/* =============================================================================
   REDSUN – Máy chủ ứng dụng Quy chế Lương thưởng & KPI (Cloudflare Worker + D1)
   - Đăng nhập email + mật khẩu (PBKDF2), phiên lưu trong D1, cookie HttpOnly
   - Quyền: admin (toàn bộ), manager (cấp dưới của mình, mọi tầng), staff (chỉ bản thân)
   - Mọi trang & file tĩnh đều yêu cầu đăng nhập, trừ trang /login
   ============================================================================= */

import { WorkerMailer } from 'worker-mailer';
import { getTemplate, sanitizeAnswers, validateAnswers, renderReport, renderText, surveyTitle } from '../public/survey-lib.js';
import { PROPOSALS, getProposal } from '../public/proposal/catalog.js';

const PBKDF2_ITER = 50000;               // Workers giới hạn tối đa 100.000; 50.000 để vừa CPU gói miễn phí

// Tham số chức danh (đồng bộ với ROLES trong public/index.html)
const TITLES = {
  cco:    { name: 'Giám đốc kinh doanh (CCO)',          cb: 0.4, X: 5,  mgr: true, en: 'Chief Commercial Officer' },
  sm:     { name: 'Trưởng phòng kinh doanh (SM)',       cb: 0.4, X: 6,  mgr: true, en: 'Sales Manager' },
  tl:     { name: 'Trưởng nhóm kinh doanh (Team Lead)', cb: 0.4, X: 10, mgr: true, en: 'Sales Team Lead' },
  senior: { name: 'Chuyên viên kinh doanh (Senior)',    cb: 0.5, X: 10, en: 'Senior Sales Consultant' },
  sales:  { name: 'Nhân viên kinh doanh (Sales Exec)',  cb: 0.5, X: 10, en: 'Sales Executive' },
  intern: { name: 'Tập sự kinh doanh (Fresher)',        cb: 0.5, X: 10, en: 'Sales Associate' },
  ctv:    { name: 'Cộng tác viên (CTV)',                cb: 0,   X: 0 },
  other:  { name: 'Khác (không thuộc khối KD)',         cb: 0,   X: 0 }
};
const APP_ROLES = ['admin', 'manager', 'staff'];

/* Công thức lương, thưởng, KPI theo phòng ban. Mỗi phòng ban chọn một công thức.
   - Công thức có danh sách chức danh cố định (titles) thì chức danh của phòng lấy theo công thức.
   - Công thức không có danh sách (titles = null) thì Admin tự tạo chức danh cho phòng.
   Thêm công thức mới cho phòng ban khác: khai báo ở đây và trong FORMULA_UI (public/app.js). */
const SALES_TITLES = ['cco', 'sm', 'tl', 'senior', 'sales', 'intern', 'ctv'];
const FORMULAS = {
  sales: { name: 'Lương 3P – Khối Kinh doanh', kpi: true, titles: SALES_TITLES,
    desc: 'Tổng lương W = Lương cơ bản (A) + Lương hiệu suất tối đa (H). Thu nhập = A + B (lương hiệu suất theo % đạt KPI doanh số) + C₁ (thưởng doanh số cá nhân lũy tiến) + C₂ (thưởng quản lý theo % đạt của đơn vị). KPI doanh số = H × hệ số X. Cộng tác viên hưởng hoa hồng lũy tiến, không có lương cố định.' },
  none: { name: 'Chưa có công thức', kpi: false, titles: null,
    desc: 'Phòng ban này chưa có công thức tính lương, thưởng, KPI. Hệ thống chỉ lưu thông tin nhân sự; công thức sẽ được bổ sung sau.' }
};
const DEFAULT_DEPT = { id: 'kinh-doanh', name: 'Phòng Kinh doanh', formula: 'sales' };
const slugId = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// Danh sách phòng ban + chức danh tự tạo; titles = bảng chức danh đầy đủ (chức danh công thức + chức danh tự tạo)
async function loadOrg(env) {
  const [d, t, c] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM departments ORDER BY sort, name'),
    env.DB.prepare('SELECT * FROM dept_titles ORDER BY sort, name'),
    env.DB.prepare('SELECT dept_id, COUNT(*) AS n FROM users WHERE active=1 GROUP BY dept_id')
  ]);
  const counts = Object.fromEntries(c.results.map((x) => [x.dept_id, x.n]));
  const departments = d.results.map((x) => ({ ...x, active: !!x.active, users: counts[x.id] || 0 }));
  const titles = {};
  for (const [k, v] of Object.entries(TITLES)) titles[k] = { ...v, formula: SALES_TITLES.includes(k) ? 'sales' : null };
  for (const x of t.results) titles[x.id] = { name: x.name, mgr: !!x.mgr, dept_id: x.dept_id, custom: true, active: !!x.active };
  return { departments, titles, deptById: Object.fromEntries(departments.map((x) => [x.id, x])) };
}
// Chức danh hợp lệ của một phòng ban
function deptTitleKeys(org, dept) {
  if (!dept) return ['other'];
  const f = FORMULAS[dept.formula] || FORMULAS.none;
  if (f.titles) return f.titles;
  return Object.entries(org.titles).filter(([, v]) => v.custom && v.dept_id === dept.id).map(([k]) => k);
}
const formulasPublic = () => Object.fromEntries(Object.entries(FORMULAS).map(([k, v]) => [k, { name: v.name, desc: v.desc, kpi: v.kpi, titles: v.titles }]));

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
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS proposal_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      proposal_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      customer_company TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      cc TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      fields TEXT NOT NULL DEFAULT '{}',
      email_status TEXT,
      email_error TEXT,
      sent_at INTEGER,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      first_viewed_at INTEGER,
      last_viewed_at INTEGER)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pshare_user ON proposal_shares(user_id, created_at)`),
    // Tài liệu nội bộ: file PDF lưu thành nhiều khúc ≤ 1 MB trong D1 (giới hạn 2 MB/dòng), chỉ xem trong tool
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      group_name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      file_name TEXT,
      file_size INTEGER NOT NULL DEFAULT 0,
      chunks INTEGER NOT NULL DEFAULT 0,
      file_rev INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      updated_at INTEGER NOT NULL,
      file_updated_at INTEGER)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS doc_chunks (
      doc_id INTEGER NOT NULL REFERENCES docs(id),
      rev INTEGER NOT NULL,
      seq INTEGER NOT NULL,
      data BLOB NOT NULL,
      PRIMARY KEY (doc_id, rev, seq))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS doc_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id INTEGER NOT NULL REFERENCES docs(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      viewed_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_docview_doc ON doc_views(doc_id, user_id, viewed_at)`),
    // Phòng ban (mỗi phòng chọn một công thức lương, thưởng, KPI) và chức danh tự tạo của phòng
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      formula TEXT NOT NULL DEFAULT 'none',
      description TEXT NOT NULL DEFAULT '',
      sort INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS dept_titles (
      id TEXT PRIMARY KEY,
      dept_id TEXT NOT NULL REFERENCES departments(id),
      name TEXT NOT NULL,
      mgr INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_kpis_period ON kpis(year, month)`)
  ]);
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (!c.n) {
    await env.DB.prepare(`INSERT INTO users (email,name,title,app_role,salary_w,pw_hash,must_change,created_at)
      VALUES (?1,?2,?3,'admin',0,?4,1,?5)`).bind(SEED_ADMIN.email, SEED_ADMIN.name, SEED_ADMIN.title, SEED_ADMIN.hash, now()).run();
  }
  // Nâng cấp cấu trúc cho dữ liệu đã có (bỏ qua nếu cột đã tồn tại)
  for (const sql of ['ALTER TABLE users ADD COLUMN cb_ratio REAL', 'ALTER TABLE kpis ADD COLUMN cb REAL', 'ALTER TABLE sessions ADD COLUMN last_seen INTEGER',
    'ALTER TABLE users ADD COLUMN phone TEXT', 'ALTER TABLE users ADD COLUMN contact_email TEXT', 'ALTER TABLE users ADD COLUMN dept_id TEXT']) {
    try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
  }
  // Lần đầu có phòng ban: tạo Phòng Kinh doanh, chuyển nhân viên đang có chức danh kinh doanh vào phòng này
  const dc = await env.DB.prepare('SELECT COUNT(*) AS n FROM departments').first();
  if (!dc.n) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO departments (id,name,formula,sort,active,created_at) VALUES (?1,?2,?3,0,1,?4)').bind(DEFAULT_DEPT.id, DEFAULT_DEPT.name, DEFAULT_DEPT.formula, now()),
      env.DB.prepare(`UPDATE users SET dept_id=?1 WHERE dept_id IS NULL AND title IN (${SALES_TITLES.map((x) => `'${x}'`).join(',')})`).bind(DEFAULT_DEPT.id)
    ]);
  }
  schemaReady = true;
}

const USER_COLS = 'id,email,name,dept_id,title,app_role,manager_id,salary_w,cb_ratio,start_date,active,must_change,phone,contact_email';

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
// Phiên hết hạn khi quá hạn tuyệt đối (session_days) hoặc không hoạt động quá idle_minutes (0 = tắt).
// last_seen được cập nhật khi người dùng thao tác (mọi lời gọi API, tối đa 1 lần / 30 giây).
async function currentUser(env, req, url) {
  const tok = getCookie(req, 'rs_sid');
  if (!tok) return null;
  const th = await sha256hex(tok), t = now();
  const row = await env.DB.prepare(`SELECT u.*, s.last_seen AS _seen FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.active = 1`).bind(th, t).first();
  if (!row) return null;
  const cfg = await getSettings(env);
  const idle = intSetting(cfg.idle_minutes, 0, 0, 1440);
  if (idle && row._seen && t - row._seen > idle * 60) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(th).run();
    return null;
  }
  const passive = url && url.pathname === '/api/session';          // chỉ kiểm tra, không tính là thao tác
  if (!passive && (!row._seen || t - row._seen >= 30)) await env.DB.prepare('UPDATE sessions SET last_seen=?1 WHERE token_hash=?2').bind(t, th).run();
  delete row._seen;
  return row;
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
  // Thông tin công ty: hiện ở slide cuối proposal, tên người gửi và chữ ký email
  company_short: 'Redsun', company_address: 'Tầng 7, 159 Điện Biên Phủ, P. Gia Định, TP.HCM',
  company_phone: '(+84-28) 7301 5630', company_hotline: '', company_email: 'kinhdoanh@redsun.vn', company_website: 'redsun.vn',
  // Bản tiếng Anh (dùng cho proposal EN; để trống = dùng bản tiếng Việt)
  company_name_en: 'Redsun Technology Investment Company', company_address_en: '7th Floor, 159 Dien Bien Phu, Gia Dinh Ward, Ho Chi Minh City, Vietnam',
  smtp_host: '', smtp_port: '587', smtp_security: 'starttls', smtp_user: '', smtp_pass: '',
  smtp_from_email: '', smtp_from_name: 'Redsun Sales',
  survey_recipients: '', survey_cc: '', survey_bcc: '', survey_cc_sales: '1', survey_include_internal: '1',
  survey_subject_prefix: '[Khảo sát]',
  session_days: '7', max_fails: '8', lock_minutes: '15',
  idle_minutes: '0', login_notify: '0', login_notify_bcc: '', login_notify_subject: ''
};
let settingsCache = null, settingsAt = 0;
async function getSettings(env, fresh) {
  if (!fresh && settingsCache && Date.now() - settingsAt < 15000) return { ...settingsCache };
  const r = await env.DB.prepare('SELECT key, value FROM settings').all();
  const out = { ...SETTING_DEFAULTS };
  for (const x of r.results) if (x.key in SETTING_DEFAULTS) out[x.key] = x.value ?? '';
  settingsCache = out; settingsAt = Date.now();
  return { ...out };
}
async function setSettings(env, obj) {
  const stmts = Object.entries(obj).map(([k, v]) => env.DB.prepare('INSERT INTO settings (key,value) VALUES (?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, String(v)));
  if (stmts.length) await env.DB.batch(stmts);
  settingsCache = null;
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
async function sendMail(env, cfg, { to, cc = [], bcc = [], subject, html, text, replyTo, fromName }) {
  const mode = mailReady(env, cfg);
  if (!mode) throw new Error('Chưa cấu hình máy chủ gửi email (SMTP). Admin vào tab Cài đặt để thiết lập.');
  if (mode === 'log') { console.log('[MAIL]', JSON.stringify({ fromName: fromName || cfg.smtp_from_name, to, cc, bcc, subject, replyTo, chars: (html || '').length })); return; }
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
      from: { name: fromName || cfg.smtp_from_name || cfg.company_name, email: cfg.smtp_from_email.trim() },
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

const LOGIN_SUBJECT_DEFAULT = 'Thông báo đăng nhập tài khoản {email} của {ten_mien}';
async function notifyLogin(env, cfg, u, req) {
  if (!mailReady(env, cfg)) return;
  const to = parseEmails(u.email); if (!to.length) return;
  const bcc = parseEmails(cfg.login_notify_bcc).filter((e) => !to.includes(e));
  const cf = req.cf || {};
  const ip = req.headers.get('cf-connecting-ip') || '';
  const where = [cf.city, cf.region, cf.country].filter(Boolean).join(', ');
  const ua = (req.headers.get('user-agent') || '').slice(0, 300);
  const when = fmtTs(now());
  const e = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const host = new URL(req.url).host;
  const rows = [['Tài khoản', `${u.name} (${u.email})`], ['Thời gian', when], ['Địa chỉ IP', ip || '—'], ['Vị trí (ước tính)', where || '—'], ['Thiết bị / trình duyệt', ua || '—']];
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;max-width:560px">
    <p style="margin:0 0 12px"><b>${e(cfg.company_name)}</b> – thông báo đăng nhập</p>
    <p style="margin:0 0 12px">Tài khoản của bạn vừa đăng nhập vào <b>${e(host)}</b>.</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;width:38%;color:#475569">${e(k)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${e(v)}</td></tr>`).join('')}</table>
    <p style="margin:14px 0 0;color:#b91c1c"><b>Nếu không phải bạn đăng nhập</b>, hãy đổi mật khẩu ngay và báo Admin.</p></div>`;
  const text = `Tài khoản của bạn vừa đăng nhập vào ${host}.\n` + rows.map(([k, v]) => `- ${k}: ${v}`).join('\n') + '\nNếu không phải bạn, hãy đổi mật khẩu ngay và báo Admin.';
  // Tiêu đề: theo Cài đặt (có thể dùng {email}, {ten}, {ten_mien}, {thoi_gian}); để trống thì dùng mặc định
  const tplSubj = (cfg.login_notify_subject || '').trim() || LOGIN_SUBJECT_DEFAULT;
  const subject = tplSubj.replace(/\{email\}/g, u.email).replace(/\{ten\}/g, u.name).replace(/\{ten_mien\}/g, host).replace(/\{thoi_gian\}/g, when).slice(0, 200);
  await sendMail(env, cfg, { to, bcc, subject, html, text });
}

async function emailSurvey(env, url, row, owner) {
  const cfg = await getSettings(env);
  const tpl = getTemplate(row.template_id);
  const ans = JSON.parse(row.answers || '{}');
  // Người nhận chính luôn là người lập phiếu; CC/BCC (tùy chọn) do Admin cài đặt
  const ownerEmail = owner && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email) ? owner.email.toLowerCase() : null;
  const to = ownerEmail ? [ownerEmail] : [];
  const cc = parseEmails(cfg.survey_cc).filter((e) => !to.includes(e));
  const bcc = parseEmails(cfg.survey_bcc).filter((e) => !to.includes(e) && !cc.includes(e));
  let status, error = null;
  if (!to.length) { status = 'no_recipients'; error = 'Tài khoản người lập phiếu chưa có email hợp lệ.'; }
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
    .bind(status, error, to.join(', '), row.id).run();
  return { email_status: status, email_error: error, email_to: to.join(', ') };
}
async function canViewSurvey(env, me, row) {
  return row.user_id === me.id || me.app_role === 'admin' || (me.app_role === 'manager' && (await subtreeIds(env, me.id)).has(row.user_id));
}

/* ---------------------------- Tài liệu nội bộ ---------------------------- */
const DOC_MAX_MB = 25, DOC_CHUNK = 1024 * 1024;
function docMeta(b) {
  const title = String(b.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const group_name = String(b.group_name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const description = String(b.description ?? '').trim().slice(0, 2000);
  if (!title) return { error: 'Chưa nhập tên tài liệu.' };
  return { title, group_name, description };
}

/* ---------------------------- Proposal ---------------------------- */
const escH = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const fmtDay = (ts) => ts ? new Date(ts * 1000).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
const fmtDayEn = (ts) => ts ? new Date(ts * 1000).toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'long', year: 'numeric' }) : '';
const FIELD_KEYS = { kh: 160, nguoi: 120, tv: 80, cv: 80, sdt: 40, email: 120, ct: 160, ctdc: 200, ctdt: 100, cthl: 40, ctemail: 120, ctweb: 120 };
function cleanFields(f) {
  const out = {};
  for (const [k, n] of Object.entries(FIELD_KEYS)) { const v = clip(f && f[k], n); if (v) out[k] = v; }
  return out;
}
const shareLink = (url, token) => `${url.origin}/p/${token}/`;
function shareView(r, url) {
  const p = getProposal(r.proposal_id);
  return { id: r.id, proposal_id: r.proposal_id, proposal_title: p ? p.short : r.proposal_id, user_id: r.user_id, user_name: r.user_name,
    customer_company: r.customer_company, customer_name: r.customer_name, customer_email: r.customer_email, cc: r.cc,
    email_status: r.email_status, email_error: r.email_error, sent_at: r.sent_at, created_at: r.created_at, expires_at: r.expires_at,
    revoked: !!r.revoked, expired: r.expires_at < now(), views: r.views, first_viewed_at: r.first_viewed_at, last_viewed_at: r.last_viewed_at,
    link: shareLink(url, r.token) };
}
async function canSeeShare(env, me, row) {
  return row.user_id === me.id || me.app_role === 'admin' || (me.app_role === 'manager' && (await subtreeIds(env, me.id)).has(row.user_id));
}
// Thông tin điền vào proposal: nhân viên (từ hồ sơ trong tab Nhân viên) + công ty (tab Cài đặt) + khách hàng
const staffTitle = (u, lang = 'vi') => {
  const t = u.title && u.title !== 'other' && TITLES[u.title];
  if (lang === 'en') return t ? t.en : 'Solution Consultant';
  return t ? t.name.replace(/\s*\(.*\)$/, '') : 'Chuyên viên tư vấn';
};
const staffEmail = (u) => parseEmails(u.contact_email || '')[0] || parseEmails(u.email || '')[0] || '';
const propLang = (p) => (p && p.lang === 'en' ? 'en' : 'vi');
function proposalFields(cfg, u, extra = {}, lang = 'vi') {
  const en = lang === 'en';
  const phoneLine = [cfg.company_phone, cfg.company_hotline ? 'Hotline ' + cfg.company_hotline : ''].filter(Boolean).join(' · ');
  return cleanFields({
    ...extra,
    tv: u.name, cv: staffTitle(u, lang), sdt: u.phone || '', email: staffEmail(u),
    ct: (en && cfg.company_name_en) || cfg.company_name, ctdc: (en && cfg.company_address_en) || cfg.company_address,
    ctdt: phoneLine, cthl: cfg.company_hotline || cfg.company_phone,
    ctemail: cfg.company_email, ctweb: cfg.company_website
  });
}
// Chữ ký email proposal
function proposalSignature(cfg, f) {
  return [
    [f.tv, f.cv].filter(Boolean).join(' - '),
    [f.sdt, f.email].filter(Boolean).join(' - '),
    f.ct,
    f.ctdc,
    [f.ctemail, f.ctweb].filter(Boolean).join(' - ')
  ].filter(Boolean);
}
// Email gửi khách: chỉ có đường dẫn xem proposal (bản không ghi chú; khách tự tải PDF trên trang)
async function emailProposal(env, url, row, owner) {
  const cfg = await getSettings(env);
  const p = getProposal(row.proposal_id);
  const f = JSON.parse(row.fields || '{}');
  const to = parseEmails(row.customer_email);
  const ownerEmail = f.email || staffEmail(owner);
  // CC: người gửi + CC nhập khi gửi + "Email nhận bản copy" (Cài đặt mục 3); BCC: theo Cài đặt
  const cc = [...new Set([...(ownerEmail ? [ownerEmail] : []), ...parseEmails(row.cc), ...parseEmails(cfg.survey_cc)])].filter((e) => !to.includes(e));
  const bcc = [...new Set(parseEmails(cfg.survey_bcc))].filter((e) => !to.includes(e) && !cc.includes(e));
  const link = shareLink(url, row.token);
  const en = propLang(p) === 'en';
  const name = (p.short || '').replace(/\s*\((VN|EN)\)$/, '');
  const co = cfg.company_short || cfg.company_name;
  const khach = row.customer_company || row.customer_name || (en ? 'your company' : 'Quý khách');
  const subject = (p.email_subject || p.title).replace(/\{khach\}/g, khach).slice(0, 200);
  const day = en ? fmtDayEn(row.expires_at) : fmtDay(row.expires_at);
  const T = en ? {
    greet: row.customer_name ? `Dear ${row.customer_name},` : 'Dear Sir/Madam,',
    msg: `Thank you for your interest in ${co}'s solutions. Please find our ${name} proposal for your review.`,
    btn: `View the ${name} proposal`,
    note: `On the proposal page you can present it or click <b>Download PDF</b> to save a copy. The link is valid until <b>${day}</b>.`,
    alt: 'If the button does not work, open this link:', bye: 'Best regards,',
    textLink: `View the ${name} proposal`, textNote: `The link is valid until ${day}. Use the Download PDF button on the page to save a copy.`
  } : {
    greet: row.customer_name ? `Kính gửi ${row.customer_name},` : 'Kính gửi Quý khách,',
    msg: `Cảm ơn Quý khách đã quan tâm đến giải pháp của ${co}. Chúng tôi xin gửi Quý khách bản đề xuất ${name} để tham khảo.`,
    btn: `Xem đề xuất ${name}`,
    note: `Trên trang đề xuất, Quý khách có thể trình chiếu hoặc bấm <b>Tải PDF</b> để lưu bản PDF. Đường dẫn có hiệu lực đến <b>${day}</b>.`,
    alt: 'Nếu nút không hoạt động, Quý khách mở đường dẫn:', bye: 'Trân trọng,',
    textLink: `Xem đề xuất ${name}`, textNote: `Đường dẫn có hiệu lực đến ${day}. Trên trang có nút Tải PDF.`
  };
  const greet = T.greet;
  const msg = row.message || T.msg;
  const sign = proposalSignature(cfg, f);
  const fromName = `${f.tv || owner.name} - ${co}`.replace(/["\r\n]/g, '').slice(0, 120);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;max-width:600px">
    <p style="margin:0 0 14px">${escH(greet)}</p>
    ${msg.split(/\n+/).map((x) => `<p style="margin:0 0 12px">${escH(x)}</p>`).join('')}
    <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#BA0000;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:8px">${escH(T.btn)}</a></p>
    <p style="margin:0 0 6px;font-size:13px;color:#475569">${T.note}</p>
    <p style="margin:0 0 18px;font-size:13px;color:#475569">${T.alt} <a href="${link}">${link}</a></p>
    <p style="margin:0">${T.bye}</p>
    <div style="margin:10px 0 0;padding-top:10px;border-top:3px solid #EDAD32;font-size:14px;line-height:1.55;color:#334155">${sign.map((x, k) => k === 0 ? `<b style="color:#003049">${escH(x)}</b>` : k === 2 ? `<b style="color:#BA0000">${escH(x)}</b>` : escH(x)).join('<br>')}</div></div>`;
  const text = `${greet}\n\n${msg}\n\n${T.textLink}: ${link}\n${T.textNote}\n\n${T.bye}\n${sign.join('\n')}`;
  let status, error = null;
  if (!to.length) { status = 'no_recipients'; error = 'Chưa có email khách hàng hợp lệ.'; }
  else {
    try {
      await sendMail(env, cfg, { to, cc, bcc, subject, html, text, replyTo: ownerEmail || undefined, fromName });
      status = mailReady(env, cfg) === 'log' ? 'sent_test' : 'sent';
    } catch (e) { status = /Chưa cấu hình/.test(e.message) ? 'not_configured' : 'failed'; error = String(e.message || e).slice(0, 300); }
  }
  const ok = status === 'sent' || status === 'sent_test';
  await env.DB.prepare('UPDATE proposal_shares SET email_status=?1, email_error=?2, sent_at=CASE WHEN ?3 THEN ?4 ELSE sent_at END WHERE id=?5')
    .bind(status, error, ok ? 1 : 0, now(), row.id).run();
  return { email_status: status, email_error: error };
}
// Trang công khai /p/<mã>/…: bản gửi khách (không ghi chú) của một lần chia sẻ
async function servePublicProposal(req, env, url, me) {
  const parts = url.pathname.split('/');            // ['', 'p', mã | _shared, ...]
  const seg = parts[2] || '', rest = parts.slice(3).join('/');
  const noStore = { 'cache-control': 'no-store' };
  const notFound = () => withHeaders(new Response('Không tìm thấy.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } }), noStore);
  if (seg === '_shared') {                          // thư viện, font, CSS dùng chung (không chứa nội dung proposal)
    if (!rest || rest.includes('..')) return notFound();
    return withHeaders(await env.ASSETS.fetch(new Request(new URL('/proposal/_shared/' + rest, url), req)), { 'cache-control': 'public, max-age=86400' });
  }
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(seg)) return notFound();
  const row = await env.DB.prepare(`SELECT s.*, u.name AS user_name, u.email AS user_email FROM proposal_shares s JOIN users u ON u.id=s.user_id WHERE s.token=?1`).bind(seg).first();
  const p = row && getProposal(row.proposal_id);
  if (!row || !p) return notFound();
  if (parts.length === 3) return Response.redirect(new URL(`/p/${seg}/`, url), 301);
  if (row.revoked || row.expires_at < now()) {
    const f = JSON.parse(row.fields || '{}');
    const who = [f.tv || row.user_name, f.sdt, f.email || row.user_email].filter(Boolean).map(escH).join(' · ');
    const en = propLang(p) === 'en';
    const h1 = en ? `This proposal link has ${row.revoked ? 'been withdrawn' : 'expired'}` : `Đường dẫn đề xuất đã ${row.revoked ? 'được thu hồi' : 'hết hạn'}`;
    const sub = en ? 'Please contact your consultant for the latest version of the proposal.' : 'Vui lòng liên hệ chuyên viên tư vấn để nhận bản đề xuất mới nhất.';
    const page = `<!DOCTYPE html><html lang="${en ? 'en' : 'vi'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escH(p.title)}</title></head>
      <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#003049;color:#F7F5F0;font-family:Arial,Helvetica,sans-serif;padding:24px">
      <div style="max-width:560px"><div style="width:56px;height:6px;background:#EDAD32;margin-bottom:20px"></div>
      <h1 style="font-size:26px;margin:0 0 12px">${h1}</h1>
      <p style="font-size:16px;line-height:1.6;color:#C9D6DE;margin:0 0 16px">${sub}</p>
      <p style="font-size:16px;line-height:1.6;margin:0">${who}</p></div></body></html>`;
    return withHeaders(new Response(page, { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } }), noStore);
  }
  if (rest && rest !== 'index.html') {
    if (!rest.startsWith('assets/') || rest.includes('..')) return notFound();
    return withHeaders(await env.ASSETS.fetch(new Request(new URL(`/proposal/${p.id}/${rest}`, url), req)), { 'cache-control': 'private, max-age=3600' });
  }
  const res = await env.ASSETS.fetch(new Request(new URL(`/proposal/${p.id}/client`, url), { method: 'GET' }));
  if (!res.ok) return withHeaders(new Response('Không tải được đề xuất.', { status: 502 }), noStore);
  const inject = `<script>window.RS_LOCKED=true;window.RS_FIELDS=${JSON.stringify(JSON.parse(row.fields || '{}')).replace(/</g, '\\u003c')};</script>`;
  const page = (await res.text()).replace('<script src="../_shared/viewer.js">', inject + '<script src="../_shared/viewer.js">');
  if (!me && req.method === 'GET') {                // không tính lượt xem khi nhân viên (đang đăng nhập) mở thử
    const t = now();
    await env.DB.prepare('UPDATE proposal_shares SET views=views+1, last_viewed_at=?1, first_viewed_at=COALESCE(first_viewed_at, ?1) WHERE id=?2').bind(t, row.id).run();
  }
  return withHeaders(new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } }), noStore);
}

/* ---------------------------- API ---------------------------- */
async function api(req, env, url, me, ctx) {
  const p = url.pathname, method = req.method;
  let body = {};
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== url.host) return bad('Yêu cầu không hợp lệ.', 403);
    if (method !== 'DELETE' && !/^\/api\/docs\/\d+\/file$/.test(p)) {   // DELETE và tải file PDF (nội dung nhị phân) không đọc JSON; vẫn chặn khác nguồn ở trên
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
      env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,last_seen) VALUES (?1,?2,?3,?4)').bind(await sha256hex(tok), u.id, now() + SESSION_DAYS * 86400, now()),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now())
    ]);
    if (cfg.login_notify === '1' && ctx) ctx.waitUntil(notifyLogin(env, cfg, u, req).catch((e) => console.error('login notify', e)));
    return json({ ok: true, must_change: !!u.must_change }, 200, { 'set-cookie': cookie(tok, SESSION_DAYS * 86400) });
  }
  if (p === '/api/logout' && method === 'POST') {
    const tok = getCookie(req, 'rs_sid');
    if (tok) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(await sha256hex(tok)).run();
    return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  }

  if (!me) return bad('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
  if (p === '/api/ping' && method === 'POST') return json({ ok: true });            // ghi nhận người dùng còn thao tác
  if (p === '/api/session' && method === 'GET') return json({ ok: true });         // kiểm tra phiên còn hiệu lực

  /* ----- Bản thân ----- */
  if (p === '/api/me' && method === 'GET') {
    const mgr = me.manager_id ? await env.DB.prepare('SELECT id,name,email FROM users WHERE id=?1').bind(me.manager_id).first() : null;
    const cfg = await getSettings(env);
    const org = await loadOrg(env);
    return json({ user: publicUser(me), manager: mgr, titles: org.titles, departments: org.departments, formulas: formulasPublic(),
      company: cfg.company_name, idle_minutes: intSetting(cfg.idle_minutes, 0, 0, 1440) });
  }

  /* ----- Phòng ban & chức danh ----- */
  if (p === '/api/org' && method === 'GET') {
    const org = await loadOrg(env);
    return json({ departments: org.departments, titles: org.titles, formulas: formulasPublic() });
  }
  if (p.startsWith('/api/org/') && me.must_change) return bad('Bạn cần đổi mật khẩu trước khi tiếp tục.', 403);
  if (p.startsWith('/api/org/') && me.app_role !== 'admin') return bad('Chỉ Admin được quản lý phòng ban và chức danh.', 403);
  if (p === '/api/org/departments' && method === 'POST') {
    const name = String(body.name || '').trim().slice(0, 80), formula = FORMULAS[body.formula] ? body.formula : 'none';
    if (!name) return bad('Chưa nhập tên phòng ban.');
    const org = await loadOrg(env);
    if (org.departments.some((x) => x.name.toLowerCase() === name.toLowerCase())) return bad('Đã có phòng ban tên này.');
    let id = slugId(name) || 'phong'; const base = id; let i = 2;
    while (org.deptById[id]) id = `${base}-${i++}`;
    await env.DB.prepare('INSERT INTO departments (id,name,formula,description,sort,active,created_at) VALUES (?1,?2,?3,?4,?5,1,?6)')
      .bind(id, name, formula, String(body.description || '').trim().slice(0, 500), org.departments.length, now()).run();
    return json({ ok: true, id });
  }
  let om = p.match(/^\/api\/org\/departments\/([a-z0-9-]+)$/);
  if (om && (method === 'PUT' || method === 'DELETE')) {
    const org = await loadOrg(env), d = org.deptById[om[1]];
    if (!d) return bad('Không tìm thấy phòng ban.', 404);
    const all = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE dept_id=?1').bind(d.id).first();
    if (method === 'DELETE') {
      if (all.n) return bad(`Phòng ban còn ${all.n} nhân viên (kể cả tài khoản đã khóa). Hãy chuyển họ sang phòng khác trước khi xóa.`);
      await env.DB.batch([env.DB.prepare('DELETE FROM dept_titles WHERE dept_id=?1').bind(d.id), env.DB.prepare('DELETE FROM departments WHERE id=?1').bind(d.id)]);
      return json({ ok: true });
    }
    const name = body.name === undefined ? d.name : String(body.name || '').trim().slice(0, 80);
    const formula = body.formula === undefined ? d.formula : (FORMULAS[body.formula] ? body.formula : null);
    if (!name) return bad('Chưa nhập tên phòng ban.');
    if (!formula) return bad('Công thức không hợp lệ.');
    if (org.departments.some((x) => x.id !== d.id && x.name.toLowerCase() === name.toLowerCase())) return bad('Đã có phòng ban tên này.');
    if (formula !== d.formula && all.n) return bad(`Phòng ban đang có ${all.n} nhân viên nên chưa đổi được công thức (chức danh của họ gắn với công thức cũ). Hãy chuyển nhân viên sang phòng khác hoặc tạo phòng mới.`);
    const active = body.active === undefined ? (d.active ? 1 : 0) : (body.active ? 1 : 0);
    const sort = body.sort === undefined ? d.sort : Math.max(0, Math.min(999, Math.round(+body.sort || 0)));
    await env.DB.prepare('UPDATE departments SET name=?1, formula=?2, description=?3, active=?4, sort=?5 WHERE id=?6')
      .bind(name, formula, body.description === undefined ? d.description : String(body.description || '').trim().slice(0, 500), active, sort, d.id).run();
    return json({ ok: true });
  }
  om = p.match(/^\/api\/org\/departments\/([a-z0-9-]+)\/titles$/);
  if (om && method === 'POST') {
    const org = await loadOrg(env), d = org.deptById[om[1]];
    if (!d) return bad('Không tìm thấy phòng ban.', 404);
    if ((FORMULAS[d.formula] || {}).titles) return bad('Chức danh của phòng này lấy theo công thức, không thêm tay được.');
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) return bad('Chưa nhập tên chức danh.');
    if (deptTitleKeys(org, d).some((k) => org.titles[k].name.toLowerCase() === name.toLowerCase())) return bad('Phòng ban đã có chức danh này.');
    const id = 't-' + hex(crypto.getRandomValues(new Uint8Array(5)));
    await env.DB.prepare('INSERT INTO dept_titles (id,dept_id,name,mgr,sort,active,created_at) VALUES (?1,?2,?3,?4,?5,1,?6)')
      .bind(id, d.id, name, body.mgr ? 1 : 0, deptTitleKeys(org, d).length, now()).run();
    return json({ ok: true, id });
  }
  om = p.match(/^\/api\/org\/titles\/(t-[a-f0-9]+)$/);
  if (om && (method === 'PUT' || method === 'DELETE')) {
    const t = await env.DB.prepare('SELECT * FROM dept_titles WHERE id=?1').bind(om[1]).first();
    if (!t) return bad('Không tìm thấy chức danh.', 404);
    const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE title=?1').bind(t.id).first();
    if (method === 'DELETE') {
      if (used.n) return bad(`Chức danh đang gán cho ${used.n} nhân viên (kể cả tài khoản đã khóa). Hãy đổi chức danh của họ trước khi xóa.`);
      await env.DB.prepare('DELETE FROM dept_titles WHERE id=?1').bind(t.id).run();
      return json({ ok: true });
    }
    const name = body.name === undefined ? t.name : String(body.name || '').trim().slice(0, 80);
    if (!name) return bad('Chưa nhập tên chức danh.');
    const dup = await env.DB.prepare('SELECT id FROM dept_titles WHERE dept_id=?1 AND lower(name)=lower(?2) AND id<>?3').bind(t.dept_id, name, t.id).first();
    if (dup) return bad('Phòng ban đã có chức danh này.');
    await env.DB.prepare('UPDATE dept_titles SET name=?1, mgr=?2 WHERE id=?3').bind(name, body.mgr === undefined ? t.mgr : (body.mgr ? 1 : 0), t.id).run();
    return json({ ok: true });
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
    const r = await env.DB.prepare(`INSERT INTO users (email,name,title,app_role,manager_id,salary_w,cb_ratio,start_date,active,pw_hash,must_change,created_at,phone,contact_email,dept_id)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,1,?9,1,?10,?11,?12,?13)`)
      .bind(v.email, v.name, v.title, v.app_role, v.manager_id, v.salary_w, v.cb_ratio, v.start_date, await hashPassword(pw), now(), v.phone, v.contact_email, v.dept_id).run();
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
      await env.DB.prepare(`INSERT INTO users (email,name,title,app_role,salary_w,cb_ratio,start_date,active,pw_hash,must_change,created_at,phone,contact_email,dept_id)
          VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8,1,?9,?10,?11,?12)`)
        .bind(v.email, v.name, v.title, v.app_role, v.salary_w, v.cb_ratio, v.start_date, await hashPassword(pw), now(), v.phone, v.contact_email, v.dept_id).run();
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
    const stmts = [env.DB.prepare(`UPDATE users SET email=?1,name=?2,title=?3,app_role=?4,manager_id=?5,salary_w=?6,cb_ratio=?7,start_date=?8,active=?9,phone=?11,contact_email=?12,dept_id=?13 WHERE id=?10`)
      .bind(v.email, v.name, v.title, v.app_role, v.manager_id, v.salary_w, v.cb_ratio, v.start_date, active, id, v.phone, v.contact_email, v.dept_id)];
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
      if (!SALES_TITLES.includes(u.title)) return bad(`${u.name} thuộc phòng ban chưa có công thức KPI, chưa giao KPI được.`);
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
    return json({ cc: parseEmails(cfg.survey_cc), has_bcc: parseEmails(cfg.survey_bcc).length > 0,
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
      for (const [k, n] of [['company_short', 60], ['company_address', 200], ['company_name_en', 120], ['company_address_en', 200],['company_phone', 40], ['company_hotline', 40], ['company_website', 120]]) if (k in b) upd[k] = str(b[k], n);
      if ('company_email' in b) { const v = normEmail(b.company_email); if (v && !parseEmails(v).length) return bad('Email công ty không hợp lệ.'); upd.company_email = v; }
      if ('smtp_host' in b) { const v = str(b.smtp_host, 200); if (v && !/^[a-z0-9.-]+$/i.test(v)) return bad('Máy chủ SMTP không hợp lệ.'); upd.smtp_host = v; }
      if ('smtp_port' in b) { const v = parseInt(b.smtp_port, 10); if (!(v > 0 && v < 65536)) return bad('Cổng SMTP không hợp lệ.'); if (v === 25) return bad('Cloudflare chặn cổng 25. Dùng 587 hoặc 465.'); upd.smtp_port = String(v); }
      if ('smtp_security' in b) { if (!['ssl', 'starttls', 'none'].includes(b.smtp_security)) return bad('Kiểu bảo mật không hợp lệ.'); upd.smtp_security = b.smtp_security; }
      if ('smtp_user' in b) upd.smtp_user = str(b.smtp_user, 200);
      if (b.smtp_pass_clear) upd.smtp_pass = '';
      else if (b.smtp_pass) upd.smtp_pass = await sealSecret(env, String(b.smtp_pass).slice(0, 500));
      if ('smtp_from_email' in b) { const v = normEmail(b.smtp_from_email); if (v && !parseEmails(v).length) return bad('Email người gửi không hợp lệ.'); upd.smtp_from_email = v; }
      if ('smtp_from_name' in b) upd.smtp_from_name = str(b.smtp_from_name, 120);
      for (const k of ['survey_cc', 'survey_bcc']) if (k in b) {
        const list = parseEmails(b[k]); if (list.length > 30) return bad('Mỗi danh sách tối đa 30 email.'); upd[k] = list.join(',');
      }
      if ('survey_include_internal' in b) upd.survey_include_internal = b.survey_include_internal ? '1' : '0';
      if ('survey_subject_prefix' in b) upd.survey_subject_prefix = str(b.survey_subject_prefix, 60);
      if ('session_days' in b) upd.session_days = String(intSetting(b.session_days, 7, 1, 90));
      if ('max_fails' in b) upd.max_fails = String(intSetting(b.max_fails, 8, 3, 50));
      if ('lock_minutes' in b) upd.lock_minutes = String(intSetting(b.lock_minutes, 15, 1, 1440));
      if ('idle_minutes' in b) { let v = intSetting(b.idle_minutes, 0, 0, 1440); if (v > 0 && v < 2) v = 2; upd.idle_minutes = String(v); }
      if ('login_notify' in b) upd.login_notify = b.login_notify ? '1' : '0';
      if ('login_notify_subject' in b) upd.login_notify_subject = str(b.login_notify_subject, 200);
      if ('login_notify_bcc' in b) { const v = normEmail(b.login_notify_bcc); if (v && parseEmails(v).length !== 1) return bad('Email nhận bản BCC thông báo đăng nhập không hợp lệ (chỉ 1 email).'); upd.login_notify_bcc = v; }
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

  /* ----- Tài liệu nội bộ (PDF chỉ đọc trong tool, ghi lại lượt xem) ----- */
  if (p === '/api/docs' && method === 'GET') {
    const r = await env.DB.prepare(`SELECT d.id, d.title, d.group_name, d.description, d.file_name, d.file_size, d.chunks, d.file_rev,
        d.created_at, d.updated_at, d.file_updated_at, cu.name AS created_by_name, uu.name AS updated_by_name,
        (SELECT COUNT(*) FROM doc_views v WHERE v.doc_id = d.id) AS views,
        (SELECT COUNT(DISTINCT v.user_id) FROM doc_views v WHERE v.doc_id = d.id) AS viewers,
        (SELECT MAX(v.viewed_at) FROM doc_views v WHERE v.doc_id = d.id AND v.user_id = ?1) AS my_last_view
      FROM docs d LEFT JOIN users cu ON cu.id = d.created_by LEFT JOIN users uu ON uu.id = d.updated_by
      ORDER BY d.group_name COLLATE NOCASE, d.updated_at DESC`).bind(me.id).all();
    return json({ docs: r.results, can_manage: me.app_role === 'admin', max_mb: DOC_MAX_MB });
  }
  if (p === '/api/docs' && method === 'POST') {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được đăng tài liệu.', 403);
    const v = docMeta(body); if (v.error) return bad(v.error);
    const t = now();
    const r = await env.DB.prepare(`INSERT INTO docs (title, group_name, description, created_by, created_at, updated_by, updated_at) VALUES (?1,?2,?3,?4,?5,?4,?5)`)
      .bind(v.title, v.group_name, v.description, me.id, t).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  m = p.match(/^\/api\/docs\/(\d+)$/);
  if (m && (method === 'PUT' || method === 'DELETE')) {
    if (me.app_role !== 'admin') return bad('Chỉ Admin được sửa tài liệu.', 403);
    const id = +m[1];
    const d = await env.DB.prepare('SELECT id FROM docs WHERE id=?1').bind(id).first();
    if (!d) return bad('Không tìm thấy tài liệu.', 404);
    if (method === 'DELETE') {
      await env.DB.batch([env.DB.prepare('DELETE FROM doc_chunks WHERE doc_id=?1').bind(id), env.DB.prepare('DELETE FROM doc_views WHERE doc_id=?1').bind(id),
        env.DB.prepare('DELETE FROM docs WHERE id=?1').bind(id)]);
      return json({ ok: true });
    }
    const v = docMeta(body); if (v.error) return bad(v.error);
    await env.DB.prepare('UPDATE docs SET title=?1, group_name=?2, description=?3, updated_by=?4, updated_at=?5 WHERE id=?6')
      .bind(v.title, v.group_name, v.description, me.id, now(), id).run();
    return json({ ok: true });
  }
  m = p.match(/^\/api\/docs\/(\d+)\/file$/);
  if (m && method === 'PUT') {                      // Admin tải lên / thay file PDF (nội dung nhị phân)
    if (me.app_role !== 'admin') return bad('Chỉ Admin được tải tài liệu lên.', 403);
    const id = +m[1];
    const d = await env.DB.prepare('SELECT id, file_rev FROM docs WHERE id=?1').bind(id).first();
    if (!d) return bad('Không tìm thấy tài liệu.', 404);
    if (!/application\/pdf/.test(req.headers.get('content-type') || '')) return bad('Chỉ nhận file PDF.', 415);
    const declared = +(req.headers.get('content-length') || 0);
    if (declared > DOC_MAX_MB * 1048576) return bad(`File vượt quá ${DOC_MAX_MB} MB.`, 413);
    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.length) return bad('File rỗng.');
    if (buf.length > DOC_MAX_MB * 1048576) return bad(`File vượt quá ${DOC_MAX_MB} MB.`, 413);
    if (String.fromCharCode(...buf.subarray(0, 5)) !== '%PDF-') return bad('File không phải PDF hợp lệ.');
    const rev = d.file_rev + 1, n = Math.ceil(buf.length / DOC_CHUNK);
    const name = String(decodeURIComponent(req.headers.get('x-file-name') || 'tai-lieu.pdf')).replace(/[\r\n"\\/]/g, '').slice(0, 160);
    const ins = [];
    for (let k = 0; k < n; k++) ins.push(env.DB.prepare('INSERT INTO doc_chunks (doc_id, rev, seq, data) VALUES (?1,?2,?3,?4)').bind(id, rev, k, buf.subarray(k * DOC_CHUNK, (k + 1) * DOC_CHUNK)));
    for (let k = 0; k < ins.length; k += 10) await env.DB.batch(ins.slice(k, k + 10));      // ghi khúc mới trước, đổi bản sau cùng
    const t = now();
    await env.DB.batch([
      env.DB.prepare('UPDATE docs SET file_name=?1, file_size=?2, chunks=?3, file_rev=?4, file_updated_at=?5, updated_at=?5, updated_by=?6 WHERE id=?7').bind(name, buf.length, n, rev, t, me.id, id),
      env.DB.prepare('DELETE FROM doc_chunks WHERE doc_id=?1 AND rev<>?2').bind(id, rev)]);
    return json({ ok: true, size: buf.length });
  }
  if (m && method === 'GET') {                      // Đọc file để hiển thị trong trình xem (không có nút tải); mỗi lần mở là 1 lượt xem
    const id = +m[1];
    const d = await env.DB.prepare('SELECT id, chunks, file_rev, file_size FROM docs WHERE id=?1').bind(id).first();
    if (!d || !d.chunks) return bad('Tài liệu chưa có file.', 404);
    const r = await env.DB.prepare('SELECT data FROM doc_chunks WHERE doc_id=?1 AND rev=?2 ORDER BY seq').bind(id, d.file_rev).all();
    const parts = r.results.map((row) => row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : Uint8Array.from(row.data));
    if (parts.length !== d.chunks || parts.reduce((a, b) => a + b.length, 0) !== d.file_size) return bad('File tài liệu bị lỗi, Admin cần tải lại.', 500);
    const out = new ReadableStream({ start(c) { for (const b of parts) c.enqueue(b); c.close(); } });
    if (url.searchParams.get('view') === '1') {
      const t = now();   // không ghi trùng khi cùng người mở lại trong 10 phút
      const last = await env.DB.prepare('SELECT MAX(viewed_at) AS t FROM doc_views WHERE doc_id=?1 AND user_id=?2').bind(id, me.id).first();
      if (!last || !last.t || t - last.t > 600) await env.DB.prepare('INSERT INTO doc_views (doc_id, user_id, viewed_at) VALUES (?1,?2,?3)').bind(id, me.id, t).run();
    }
    return new Response(out, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(d.file_size), 'cache-control': 'private, no-store', 'content-disposition': 'inline', 'x-content-type-options': 'nosniff' } });
  }
  m = p.match(/^\/api\/docs\/(\d+)\/views$/);
  if (m && method === 'GET') {
    if (me.app_role !== 'admin') return bad('Chỉ Admin xem được thống kê lượt xem.', 403);
    const id = +m[1];
    const [by, recent] = await Promise.all([
      env.DB.prepare(`SELECT u.id, u.name, u.email, COUNT(*) AS views, MIN(v.viewed_at) AS first_at, MAX(v.viewed_at) AS last_at
        FROM doc_views v JOIN users u ON u.id = v.user_id WHERE v.doc_id=?1 GROUP BY u.id ORDER BY last_at DESC`).bind(id).all(),
      env.DB.prepare(`SELECT u.name, v.viewed_at FROM doc_views v JOIN users u ON u.id = v.user_id WHERE v.doc_id=?1 ORDER BY v.viewed_at DESC LIMIT 200`).bind(id).all()]);
    const total = by.results.reduce((a, x) => a + x.views, 0);
    return json({ total, viewers: by.results, recent: recent.results });
  }

  /* ----- Proposal ----- */
  if (p === '/api/proposals' && method === 'GET') {
    let where = 's.user_id = ?1', binds = [me.id];
    if (me.app_role === 'admin') { where = '1'; binds = []; }
    else if (me.app_role === 'manager') {
      const ids = [me.id, ...(await subtreeIds(env, me.id))];
      where = `s.user_id IN (${ids.map(() => '?').join(',')})`; binds = ids;
    }
    const r = await env.DB.prepare(`SELECT s.*, u.name AS user_name FROM proposal_shares s JOIN users u ON u.id = s.user_id
        WHERE ${where} ORDER BY s.created_at DESC LIMIT 300`).bind(...binds).all();
    const cfg = await getSettings(env);
    return json({ proposals: PROPOSALS, shares: r.results.map((x) => shareView(x, url)), mail_ready: !!mailReady(env, cfg), mail_mode: mailReady(env, cfg),
      fields: proposalFields(cfg, me), fields_en: proposalFields(cfg, me, {}, 'en'), from_name: `${me.name} - ${cfg.company_short || cfg.company_name}` });
  }
  if (p === '/api/proposals/shares' && method === 'POST') {
    const prop = getProposal(body.proposal_id);
    if (!prop) return bad('Không tìm thấy proposal.');
    const customer_company = clip(body.customer_company, 160), customer_name = clip(body.customer_name, 120);
    const emails = parseEmails(body.customer_email), cc = parseEmails(body.cc);
    const send = !!body.send_email;
    if (!customer_company) return bad('Chưa nhập tên doanh nghiệp khách hàng.');
    if (send && !emails.length) return bad('Email khách hàng không hợp lệ.');
    if (emails.length > 5 || cc.length > 10) return bad('Tối đa 5 email nhận và 10 email CC.');
    const days = intSetting(body.days, 30, 1, 90);
    const fields = proposalFields(await getSettings(env), me, { kh: customer_company, nguoi: customer_name }, propLang(prop));
    const token = b64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));
    const t = now();
    const r = await env.DB.prepare(`INSERT INTO proposal_shares (token,proposal_id,user_id,customer_company,customer_name,customer_email,cc,message,fields,created_at,expires_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`).bind(token, prop.id, me.id, customer_company, customer_name, emails.join(', '), cc.join(', '),
        String(body.message || '').slice(0, 2000).trim(), JSON.stringify(fields), t, t + days * 86400).run();
    const row = await env.DB.prepare('SELECT * FROM proposal_shares WHERE id=?1').bind(r.meta.last_row_id).first();
    const mail = send ? await emailProposal(env, url, row, me) : {};
    return json({ ok: true, id: row.id, link: shareLink(url, token), ...mail });
  }
  m = p.match(/^\/api\/proposals\/shares\/(\d+)\/(send|revoke)$/);
  if (m && method === 'POST') {
    const row = await env.DB.prepare('SELECT s.*, u.name AS user_name, u.email AS user_email, u.contact_email AS user_contact_email FROM proposal_shares s JOIN users u ON u.id=s.user_id WHERE s.id=?1').bind(+m[1]).first();
    if (!row || !(await canSeeShare(env, me, row))) return bad('Không tìm thấy hoặc bạn không có quyền.', 404);
    if (row.user_id !== me.id && me.app_role !== 'admin') return bad('Chỉ người gửi hoặc Admin được thao tác.', 403);
    if (m[2] === 'revoke') { await env.DB.prepare('UPDATE proposal_shares SET revoked=1 WHERE id=?1').bind(row.id).run(); return json({ ok: true }); }
    if (row.revoked || row.expires_at < now()) return bad('Đường dẫn đã thu hồi hoặc hết hạn. Hãy tạo lần gửi mới.');
    return json({ ok: true, ...(await emailProposal(env, url, row, { id: row.user_id, name: row.user_name, email: row.user_email, contact_email: row.user_contact_email })) });
  }

  return bad('Không tìm thấy.', 404);
}

async function validateUser(env, b, selfId) {
  const email = normEmail(b.email), name = String(b.name || '').trim();
  // Phòng ban → chức danh hợp lệ theo công thức của phòng. Không chọn phòng = chức danh "Khác".
  const org = await loadOrg(env);
  let dept_id = b.dept_id === undefined ? undefined : (b.dept_id || null);
  if (dept_id === undefined) {                       // dữ liệu cũ / nhập file: đoán phòng theo chức danh
    const byName = b.dept_name && org.departments.find((x) => x.name.toLowerCase() === String(b.dept_name).trim().toLowerCase());
    dept_id = byName ? byName.id : SALES_TITLES.includes(b.title) ? ((org.departments.find((x) => x.formula === 'sales' && x.active) || {}).id || null) : null;
  }
  const dept = dept_id ? org.deptById[dept_id] : null;
  if (dept_id && !dept) return { error: 'Phòng ban không tồn tại.' };
  const title = deptTitleKeys(org, dept).includes(b.title) ? b.title : null;
  if (!title) return { error: dept ? `Chức danh không thuộc ${dept.name}. Hãy chọn lại chức danh.` : 'Chức danh không hợp lệ.' };
  const app_role = APP_ROLES.includes(b.app_role) ? b.app_role : null;
  const salary_w = Math.max(0, Math.round(+b.salary_w || 0));
  // Tỷ lệ lương cơ bản dạng thập phân 0–1 (vd 0.4 = 40%); để trống = theo chức danh
  let cb_ratio = b.cb_ratio === '' || b.cb_ratio == null ? null : +b.cb_ratio;
  if (cb_ratio != null && !(cb_ratio >= 0 && cb_ratio <= 1)) return { error: 'Tỷ lệ lương cơ bản phải từ 0% đến 100%.' };
  if (cb_ratio != null) cb_ratio = Math.round(cb_ratio * 1000) / 1000;
  const manager_id = b.manager_id ? +b.manager_id : null;
  const start_date = b.start_date && /^\d{4}-\d{2}-\d{2}$/.test(b.start_date) ? b.start_date : null;
  // Thông tin liên hệ (hiện trên proposal & chữ ký email): số điện thoại, email liên hệ (để trống = email đăng nhập)
  const phone = String(b.phone ?? '').replace(/[^\d+().\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30) || null;
  const contact_email = normEmail(b.contact_email || '') || null;
  if (contact_email && !isEmail(contact_email)) return { error: 'Email liên hệ không hợp lệ.' };
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
  return { email, name, dept_id, title, app_role, manager_id, salary_w, cb_ratio, start_date, phone, contact_email };
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
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      await ensureSchema(env);
      const me = await currentUser(env, req, url);
      if (url.pathname.startsWith('/api/')) return withHeaders(await api(req, env, url, me, ctx));
      if (url.pathname === '/p' || url.pathname.startsWith('/p/')) {          // proposal gửi khách (công khai theo mã)
        if (req.method !== 'GET' && req.method !== 'HEAD') return withHeaders(new Response('Method not allowed', { status: 405 }));
        return await servePublicProposal(req, env, url, me);
      }

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
      const sameFrame = url.pathname.startsWith('/proposal/') ? { 'x-frame-options': 'SAMEORIGIN' } : {};   // tab Proposal tạo PDF qua khung ẩn
      return withHeaders(await env.ASSETS.fetch(req), { 'cache-control': 'private, no-store', ...sameFrame });
    } catch (e) {
      console.error(e);
      return withHeaders(json({ error: 'Lỗi máy chủ: ' + (e.message || e) }, 500));
    }
  }
};
