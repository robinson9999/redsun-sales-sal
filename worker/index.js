/* =============================================================================
   REDSUN – Máy chủ ứng dụng Quy chế Lương thưởng & KPI (Cloudflare Worker + D1)
   - Đăng nhập email + mật khẩu (PBKDF2), phiên lưu trong D1, cookie HttpOnly
   - Quyền: admin (toàn bộ), manager (cấp dưới của mình, mọi tầng), staff (chỉ bản thân)
   - Mọi trang & file tĩnh đều yêu cầu đăng nhập, trừ trang /login
   ============================================================================= */

import { WorkerMailer } from 'worker-mailer';
import { getTemplate, sanitizeAnswers, validateAnswers, renderReport, renderText, surveyTitle } from '../public/survey-lib.js';

const PBKDF2_ITER = 50000;               // Workers giới hạn tối đa 100.000; 50.000 để vừa CPU gói miễn phí

// Tham số chức danh (đồng bộ với ROLES trong public/index.html)
const TITLES = {
  cco:    { name: 'Giám đốc kinh doanh (CCO)',          cb: 0.4, X: 5,  mgr: true },
  sm:     { name: 'Trưởng phòng kinh doanh (SM)',       cb: 0.4, X: 6,  mgr: true },
  tl:     { name: 'Trưởng nhóm kinh doanh (Team Lead)', cb: 0.4, X: 10, mgr: true },
  senior: { name: 'Chuyên viên kinh doanh (Senior)',    cb: 0.5, X: 10 },
  sales:  { name: 'Nhân viên kinh doanh (Sales Exec)',  cb: 0.5, X: 10 },
  intern: { name: 'Tập sự kinh doanh (Fresher)',        cb: 0.5, X: 10 },
  ctv:    { name: 'Cộng tác viên (CTV)',                cb: 0,   X: 0 },
  other:  { name: 'Khác (không thuộc khối KD)',         cb: 0,   X: 0 }
};
const APP_ROLES = ['admin', 'manager', 'staff'];

// Tài khoản quản trị đầu tiên (chỉ tạo khi bảng users còn trống). Bắt buộc đổi mật khẩu lần đầu.
const SEED_ADMIN = { email: 'sondo@redsun.vn', name: 'Sơn Đỗ', title: 'other',
  hash: 'pbkdf2$50000$GzRdoYJivtQJCRpQc84wgw==$hQqKIiCL1qZtUyTmnlQrphwaJeFY08yva0p4ex0wT3U=' };

/* ---------------------------- Tiện ích ---------------------------- */
const te = new TextEncoder();
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (const x of a) s += String.fromCharCode(x); return btoa(s); };
const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const now = () => Math.floor(Date.now() / 1000);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
const bad = (msg, status = 400) => json({ error: msg }, status);

async function hashPassword(pw, iter = PBKDF2_ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return `pbkdf2$${iter}$${b64(salt)}$${b64(bits)}`;
}
async function verifyPassword(pw, stored) {
  const [alg, iterS, saltS, hashS] = String(stored || '').split('$');
  if (alg !== 'pbkdf2') return false;
  const key = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: ub64(saltS), iterations: +iterS }, key, 256));
  const want = ub64(hashS);
  if (bits.length !== want.length) return false;
  let d = 0; for (let i = 0; i < bits.length; i++) d |= bits[i] ^ want[i];
  return d === 0;
}
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function tempPassword() {
  for (;;) {
    const s = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => PW_ALPHABET[x % PW_ALPHABET.length]).join('');
    if (/[A-Z]/.test(s) && /[a-z]/.test(s) && /[2-9]/.test(s)) return s.slice(0, 4) + '-' + s.slice(4);
  }
}
const sha256hex = async (s) => hex(await crypto.subtle.digest('SHA-256', te.encode(s)));
const normEmail = (e) => String(e || '').trim().toLowerCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || /^[a-z0-9._-]{3,}$/.test(e);

/* ---------------------------- Cơ sở dữ liệu ---------------------------- */
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'sales',
      app_role TEXT NOT NULL DEFAULT 'staff',
      manager_id INTEGER REFERENCES users(id),
      salary_w INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      pw_hash TEXT NOT NULL,
      must_change INTEGER NOT NULL DEFAULT 1,
      failed INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      w INTEGER NOT NULL,
      x REAL NOT NULL,
      kcn INTEGER NOT NULL,
      kteam INTEGER,
      note TEXT,
      assigned_by INTEGER,
      assigned_at INTEGER NOT NULL,
      UNIQUE(user_id, year, month))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS survey_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id TEXT NOT NULL,
      template_version INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL DEFAULT '',
      answers TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      email_status TEXT,
      email_error TEXT,
      email_to TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      submitted_at INTEGER)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_survey_user ON survey_responses(user_id, updated_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_kpis_period ON kpis(year, month)`)
  ]);
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (!c.n) {
    await env.DB.prepare(`INSERT INTO users (email,name,title,app_role,salary_w,pw_hash,must_change,created_at)
      VALUES (?1,?2,?3,'admin',0,?4,1,?5)`).bind(SEED_ADMIN.email, SEED_ADMIN.name, SEED_ADMIN.title, SEED_ADMIN.hash, now()).run();
  }
  // Nâng cấp cấu trúc cho dữ liệu đã có (bỏ qua nếu cột đã tồn tại)
  for (const sql of ['ALTER TABLE users ADD COLUMN cb_ratio REAL', 'ALTER TABLE kpis ADD COLUMN cb REAL']) {
    try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
  }
  schemaReady = true;
}

const USER_COLS = 'id,email,name,title,app_role,manager_id,salary_w,cb_ratio,start_date,active,must_change';

async function subtreeIds(env, managerId) {
  const r = await env.DB.prepare(`WITH RECURSIVE t(id) AS (
      SELECT id FROM users WHERE manager_id = ?1
      UNION SELECT u.id FROM users u JOIN t ON u.manager_id = t.id)
    SELECT id FROM t`).bind(managerId).all();
  return new Set(r.results.map((x) => x.id));
}
async function canManage(env, actor, targetId) {
  if (actor.app_role === 'admin') return true;
  if (actor.app_role !== 'manager') return false;
  return (await subtreeIds(env, actor.id)).has(targetId);
}

/* ---------------------------- Phiên đăng nhập ---------------------------- */
function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}
function cookie(token, maxAge) {
  return `rs_sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
async function currentUser(env, req) {
  const tok = getCookie(req, 'rs_sid');
  if (!tok) return null;
  const row = await env.DB.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.active = 1`).bind(await sha256hex(tok), now()).first();
  return row || null;
}
function publicUser(u) {
  const { pw_hash, failed, locked_until, created_at, ...rest } = u;
  return rest;
}

/* ---------------------------- KPI ---------------------------- */
function cbOf(u) {
  const t = TITLES[u.title] || TITLES.other;
  return u.cb_ratio == null ? t.cb : u.cb_ratio;
}
function defaultKcn(u, x) {
  return Math.round((u.salary_w || 0) * (1 - cbOf(u)) * x);
}
// Target đơn vị của một người trong tháng = K_cn + K_đội (nếu có)
async function unitTarget(env, u, y, m) {
  const k = await env.DB.prepare('SELECT kcn, kteam FROM kpis WHERE user_id=?1 AND year=?2 AND month=?3').bind(u.id, y, m).first();
  if (k) return k.kcn + (k.kteam || 0);
  const t = TITLES[u.title] || TITLES.other;
  return defaultKcn(u, t.X);
}
async function suggestTeamTarget(env, managerId, y, m, factor = 1) {
  const kids = await env.DB.prepare('SELECT * FROM users WHERE manager_id=?1 AND active=1').bind(managerId).all();
  let sum = 0;
  for (const c of kids.results) sum += await unitTarget(env, c, y, m);
  return Math.round(sum * factor);
}

/* ---------------------------- Cài đặt hệ thống ---------------------------- */
// Mặc định của từng cài đặt (lưu trong bảng settings dạng chuỗi)
const SETTING_DEFAULTS = {
  company_name: 'Công ty Đầu tư Công nghệ Redsun',
  smtp_host: '', smtp_port: '587', smtp_security: 'starttls', smtp_user: '', smtp_pass: '',
  smtp_from_email: '', smtp_from_name: 'Redsun Sales',
  survey_recipients: '', survey_cc: '', survey_bcc: '', survey_cc_sales: '1', survey_include_internal: '1',
  survey_subject_prefix: '[Khảo sát]',
  session_days: '7', max_fails: '8', lock_minutes: '15'
};
async function getSettings(env) {
  const r = await env.DB.prepare('SELECT key, value FROM settings').all();
  const out = { ...SETTING_DEFAULTS };
  for (const x of r.results) if (x.key in SETTING_DEFAULTS) out[x.key] = x.value ?? '';
  return out;
}
async function setSettings(env, obj) {
  const stmts = Object.entries(obj).map(([k, v]) => env.DB.prepare('INSERT INTO settings (key,value) VALUES (?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, String(v)));
  if (stmts.length) await env.DB.batch(stmts);
}
const intSetting = (v, def, min, max) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const parseEmails = (s) => [...new Set(String(s || '').split(/[\s,;]+/).map(normEmail).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];

// Mật khẩu SMTP: mã hóa AES-GCM nếu có secret SETTINGS_KEY, nếu không lưu nguyên dạng (chỉ ghi, không bao giờ trả về giao diện)
async function settingsKey(env) {
  if (!env.SETTINGS_KEY) return null;
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', te.encode(env.SETTINGS_KEY)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function sealSecret(env, plain) {
  if (!plain) return '';
  const key = await settingsKey(env);
  if (!key) return 'plain:' + plain;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `enc:${b64(iv)}:${b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(plain)))}`;
}
async function openSecret(env, stored) {
  if (!stored) return '';
  if (stored.startsWith('plain:')) return stored.slice(6);
  if (stored.startsWith('enc:')) {
    const key = await settingsKey(env);
    if (!key) throw new Error('Mật khẩu SMTP được mã hóa bằng SETTINGS_KEY nhưng khóa này không còn. Vui lòng nhập lại mật khẩu SMTP.');
    const [, iv, ct] = stored.split(':');
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(iv) }, key, ub64(ct)));
  }
  return stored;
}

function mailReady(env, cfg) {
  if (env.MAIL_MODE === 'log') return 'log';            // chạy thử trên máy: chỉ ghi log
  return cfg.smtp_host && cfg.smtp_from_email ? 'smtp' : null;
}
async function sendMail(env, cfg, { to, cc = [], bcc = [], subject, html, text, replyTo }) {
  const mode = mailReady(env, cfg);
  if (!mode) throw new Error('Chưa cấu hình máy chủ gửi email (SMTP). Admin vào tab Cài đặt để thiết lập.');
  if (mode === 'log') { console.log('[MAIL]', JSON.stringify({ to, cc, bcc, subject, replyTo, chars: (html || '').length })); return; }
  const port = intSetting(cfg.smtp_port, 587, 1, 65535);
  if (port === 25) throw new Error('Cloudflare chặn cổng 25. Hãy dùng cổng 587 (STARTTLS) hoặc 465 (SSL/TLS).');
  const sec = cfg.smtp_security;
  const opts = {
    host: cfg.smtp_host.trim(), port,
    secure: sec === 'ssl', startTls: sec === 'starttls',
    authType: ['plain', 'login'], socketTimeoutMs: 12000, responseTimeoutMs: 12000
  };
  if (cfg.smtp_user) opts.credentials = { username: cfg.smtp_user.trim(), password: await openSecret(env, cfg.smtp_pass) };
  let mailer;
  try { mailer = await WorkerMailer.connect(opts); } catch (e) { throw new Error(smtpErrVi(e, opts)); }
  try {
    await mailer.send({
      from: { name: cfg.smtp_from_name || cfg.company_name, email: cfg.smtp_from_email.trim() },
      to: to.map((email) => ({ email })), cc: cc.length ? cc.map((email) => ({ email })) : undefined,
      bcc: bcc.length ? bcc.map((email) => ({ email })) : undefined,
      reply: replyTo ? { email: replyTo } : undefined, subject, text, html
    });
  } catch (e) { throw new Error(smtpErrVi(e, opts)); }
  finally { try { await mailer.close(); } catch (e) { /* bỏ qua */ } }
}
// Dịch lỗi SMTP sang tiếng Việt kèm gợi ý xử lý
function smtpErrVi(e, opts) {
  const m = String((e && e.message) || e);
  if (/^(Chưa|Cloudflare|Sai|Không|Hết)/.test(m)) return m;
  if (/535|534|authentication|auth.*fail|username and password|credentials/i.test(m)) return 'Sai tài khoản hoặc mật khẩu SMTP. Với Gmail/Microsoft 365 phải dùng "Mật khẩu ứng dụng" (App Password), không dùng mật khẩu đăng nhập thường. (' + m.slice(0, 120) + ')';
  if (/cannot connect|connect|ECONNREFUSED|proxy request failed|network/i.test(m)) return `Không kết nối được tới máy chủ ${opts.host}:${opts.port}. Kiểm tra lại địa chỉ máy chủ, cổng và kiểu bảo mật (465 = SSL/TLS, 587 = STARTTLS). (` + m.slice(0, 120) + ')';
  if (/timeout|timed out/i.test(m)) return 'Máy chủ SMTP không phản hồi (hết thời gian chờ). Thường do sai mật khẩu, sai kiểu bảo mật so với cổng (465 ↔ SSL/TLS, 587 ↔ STARTTLS) hoặc máy chủ chặn đăng nhập. (' + m.slice(0, 120) + ')';
  if (/550|553|sender|not allowed|relay/i.test(m)) return 'Máy chủ từ chối địa chỉ người gửi. "Email người gửi" phải trùng tài khoản SMTP hoặc là alias đã được cấp quyền. (' + m.slice(0, 120) + ')';
  return 'Lỗi gửi email: ' + m.slice(0, 200);
}
const surveyCode = (r) => `KS-${new Date(r.created_at * 1000).getFullYear()}-${String(r.id).padStart(4, '0')}`;
const fmtTs = (ts) => ts ? new Date(ts * 1000).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) : '';

async function emailSurvey(env, url, row, owner) {
  const cfg = await getSettings(env);
  const tpl = getTemplate(row.template_id);
  const ans = JSON.parse(row.answers || '{}');
  const to = parseEmails(cfg.survey_recipients);
  const ownerEmail = owner && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email) ? owner.email : null;
  const cc = parseEmails(cfg.survey_cc).filter((e) => !to.includes(e));
  if (cfg.survey_cc_sales === '1' && ownerEmail && !to.includes(ownerEmail) && !cc.includes(ownerEmail)) cc.push(ownerEmail);
  const bcc = parseEmails(cfg.survey_bcc).filter((e) => !to.includes(e) && !cc.includes(e));
  const all = [...to, ...cc, ...bcc];
  let status, error = null;
  if (!to.length) { status = 'no_recipients'; error = 'Chưa cài đặt email nhận phiếu.'; }
  else {
    const internal = cfg.survey_include_internal === '1';
    const meta = { sales: owner ? owner.name : '', submitted: fmtTs(row.submitted_at), code: surveyCode(row), company: cfg.company_name };
    const link = `${url.origin}/#khao-sat`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;margin-bottom:14px;">
        Phiếu khảo sát mới từ <b>${String(meta.sales).replace(/</g, '&lt;')}</b>. Xem và xuất PDF tại <a href="${link}">${url.host}</a>.</div>`
      + renderReport(tpl, ans, { internal, meta });
    const prefix = (cfg.survey_subject_prefix || '').trim();
    try {
      await sendMail(env, cfg, { to, cc, bcc, subject: `${prefix ? prefix + ' ' : ''}${tpl.short}: ${surveyTitle(tpl, ans)} – ${meta.sales} (${meta.code})`,
        html, text: renderText(tpl, ans, { internal }), replyTo: ownerEmail || undefined });
      status = mailReady(env, cfg) === 'log' ? 'sent_test' : 'sent';
    } catch (e) { status = /Chưa cấu hình/.test(e.message) ? 'not_configured' : 'failed'; error = String(e.message || e).slice(0, 300); }
  }
  await env.DB.prepare('UPDATE survey_responses SET email_status=?1, email_error=?2, email_to=?3 WHERE id=?4')
    .bind(status, error, all.join(', '), row.id).run();
  return { email_status: status, email_error: error, email_to: all.join(', ') };
}
async function canViewSurvey(env, me, row) {
  return row.user_id === me.id || me.app_role === 'admin' || (me.app_role === 'manager' && (await subtreeIds(env, me.id)).has(row.user_id));
}

/* ---------------------------- API ---------------------------- */
async function api(req, env, url, me) {
  const p = url.pathname, method = req.method;
  let body = {};
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== url.host) return bad('Yêu cầu không hợp lệ.', 403);
    if (method !== 'DELETE') {   // DELETE không cần nội dung; vẫn được chặn khác nguồn bằng kiểm tra Origin ở trên
      if (!(req.headers.get('content-type') || '').includes('application/json')) return bad('Yêu cầu không hợp lệ.', 415);
      try { body = await req.json(); } catch { return bad('Dữ liệu không hợp lệ.'); }
    }
  }

  /* ----- Đăng nhập / đăng xuất ----- */
  if (p === '/api/login' && method === 'POST') {
    const email = normEmail(body.email), pw = String(body.password || '');
    const u = await env.DB.prepare('SELECT * FROM users WHERE email=?1').bind(email).first();
    const cfg = await getSettings(env);
    const SESSION_DAYS = intSetting(cfg.session_days, 7, 1, 90), MAX_FAILS = intSetting(cfg.max_fails, 8, 3, 50), LOCK_MINUTES = intSetting(cfg.lock_minutes, 15, 1, 1440);
    const generic = bad('Email hoặc mật khẩu không đúng.', 401);
    if (!u || !u.active) { await hashPassword(pw); return generic; }           // giữ thời gian phản hồi tương đương
    if (u.locked_until > now()) return bad(`Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ${Math.ceil((u.locked_until - now()) / 60)} phút.`, 429);
    if (!(await verifyPassword(pw, u.pw_hash))) {
      const failed = u.failed + 1;
      await env.DB.prepare('UPDATE users SET failed=?1, locked_until=?2 WHERE id=?3')
        .bind(failed >= MAX_FAILS ? 0 : failed, failed >= MAX_FAILS ? now() + LOCK_MINUTES * 60 : 0, u.id).run();
      return generic;
    }
    const tok = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET failed=0, locked_until=0 WHERE id=?1').bind(u.id),
      env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?1,?2,?3)').bind(await sha256hex(tok), u.id, now() + SESSION_DAYS * 86400),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now())
    ]);
    return json({ ok: true, must_change: !!u.must_change }, 200, { 'set-cookie': cookie(tok, SESSION_DAYS * 86400) });
  }
  if (p === '/api/logout' && method === 'POST') {
    const tok = getCookie(req, 'rs_sid');
    if (tok) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(await sha256hex(tok)).run();
    return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  }

  if (!me) return bad('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);

  /* ----- Bản thân ----- */
  if (p === '/api/me' && method === 'GET') {
    const mgr = me.manager_id ? await env.DB.prepare('SELECT id,name,email FROM users WHERE id=?1').bind(me.manager_id).first() : null;
    const cfg = await getSettings(env);
    return json({ user: publicUser(me), manager: mgr, titles: TITLES, company: cfg.company_name });
  }
  if (p === '/api/me/password' && method === 'POST') {
    const oldPw = String(body.old_password || ''), newPw = String(body.new_password || '');
    if (!(await verifyPassword(oldPw, me.pw_hash))) return bad('Mật khẩu hiện tại không đúng.');
    if (newPw.length < 8) return bad('Mật khẩu mới cần tối thiểu 8 ký tự.');
    if (newPw === oldPw) return bad('Mật khẩu mới phải khác mật khẩu hiện tại.');
    const tok = getCookie(req, 'rs_sid');
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET pw_hash=?1, must_change=0 WHERE id=?2').bind(await hashPassword(newPw), me.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?1 AND token_hash<>?2').bind(me.id, await sha256hex(tok))
    ]);
    return json({ ok: true });
  }

  // Bắt buộc đổi mật khẩu trước khi dùng các chức năng khác
  if (me.must_change) return bad('Bạn cần đổi mật khẩu trước khi tiếp tục.', 403);

  /* ----- Nhân viên ----- */
  if (p === '/api/users' && method === 'GET') {
    if (me.app_role === 'admin') {
      const r = await env.DB.prepare(`SELECT ${USER_COLS} FROM users ORDER BY active DESC, name`).all();
      return json({ users: r.results, scope: 'all' });
    }
    if (me.app_role === 'manager') {
      const ids = [...(await subtreeIds(env, me.id))];
      if (!ids.length) return json({ users: [], scope: 'team' });
      const r = await env.DB.prepare(`SELECT ${USER_COLS} FROM users WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY active DESC, name`).bind(...ids).all();
      return json({ users: r.results, scope: 'team' });
    }
    return bad('Bạn không có quyền xem danh sách nhân viên.', 403);
  }
  if (p === '/api/users' && method === 'POST') {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được thêm nhân viên.', 403);
    const v = await validateUser(env, body, null);
    if (v.error) return bad(v.error);
    const pw = tempPassword();
    const r = await env.DB.prepare(`INSERT INTO users (email,name,title,app_role,manager_id,salary_w,cb_ratio,start_date,active,pw_hash,must_change,created_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,1,?9,1,?10)`)
      .bind(v.email, v.name, v.title, v.app_role, v.manager_id, v.salary_w, v.cb_ratio, v.start_date, await hashPassword(pw), now()).run();
    return json({ ok: true, id: r.meta.last_row_id, temp_password: pw });
  }
  if (p === '/api/users/import' && method === 'POST') {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được nhập danh sách nhân viên.', 403);
    const rows = Array.isArray(body.users) ? body.users.slice(0, 500) : [];
    if (!rows.length) return bad('File không có dòng nào.');
    const created = [], skipped = [];
    for (const r of rows) {
      const v = await validateUser(env, { ...r, manager_id: null }, null);
      if (v.error) { skipped.push({ email: r.email, reason: v.error }); continue; }
      const given = String(r.password || '');
      if (given && given.length < 8) { skipped.push({ email: v.email, reason: 'Mật khẩu dưới 8 ký tự.' }); continue; }
      const pw = given || tempPassword();
      await env.DB.prepare(`INSERT INTO users (email,name,title,app_role,salary_w,cb_ratio,start_date,active,pw_hash,must_change,created_at)
          VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8,1,?9)`)
        .bind(v.email, v.name, v.title, v.app_role, v.salary_w, v.cb_ratio, v.start_date, await hashPassword(pw), now()).run();
      created.push({ email: v.email, name: v.name, temp_password: given ? null : pw, manager_email: normEmail(r.manager_email) });
    }
    // Gán quản lý trực tiếp theo email (sau khi đã tạo đủ người)
    for (const c of created) {
      if (!c.manager_email) continue;
      const mg = await env.DB.prepare('SELECT id FROM users WHERE email=?1').bind(c.manager_email).first();
      const u = await env.DB.prepare('SELECT id FROM users WHERE email=?1').bind(c.email).first();
      if (mg && mg.id !== u.id && !(await subtreeIds(env, u.id)).has(mg.id))
        await env.DB.prepare('UPDATE users SET manager_id=?1 WHERE id=?2').bind(mg.id, u.id).run();
      else c.manager_note = 'Không tìm thấy quản lý ' + c.manager_email;
    }
    return json({ ok: true, created, skipped });
  }
  let m = p.match(/^\/api\/users\/(\d+)$/);
  if (m && method === 'PUT') {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được sửa thông tin nhân viên.', 403);
    const id = +m[1];
    const u = await env.DB.prepare('SELECT * FROM users WHERE id=?1').bind(id).first();
    if (!u) return bad('Không tìm thấy nhân viên.', 404);
    const v = await validateUser(env, { ...u, ...body }, id);
    if (v.error) return bad(v.error);
    const active = body.active === undefined ? u.active : (body.active ? 1 : 0);
    // Không để hệ thống mất Admin cuối cùng
    if (u.app_role === 'admin' && (v.app_role !== 'admin' || !active)) {
      const c = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE app_role='admin' AND active=1 AND id<>?1`).bind(id).first();
      if (!c.n) return bad('Phải còn ít nhất một Admin đang hoạt động.');
    }
    const stmts = [env.DB.prepare(`UPDATE users SET email=?1,name=?2,title=?3,app_role=?4,manager_id=?5,salary_w=?6,cb_ratio=?7,start_date=?8,active=?9 WHERE id=?10`)
      .bind(v.email, v.name, v.title, v.app_role, v.manager_id, v.salary_w, v.cb_ratio, v.start_date, active, id)];
    if (!active) stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=?1').bind(id));
    await env.DB.batch(stmts);
    return json({ ok: true });
  }
  m = p.match(/^\/api\/users\/(\d+)\/reset-password$/);
  if (m && method === 'POST') {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được cấp lại mật khẩu.', 403);
    const id = +m[1], pw = tempPassword();
    const r = await env.DB.prepare('UPDATE users SET pw_hash=?1, must_change=1, failed=0, locked_until=0 WHERE id=?2').bind(await hashPassword(pw), id).run();
    if (!r.meta.changes) return bad('Không tìm thấy nhân viên.', 404);
    await env.DB.prepare('DELETE FROM sessions WHERE user_id=?1').bind(id).run();
    return json({ ok: true, temp_password: pw });
  }

  /* ----- KPI ----- */
  if (p === '/api/kpis' && method === 'GET') {
    const y = +url.searchParams.get('year') || new Date().getFullYear();
    const uid = url.searchParams.get('user_id');
    let ids;
    if (uid === 'me' || !uid) {
      if (uid === 'me') ids = [me.id];
      else if (me.app_role === 'admin') ids = null;            // tất cả
      else if (me.app_role === 'manager') ids = [...(await subtreeIds(env, me.id))];
      else ids = [me.id];
    } else {
      const t = +uid;
      if (t !== me.id && !(await canManage(env, me, t))) return bad('Bạn không có quyền xem KPI của nhân viên này.', 403);
      ids = [t];
    }
    const q = `SELECT k.*, u.name, u.email, u.title, a.name AS assigned_by_name FROM kpis k
      JOIN users u ON u.id = k.user_id LEFT JOIN users a ON a.id = k.assigned_by
      WHERE k.year = ?1 ${ids ? (ids.length ? `AND k.user_id IN (${ids.map(() => '?').join(',')})` : 'AND 0') : ''}
      ORDER BY u.name, k.month`;
    const r = await env.DB.prepare(q).bind(y, ...(ids || [])).all();
    return json({ year: y, kpis: r.results });
  }
  if (p === '/api/kpis/suggest-team' && method === 'GET') {
    const uid = +url.searchParams.get('user_id'), y = +url.searchParams.get('year'), mo = +url.searchParams.get('month');
    const f = +(url.searchParams.get('factor') || 1);
    if (!(await canManage(env, me, uid))) return bad('Không có quyền.', 403);
    return json({ kteam: await suggestTeamTarget(env, uid, y, mo, f) });
  }
  if (p === '/api/kpis' && method === 'POST') {
    if (!['admin', 'manager'].includes(me.app_role)) return bad('Bạn không có quyền giao KPI.', 403);
    const userIds = [...new Set((body.user_ids || []).map(Number))].filter(Boolean);
    const months = [...new Set((body.months || []).map(Number))].filter((x) => x >= 1 && x <= 12);
    const year = +body.year;
    if (!userIds.length) return bad('Chưa chọn nhân viên.');
    if (!months.length) return bad('Chưa chọn tháng.');
    if (!(year >= 2020 && year <= 2100)) return bad('Năm không hợp lệ.');
    if (userIds.length * months.length > 1200) return bad('Số lượng quá lớn, hãy chia nhỏ.');
    const xOv = body.x === '' || body.x == null ? null : +body.x;
    const kcnOv = body.kcn === '' || body.kcn == null ? null : Math.round(+body.kcn);
    const kteamOv = body.kteam === '' || body.kteam == null ? null : Math.round(+body.kteam);
    const factor = +(body.team_factor || 1);
    if (xOv !== null && !(xOv > 0 && xOv <= 50)) return bad('Hệ số X không hợp lệ.');
    if (kcnOv !== null && !(kcnOv >= 0)) return bad('Target cá nhân không hợp lệ.');
    if (!(factor >= 0.5 && factor <= 2)) return bad('Hệ số target đội không hợp lệ.');
    const scope = me.app_role === 'admin' ? null : await subtreeIds(env, me.id);
    const stmts = [], preview = [];
    // Giao cấp dưới trước để target đội của cấp trên tự cộng đúng
    const users = [];
    for (const id of userIds) {
      if (me.app_role !== 'admin' && (id === me.id || !scope.has(id))) return bad('Chỉ được giao KPI cho nhân viên thuộc quyền quản lý của bạn.', 403);
      const u = await env.DB.prepare('SELECT * FROM users WHERE id=?1 AND active=1').bind(id).first();
      if (!u) return bad(`Không tìm thấy nhân viên #${id}.`);
      users.push(u);
    }
    const depth = async (u) => { let d = 0, cur = u; const seen = new Set(); while (cur && cur.manager_id && !seen.has(cur.id)) { seen.add(cur.id); d++; cur = await env.DB.prepare('SELECT id,manager_id FROM users WHERE id=?1').bind(cur.manager_id).first(); } return d; };
    for (const u of users) u._depth = await depth(u);
    users.sort((a, b) => b._depth - a._depth);
    for (const u of users) {
      const t = TITLES[u.title] || TITLES.other;
      const x = xOv ?? t.X;
      for (const mo of months) {
        const kcn = kcnOv ?? defaultKcn(u, x);
        let kteam = null;
        if (t.mgr) kteam = kteamOv ?? await suggestTeamTarget(env, u.id, year, mo, factor);
        const st = env.DB.prepare(`INSERT INTO kpis (user_id,year,month,w,x,kcn,kteam,note,assigned_by,assigned_at,cb)
            VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
            ON CONFLICT(user_id,year,month) DO UPDATE SET w=excluded.w, x=excluded.x, kcn=excluded.kcn, kteam=excluded.kteam, cb=excluded.cb,
              note=excluded.note, assigned_by=excluded.assigned_by, assigned_at=excluded.assigned_at`)
          .bind(u.id, year, mo, u.salary_w, x, kcn, kteam, String(body.note || '').slice(0, 500), me.id, now(), cbOf(u));
        if (body.dry_run) preview.push({ user_id: u.id, name: u.name, title: u.title, month: mo, w: u.salary_w, cb: cbOf(u), x, kcn, kteam });
        else { await st.run(); }   // chạy tuần tự để K_đội của cấp trên thấy KPI vừa giao cho cấp dưới
      }
    }
    if (body.dry_run) return json({ preview });
    return json({ ok: true, count: users.length * months.length });
  }
  m = p.match(/^\/api\/kpis\/(\d+)$/);
  if (m && method === 'DELETE') {
    const k = await env.DB.prepare('SELECT * FROM kpis WHERE id=?1').bind(+m[1]).first();
    if (!k) return bad('Không tìm thấy KPI.', 404);
    if (me.app_role !== 'admin' && (k.user_id === me.id || !(await canManage(env, me, k.user_id)))) return bad('Không có quyền xóa KPI này.', 403);
    await env.DB.prepare('DELETE FROM kpis WHERE id=?1').bind(k.id).run();
    return json({ ok: true });
  }

  /* ----- Phiếu khảo sát ----- */
  if (p === '/api/settings/survey' && method === 'GET') {          // thông tin cho mọi người dùng (không có bí mật)
    const cfg = await getSettings(env);
    return json({ recipients: parseEmails(cfg.survey_recipients), cc: parseEmails(cfg.survey_cc), cc_sales: cfg.survey_cc_sales === '1',
      mail_ready: !!mailReady(env, cfg), mail_mode: mailReady(env, cfg), company: cfg.company_name });
  }
  if (p.startsWith('/api/admin/')) {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được truy cập cài đặt hệ thống.', 403);
    if (p === '/api/admin/settings' && method === 'GET') {
      const cfg = await getSettings(env);
      const { smtp_pass, ...rest } = cfg;
      return json({ settings: rest, smtp_pass_set: !!smtp_pass, smtp_pass_encrypted: smtp_pass.startsWith('enc:'), has_settings_key: !!env.SETTINGS_KEY, mail_mode: mailReady(env, cfg) });
    }
    if (p === '/api/admin/settings' && method === 'PUT') {
      const b = body || {}, upd = {};
      const str = (v, n) => String(v ?? '').trim().slice(0, n);
      if ('company_name' in b) { const v = str(b.company_name, 120); if (!v) return bad('Chưa nhập tên công ty.'); upd.company_name = v; }
      if ('smtp_host' in b) { const v = str(b.smtp_host, 200); if (v && !/^[a-z0-9.-]+$/i.test(v)) return bad('Máy chủ SMTP không hợp lệ.'); upd.smtp_host = v; }
      if ('smtp_port' in b) { const v = parseInt(b.smtp_port, 10); if (!(v > 0 && v < 65536)) return bad('Cổng SMTP không hợp lệ.'); if (v === 25) return bad('Cloudflare chặn cổng 25. Dùng 587 hoặc 465.'); upd.smtp_port = String(v); }
      if ('smtp_security' in b) { if (!['ssl', 'starttls', 'none'].includes(b.smtp_security)) return bad('Kiểu bảo mật không hợp lệ.'); upd.smtp_security = b.smtp_security; }
      if ('smtp_user' in b) upd.smtp_user = str(b.smtp_user, 200);
      if (b.smtp_pass_clear) upd.smtp_pass = '';
      else if (b.smtp_pass) upd.smtp_pass = await sealSecret(env, String(b.smtp_pass).slice(0, 500));
      if ('smtp_from_email' in b) { const v = normEmail(b.smtp_from_email); if (v && !parseEmails(v).length) return bad('Email người gửi không hợp lệ.'); upd.smtp_from_email = v; }
      if ('smtp_from_name' in b) upd.smtp_from_name = str(b.smtp_from_name, 120);
      for (const k of ['survey_recipients', 'survey_cc', 'survey_bcc']) if (k in b) {
        const list = parseEmails(b[k]); if (list.length > 30) return bad('Mỗi danh sách tối đa 30 email.'); upd[k] = list.join(',');
      }
      if ('survey_cc_sales' in b) upd.survey_cc_sales = b.survey_cc_sales ? '1' : '0';
      if ('survey_include_internal' in b) upd.survey_include_internal = b.survey_include_internal ? '1' : '0';
      if ('survey_subject_prefix' in b) upd.survey_subject_prefix = str(b.survey_subject_prefix, 60);
      if ('session_days' in b) upd.session_days = String(intSetting(b.session_days, 7, 1, 90));
      if ('max_fails' in b) upd.max_fails = String(intSetting(b.max_fails, 8, 3, 50));
      if ('lock_minutes' in b) upd.lock_minutes = String(intSetting(b.lock_minutes, 15, 1, 1440));
      await setSettings(env, upd);
      return json({ ok: true, saved: Object.keys(upd).length });
    }
    if (p === '/api/admin/test-email' && method === 'POST') {
      const to = parseEmails(body.to);
      if (!to.length) return bad('Nhập email nhận thư thử.');
      const cfg = await getSettings(env);
      try {
        await sendMail(env, cfg, { to: [to[0]], subject: `${cfg.company_name} – Email thử từ hệ thống KPI`,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px">Xin chào,<br><br>Đây là email thử gửi từ <b>${url.host}</b> qua máy chủ SMTP <b>${cfg.smtp_host}:${cfg.smtp_port}</b>.<br>Nếu bạn nhận được email này, cấu hình gửi email đã hoạt động.<br><br>${cfg.company_name}</div>`,
          text: `Email thử từ ${url.host} qua SMTP ${cfg.smtp_host}:${cfg.smtp_port}. Cấu hình gửi email đã hoạt động.` });
        return json({ ok: true, mode: mailReady(env, cfg) });
      } catch (e) { return bad(String(e.message || e).slice(0, 400)); }
    }
    return bad('Không tìm thấy.', 404);
  }
  if (p === '/api/surveys' && method === 'GET') {
    let where = 'r.user_id = ?1', binds = [me.id];
    if (me.app_role === 'admin') { where = '1'; binds = []; }
    else if (me.app_role === 'manager') {
      const ids = [me.id, ...(await subtreeIds(env, me.id))];
      where = `r.user_id IN (${ids.map(() => '?').join(',')})`; binds = ids;
    }
    const r = await env.DB.prepare(`SELECT r.id, r.template_id, r.title, r.status, r.email_status, r.answers, r.created_at, r.updated_at, r.submitted_at,
        r.user_id, u.name AS user_name FROM survey_responses r JOIN users u ON u.id = r.user_id
        WHERE ${where} ORDER BY r.updated_at DESC LIMIT 300`).bind(...binds).all();
    return json({ surveys: r.results.map((x) => ({ ...x, code: surveyCode(x), answers: JSON.parse(x.answers || '{}') })) });
  }
  m = p.match(/^\/api\/surveys(?:\/(\d+))?(\/send)?$/);
  if (m) {
    const id = m[1] ? +m[1] : null, isSend = !!m[2];
    if (!id && method === 'POST') {
      const tpl = getTemplate(body.template_id);
      if (!tpl) return bad('Không tìm thấy mẫu phiếu.');
      const ans = sanitizeAnswers(tpl, body.answers || {});
      if (body.submit) { const errs = validateAnswers(tpl, ans); if (errs.length) return bad(errs.join(' ')); }
      const t = now();
      const r = await env.DB.prepare(`INSERT INTO survey_responses (template_id,template_version,user_id,title,answers,status,created_at,updated_at,submitted_at)
          VALUES (?1,?2,?3,?4,?5,?6,?7,?7,?8)`).bind(tpl.id, tpl.version, me.id, surveyTitle(tpl, ans).slice(0, 200), JSON.stringify(ans),
          body.submit ? 'submitted' : 'draft', t, body.submit ? t : null).run();
      const row = await env.DB.prepare('SELECT * FROM survey_responses WHERE id=?1').bind(r.meta.last_row_id).first();
      const mail = body.submit ? await emailSurvey(env, url, row, me) : {};
      return json({ ok: true, id: row.id, code: surveyCode(row), ...mail });
    }
    if (!id) return bad('Không tìm thấy.', 404);
    const row = await env.DB.prepare(`SELECT r.*, u.name AS user_name, u.email AS user_email FROM survey_responses r JOIN users u ON u.id=r.user_id WHERE r.id=?1`).bind(id).first();
    if (!row || !(await canViewSurvey(env, me, row))) return bad('Không tìm thấy phiếu hoặc bạn không có quyền xem.', 404);
    const owner = { id: row.user_id, name: row.user_name, email: row.user_email };
    if (method === 'GET' && !isSend) return json({ survey: { ...row, code: surveyCode(row), answers: JSON.parse(row.answers || '{}') } });
    if (method === 'POST' && isSend) {
      if (row.status !== 'submitted') return bad('Phiếu chưa hoàn tất.');
      return json({ ok: true, ...(await emailSurvey(env, url, row, owner)) });
    }
    if (method === 'PUT') {
      if (row.user_id !== me.id && me.app_role !== 'admin') return bad('Chỉ người lập phiếu được sửa.', 403);
      const tpl = getTemplate(row.template_id);
      const ans = sanitizeAnswers(tpl, body.answers || {});
      const submit = !!body.submit || row.status === 'submitted';
      if (submit) { const errs = validateAnswers(tpl, ans); if (errs.length) return bad(errs.join(' ')); }
      const t = now();
      await env.DB.prepare(`UPDATE survey_responses SET answers=?1, title=?2, status=?3, updated_at=?4, submitted_at=COALESCE(?5, submitted_at) WHERE id=?6`)
        .bind(JSON.stringify(ans), surveyTitle(tpl, ans).slice(0, 200), submit ? 'submitted' : 'draft', t, body.submit ? t : null, id).run();
      const fresh = await env.DB.prepare('SELECT * FROM survey_responses WHERE id=?1').bind(id).first();
      const mail = body.submit ? await emailSurvey(env, url, fresh, owner) : {};
      return json({ ok: true, id, code: surveyCode(fresh), ...mail });
    }
    if (method === 'DELETE') {
      if (!(me.app_role === 'admin' || (row.user_id === me.id && row.status === 'draft'))) return bad('Chỉ xóa được phiếu nháp của mình (Admin xóa được mọi phiếu).', 403);
      await env.DB.prepare('DELETE FROM survey_responses WHERE id=?1').bind(id).run();
      return json({ ok: true });
    }
  }

  return bad('Không tìm thấy.', 404);
}

async function validateUser(env, b, selfId) {
  const email = normEmail(b.email), name = String(b.name || '').trim();
  const title = TITLES[b.title] ? b.title : null;
  const app_role = APP_ROLES.includes(b.app_role) ? b.app_role : null;
  const salary_w = Math.max(0, Math.round(+b.salary_w || 0));
  // Tỷ lệ lương cơ bản dạng thập phân 0–1 (vd 0.4 = 40%); để trống = theo chức danh
  let cb_ratio = b.cb_ratio === '' || b.cb_ratio == null ? null : +b.cb_ratio;
  if (cb_ratio != null && !(cb_ratio >= 0 && cb_ratio <= 1)) return { error: 'Tỷ lệ lương cơ bản phải từ 0% đến 100%.' };
  if (cb_ratio != null) cb_ratio = Math.round(cb_ratio * 1000) / 1000;
  const manager_id = b.manager_id ? +b.manager_id : null;
  const start_date = b.start_date && /^\d{4}-\d{2}-\d{2}$/.test(b.start_date) ? b.start_date : null;
  if (!isEmail(email)) return { error: 'Email không hợp lệ.' };
  if (!name) return { error: 'Chưa nhập họ tên.' };
  if (!title) return { error: 'Chức danh không hợp lệ.' };
  if (!app_role) return { error: 'Quyền không hợp lệ.' };
  const dup = await env.DB.prepare('SELECT id FROM users WHERE email=?1').bind(email).first();
  if (dup && dup.id !== selfId) return { error: 'Email này đã có tài khoản.' };
  if (manager_id) {
    if (manager_id === selfId) return { error: 'Nhân viên không thể là quản lý của chính mình.' };
    const mg = await env.DB.prepare('SELECT id FROM users WHERE id=?1').bind(manager_id).first();
    if (!mg) return { error: 'Quản lý trực tiếp không tồn tại.' };
    if (selfId && (await subtreeIds(env, selfId)).has(manager_id)) return { error: 'Không thể chọn cấp dưới làm quản lý (tạo vòng lặp).' };
  }
  return { email, name, title, app_role, manager_id, salary_w, cb_ratio, start_date };
}

/* ---------------------------- Điều hướng ---------------------------- */
const SEC_HEADERS = {
  'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};
function withHeaders(res, extra = {}) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries({ ...SEC_HEADERS, ...extra })) r.headers.set(k, v);
  return r;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      await ensureSchema(env);
      const me = await currentUser(env, req);
      if (url.pathname.startsWith('/api/')) return withHeaders(await api(req, env, url, me));

      const isLogin = url.pathname === '/login' || url.pathname === '/login.html';
      if (isLogin) {
        if (me) return Response.redirect(new URL('/', url), 302);
        return withHeaders(await env.ASSETS.fetch(new Request(new URL('/login', url), req)), { 'cache-control': 'no-store' });
      }
      if (!me) {
        if (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'))
          return Response.redirect(new URL('/login', url), 302);
        return withHeaders(new Response('Unauthorized', { status: 401 }));
      }
      return withHeaders(await env.ASSETS.fetch(req), { 'cache-control': 'private, no-store' });
    } catch (e) {
      console.error(e);
      return withHeaders(json({ error: 'Lỗi máy chủ: ' + (e.message || e) }, 500));
    }
  }
};
