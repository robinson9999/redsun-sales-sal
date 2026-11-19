/* =============================================================================
   REDSUN – Phần ứng dụng: tài khoản, KPI của bạn, Giao KPI, Nhân viên
   Dùng chung các hàm của trang (ROLES, compute, fmt, parseVND, switchTab...).
   ============================================================================= */
(function () {
  'use strict';

  const ROLE_LABEL = { admin: 'Admin', manager: 'Quản lý', staff: 'Nhân viên' };
  /* Phân quyền: S.perm = nhóm quyền của tài khoản (ma trận Xem/Thêm/Sửa/Xóa theo mục + phạm vi dữ liệu) */
  const canDo = (mod, act = 'view') => !!(S.perm && S.perm.perms && (S.perm.perms[mod] || []).includes(act));
  const isAll = () => !!(S.perm && S.perm.scope === 'all');
  const isSelf = () => !S.perm || S.perm.scope === 'self';
  const groupName = (id) => ((S.groups || []).find((g) => g.id === id) || {}).name || ROLE_LABEL[id] || id || '—';
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const S = { me: null, manager: null, titles: {}, depts: [], formulas: {}, users: null, year: new Date().getFullYear(), rendered: {} };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const titleName = (t) => (S.titles[t] && S.titles[t].name) || t || '—';
  const isMgrTitle = (t) => !!(S.titles[t] && S.titles[t].mgr);
  /* Phòng ban → công thức lương, thưởng, KPI. Chỉ chức danh có trong ROLES (Lương 3P khối KD) mới có KPI & bảng tính. */
  const deptOf = (id) => S.depts.find((d) => d.id === id) || null;
  const deptName = (id) => (deptOf(id) || {}).name || 'Chưa phân phòng';
  const formulaOfDept = (d) => d ? (S.formulas[d.formula] || S.formulas.none || {}) : null;
  const tplOf = (f) => (f && f.template && S.templates[f.template]) || null;
  const fDesc = (f) => f ? [tplOf(f) ? tplOf(f).desc : f.description, tplOf(f) && f.description ? f.description : ''].filter(Boolean).join(' ') : '';
  const pOf = (k) => (S.titles[k] && S.titles[k].params) || {};
  const hasKpi = (u) => !!ROLES[u.title];
  const deptTitleKeys = (d) => {
    if (!d) return ['other'];
    const own = Object.keys(S.titles).filter((k) => S.titles[k].custom && S.titles[k].dept_id === d.id);
    return d.formula === 'sales' ? [...BUILTIN_KEYS, ...own] : own;
  };
  /* Nạp phòng ban, chức danh, công thức. Chức danh theo mẫu "Lương 3P theo doanh số" được đưa vào ROLES của trang
     để Bảng tính, Quy chế, KPI dùng chung một bộ máy tính (compute) với tham số từ công thức. */
  const INF = (b) => (b || []).map(([t, r]) => [t == null ? Infinity : t, r]);
  const c2Bands = (c) => [[c.t0, 0], [1.0, c.a / (1 - c.t0)], [1.2, (c.b * 1.2 - c.a) / 0.2], [Infinity, c.b]];
  const BUILTIN_KEYS = ['cco', 'sm', 'tl', 'senior', 'sales', 'intern', 'ctv'];
  const DOTS = { mgr: 'bg-amber-500', staff: 'bg-emerald-600', ctv: 'bg-gold-500' };
  const setOrg = (d) => {
    S.titles = d.titles; S.depts = d.departments || []; S.formulas = d.formulas || {}; S.templates = d.templates || {};
    const base = S.formulas.sales && S.formulas.sales.config;
    if (base) {                                   // bậc thưởng của công thức gốc → Quy chế & mặc định
      C1_BANDS.splice(0, C1_BANDS.length, ...INF(base.c1)); CTV_BANDS.splice(0, CTV_BANDS.length, ...INF(base.ctv));
    }
    for (const k of Object.keys(ROLES)) if (!BUILTIN_KEYS.includes(k) && !(S.titles[k] && S.titles[k].template === 'sales_3p')) { delete ROLES[k]; delete C2_BANDS[k]; }
    for (const [k, t] of Object.entries(S.titles)) {
      if (t.template !== 'sales_3p' || !t.params) continue;
      const f = S.formulas[t.formula] || {}, cfg = f.config || {}, pr = t.params, builtin = BUILTIN_KEYS.includes(k);
      const prev = ROLES[k] || {};
      ROLES[k] = { ...prev, name: t.name, dot: prev.dot || (builtin && k === 'cco' || k === 'sm' ? 'bg-redsun-600' : DOTS[pr.type] || 'bg-slate-400'),
        type: pr.type, min: pr.min, max: pr.max, cb: pr.cb, X: pr.X, wCn: pr.wCn, wQl: pr.wQl, ramp: pr.ramp, team: pr.team || prev.team || 'Đội',
        c1: cfg.c1 ? INF(cfg.c1) : null, ctvb: cfg.ctv ? INF(cfg.ctv) : null, doc: builtin };
      if (!pr.ramp) delete ROLES[k].ramp;
      if (pr.type === 'mgr' && pr.c2) C2_BANDS[k] = c2Bands(pr.c2);
    }
    try { if (typeof renderDoc === 'function') renderDoc(); } catch (e) { /* bỏ qua */ }
    const rs = document.getElementById('role-select');
    if (rs) { const v = rs.value; rs.innerHTML = Object.entries(ROLES).map(([k, r]) => `<option value="${k}">${esc(r.name)}${r.type === 'ctv' ? ' • Hoa hồng thuần' : ' • Khung ' + rng(r.min, r.max)}</option>`).join(''); if (ROLES[v]) rs.value = v; }
  };
  const fmtDate = (ts) => ts ? new Date(ts * 1000).toLocaleDateString('vi-VN') : '';
  const money = (n) => (n == null ? '—' : fmt(n));

  /* ------------------------------ Gọi API ------------------------------ */
  async function api(path, opts = {}) {
    const o = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    const r = await fetch(path, o);
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== '/api/me/password') { location.replace('/login?het-han=1'); throw new Error('Hết phiên đăng nhập.'); }
    if (!r.ok) {
      if (r.status === 403 && /đổi mật khẩu/.test(d.error || '')) openPwModal(true);
      throw new Error(d.error || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
    return d;
  }

  /* ------------------------------ Hộp thoại ------------------------------ */
  function openModal(html, locked, wide) {
    const m = document.getElementById('modal'), bx = document.getElementById('modal-box');
    bx.classList.toggle('max-w-lg', !wide); bx.classList.toggle('max-w-3xl', !!wide);
    bx.innerHTML = html;
    m.dataset.locked = locked ? '1' : '';
    m.classList.remove('hidden');
    const f = m.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
  }
  window.closeModal = function () { document.getElementById('modal').classList.add('hidden'); };
  const modalHead = (title, sub, locked) => `<div class="px-6 pt-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
      <div><h3 class="font-extrabold text-slate-900 text-lg">${title}</h3>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>
      ${locked ? '' : '<button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-xl leading-none" aria-label="Đóng">×</button>'}</div>`;
  const field = (label, inner, hint) => `<label class="block"><span class="block text-xs font-bold text-slate-600 mb-1">${label}</span>${inner}${hint ? `<span class="block text-[11px] text-slate-400 mt-1">${hint}</span>` : ''}</label>`;
  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-redsun-200 focus:border-redsun-600';
  const btn = (cls) => `px-4 py-2 rounded-xl text-sm font-bold ${cls}`;
  const BTN_P = btn('bg-redsun-700 hover:bg-redsun-800 text-white'), BTN_S = btn('bg-slate-100 hover:bg-slate-200 text-slate-700');
  const errBox = (id) => `<div id="${id}" class="hidden mt-3 p-3 rounded-lg bg-redsun-50 text-redsun-800 text-sm"></div>`;
  function showErr(id, msg) { const e = document.getElementById(id); e.textContent = msg; e.classList.remove('hidden'); }

  /* ------------------------------ Đổi mật khẩu ------------------------------ */
  window.openPwModal = function (forced) {
    const locked = forced || (S.me && S.me.must_change);
    openModal(`${modalHead(locked ? 'Đặt mật khẩu mới' : 'Đổi mật khẩu', locked ? 'Bạn đang dùng mật khẩu tạm do Công ty cấp. Vui lòng đặt mật khẩu riêng để tiếp tục.' : '', locked)}
      <form id="pw-form" class="px-6 py-5 space-y-3">
        ${field('Mật khẩu hiện tại' + (locked ? ' (mật khẩu tạm)' : ''), `<input type="password" id="pw-old" autocomplete="current-password" class="${inputCls}" required>`)}
        ${field('Mật khẩu mới', `<input type="password" id="pw-new" autocomplete="new-password" minlength="8" class="${inputCls}" required>`, 'Tối thiểu 8 ký tự, nên có chữ hoa, chữ thường và số.')}
        ${field('Nhập lại mật khẩu mới', `<input type="password" id="pw-new2" autocomplete="new-password" class="${inputCls}" required>`)}
        ${errBox('pw-err')}
        <div class="flex justify-end gap-2 pt-2">${locked ? `<button type="button" onclick="rsLogout()" class="${BTN_S}">Đăng xuất</button>` : `<button type="button" onclick="closeModal()" class="${BTN_S}">Hủy</button>`}<button class="${BTN_P}">Lưu mật khẩu</button></div>
      </form>`, locked);
    document.getElementById('pw-form').onsubmit = async (e) => {
      e.preventDefault();
      const n1 = document.getElementById('pw-new').value, n2 = document.getElementById('pw-new2').value;
      if (n1 !== n2) return showErr('pw-err', 'Hai lần nhập mật khẩu mới không khớp.');
      try {
        await api('/api/me/password', { method: 'POST', body: { old_password: document.getElementById('pw-old').value, new_password: n1 } });
        if (S.me) S.me.must_change = 0;
        openModal(`${modalHead('Đã đổi mật khẩu')}<div class="px-6 py-5 text-sm text-slate-700">Mật khẩu mới đã được lưu. Các thiết bị khác đang đăng nhập bằng tài khoản này đã được đăng xuất.
          <div class="flex justify-end pt-4"><button onclick="closeModal();location.reload()" class="${BTN_P}">Tiếp tục</button></div></div>`);
      } catch (err) { showErr('pw-err', err.message); }
    };
  };

  /* ------------------------------ Khởi động ------------------------------ */
  /* --------------- Tự đăng xuất khi không thao tác ---------------
     Ghi thời điểm thao tác cuối (dùng chung giữa các tab qua localStorage), báo máy chủ tối đa 1 lần/phút,
     cảnh báo trước 1 phút rồi đăng xuất. Máy chủ cũng tự hủy phiên nếu quá hạn. */
  let idleTimer = null;
  function startIdleWatch(minutes) {
    clearInterval(idleTimer);
    if (!(minutes > 0)) return;
    const LIMIT = minutes * 60000, KEY = 'rs_last_act';
    const getAct = () => { try { return +localStorage.getItem(KEY) || 0; } catch { return 0; } };
    let mem = Date.now(), lastPing = Date.now(), lastWrite = 0;
    const lastAct = () => getAct() || mem;          // ưu tiên giá trị dùng chung giữa các tab
    const mark = () => { mem = Date.now(); if (mem - lastWrite > 5000) { lastWrite = mem; try { localStorage.setItem(KEY, String(mem)); } catch { /* bỏ qua */ } } hideWarn(); };
    const warnEl = () => document.getElementById('idle-warn');
    function hideWarn() { const w = warnEl(); if (w) w.remove(); }
    function showWarn(sec) {
      let w = warnEl();
      if (!w) {
        w = document.createElement('div'); w.id = 'idle-warn'; w.className = 'fixed inset-x-0 top-3 z-[110] flex justify-center px-3'; document.body.appendChild(w);
        w.innerHTML = `<div class="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500 text-slate-900 text-sm font-semibold shadow-xl">Bạn sẽ bị đăng xuất sau <span data-sec></span> giây do không thao tác. <button class="px-3 py-1 rounded-lg bg-slate-900 text-white">Tiếp tục làm việc</button></div>`;
        w.querySelector('button').onclick = () => { lastWrite = 0; mark(); ping(true); };
      }
      w.querySelector('[data-sec]').textContent = sec;
    }
    async function ping(force) {
      if (!force && lastAct() <= lastPing) return;
      lastPing = Date.now();
      try { await fetch('/api/ping', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', credentials: 'same-origin' })
        .then((r) => { if (r.status === 401) location.replace('/login?het-han=1'); }); } catch { /* mạng lỗi: thử lần sau */ }
    }
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'scroll'].forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    mark();
    idleTimer = setInterval(async () => {
      const left = LIMIT - (Date.now() - lastAct());
      if (left <= 0) {
        clearInterval(idleTimer);
        try { await fetch('/api/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', credentials: 'same-origin' }); } catch { /* bỏ qua */ }
        location.replace('/login?het-han=1'); return;
      }
      if (left <= 60000) showWarn(Math.ceil(left / 1000)); else hideWarn();
      if (Date.now() - lastPing >= 60000) ping(false);
    }, 1000);
  }

  window.appInit = async function () {
    try {
      const d = await api('/api/me');
      S.me = d.user; S.manager = d.manager; S.perm = d.perm; S.permMeta = d.perm_meta; setOrg(d); S.company = d.company; startIdleWatch(d.idle_minutes);
      document.getElementById('me-name').textContent = S.me.name;
      document.getElementById('me-role').textContent = `${S.perm ? S.perm.name : ''}${S.me.title !== 'other' ? ' • ' + titleName(S.me.title) : ''}${S.me.dept_id ? ' • ' + deptName(S.me.dept_id) : ''}`;
      // Hiện các tab theo quyền Xem của nhóm quyền
      const TABMOD = { policy: 'policy', calc: 'calc', kpi: 'kpi', survey: 'survey', proposal: 'proposal', docs: 'docs', assign: 'assign', staff: 'staff', perm: 'perm', settings: 'settings' };
      for (const [tab, mod] of Object.entries(TABMOD)) { const b = document.getElementById('tab-btn-' + tab); if (b) b.classList.toggle('hidden', !canDo(mod, 'view')); }
      if (canDo('staff') || canDo('perm')) api('/api/perm-groups').then((g) => { S.groups = g.groups; }).catch(() => {});
      switchTab(tabFromHash());
      if (!S.me.must_change) initCalc();
      if (S.me.must_change) openPwModal(true);
    } catch (e) {
      switchTab('policy');
    }
  };
  /* =========================================================================
     BẢNG TÍNH THEO NGƯỜI: bản thân (khối KD) hoặc nhân viên dưới quyền (quản lý/admin)
     ========================================================================= */
  const C = { people: [], kpiCache: {}, ready: false };
  const cbText = (u) => { const cb = u.cb_ratio != null ? u.cb_ratio : (pOf(u.title).cb || 0); return `${Math.round(cb * 1000) / 10}% CB – ${Math.round((1 - cb) * 1000) / 10}% HS`; };
  async function initCalc() {
    const box = document.getElementById('calc-person-box'), sel = document.getElementById('calc-person');
    const canMgr = !isSelf(), admin = isAll();
    let people = ROLES[S.me.title] ? [S.me] : [];
    if (canMgr) { try { people = people.concat((await loadUsers()).filter((u) => u.active && u.id !== S.me.id && ROLES[u.title])); } catch (e) { /* bỏ qua */ } }
    C.people = people; C.ready = true;
    if (!people.length) { box.classList.add('hidden'); clearCalcPerson(); return; }
    box.classList.remove('hidden');
    sel.innerHTML = people.map((u) => `<option value="${u.id}">${esc(u.name)}${u.id === S.me.id ? ' (bạn)' : ''} – ${esc(titleName(u.title).replace(/ \(.+\)$/, ''))}</option>`).join('')
      + (admin ? '<option value="free">— Mô phỏng tự do (không gắn nhân sự) —</option>' : '');
    sel.disabled = people.length === 1 && !admin;
    sel.onchange = () => calcShow(sel.value);
    document.getElementById('calc-month').onchange = applyCalcMonth;
    await calcShow(String(people[0].id));
  }
  async function calcShow(id, month) {
    const sel = document.getElementById('calc-person'), msel = document.getElementById('calc-month'), note = document.getElementById('calc-person-note');
    sel.value = String(id);
    if (id === 'free') {
      msel.innerHTML = '<option>Không áp dụng</option>'; msel.disabled = true;
      note.textContent = 'Chế độ mô phỏng: tự chọn chức danh, lương W và doanh số để thử các kịch bản.';
      clearCalcPerson(); return;
    }
    const u = C.people.find((p) => String(p.id) === String(id)); if (!u) return;
    const y = new Date().getFullYear(), key = u.id + '-' + y;
    try { if (!C.kpiCache[key]) C.kpiCache[key] = (await api(`/api/kpis?user_id=${u.id === S.me.id ? 'me' : u.id}&year=${y}`)).kpis; }
    catch (e) { C.kpiCache[key] = []; }
    const byM = Object.fromEntries(C.kpiCache[key].map((k) => [k.month, k]));
    const cur = new Date().getMonth() + 1, m0 = month || cur;
    msel.disabled = false;
    msel.innerHTML = MONTHS.map((m) => `<option value="${m}">Tháng ${m}/${y}${byM[m] ? ' – đã giao' : ' – chưa giao'}</option>`).join('')
      + '<option value="0">Không dùng KPI (theo định mức chức danh)</option>';
    msel.value = String(m0);
    msel.dataset.uid = u.id;
    note.textContent = (u.id === S.me.id ? 'Bảng tính lương của bạn' : `Bạn đang xem bảng tính của nhân viên dưới quyền`)
      + ` • Lương W ${u.salary_w ? fmt(u.salary_w) : 'chưa khai báo'} • Cơ cấu ${cbText(u)}. Doanh số nhập vào chỉ để ước tính, không được lưu lại.`;
    applyCalcMonth();
  }
  function applyCalcMonth() {
    const msel = document.getElementById('calc-month');
    const u = C.people.find((p) => String(p.id) === String(msel.dataset.uid)); if (!u) return;
    const y = new Date().getFullYear(), m = +msel.value;
    const k = m ? (C.kpiCache[u.id + '-' + y] || []).find((x) => x.month === m) || null : null;
    setCalcPerson(u, k);
  }
  window.calcShowFor = async function (id, month) { if (!C.ready) await initCalc(); await calcShow(String(id), month); switchTab('calc'); window.scrollTo(0, 0); };

  window.onTabShown = function (t) {
    if (!S.me || S.me.must_change) return;
    if (t === 'kpi') renderKpi();
    if (t === 'survey') renderSurvey();
    if (t === 'proposal') renderProposal();
    if (t === 'docs') renderDocs();
    if (t === 'settings') renderSettings();
    if (t === 'assign') renderAssign();
    if (t === 'staff') renderStaff(true);
    if (t === 'perm') renderPerm();
    if (t === 'policy') renderPolicy();
  };

  /* =========================================================================
     TRANG: QUY CHẾ – đọc bản đang ban hành; người có quyền soạn thảo, ban hành, xem lịch sử
     Nội dung lưu dạng các mục HTML; khối số liệu <div data-block> & tham số <span data-cfg> tự điền.
     ========================================================================= */
  const PO = { list: null, sel: null, mode: 'view', dirty: false };
  const polCan = (a) => !!(PO.can && PO.can[a]);
  function policyHtml(c, opts = {}) {
    // Văn bản đã được máy chủ lọc an toàn; chỉ bọc khung hiển thị
    return `<div class="card bg-gradient-to-br from-white via-redsun-50 to-amber-50 !border-redsun-100">
        <span class="inline-block px-3 py-1 rounded-full ${opts.draft ? 'bg-amber-100 text-amber-800' : 'bg-redsun-100 text-redsun-800'} text-[11px] font-bold uppercase tracking-wider mb-3">${opts.badge || 'Tài liệu chính thức • Lưu hành nội bộ'}</span>
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-3">${esc(c.title)}</h1>
        <div class="sec">${c.intro || ''}</div>
        <p class="text-sm text-slate-500 mt-2">Hiệu lực: <span data-cfg="hieuLuc"></span>. Đầu mối giải đáp: <span data-cfg="dauMoi"></span>.${opts.meta ? ' ' + opts.meta : ''}</p></div>`
      + c.sections.map((x, i) => `<section id="pol-${esc(x.id)}" class="card" data-title="${esc(x.title)}"><h2><span class="num">${i + 1}</span>${esc(x.title)}</h2><div class="sec">${x.html}</div></section>`).join('');
  }
  function paintPolicy(root, c, opts) {
    root.innerHTML = (opts.bar || '') + policyHtml(c, opts);
    const sink = document.getElementById('doc-sink'); if (sink) sink.remove();
    POLICY_CFG = { ...(c.vars || {}) };
    fillPolicyBlocks(root);
    try { renderDoc(); } catch (e) { console.error(e); }
    // Mục lục trỏ đúng mục của tài liệu đang xem
    document.getElementById('toc').innerHTML = c.sections.map((x, i) => `<li><button data-toc="pol-${esc(x.id)}" class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-redsun-50 text-slate-600 hover:text-redsun-800"><b class="text-redsun-700 mr-1.5">${i + 1}.</b>${esc(x.title)}</button></li>`).join('');
    document.querySelectorAll('[data-toc]').forEach((b) => b.onclick = () => document.getElementById(b.dataset.toc).scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  // Khi soạn thảo: ẩn cột mục lục, trình soạn dùng toàn bộ bề ngang
  const policyWide = (on) => {
    const aside = document.querySelector('#tab-policy > aside'), root = document.getElementById('policy-root');
    if (aside) aside.classList.toggle('lg:hidden', on);
    root.classList.toggle('lg:col-span-9', !on); root.classList.toggle('lg:col-span-12', on);
  };
  async function renderPolicy(force) {
    const root = document.getElementById('policy-root');
    if (PO.mode === 'edit') return;                       // đang soạn: không vẽ lại
    policyWide(false);
    if (!PO.list || force) {
      try { const d = await api('/api/policies'); PO.list = d.policies; PO.vars = d.vars; PO.can = d.can; }
      catch (e) { root.innerHTML = errorCard(e.message); return; }
    }
    if (!PO.list.length) { root.innerHTML = card('<div class="p-6 text-sm text-slate-500">Chưa có quy chế nào được ban hành.</div>'); return; }
    if (!PO.sel || !PO.list.find((x) => x.id === PO.sel)) PO.sel = (PO.list.find((x) => x.current) || PO.list[0]).id;
    const pol = PO.list.find((x) => x.id === PO.sel), showDraft = PO.mode === 'draft' && pol.draft && pol.draft.content;
    const ver = showDraft ? pol.draft : pol.current;
    const pick = PO.list.length > 1 ? `<select id="po-pick" class="${inputCls} sm:w-80">${PO.list.map((x) => `<option value="${x.id}" ${x.id === PO.sel ? 'selected' : ''}>${esc(x.name)}${x.current ? '' : ' (chưa ban hành)'}</option>`).join('')}</select>` : '';
    const tools = polCan('edit') ? `<div class="flex flex-wrap gap-2">
        ${pol.draft && pol.draft.content ? `<button id="po-toggle" class="${BTN_S}">${showDraft ? '← Xem bản đang ban hành' : '👁 Xem bản nháp'}</button>` : ''}
        <button id="po-edit" class="${BTN_P}">✎ ${pol.draft && pol.draft.content ? 'Soạn tiếp bản nháp' : 'Soạn bản mới'}</button>
        <button id="po-hist" class="${BTN_S}">🕘 Lịch sử phiên bản</button>${polCan('add') ? `<button id="po-new" class="${BTN_S}">＋ Quy chế mới</button>` : ''}</div>` : '';
    const draftNote = polCan('edit') && pol.draft && pol.draft.content && !showDraft
      ? `<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">Có <b>bản nháp</b> chưa ban hành${pol.draft.note ? ': ' + esc(pol.draft.note) : ''} (sửa lần cuối ${fmtDT2(pol.draft.updated_at)}${pol.draft.updated_by_name ? ' bởi ' + esc(pol.draft.updated_by_name) : ''}).</div>` : '';
    const bar = (pick || tools) ? `<div class="no-print flex flex-col sm:flex-row gap-2 justify-between">${pick || '<span></span>'}${tools}</div>${draftNote}` : draftNote;
    if (!ver) { root.innerHTML = bar + card('<div class="p-6 text-sm text-slate-500">Quy chế này chưa có bản ban hành. Bấm "Xem bản nháp" hoặc "Soạn tiếp bản nháp".</div>'); bindPolicyBar(pol); return; }
    const meta = showDraft ? '' : `Phiên bản ${esc(ver.version || '')} • ban hành ${fmtDate(ver.published_at)}${ver.published_by_name ? ' bởi ' + esc(ver.published_by_name) : ''}.`;
    paintPolicy(root, ver.content, { bar, draft: showDraft, badge: showDraft ? 'Bản nháp • chưa ban hành' : null, meta });
    bindPolicyBar(pol);
  }
  function bindPolicyBar(pol) {
    const x = (id) => document.getElementById(id);
    if (x('po-pick')) x('po-pick').onchange = (e) => { PO.sel = e.target.value; PO.mode = 'view'; renderPolicy(); };
    if (x('po-toggle')) x('po-toggle').onclick = () => { PO.mode = PO.mode === 'draft' ? 'view' : 'draft'; renderPolicy(); };
    if (x('po-edit')) x('po-edit').onclick = () => policyEditor(pol);
    if (x('po-hist')) x('po-hist').onclick = () => policyHistory(pol);
    if (x('po-new')) x('po-new').onclick = async () => { const name = prompt('Tên quy chế mới (vd: Quy chế Lương, Thưởng & KPI – Phòng Kế toán):'); if (!name) return;
      try { const r = await api('/api/policies', { method: 'POST', body: { name } }); PO.sel = r.id; await renderPolicy(true); const p2 = PO.list.find((y) => y.id === r.id); if (p2) policyEditor(p2); } catch (e) { alert(e.message); } };
  }

  /* ----- Lịch sử phiên bản: xem, khôi phục thành bản nháp ----- */
  async function policyHistory(pol) {
    openModal(`${modalHead('Lịch sử phiên bản', esc(pol.name))}<div id="ph-body" class="px-6 py-5">${loading}</div>`, false, true);
    try {
      const d = await api(`/api/policies/${pol.id}/versions`);
      const cur = pol.current && pol.current.id;
      document.getElementById('ph-body').innerHTML = `<div class="divide-y divide-slate-100 border border-slate-200 rounded-xl">${d.versions.map((v) => `<div class="px-4 py-3 flex flex-wrap items-center gap-3">
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${v.status === 'draft' ? 'bg-amber-100 text-amber-800' : v.id === cur ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${v.status === 'draft' ? 'Bản nháp' : v.id === cur ? 'Đang ban hành' : 'Đã thay thế'}</span>
          <div class="flex-grow min-w-0"><b class="text-sm">${v.status === 'draft' ? 'Nháp' : 'Phiên bản ' + esc(v.version || '')}</b> <span class="text-xs text-slate-500">${v.status === 'draft' ? 'sửa ' + fmtDT2(v.updated_at) + (v.updated_by_name ? ' • ' + esc(v.updated_by_name) : '') : 'ban hành ' + fmtDT2(v.published_at) + (v.published_by_name ? ' • ' + esc(v.published_by_name) : '')}</span>
            ${v.note ? `<span class="block text-xs text-slate-600">${esc(v.note)}</span>` : ''}</div>
          <span class="text-xs whitespace-nowrap"><button data-pv="${v.id}" class="font-bold text-slate-700 hover:underline mr-3">Xem</button>${v.status !== 'draft' ? `<button data-pr="${v.id}" class="font-bold text-redsun-700 hover:underline">Lấy làm bản nháp</button>` : ''}</span></div>`).join('')}</div>
        <p class="text-[11px] text-slate-500 mt-2">"Lấy làm bản nháp" sẽ thay bản nháp hiện có (nếu có) bằng nội dung phiên bản đó để sửa tiếp và ban hành lại.</p>`;
      document.querySelectorAll('[data-pv]').forEach((b) => b.onclick = () => {
        const v = d.versions.find((y) => y.id === +b.dataset.pv);
        openModal(`${modalHead(v.status === 'draft' ? 'Bản nháp' : 'Phiên bản ' + esc(v.version || ''), esc(pol.name))}<div class="px-6 py-5 doc space-y-4" id="pv-root"></div>
          <div class="px-6 pb-5 flex justify-end"><button id="pv-back" class="${BTN_S}">← Quay lại lịch sử</button></div>`, false, true);
        const r = document.getElementById('pv-root'); r.innerHTML = policyHtml(v.content, { draft: v.status === 'draft' }); POLICY_CFG = { ...(v.content.vars || {}) }; fillPolicyBlocks(r);
        // Bảng số liệu trong bản xem lại dùng id riêng → điền bằng cách sao chép từ tài liệu đang hiển thị
        r.querySelectorAll('[data-cfg]').forEach((e) => { e.textContent = POLICY_CFG[e.dataset.cfg] ?? ''; });
        r.querySelectorAll('.blk').forEach((e) => { e.innerHTML = '<p class="muted">[Bảng số liệu tự động – hiển thị đầy đủ khi xem ở trang Quy chế]</p>'; });
        document.getElementById('pv-back').onclick = () => policyHistory(pol);
      });
      document.querySelectorAll('[data-pr]').forEach((b) => b.onclick = async () => {
        if (pol.draft && pol.draft.content && !confirm('Bản nháp hiện có sẽ bị thay thế. Tiếp tục?')) return;
        try { await api(`/api/policies/${pol.id}/restore`, { method: 'POST', body: { version_id: +b.dataset.pr } }); closeModal(); PO.mode = 'draft'; await renderPolicy(true); } catch (e) { alert(e.message); }
      });
    } catch (e) { document.getElementById('ph-body').innerHTML = errorCard(e.message); }
  }

  /* ----- Trình soạn thảo ----- */
  function policyEditor(pol) {
    const root = document.getElementById('policy-root');
    const base = (pol.draft && pol.draft.content) || (pol.current && pol.current.content);
    const D = JSON.parse(JSON.stringify(base));
    D.vars = { ...Object.fromEntries(Object.entries(PO.vars).map(([k, v]) => [k, v.def])), ...(D.vars || {}) };
    let note = (pol.draft && pol.draft.note) || '';
    let cur = 0, view = 'edit';
    PO.mode = 'edit'; PO.dirty = false; policyWide(true);
    const AUTO_VARS = { nguongQLpct: 'Ngưỡng thưởng quản lý (theo công thức lương)' };       // tham số tự lấy từ công thức
    const BL = (k) => (POLICY_BLOCKS[k] || {}).label || k, VL = (k) => (PO.vars[k] || {}).label || AUTO_VARS[k] || k;
    // Lưu trữ ↔ trình soạn: khối và tham số hiển thị thành "nhãn" không sửa được
    const toEditor = (html) => html.replace(/<div data-block="([a-z0-9_]+)"><\/div>/g, (m, k) => `<div data-block="${k}" contenteditable="false" class="chip-block">📊 ${esc(BL(k))} (tự động)</div>`)
      .replace(/<span data-cfg="([a-zA-Z0-9_]+)"><\/span>/g, (m, k) => `<span data-cfg="${k}" contenteditable="false" class="chip-cfg">${esc(VL(k))}</span>`);
    const fromEditor = (el) => { const c = el.cloneNode(true); c.querySelectorAll('[data-block],[data-cfg]').forEach((e) => { e.innerHTML = ''; e.removeAttribute('class'); e.removeAttribute('contenteditable'); }); return c.innerHTML; };
    const syncCur = () => {
      const a = document.getElementById('pe-area'); if (a && view === 'edit') { if (cur === -1) D.intro = fromEditor(a); else D.sections[cur].html = fromEditor(a); }
      const t = document.getElementById('pe-stitle'); if (t && cur >= 0) D.sections[cur].title = t.value;
      const tt = document.getElementById('pe-title'); if (tt) D.title = tt.value;
      const n = document.getElementById('pe-note'); if (n) note = n.value;
      document.querySelectorAll('[data-var]').forEach((i) => { D.vars[i.dataset.var] = i.value; });
    };
    const mark = () => { PO.dirty = true; const s2 = document.getElementById('pe-state'); if (s2) s2.textContent = 'Chưa lưu'; };
    const tb = (cmd, label, title) => `<button type="button" data-cmd="${cmd}" class="pe-tool" title="${title || label}">${label}</button>`;
    const draw = () => {
      const secList = `<button data-sec="-1" class="w-full text-left px-3 py-2 rounded-lg text-sm ${cur === -1 ? 'bg-redsun-50 text-redsun-800 font-bold' : 'hover:bg-slate-50'}">Mở đầu tài liệu</button>`
        + D.sections.map((x, i) => `<div class="flex items-center gap-1 ${cur === i ? 'bg-redsun-50 rounded-lg' : ''}"><button data-sec="${i}" class="flex-grow text-left px-3 py-2 rounded-lg text-sm truncate ${cur === i ? 'text-redsun-800 font-bold' : 'hover:bg-slate-50'}"><b class="text-redsun-700 mr-1">${i + 1}.</b>${esc(x.title)}</button>
          <button data-up="${i}" class="text-slate-400 hover:text-slate-800 px-1" title="Lên">↑</button><button data-down="${i}" class="text-slate-400 hover:text-slate-800 px-1" title="Xuống">↓</button></div>`).join('');
      const blockOpts = Object.entries(POLICY_BLOCKS).map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join('');
      const varOpts = Object.entries(PO.vars).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('') + Object.entries(AUTO_VARS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
      const editorPane = view === 'vars' ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${Object.entries(PO.vars).map(([k, v]) => field(esc(v.label), `<input data-var="${k}" value="${esc(D.vars[k] ?? '')}" class="${inputCls}">`)).join('')}</div>
            <p class="text-[11px] text-slate-500 mt-2">Tham số hiện trong văn bản ở các chỗ đánh dấu màu vàng. Ngưỡng thưởng quản lý và các bảng số liệu lấy từ <b>Công thức lương</b> (tab Nhân viên → 🧮 Công thức lương).</p>`
        : view === 'preview' ? '<div id="pe-preview" class="doc space-y-6"></div>'
        : `<div class="flex flex-wrap items-end gap-2 mb-2">${cur >= 0 ? `<div class="flex-grow">${field('Tên mục', `<input id="pe-stitle" maxlength="150" value="${esc(D.sections[cur].title)}" class="${inputCls}">`)}</div>
              <button id="pe-del" class="text-xs text-redsun-700 hover:underline pb-2">Xóa mục này</button>` : `<div class="flex-grow">${field('Tiêu đề tài liệu', `<input id="pe-title" maxlength="200" value="${esc(D.title)}" class="${inputCls}">`)}</div>`}</div>
          <div class="flex flex-wrap gap-1 mb-2 sticky top-28 z-10 bg-white py-1">
            ${tb('bold', '<b>B</b>', 'Đậm')}${tb('italic', '<i>I</i>', 'Nghiêng')}${tb('underline', '<u>U</u>', 'Gạch chân')}
            ${tb('h3', 'Tiêu đề nhỏ')}${tb('p', 'Đoạn văn')}${tb('ul', '• Danh sách')}${tb('ol', '1. Danh sách')}
            ${tb('note', '💡 Ghi chú')}${tb('tip', '✅ Mẹo/ví dụ')}${tb('warn', '⚠ Cảnh báo')}${tb('formula', 'Công thức')}
            ${tb('link', '🔗 Liên kết')}${tb('table', '▦ Bảng')}${tb('faq', '❓ Hỏi đáp')}${tb('clear', 'Xóa định dạng')}
            <select id="pe-block" class="pe-tool"><option value="">📊 Chèn bảng số liệu tự động…</option>${blockOpts}</select>
            <select id="pe-var" class="pe-tool"><option value="">🔤 Chèn tham số…</option>${varOpts}</select></div>
          <div id="pe-area" class="pe-area doc" contenteditable="true">${toEditor(cur === -1 ? (D.intro || '') : D.sections[cur].html)}</div>
          <p class="text-[11px] text-slate-500 mt-2">Dán văn bản sẽ giữ chữ, bỏ định dạng lạ. Ô xám là bảng số liệu tự động, ô vàng là tham số: chọn rồi bấm Delete để xóa, dùng 2 nút cuối thanh công cụ để chèn.</p>`;
      root.innerHTML = `<div class="card !p-4 no-print flex flex-col lg:flex-row lg:items-center gap-3 justify-between sticky top-20 z-20">
          <div><b class="text-slate-900">Soạn thảo: ${esc(pol.name)}</b><span class="block text-xs text-slate-500">Bản nháp • <span id="pe-state">${PO.dirty ? 'Chưa lưu' : (pol.draft && pol.draft.updated_at ? 'Đã lưu ' + fmtDT2(pol.draft.updated_at) : 'Chưa lưu')}</span></span></div>
          <div class="flex flex-wrap gap-2">
            ${[['edit', '✎ Nội dung'], ['vars', '🔤 Tham số'], ['preview', '👁 Xem trước']].map(([k, l]) => `<button data-view="${k}" class="${view === k ? BTN_P : BTN_S}">${l}</button>`).join('')}
            <button id="pe-save" class="${BTN_S}">💾 Lưu nháp</button>${polCan('add') ? `<button id="pe-pub" class="${BTN_P}">Ban hành…</button>` : ''}
            ${polCan('delete') && pol.draft && pol.draft.content ? `<button id="pe-drop" class="${BTN_S}">Hủy nháp</button>` : ''}<button id="pe-close" class="${BTN_S}">Đóng</button></div></div>
        ${errBox('pe-err')}
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div class="lg:col-span-3 card !p-3 space-y-1">${secList}<button id="pe-add" class="mt-2 text-xs font-bold text-redsun-700 hover:underline px-3">＋ Thêm mục</button>
            <div class="pt-3 px-3">${field('Ghi chú phiên bản', `<input id="pe-note" maxlength="300" value="${esc(note)}" placeholder="VD: Cập nhật tỷ lệ thưởng 2027" class="${inputCls}">`)}</div></div>
          <div class="lg:col-span-9 card !p-4">${editorPane}</div></div>`;
      bind();
      if (view === 'preview') {
        const pr = document.getElementById('pe-preview'); pr.innerHTML = policyHtml(D, { draft: true, badge: 'Xem trước bản nháp' });
        const sink = document.getElementById('doc-sink'); if (sink) sink.remove();
        POLICY_CFG = { ...D.vars }; fillPolicyBlocks(pr); try { renderDoc(); } catch (e) { console.error(e); }
      }
    };
    // Chèn HTML tại vị trí con trỏ (tự làm để giữ thuộc tính data-block / data-cfg; nhớ vị trí khi bấm sang ô chọn)
    let lastRange = null;
    const keepRange = () => { const sel = window.getSelection(), a = document.getElementById('pe-area'); if (a && sel.rangeCount && a.contains(sel.getRangeAt(0).commonAncestorContainer)) lastRange = sel.getRangeAt(0).cloneRange(); };
    const insertAtCaret = (html) => {
      const a = document.getElementById('pe-area'), sel = window.getSelection();
      let r = lastRange;
      if (sel.rangeCount && a.contains(sel.getRangeAt(0).commonAncestorContainer)) r = sel.getRangeAt(0);
      if (!r) { r = document.createRange(); r.selectNodeContents(a); r.collapse(false); }
      r.deleteContents();
      const t = document.createElement('template'); t.innerHTML = html;
      const last = t.content.lastChild; r.insertNode(t.content);
      if (last) { const nr = document.createRange(); nr.setStartAfter(last); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); lastRange = nr.cloneRange(); }
      a.focus(); mark();
    };
    const exec = (cmd) => {
      const a = document.getElementById('pe-area'); a.focus();
      if (lastRange && !(window.getSelection().rangeCount && a.contains(window.getSelection().getRangeAt(0).commonAncestorContainer))) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(lastRange); }
      const wrap = (cls) => { const sel = window.getSelection(); const txt = sel && sel.toString() ? esc(sel.toString()) : 'Nội dung…'; insertAtCaret(`<div class="${cls}">${txt}</div><p><br></p>`); };
      if (['bold', 'italic', 'underline'].includes(cmd)) document.execCommand(cmd);
      else if (cmd === 'h3') document.execCommand('formatBlock', false, 'h3');
      else if (cmd === 'p') document.execCommand('formatBlock', false, 'p');
      else if (cmd === 'ul') document.execCommand('insertUnorderedList');
      else if (cmd === 'ol') document.execCommand('insertOrderedList');
      else if (['note', 'tip', 'warn', 'formula'].includes(cmd)) wrap(cmd);
      else if (cmd === 'link') { const u = prompt('Địa chỉ liên kết (https://…):', 'https://'); if (u && /^(https?:|mailto:|tel:)/i.test(u)) document.execCommand('createLink', false, u); }
      else if (cmd === 'table') insertAtCaret('<table><thead><tr><th>Cột 1</th><th>Cột 2</th></tr></thead><tbody><tr><td>…</td><td>…</td></tr><tr><td>…</td><td>…</td></tr></tbody></table><p><br></p>');
      else if (cmd === 'faq') insertAtCaret('<details><summary>Câu hỏi?</summary><p>Câu trả lời.</p></details><p><br></p>');
      else if (cmd === 'clear') document.execCommand('removeFormat');
      mark();
    };
    const bind = () => {
      const x = (id) => document.getElementById(id);
      document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { syncCur(); view = b.dataset.view; draw(); });
      document.querySelectorAll('[data-sec]').forEach((b) => b.onclick = () => { syncCur(); cur = +b.dataset.sec; view = 'edit'; draw(); });
      document.querySelectorAll('[data-up],[data-down]').forEach((b) => b.onclick = () => {
        syncCur(); const i = +(b.dataset.up ?? b.dataset.down), j = b.dataset.up != null ? i - 1 : i + 1;
        if (j < 0 || j >= D.sections.length) return; [D.sections[i], D.sections[j]] = [D.sections[j], D.sections[i]]; if (cur === i) cur = j; else if (cur === j) cur = i; mark(); draw(); });
      x('pe-add').onclick = () => { syncCur(); D.sections.push({ id: 'm' + Date.now().toString(36), title: 'Mục mới', html: '<p>Nội dung…</p>' }); cur = D.sections.length - 1; view = 'edit'; mark(); draw(); };
      if (x('pe-del')) x('pe-del').onclick = () => { if (D.sections.length < 2) return alert('Quy chế cần ít nhất 1 mục.'); if (!confirm(`Xóa mục "${D.sections[cur].title}"?`)) return; D.sections.splice(cur, 1); cur = Math.max(0, cur - 1); mark(); draw(); };
      document.querySelectorAll('[data-cmd]').forEach((b) => { b.onmousedown = (e) => e.preventDefault(); b.onclick = () => exec(b.dataset.cmd); });
      const area = x('pe-area');
      if (area) {
        area.oninput = () => { mark(); keepRange(); };
        ['keyup', 'mouseup', 'focus'].forEach((ev) => area.addEventListener(ev, keepRange));
        area.onpaste = (e) => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertHTML', false, t.split(/\n{2,}/).map((pp) => `<p>${esc(pp).replace(/\n/g, '<br>')}</p>`).join('')); };
      }
      ['pe-stitle', 'pe-title', 'pe-note'].forEach((id) => { if (x(id)) x(id).oninput = mark; });
      document.querySelectorAll('[data-var]').forEach((i) => i.oninput = mark);
      if (x('pe-block')) x('pe-block').onchange = (e) => { const k = e.target.value; if (!k) return; insertAtCaret(`<div data-block="${k}" contenteditable="false" class="chip-block">📊 ${esc(BL(k))} (tự động)</div><p><br></p>`); e.target.value = ''; };
      if (x('pe-var')) x('pe-var').onchange = (e) => { const k = e.target.value; if (!k) return; insertAtCaret(`<span data-cfg="${k}" contenteditable="false" class="chip-cfg">${esc(VL(k))}</span>&nbsp;`); e.target.value = ''; };
      x('pe-save').onclick = () => save();
      if (x('pe-pub')) x('pe-pub').onclick = () => publish();
      if (x('pe-drop')) x('pe-drop').onclick = async () => { if (!confirm('Hủy bản nháp? Nội dung nháp sẽ bị xóa, bản đang ban hành giữ nguyên.')) return;
        try { await api(`/api/policies/${pol.id}/draft`, { method: 'DELETE' }); PO.mode = 'view'; PO.dirty = false; await renderPolicy(true); } catch (e2) { showErr('pe-err', e2.message); } };
      x('pe-close').onclick = async () => { syncCur(); if (PO.dirty && !confirm('Bản nháp có thay đổi chưa lưu. Đóng mà không lưu?')) return; PO.mode = 'view'; PO.dirty = false; await renderPolicy(true); };
    };
    const save = async (quiet) => {
      syncCur();
      try {
        const r = await api(`/api/policies/${pol.id}/draft`, { method: 'PUT', body: { content: D, note } });
        PO.dirty = false; pol.draft = { ...(pol.draft || {}), content: D, note, updated_at: r.saved_at };
        const s2 = document.getElementById('pe-state'); if (s2) s2.textContent = 'Đã lưu ' + fmtDT2(r.saved_at);
        return true;
      } catch (e) { showErr('pe-err', e.message); if (!quiet) window.scrollTo(0, 0); return false; }
    };
    const publish = async () => {
      if (!(await save(true))) return;
      const curV = pol.current && pol.current.version, m = String(curV || '0.9').match(/^(\d+)\.(\d+)$/), sug = m ? `${m[1]}.${+m[2] + 1}` : '1.0';
      const v = prompt(`Ban hành bản nháp thành phiên bản chính thức.\nMọi nhân viên sẽ thấy nội dung mới ngay.\n\nSố phiên bản:`, sug);
      if (!v) return;
      try { await api(`/api/policies/${pol.id}/publish`, { method: 'POST', body: { version: v, note } }); PO.mode = 'view'; PO.dirty = false; await renderPolicy(true); window.scrollTo(0, 0); }
      catch (e) { showErr('pe-err', e.message); }
    };
    window.onbeforeunload = () => (PO.mode === 'edit' && PO.dirty ? 'Bản nháp chưa lưu' : undefined);
    draw();
  }

  /* =========================================================================
     TRANG: PHÂN QUYỀN – nhóm quyền = ma trận Xem/Thêm/Sửa/Xóa theo mục + phạm vi dữ liệu
     ========================================================================= */
  const PM = { sel: null };
  async function renderPerm() {
    const el = document.getElementById('tab-perm');
    el.innerHTML = loading;
    let d;
    try { d = await api('/api/perm-groups'); } catch (e) { el.innerHTML = errorCard(e.message); return; }
    S.groups = d.groups;
    const meta = d.meta, A = Object.keys(meta.actions), edit = canDo('perm', 'edit');
    if (!PM.sel || !d.groups.find((g) => g.id === PM.sel)) PM.sel = (d.groups.find((g) => g.id === 'manager') || d.groups[0]).id;
    const g = d.groups.find((x) => x.id === PM.sel), ro = !edit || g.locked;
    const groupList = d.groups.map((x) => `<button data-g="${x.id}" class="w-full text-left px-3 py-2.5 rounded-xl border ${x.id === PM.sel ? 'border-redsun-600 bg-redsun-50' : 'border-slate-200 hover:bg-slate-50'}">
        <b class="text-sm text-slate-900">${esc(x.name)}</b>${x.builtin ? ' <span class="text-[10px] px-1.5 rounded bg-slate-100 text-slate-500">gốc</span>' : ''}
        <span class="block text-[11px] text-slate-500">${esc(meta.scopes[x.scope])} • ${x.users} tài khoản</span></button>`).join('');
    const rows = Object.entries(meta.modules).map(([mk, m]) => `<tr class="hover:bg-slate-50"><td class="py-2 px-3"><b class="text-slate-900">${esc(m.name)}</b>
        <span class="block text-[11px] text-slate-500">${Object.entries(m.acts).map(([a, l]) => `${meta.actions[a]}: ${esc(l)}`).join(' • ')}</span></td>
        ${A.map((a) => `<td class="py-2 px-3 text-center">${a in m.acts ? `<input type="checkbox" data-m="${mk}" data-a="${a}" class="w-4 h-4 accent-red-700" ${(g.perms[mk] || []).includes(a) ? 'checked' : ''} ${ro ? 'disabled' : ''}>` : '<span class="text-slate-300">—</span>'}</td>`).join('')}
        <td class="py-2 px-3 text-right">${ro ? '' : `<button data-row="${mk}" class="text-[11px] text-slate-500 hover:underline">tất cả</button>`}</td></tr>`).join('');
    el.innerHTML = pageHead('Phân quyền', 'Mỗi tài khoản thuộc một nhóm quyền. Nhóm quyền quy định được Xem / Thêm / Sửa / Xóa ở từng mục và phạm vi dữ liệu được thao tác.',
        canDo('perm', 'add') ? `<div class="flex gap-2"><input id="pm-new" maxlength="80" placeholder="Tên nhóm mới, vd: Kế toán" class="${inputCls} sm:w-56"><button id="pm-add" class="${BTN_P} whitespace-nowrap">＋ Tạo nhóm</button></div>` : '')
      + `<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-3 space-y-2">${groupList}<p class="text-[11px] text-slate-500 px-1 pt-2">Đổi nhóm quyền của từng người ở tab <b>Nhân viên</b> → Sửa → <b>Nhóm quyền</b>.</p></div>
        <div class="lg:col-span-9">${card(`<div class="p-5 space-y-4">
          ${errBox('pm-err')}
          ${g.locked ? '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">Nhóm <b>Admin</b> luôn có toàn quyền trên mọi mục để hệ thống luôn có người quản trị; không sửa được.</div>' : ''}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${field('Tên nhóm quyền', `<input id="pm-name" maxlength="80" value="${esc(g.name)}" class="${inputCls}" ${ro ? 'disabled' : ''}>`)}
            ${field('Mô tả', `<input id="pm-desc" maxlength="300" value="${esc(g.description || '')}" class="${inputCls}" ${ro ? 'disabled' : ''}>`)}</div>
          <div><span class="block text-xs font-bold text-slate-600 mb-1">Phạm vi dữ liệu</span><div class="flex flex-wrap gap-2">${Object.entries(meta.scopes).map(([k, l]) => `<label class="flex items-center gap-2 px-3 py-2 rounded-xl border ${g.scope === k ? 'border-redsun-600 bg-redsun-50' : 'border-slate-200'} text-sm cursor-pointer">
              <input type="radio" name="pm-scope" value="${k}" ${g.scope === k ? 'checked' : ''} ${ro ? 'disabled' : ''}> ${esc(l)}</label>`).join('')}</div>
            <p class="text-[11px] text-slate-500 mt-1">Áp dụng cho dữ liệu nhân viên, KPI, phiếu khảo sát, proposal: <b>Toàn công ty</b> – mọi người; <b>Bản thân & cấp dưới</b> – mình và người mình quản lý (trực tiếp, gián tiếp); <b>Chỉ bản thân</b>.</p></div>
          <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th class="py-2 px-3 text-left">Mục</th>
            ${A.map((a) => `<th class="py-2 px-3 text-center w-16">${esc(meta.actions[a])}${ro ? '' : `<br><button data-col="${a}" class="normal-case font-normal text-[10px] text-slate-500 hover:underline">tất cả</button>`}</th>`).join('')}<th></th></tr></thead>
            <tbody class="divide-y divide-slate-100">${rows}</tbody></table></div>
          <p class="text-[11px] text-slate-500">Có Thêm/Sửa/Xóa thì tự có Xem. Tab chỉ hiện với người có quyền Xem mục đó.</p>
          <div class="flex flex-wrap justify-between gap-2"><span>${!g.builtin && canDo('perm', 'delete') ? `<button id="pm-del" class="${BTN_S}">Xóa nhóm</button>` : ''}</span>
            <span class="flex gap-2">${canDo('perm', 'add') ? `<button id="pm-copy" class="${BTN_S}">Nhân bản nhóm</button>` : ''}${ro ? '' : `<button id="pm-save" class="${BTN_P}">Lưu nhóm quyền</button>`}</span></div>
        </div>`)}</div></div>`;
    el.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { PM.sel = b.dataset.g; renderPerm(); });
    const boxes = () => [...el.querySelectorAll('[data-m]')];
    // Tick Thêm/Sửa/Xóa thì tự tick Xem; bỏ Xem thì bỏ hết hàng đó
    boxes().forEach((c) => c.onchange = () => {
      const row = boxes().filter((x) => x.dataset.m === c.dataset.m);
      if (c.checked && c.dataset.a !== 'view') row.filter((x) => x.dataset.a === 'view').forEach((x) => { x.checked = true; });
      if (!c.checked && c.dataset.a === 'view') row.forEach((x) => { x.checked = false; });
    });
    el.querySelectorAll('[data-row]').forEach((b) => b.onclick = () => { const r = boxes().filter((x) => x.dataset.m === b.dataset.row), on = !r.every((x) => x.checked); r.forEach((x) => { x.checked = on; }); });
    el.querySelectorAll('[data-col]').forEach((b) => b.onclick = () => { const c = boxes().filter((x) => x.dataset.a === b.dataset.col), on = !c.every((x) => x.checked);
      c.forEach((x) => { x.checked = on; if (on) boxes().filter((y) => y.dataset.m === x.dataset.m && y.dataset.a === 'view').forEach((y) => { y.checked = true; }); }); });
    const collect = () => {
      const perms = {}; boxes().forEach((c) => { if (c.checked) (perms[c.dataset.m] = perms[c.dataset.m] || []).push(c.dataset.a); });
      return { name: document.getElementById('pm-name').value, description: document.getElementById('pm-desc').value, scope: (el.querySelector('[name=pm-scope]:checked') || {}).value, perms };
    };
    const run = async (fn) => { try { await fn(); await renderPerm(); } catch (e) { showErr('pm-err', e.message); } };
    const x = (id) => document.getElementById(id);
    if (x('pm-save')) x('pm-save').onclick = () => run(async () => {
      await api('/api/perm-groups/' + g.id, { method: 'PUT', body: collect() });
      if (g.id === S.me.app_role) location.reload();                 // đổi quyền của chính nhóm mình: tải lại để áp dụng
    });
    if (x('pm-add')) x('pm-add').onclick = () => run(async () => { const r = await api('/api/perm-groups', { method: 'POST', body: { name: x('pm-new').value } }); PM.sel = r.id; });
    if (x('pm-copy')) x('pm-copy').onclick = () => { const name = prompt('Tên nhóm quyền mới:', g.name + ' (bản sao)'); if (name) run(async () => { const r = await api('/api/perm-groups', { method: 'POST', body: { name, from: g.id } }); PM.sel = r.id; }); };
    if (x('pm-del')) x('pm-del').onclick = () => { if (confirm(`Xóa nhóm quyền "${g.name}"?`)) run(async () => { await api('/api/perm-groups/' + g.id, { method: 'DELETE' }); PM.sel = null; }); };
  }

  async function loadUsers(force) {
    if (S.users && !force) return S.users;
    const d = await api('/api/users');
    S.users = d.users; S.scope = d.scope;
    return S.users;
  }
  const yearOptions = (sel) => { const y0 = new Date().getFullYear(); return [y0 - 1, y0, y0 + 1, y0 + 2].map((y) => `<option value="${y}" ${y === sel ? 'selected' : ''}>${y}</option>`).join(''); };
  const pageHead = (title, sub, right = '') => `<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
      <div><h2 class="text-xl sm:text-2xl font-black text-slate-900">${title}</h2><p class="text-sm text-slate-500">${sub}</p></div>${right}</div>`;
  const card = (inner, cls = '') => `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm ${cls}">${inner}</div>`;
  const loading = '<div class="p-10 text-center text-slate-400 text-sm">Đang tải…</div>';
  const errorCard = (m) => card(`<div class="p-6 text-sm text-redsun-800">${esc(m)}</div>`);

  /* =========================================================================
     TRANG: KPI CỦA BẠN
     ========================================================================= */
  async function renderKpi() {
    const el = document.getElementById('tab-kpi');
    el.innerHTML = loading;
    if (!hasKpi(S.me)) {
      const d = deptOf(S.me.dept_id), f = formulaOfDept(d), t = S.titles[S.me.title] || {}, pr = t.params;
      const info = [['Họ tên', esc(S.me.name)], ['Phòng ban', esc(deptName(S.me.dept_id))], ['Chức danh', esc(titleName(S.me.title))], ['Tổng lương W', S.me.salary_w ? fmt(S.me.salary_w) : '—']];
      let body = `<div class="mt-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900"><b class="block mb-1">${esc(f ? f.name : 'Chưa phân phòng ban')}</b>${esc(f ? fDesc(f) : 'Tài khoản của bạn chưa được gán vào phòng ban nào nên chưa có công thức tính lương, thưởng, KPI.')}</div>`;
      if (f && f.template === 'kpi_score' && pr) {
        const cfg = f.config, par = { cb: S.me.cb_ratio ?? pr.cb, allowance: pr.allowance };
        body = `<div class="mt-6 space-y-4">` + card(`<div class="p-5"><h3 class="font-bold text-slate-900">Ước tính thu nhập theo điểm KPI</h3>
            <p class="text-xs text-slate-500 mb-3">${esc(f.name)} • Nhập % hoàn thành dự kiến của từng tiêu chí (tối đa ${P100(cfg.item_cap)}%). Điểm sàn ${P100(cfg.min_score)}%: dưới mức này không hưởng lương hiệu suất.</p>
            <table class="w-full text-sm"><thead class="text-[11px] uppercase text-slate-500 bg-slate-50"><tr><th class="py-2 px-3 text-left">Tiêu chí</th><th class="py-2 px-3 text-right">Trọng số</th><th class="py-2 px-3 text-right w-36">% hoàn thành</th></tr></thead>
            <tbody class="divide-y divide-slate-100">${cfg.criteria.map((c, i) => `<tr><td class="py-2 px-3"><b>${esc(c.name)}</b>${c.note ? `<br><span class="text-[11px] text-slate-500">${esc(c.note)}</span>` : ''}</td><td class="py-2 px-3 text-right">${P100(c.weight)}%</td>
              <td class="py-2 px-3"><div class="relative"><input data-ach="${i}" type="number" step="5" min="0" value="100" class="${inputCls} pr-7 text-right"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div></td></tr>`).join('')}</tbody></table>
            <div id="ks-out" class="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200"></div>
            ${cfg.bonus && cfg.bonus.length ? `<p class="text-[11px] text-slate-500 mt-2">Thưởng hiệu suất: ${cfg.bonus.map(([a, r]) => `từ ${P100(a)}% điểm → ${P100(r)}% W`).join(' • ')}.</p>` : ''}</div>`) + `</div>`;
        el.innerHTML = pageHead('KPI của bạn', 'Tiêu chí KPI và cách tính thu nhập theo phòng ban của bạn.') + card(`<div class="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">${info.map(([l, v]) => `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><span class="text-[11px] text-slate-400 block">${l}</span><b class="text-sm text-slate-900">${v}</b></div>`).join('')}</div>`) + body;
        const upd = () => { document.getElementById('ks-out').innerHTML = S.me.salary_w ? scoreRows(calcScore(cfg, par, S.me.salary_w, [...el.querySelectorAll('[data-ach]')].map((x) => fromP(x.value) || 0))) : '<p class="text-sm text-slate-500">Chưa có tổng lương W trong hồ sơ: nhờ Admin cập nhật để ước tính thu nhập.</p>'; };
        el.querySelectorAll('[data-ach]').forEach((x) => x.oninput = upd); upd();
        return;
      }
      if (f && f.template === 'fixed' && pr) body = `<div class="mt-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"><b class="block mb-1">${esc(f.name)}</b>${esc(fDesc(f))}<p class="mt-2">Thu nhập cố định/tháng: <b class="font-mono">${fmt((S.me.salary_w || 0) + (pr.allowance || 0))}</b> (W ${fmt(S.me.salary_w || 0)} + phụ cấp ${fmt(pr.allowance || 0)}).</p></div>`;
      el.innerHTML = pageHead('KPI của bạn', 'Chỉ tiêu và cách tính thu nhập theo phòng ban của bạn.')
        + card(`<div class="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">${info.map(([l, v]) => `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><span class="text-[11px] text-slate-400 block">${l}</span><b class="text-sm text-slate-900">${v}</b></div>`).join('')}</div>`) + body;
      return;
    }
    try {
      const d = await api(`/api/kpis?user_id=me&year=${S.year}`);
      const byM = Object.fromEntries(d.kpis.map((k) => [k.month, k]));
      const now = new Date(), curM = now.getFullYear() === S.year ? now.getMonth() + 1 : null;
      const cur = curM ? byM[curM] : null;
      const isMgr = isMgrTitle(S.me.title);
      const t = S.titles[S.me.title] || {};
      const info = (label, val) => `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><span class="text-[11px] text-slate-400 block">${label}</span><b class="text-sm text-slate-900">${val}</b></div>`;

      let curHtml;
      if (cur) {
        curHtml = `<div class="p-5 rounded-2xl bg-gradient-to-br from-redsun-900 via-redsun-700 to-redsun-600 text-white">
            <p class="text-xs uppercase tracking-wider text-red-200 font-bold">KPI tháng ${curM}/${S.year}</p>
            <div class="grid grid-cols-2 ${isMgr ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 mt-3">
              <div><span class="text-[11px] text-red-200 block">Target cá nhân</span><b class="text-xl font-black font-mono">${fmt(cur.kcn)}</b></div>
              ${isMgr ? `<div><span class="text-[11px] text-red-200 block">Target đội</span><b class="text-xl font-black font-mono">${money(cur.kteam)}</b></div>
              <div><span class="text-[11px] text-red-200 block">Target đơn vị</span><b class="text-xl font-black font-mono">${fmt(cur.kcn + (cur.kteam || 0))}</b></div>` : ''}
              <div><span class="text-[11px] text-red-200 block">Hệ số X • Lương W</span><b class="text-base font-bold">x${cur.x} • ${fmt(cur.w)}</b></div>
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-3"><button data-calc="${cur.month}" class="px-4 py-2 rounded-xl bg-white text-redsun-800 font-bold text-sm">Ước tính thu nhập với KPI này →</button>
            <span class="text-xs text-red-100">Giao bởi ${esc(cur.assigned_by_name || '—')} ngày ${fmtDate(cur.assigned_at)}${cur.note ? ' • ' + esc(cur.note) : ''}</span></div></div>`;
      } else {
        curHtml = `<div class="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">${curM ? `Tháng ${curM}/${S.year} chưa được giao KPI.` : `Chọn tháng trong bảng bên dưới để xem chi tiết.`} Khi quản lý giao KPI, chỉ tiêu sẽ hiện tại đây.</div>`;
      }

      const rows = [...MONTHS].reverse().map((m) => {   // tháng mới nhất ở trên
        const k = byM[m];
        const hl = m === curM ? 'bg-redsun-50/40' : '';
        if (!k) return `<tr class="${hl}"><td class="py-2.5 px-3 font-bold">Tháng ${m}</td><td colspan="${isMgr ? 7 : 5}" class="py-2.5 px-3 text-slate-400 italic">Chưa giao</td></tr>`;
        return `<tr class="${hl}"><td class="py-2.5 px-3 font-bold">Tháng ${m}</td>
          <td class="py-2.5 px-3 text-right font-mono">${fmt(k.w)}</td><td class="py-2.5 px-3 text-center font-mono">x${k.x}</td>
          <td class="py-2.5 px-3 text-right font-mono font-bold text-redsun-800">${fmt(k.kcn)}</td>
          ${isMgr ? `<td class="py-2.5 px-3 text-right font-mono">${money(k.kteam)}</td><td class="py-2.5 px-3 text-right font-mono font-bold">${fmt(k.kcn + (k.kteam || 0))}</td>` : ''}
          <td class="py-2.5 px-3 text-xs text-slate-500">${esc(k.assigned_by_name || '')}<br>${fmtDate(k.assigned_at)}${k.note ? `<br><i>${esc(k.note)}</i>` : ''}</td>
          <td class="py-2.5 px-3 text-right"><button data-calc="${m}" class="text-xs font-bold text-redsun-700 hover:underline">Tính thu nhập</button></td></tr>`;
      }).join('');

      el.innerHTML = pageHead('KPI của bạn', 'Chỉ tiêu doanh số được giao cho bạn theo từng tháng.',
          `<label class="text-sm text-slate-600 flex items-center gap-2">Năm <select id="kpi-year" class="px-3 py-1.5 border border-slate-300 rounded-lg font-bold">${yearOptions(S.year)}</select></label>`)
        + `<div class="space-y-6">`
        + card(`<div class="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${info('Họ tên', esc(S.me.name))}${info('Chức danh', esc(titleName(S.me.title)))}
            ${info('Quản lý trực tiếp', S.manager ? esc(S.manager.name) : '—')}${info('Tổng lương W • Cơ cấu', S.me.salary_w ? fmt(S.me.salary_w) + '<br><span class="text-xs font-normal text-slate-500">' + cbText(S.me) + '</span>' : '—')}</div>`)
        + curHtml
        + card(`<div class="px-5 py-4 border-b border-slate-100"><h3 class="font-bold text-slate-900">Bảng KPI năm ${S.year}</h3>
              <p class="text-xs text-slate-500">${isMgr ? 'Target đơn vị = target cá nhân + target đội (dùng để tính phần đơn vị của Lương hiệu suất và Thưởng quản lý).' : 'Target cá nhân dùng để tính Lương hiệu suất và Thưởng doanh số cá nhân.'}</p></div>
            <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>
              <th class="py-2.5 px-3 text-left">Tháng</th><th class="py-2.5 px-3 text-right">Lương W</th><th class="py-2.5 px-3">Hệ số X</th><th class="py-2.5 px-3 text-right">Target cá nhân</th>
              ${isMgr ? '<th class="py-2.5 px-3 text-right">Target đội</th><th class="py-2.5 px-3 text-right">Target đơn vị</th>' : ''}
              <th class="py-2.5 px-3 text-left">Người giao</th><th></th></tr></thead>
              <tbody class="divide-y divide-slate-100">${rows}</tbody></table></div>`)
        + `</div>`;
      document.getElementById('kpi-year').onchange = (e) => { S.year = +e.target.value; renderKpi(); };
      el.querySelectorAll('[data-calc]').forEach((b) => b.onclick = () => {
        if (!ROLES[S.me.title]) return alert('Chức danh của bạn không dùng bảng tính lương này.');
        C.kpiCache = {}; calcShowFor(S.me.id, +b.dataset.calc);
      });
      void t;
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  /* =========================================================================
     TRANG: GIAO KPI
     ========================================================================= */
  const A = { sel: new Set(), months: new Set([new Date().getMonth() + 1]), year: new Date().getFullYear(), q: '', title: '', listFilter: '' };

  async function renderAssign() {
    const el = document.getElementById('tab-assign');
    if (!S.rendered.assign) el.innerHTML = loading;
    try {
      const users = (await loadUsers(true)).filter((u) => u.active && hasKpi(u) && (isAll() || u.id !== S.me.id));
      S.rendered.assign = true;
      el.innerHTML = pageHead('Giao KPI', isAll() ? 'Giao chỉ tiêu cho bất kỳ nhân viên nào.' : 'Giao chỉ tiêu cho nhân viên thuộc quyền quản lý của bạn.')
        + `<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-5">${card(`<div class="p-5">
            <h3 class="font-bold text-slate-900 mb-1">1. Chọn nhân viên</h3>
            <p class="text-[11px] text-slate-500 mb-2">Chỉ hiện nhân viên thuộc phòng ban có công thức KPI (hiện tại: Lương 3P – Khối Kinh doanh).</p>
            <div class="flex gap-2 mb-2"><input id="as-q" placeholder="Tìm tên hoặc email…" value="${esc(A.q)}" class="${inputCls}">
              <select id="as-title" class="px-2 border border-slate-300 rounded-lg text-sm"><option value="">Mọi chức danh</option>${Object.entries(S.titles).filter(([k]) => ROLES[k]).map(([k, v]) => `<option value="${k}" ${A.title === k ? 'selected' : ''}>${esc(v.name.replace(/ \(.+\)$/, ''))}</option>`).join('')}</select></div>
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1"><span id="as-count"></span>
              <span><button id="as-all" class="font-bold text-redsun-700 hover:underline">Chọn tất cả đang hiện</button> · <button id="as-none" class="hover:underline">Bỏ chọn</button></span></div>
            <div id="as-list" class="max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100"></div>
          </div>`)}</div>
          <div class="lg:col-span-7 space-y-6">${card(`<div class="p-5 space-y-5">
            <div><h3 class="font-bold text-slate-900 mb-2">2. Chọn tháng</h3>
              <div class="flex flex-wrap items-center gap-2 mb-2"><select id="as-year" class="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-sm">${yearOptions(A.year)}</select>
                ${['Cả năm', 'Quý 1', 'Quý 2', 'Quý 3', 'Quý 4', 'Tháng này', 'Bỏ chọn'].map((l, i) => `<button data-mq="${i}" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">${l}</button>`).join('')}</div>
              <div id="as-months" class="grid grid-cols-6 gap-1.5"></div></div>
            <div><h3 class="font-bold text-slate-900 mb-2">3. Chỉ tiêu</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${field('Hệ số KPI (X)', `<input id="as-x" type="number" min="0.5" max="50" step="0.5" placeholder="Theo chức danh" class="${inputCls}">`, 'Để trống: dùng hệ số mặc định của từng chức danh.')}
                ${field('Target cá nhân (VNĐ)', `<input id="as-kcn" inputmode="numeric" placeholder="Tự tính = H × X" class="${inputCls}">`, 'Để trống: tự tính theo lương W của từng người.')}
              </div>
              <div class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span class="block text-xs font-bold text-slate-600 mb-1">Target đội (chỉ áp dụng cho CCO, SM, Team Lead)</span>
                <label class="flex items-center gap-2 text-sm"><input type="radio" name="as-tm" value="auto" checked> Tự cộng từ target đơn vị của cấp dưới trực tiếp × hệ số
                  <input id="as-factor" type="number" min="0.5" max="2" step="0.05" value="1" class="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm"></label>
                <label class="flex items-center gap-2 text-sm mt-1"><input type="radio" name="as-tm" value="manual"> Nhập tay
                  <input id="as-kteam" inputmode="numeric" placeholder="VNĐ" class="w-44 px-2 py-1 border border-slate-300 rounded-lg text-sm"></label>
                <p class="text-[11px] text-slate-400 mt-1">Mẹo: giao KPI cho nhân viên trước, rồi giao cho quản lý, để target đội cộng đúng số mới nhất.</p>
              </div>
              <div class="mt-3">${field('Ghi chú (tùy chọn)', `<input id="as-note" maxlength="500" class="${inputCls}" placeholder="VD: Target mùa cao điểm">`)}</div>
            </div>
            ${errBox('as-err')}
            <div class="flex flex-wrap gap-2 justify-end"><button id="as-preview" class="${BTN_S}">Xem trước</button><button id="as-save" class="${BTN_P}">Giao KPI</button></div>
            <div id="as-prev"></div>
          </div>`)}</div></div>
          <div class="mt-6" id="as-assigned"></div>`;

      const listEl = document.getElementById('as-list');
      const visible = () => users.filter((u) => (!A.title || u.title === A.title) && (!A.q || (u.name + ' ' + u.email).toLowerCase().includes(A.q.toLowerCase())));
      const drawList = () => {
        const v = visible();
        listEl.innerHTML = v.length ? v.map((u) => `<label class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" data-uid="${u.id}" ${A.sel.has(u.id) ? 'checked' : ''} class="w-4 h-4 accent-red-700">
            <span class="min-w-0"><b class="text-sm text-slate-900 block truncate">${esc(u.name)}</b><span class="text-[11px] text-slate-500">${esc(titleName(u.title))} • W ${u.salary_w ? short(u.salary_w) : '—'}</span></span></label>`).join('')
          : '<div class="p-4 text-sm text-slate-400">Không có nhân viên phù hợp.</div>';
        listEl.querySelectorAll('[data-uid]').forEach((c) => c.onchange = () => { c.checked ? A.sel.add(+c.dataset.uid) : A.sel.delete(+c.dataset.uid); count(); });
        count();
      };
      const count = () => { document.getElementById('as-count').textContent = `Đã chọn ${A.sel.size} người`; };
      document.getElementById('as-q').oninput = (e) => { A.q = e.target.value; drawList(); };
      document.getElementById('as-title').onchange = (e) => { A.title = e.target.value; drawList(); };
      document.getElementById('as-all').onclick = () => { visible().forEach((u) => A.sel.add(u.id)); drawList(); };
      document.getElementById('as-none').onclick = () => { A.sel.clear(); drawList(); };
      drawList();

      const drawMonths = () => {
        document.getElementById('as-months').innerHTML = MONTHS.map((m) => `<button data-m="${m}" class="py-2 rounded-lg text-sm font-bold border ${A.months.has(m) ? 'bg-redsun-700 border-redsun-700 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-redsun-600'}">T${m}</button>`).join('');
        document.querySelectorAll('#as-months [data-m]').forEach((b) => b.onclick = () => { const m = +b.dataset.m; A.months.has(m) ? A.months.delete(m) : A.months.add(m); drawMonths(); });
      };
      document.querySelectorAll('[data-mq]').forEach((b) => b.onclick = () => {
        const i = +b.dataset.mq;
        if (i === 0) A.months = new Set(MONTHS);
        else if (i <= 4) A.months = new Set([3 * i - 2, 3 * i - 1, 3 * i]);
        else if (i === 5) A.months = new Set([new Date().getMonth() + 1]);
        else A.months.clear();
        drawMonths();
      });
      document.getElementById('as-year').onchange = (e) => { A.year = +e.target.value; drawAssigned(); };
      drawMonths();

      const payload = (dry) => {
        const manual = document.querySelector('input[name=as-tm]:checked').value === 'manual';
        return { user_ids: [...A.sel], year: A.year, months: [...A.months].sort((a, b) => a - b),
          x: document.getElementById('as-x').value || null,
          kcn: document.getElementById('as-kcn').value ? parseVND(document.getElementById('as-kcn').value) : null,
          kteam: manual ? parseVND(document.getElementById('as-kteam').value) : null,
          team_factor: +document.getElementById('as-factor').value || 1,
          note: document.getElementById('as-note').value, dry_run: !!dry };
      };
      const existing = new Map();
      document.getElementById('as-preview').onclick = async () => {
        document.getElementById('as-err').classList.add('hidden');
        try {
          const d = await api('/api/kpis', { method: 'POST', body: payload(true) });
          const over = d.preview.filter((p) => existing.has(p.user_id + '-' + p.month)).length;
          document.getElementById('as-prev').innerHTML = `<div class="border border-slate-200 rounded-xl overflow-hidden"><div class="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-600">Xem trước ${d.preview.length} dòng KPI${over ? ` • <span class="text-amber-700">${over} dòng sẽ ghi đè KPI đã giao</span>` : ''}</div>
            <div class="max-h-72 overflow-y-auto"><table class="w-full text-sm"><thead class="text-[11px] uppercase text-slate-500"><tr><th class="py-2 px-3 text-left">Nhân viên</th><th class="py-2 px-3">Tháng</th><th class="py-2 px-3">X</th><th class="py-2 px-3 text-right">Target cá nhân</th><th class="py-2 px-3 text-right">Target đội</th></tr></thead>
            <tbody class="divide-y divide-slate-100">${d.preview.map((p) => `<tr class="${existing.has(p.user_id + '-' + p.month) ? 'bg-amber-50' : ''}"><td class="py-1.5 px-3">${esc(p.name)}</td><td class="py-1.5 px-3 text-center">${p.month}/${A.year}</td><td class="py-1.5 px-3 text-center font-mono">x${p.x}</td><td class="py-1.5 px-3 text-right font-mono">${fmt(p.kcn)}</td><td class="py-1.5 px-3 text-right font-mono">${p.kteam == null ? '—' : fmt(p.kteam)}</td></tr>`).join('')}</tbody></table></div></div>`;
        } catch (e) { showErr('as-err', e.message); }
      };
      document.getElementById('as-save').onclick = async () => {
        document.getElementById('as-err').classList.add('hidden');
        const p = payload(false);
        const over = p.user_ids.flatMap((u) => p.months.map((m) => u + '-' + m)).filter((k) => existing.has(k)).length;
        if (over && !confirm(`${over} tháng đã có KPI sẽ bị ghi đè. Tiếp tục?`)) return;
        try {
          const d = await api('/api/kpis', { method: 'POST', body: p });
          document.getElementById('as-prev').innerHTML = `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">✔ Đã giao ${d.count} dòng KPI.</div>`;
          C.kpiCache = {};
          drawAssigned();
        } catch (e) { showErr('as-err', e.message); }
      };

      async function drawAssigned() {
        const box = document.getElementById('as-assigned');
        box.innerHTML = card(loading);
        try {
          const d = await api(`/api/kpis?year=${A.year}`);
          existing.clear(); d.kpis.forEach((k) => existing.set(k.user_id + '-' + k.month, k));
          const mine = d.kpis.filter((k) => isAll() || k.user_id !== S.me.id);
          const f = A.listFilter.toLowerCase();
          const shown = mine.filter((k) => !f || (k.name + ' ' + k.email).toLowerCase().includes(f));
          box.innerHTML = card(`<div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><h3 class="font-bold text-slate-900">KPI đã giao năm ${A.year}</h3><p class="text-xs text-slate-500">${mine.length} dòng</p></div>
              <input id="as-lf" placeholder="Lọc theo tên…" value="${esc(A.listFilter)}" class="${inputCls} sm:w-64"></div>
            <div class="overflow-x-auto max-h-[480px] overflow-y-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500 sticky top-0"><tr>
              <th class="py-2.5 px-3 text-left">Nhân viên</th><th class="py-2.5 px-3">Tháng</th><th class="py-2.5 px-3 text-right">Lương W</th><th class="py-2.5 px-3">X</th>
              <th class="py-2.5 px-3 text-right">Target cá nhân</th><th class="py-2.5 px-3 text-right">Target đội</th><th class="py-2.5 px-3 text-left">Người giao</th><th></th></tr></thead>
              <tbody class="divide-y divide-slate-100">${shown.length ? shown.map((k) => `<tr><td class="py-2 px-3"><b>${esc(k.name)}</b><br><span class="text-[11px] text-slate-500">${esc(titleName(k.title))}</span></td>
                <td class="py-2 px-3 text-center">${k.month}</td><td class="py-2 px-3 text-right font-mono">${fmt(k.w)}</td><td class="py-2 px-3 text-center font-mono">x${k.x}</td>
                <td class="py-2 px-3 text-right font-mono font-bold">${fmt(k.kcn)}</td><td class="py-2 px-3 text-right font-mono">${money(k.kteam)}</td>
                <td class="py-2 px-3 text-xs text-slate-500">${esc(k.assigned_by_name || '')}<br>${fmtDate(k.assigned_at)}</td>
                <td class="py-2 px-3 text-right"><button data-del="${k.id}" class="text-xs text-redsun-700 hover:underline">Xóa</button></td></tr>`).join('')
                : '<tr><td colspan="8" class="py-6 text-center text-slate-400">Chưa có KPI nào.</td></tr>'}</tbody></table></div>`);
          document.getElementById('as-lf').oninput = (e) => { A.listFilter = e.target.value; const pos = e.target.selectionStart; drawAssigned().then(() => { const i = document.getElementById('as-lf'); i.focus(); i.setSelectionRange(pos, pos); }); };
          box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
            if (!confirm('Xóa KPI này?')) return;
            try { await api('/api/kpis/' + b.dataset.del, { method: 'DELETE', body: {} }); C.kpiCache = {}; drawAssigned(); } catch (e) { alert(e.message); }
          });
        } catch (e) { box.innerHTML = errorCard(e.message); }
      }
      drawAssigned();
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  /* =========================================================================
     TRANG: NHÂN VIÊN
     ========================================================================= */
  const ST = { q: '', showInactive: false, dept: '' };
  async function renderStaff(force) {
    const el = document.getElementById('tab-staff');
    if (!S.rendered.staff) el.innerHTML = loading;
    try {
      const users = await loadUsers(force);
      S.rendered.staff = true;
      const admin = isAll(), cAdd = canDo('staff', 'add'), cEdit = canDo('staff', 'edit'), cOrg = canDo('org'), cPerm = canDo('perm');
      const byId = Object.fromEntries(users.map((u) => [u.id, u]));
      const mgrName = (id) => id === S.me.id ? esc(S.me.name) + ' (bạn)' : (byId[id] ? esc(byId[id].name) : '—');
      const q = ST.q.toLowerCase();
      const rows = users.filter((u) => (ST.showInactive || u.active) && (!ST.dept || (ST.dept === '_none' ? !u.dept_id : u.dept_id === ST.dept)) && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)));
      el.innerHTML = pageHead('Nhân viên', admin ? 'Toàn bộ tài khoản trong hệ thống.' : 'Nhân viên thuộc quyền quản lý của bạn (trực tiếp và gián tiếp).',
          `<div class="flex flex-wrap gap-2">${cOrg ? `<button id="st-org" class="${BTN_S}">🏢 Phòng ban & chức danh</button><button id="st-formula" class="${BTN_S}">🧮 Công thức lương</button>` : ''}${cPerm ? `<button id="st-perm" class="${BTN_S}">🔐 Phân quyền</button>` : ''}${cAdd && admin ? `<button id="st-import" class="${BTN_S}">⇪ Nhập từ file CSV</button>` : ''}${cAdd && !isSelf() ? `<button id="st-add" class="${BTN_P}">＋ Thêm nhân viên</button>` : ''}</div>`)
        + card(`<div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div class="flex flex-col sm:flex-row gap-2"><input id="st-q" placeholder="Tìm tên hoặc email…" value="${esc(ST.q)}" class="${inputCls} sm:w-64">
              <select id="st-dept" class="${inputCls} sm:w-56"><option value="">Mọi phòng ban</option>${S.depts.map((d) => `<option value="${d.id}" ${ST.dept === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}<option value="_none" ${ST.dept === '_none' ? 'selected' : ''}>Chưa phân phòng</option></select></div>
            <div class="flex items-center gap-4 text-sm text-slate-600"><span>${rows.length} người</span>
            <label class="flex items-center gap-2"><input type="checkbox" id="st-inactive" ${ST.showInactive ? 'checked' : ''}> Hiện cả tài khoản đã khóa</label></div></div>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>
            <th class="py-2.5 px-3 text-left">Nhân viên</th><th class="py-2.5 px-3 text-left">Phòng ban • Chức danh</th><th class="py-2.5 px-3 text-left">Nhóm quyền</th>
            <th class="py-2.5 px-3 text-left">Quản lý trực tiếp</th><th class="py-2.5 px-3 text-right">Lương W • Cơ cấu</th><th class="py-2.5 px-3 text-left">Trạng thái</th><th></th></tr></thead>
            <tbody class="divide-y divide-slate-100">${rows.length ? rows.map((u) => `<tr class="${u.active ? '' : 'opacity-50'}">
              <td class="py-2.5 px-3"><b class="text-slate-900">${esc(u.name)}</b><br><span class="text-[11px] text-slate-500">${esc(u.email)}</span></td>
              <td class="py-2.5 px-3"><span class="text-[11px] font-bold ${u.dept_id ? 'text-redsun-700' : 'text-slate-400'}">${esc(deptName(u.dept_id))}</span><br>${esc(titleName(u.title))}</td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${u.app_role === 'admin' ? 'bg-redsun-100 text-redsun-800' : u.app_role === 'manager' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">${esc(groupName(u.app_role))}</span></td>
              <td class="py-2.5 px-3">${u.manager_id ? mgrName(u.manager_id) : '—'}</td>
              <td class="py-2.5 px-3 text-right"><span class="font-mono">${u.salary_w ? fmt(u.salary_w) : '—'}</span>${u.salary_w && pOf(u.title).cb != null && pOf(u.title).type !== 'ctv' ? `<br><span class="text-[11px] text-slate-500">${cbText(u)}</span>` : ''}</td>
              <td class="py-2.5 px-3 text-xs">${!u.active ? 'Đã khóa' : u.must_change ? '<span class="text-amber-700">Chưa đổi mật khẩu tạm</span>' : '<span class="text-emerald-700">Đang hoạt động</span>'}</td>
              <td class="py-2.5 px-3 text-right whitespace-nowrap">
                ${u.active && hasKpi(u) && canDo('assign', 'add') && (admin || u.id !== S.me.id) ? `<button data-kpi="${u.id}" class="text-xs font-bold text-redsun-700 hover:underline mr-2">Giao KPI</button>` : ''}
                ${cEdit && (admin || u.id !== S.me.id) && (u.app_role !== 'admin' || S.me.app_role === 'admin') ? `<button data-edit="${u.id}" class="text-xs font-bold text-slate-700 hover:underline mr-2">Sửa</button><button data-reset="${u.id}" class="text-xs text-slate-500 hover:underline">Cấp lại MK</button>` : ''}
              </td></tr>`).join('') : '<tr><td colspan="7" class="py-8 text-center text-slate-400">Chưa có nhân viên nào.</td></tr>'}</tbody></table></div>`);
      const qi = document.getElementById('st-q');
      qi.oninput = (e) => { ST.q = e.target.value; const p = e.target.selectionStart; renderStaff().then(() => { const i = document.getElementById('st-q'); i.focus(); i.setSelectionRange(p, p); }); };
      document.getElementById('st-inactive').onchange = (e) => { ST.showInactive = e.target.checked; renderStaff(); };
      document.getElementById('st-dept').onchange = (e) => { ST.dept = e.target.value; renderStaff(); };
      const on = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
      on('st-add', () => userForm(null, users)); on('st-import', importCsv); on('st-org', () => orgManager('dept')); on('st-formula', () => orgManager('formula')); on('st-perm', () => switchTab('perm'));
      el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => userForm(byId[+b.dataset.edit], users));
      el.querySelectorAll('[data-reset]').forEach((b) => b.onclick = () => resetPw(byId[+b.dataset.reset]));
      el.querySelectorAll('[data-kpi]').forEach((b) => b.onclick = () => { A.sel = new Set([+b.dataset.kpi]); S.rendered.assign = false; switchTab('assign'); });
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  function userForm(u, users) {
    const isNew = !u;
    const firstDept = S.depts.find((d) => d.active) || null;
    u = u || { email: '', name: '', dept_id: firstDept ? firstDept.id : '', title: '', app_role: 'staff', manager_id: '', salary_w: '', start_date: '', active: 1 };
    const mgrOpts = users.filter((x) => x.active && (!u.id || x.id !== u.id))
      .map((x) => `<option value="${x.id}" ${u.manager_id === x.id ? 'selected' : ''}>${esc(x.name)} – ${esc(titleName(x.title))}</option>`).join('');
    const range = (t) => ROLES[t] && ROLES[t].type !== 'ctv' ? `Khung ${rng(ROLES[t].min, ROLES[t].max)}` : 'Không áp dụng lương cố định';
    openModal(`${modalHead(isNew ? 'Thêm nhân viên' : 'Sửa thông tin nhân viên', isNew ? 'Hệ thống sẽ tạo mật khẩu tạm; nhân viên phải đổi ở lần đăng nhập đầu.' : esc(u.email))}
      <form id="uf" class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">${field('Email đăng nhập', `<input id="uf-email" type="email" value="${esc(u.email)}" class="${inputCls}" required>`)}</div>
        <div class="sm:col-span-2">${field('Họ tên', `<input id="uf-name" value="${esc(u.name)}" class="${inputCls}" required>`)}</div>
        ${field('Số điện thoại', `<input id="uf-phone" type="tel" value="${esc(u.phone || '')}" placeholder="09xx xxx xxx" class="${inputCls}">`, 'Hiện trên proposal và chữ ký email gửi khách.')}
        ${field('Email liên hệ', `<input id="uf-cemail" type="email" value="${esc(u.contact_email || '')}" placeholder="Để trống: dùng email đăng nhập" class="${inputCls}">`, 'Email khách liên hệ, nhận CC khi gửi proposal.')}
        ${field('Phòng ban', `<select id="uf-dept" class="${inputCls}">${S.depts.filter((d) => d.active || d.id === u.dept_id).map((d) => `<option value="${d.id}" ${u.dept_id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}<option value="" ${!u.dept_id ? 'selected' : ''}>— Chưa phân phòng (chức danh Khác) —</option></select>`)}
        ${field('Chức danh', `<select id="uf-title" class="${inputCls}"></select>`, '<span id="uf-thint"></span>')}
        <div class="sm:col-span-2 p-3 rounded-xl border text-xs" id="uf-formula"></div>
        ${field('Nhóm quyền', `<select id="uf-role" class="${inputCls}" ${canDo('perm', 'edit') ? '' : 'disabled'}>${(S.groups || [{ id: 'admin', name: 'Admin' }, { id: 'manager', name: 'Quản lý' }, { id: 'staff', name: 'Nhân viên' }]).filter((g) => g.id !== 'admin' || S.me.app_role === 'admin' || u.app_role === 'admin').map((g) => `<option value="${g.id}" ${u.app_role === g.id ? 'selected' : ''}>${esc(g.name)}${g.scope ? ' • ' + esc((S.permMeta.scopes || {})[g.scope] || '') : ''}</option>`).join('')}</select>`, canDo('perm', 'edit') ? 'Quyền Xem/Thêm/Sửa/Xóa từng mục theo nhóm. Cấu hình ở tab 🔐 Phân quyền.' : 'Cần quyền Sửa mục Phân quyền để đổi nhóm.')}
        ${field('Quản lý trực tiếp', `<select id="uf-mgr" class="${inputCls}"><option value="">— Không có —</option>${mgrOpts}</select>`)}
        ${field('Tổng lương thỏa thuận W (VNĐ)', `<input id="uf-w" inputmode="numeric" value="${u.salary_w ? fmt(u.salary_w) : ''}" class="${inputCls}">`, `<span id="uf-range">${range(u.title)}</span>`)}
        <div id="uf-cb-box">${field('Tỷ lệ lương cơ bản (%)', `<div class="flex items-center gap-2"><input id="uf-cb" type="number" min="0" max="100" step="1" value="${u.cb_ratio != null ? Math.round(u.cb_ratio * 1000) / 10 : ''}" class="${inputCls}"><span class="text-xs text-slate-500 whitespace-nowrap">CB / <b id="uf-hs"></b> HS</span></div>`, 'Để trống: theo tham số của chức danh.')}</div>
        <div class="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600" id="uf-split"></div>
        ${field('Ngày vào làm', `<input id="uf-start" type="date" value="${esc(u.start_date || '')}" class="${inputCls}">`)}
        ${isNew ? '' : field('Trạng thái', `<select id="uf-active" class="${inputCls}"><option value="1" ${u.active ? 'selected' : ''}>Đang hoạt động</option><option value="0" ${u.active ? '' : 'selected'}>Khóa tài khoản</option></select>`)}
        <div class="sm:col-span-2">${errBox('uf-err')}</div>
        <div class="sm:col-span-2 flex justify-end gap-2 pt-1"><button type="button" onclick="closeModal()" class="${BTN_S}">Hủy</button><button class="${BTN_P}">${isNew ? 'Tạo tài khoản' : 'Lưu'}</button></div>
      </form>`);
    const tSel = document.getElementById('uf-title'), rSel = document.getElementById('uf-role'), dSel = document.getElementById('uf-dept');
    // Chọn phòng ban → nạp chức danh của phòng và hiện cách tính lương, thưởng, KPI theo công thức của phòng
    const fillTitles = () => {
      const d = deptOf(dSel.value), keys = deptTitleKeys(d).filter((k) => S.titles[k].active !== false || k === u.title), keep = keys.includes(tSel.value) ? tSel.value : keys.includes(u.title) ? u.title : (keys.includes('sales') ? 'sales' : keys[0]);
      tSel.innerHTML = keys.length ? keys.map((k) => `<option value="${k}" ${k === keep ? 'selected' : ''}>${esc(titleName(k))}</option>`).join('') : '<option value="">— Phòng chưa có chức danh —</option>';
      document.getElementById('uf-thint').innerHTML = d && !keys.length ? 'Phòng này chưa có chức danh. Bấm <b>🏢 Phòng ban & chức danh</b> để thêm.' : '';
      const f = formulaOfDept(d), has = !!(f && f.template);
      const fb = document.getElementById('uf-formula');
      fb.className = `sm:col-span-2 p-3 rounded-xl border text-xs ${has ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`;
      fb.innerHTML = `<b class="block text-[13px] mb-0.5">Cách tính lương, thưởng, KPI: ${esc(f ? f.name : 'Chưa phân phòng ban')}</b>${esc(f ? fDesc(f) : 'Nhân viên chưa thuộc phòng ban nào: chỉ lưu thông tin, không tính lương, thưởng, KPI.')}`;
      onTitle();
    };
    const onTitle = () => {
      const t = S.titles[tSel.value] || {}, pr = t.params;
      const fixedPay = pr && pr.type !== 'ctv' && pr.max;
      document.getElementById('uf-range').textContent = !pr ? 'Lưu để tham khảo; chức danh chưa có công thức tính.' : pr.type === 'ctv' ? 'Không áp dụng lương cố định' : `Khung ${rng(pr.min, pr.max)}`;
      document.getElementById('uf-cb-box').classList.toggle('hidden', !fixedPay || pr.cb == null);
      document.getElementById('uf-split').classList.toggle('hidden', !pr);
      if (isNew && !rSel.disabled && ['manager', 'staff'].includes(rSel.value)) rSel.value = isMgrTitle(tSel.value) ? 'manager' : 'staff';
    };
    tSel.onchange = onTitle; dSel.onchange = fillTitles;
    const wIn = document.getElementById('uf-w'), cbIn = document.getElementById('uf-cb');
    const split = () => {
      const t = S.titles[tSel.value] || {}, pr = t.params || {}, W = parseVND(wIn.value);
      const cbDef = pr.cb || 0, cb = cbIn.value === '' ? cbDef : Math.min(100, Math.max(0, +cbIn.value)) / 100;
      cbIn.placeholder = `Mặc định ${Math.round(cbDef * 1000) / 10}`;
      document.getElementById('uf-hs').textContent = `${Math.round((1 - cb) * 1000) / 10}%`;
      const al = pr.allowance ? ` • Phụ cấp <b>${fmt(pr.allowance)}</b>` : '';
      document.getElementById('uf-split').innerHTML = !t.params ? '' : pr.type === 'ctv' ? 'Chức danh này không áp dụng lương cố định (hoa hồng theo bậc doanh số).'
        : t.template === 'sales_3p' ? `Lương cơ bản S = <b>${fmt(W * cb)}</b> • Lương hiệu suất tối đa H = <b>${fmt(W * (1 - cb))}</b> • Target cá nhân mặc định (x${pr.X}) = <b>${fmt(W * (1 - cb) * pr.X)}</b>`
        : t.template === 'kpi_score' ? `Lương cơ bản = <b>${fmt(W * cb)}</b> • Lương hiệu suất tối đa (theo điểm KPI) = <b>${fmt(W * (1 - cb))}</b>${al}`
        : `Thu nhập cố định = <b>${fmt(W)}</b>${al}`;
    };
    wIn.oninput = split; cbIn.oninput = split; tSel.addEventListener('change', split); dSel.addEventListener('change', split); fillTitles(); split();
    wIn.onblur = () => { const v = parseVND(wIn.value); wIn.value = v ? fmt(v) : ''; };
    document.getElementById('uf').onsubmit = async (e) => {
      e.preventDefault();
      if (!tSel.value) return showErr('uf-err', 'Phòng ban này chưa có chức danh. Hãy thêm chức danh cho phòng trước.');
      const body = { email: document.getElementById('uf-email').value, name: document.getElementById('uf-name').value, dept_id: dSel.value || null, title: tSel.value, app_role: rSel.value,
        manager_id: document.getElementById('uf-mgr').value || null, salary_w: parseVND(wIn.value), start_date: document.getElementById('uf-start').value || null,
        cb_ratio: cbIn.value === '' || pOf(tSel.value).cb == null ? null : Math.min(100, Math.max(0, +cbIn.value)) / 100,
        phone: document.getElementById('uf-phone').value.trim(), contact_email: document.getElementById('uf-cemail').value.trim() };
      if (!isNew) body.active = document.getElementById('uf-active').value === '1';
      try {
        if (isNew) {
          const d = await api('/api/users', { method: 'POST', body });
          showTempPw(body.email, d.temp_password, true);
        } else {
          await api('/api/users/' + u.id, { method: 'PUT', body });
          closeModal();
        }
        S.rendered.assign = false; C.kpiCache = {}; await renderStaff(true); if (C.ready) initCalc();
      } catch (err) { showErr('uf-err', err.message); }
    };
  }

  /* ---------- Phòng ban, chức danh & công thức lương, thưởng, KPI (Admin) ---------- */
  async function reloadOrg() { setOrg(await api('/api/org')); }
  const P100 = (v) => (v == null || v === '' ? '' : Math.round(v * 100000) / 1000);          // 0.125 → 12.5
  const fromP = (v) => (String(v).trim() === '' ? null : +String(v).replace(',', '.') / 100);
  const vndIn = (id, v, ph = '') => `<input id="${id}" inputmode="numeric" value="${v ? fmt(v) : ''}" placeholder="${ph}" class="${inputCls}" data-vnd>`;
  const pctIn = (id, v, ph = '') => `<div class="relative"><input id="${id}" type="number" step="0.1" value="${P100(v)}" placeholder="${ph}" class="${inputCls} pr-7"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div>`;
  const bindVnd = (root) => root.querySelectorAll('[data-vnd]').forEach((i) => { i.onblur = () => { const v = parseVND(i.value); i.value = v ? fmt(v) : ''; }; });
  const tplName = (f) => (tplOf(f) ? tplOf(f).short : 'Chưa có công thức');
  // Tóm tắt tham số chức danh
  function paramText(k) {
    const t = S.titles[k], p = t.params, tp = t.template;
    if (!tp || !p) return 'Chưa có công thức';
    const T = S.templates[tp], parts = [T.types[p.type] || p.type];
    if (p.type === 'ctv') return parts.concat('hoa hồng theo bậc doanh số').join(' • ');
    if (p.max) parts.push('khung ' + rng(p.min, p.max));
    if (p.cb != null) parts.push(`${P100(p.cb)}% CB`);
    if (tp === 'sales_3p') { parts.push('X = ' + p.X); if (p.type === 'mgr' && p.c2) parts.push(`thưởng QL ${P100(p.c2.a)}%→${P100(p.c2.b)}%`); }
    if (p.allowance) parts.push('phụ cấp ' + short(p.allowance));
    return parts.join(' • ');
  }
  // Thu nhập theo điểm KPI (mẫu kpi_score) – dùng ở form công thức (thử tính) và tab KPI của bạn
  function calcScore(cfg, p, W, achv) {
    const cb = p.cb ?? 0.7, A = W * cb, H = W * (1 - cb);
    const score = cfg.criteria.reduce((s, c, i) => s + c.weight * Math.min(Math.max(+achv[i] || 0, 0), cfg.item_cap), 0);
    const B = score < cfg.min_score ? 0 : H * Math.min(score, cfg.hs_cap);
    let rate = 0; for (const [from, r] of cfg.bonus || []) if (score >= from - 1e-9) rate = r;
    const bonus = W * rate, allowance = p.allowance || 0;
    return { A, H, score, B, rate, bonus, allowance, N: A + B + bonus + allowance };
  }
  const scoreRows = (c) => `<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">${[['Lương cơ bản A', fmt(c.A)], ['Điểm KPI', (c.score * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%'], ['Lương hiệu suất B', fmt(c.B)], ['Thưởng hiệu suất', fmt(c.bonus) + (c.rate ? ` (${P100(c.rate)}% W)` : '')], ['Phụ cấp', fmt(c.allowance)]]
    .map(([l, v]) => `<div class="p-2 rounded-lg bg-white border border-slate-200"><span class="block text-[10px] text-slate-400">${l}</span><b>${v}</b></div>`).join('')}</div>
    <p class="mt-2 text-sm">Tổng thu nhập: <b class="text-redsun-800 text-lg font-mono">${fmt(c.N)}</b></p>`;

  async function orgManager(tab = 'dept') {
    try { await reloadOrg(); } catch (e) { return alert(e.message); }
    const fOpts = (sel) => Object.entries(S.formulas).map(([k, f]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(f.name)}${f.template ? ' — ' + esc(tplName(f)) : ''}</option>`).join('');
    const after = async () => { await reloadOrg(); S.rendered.assign = false; C.kpiCache = {}; if (S.rendered.staff) renderStaff(); };
    const tabs = () => `<div class="flex gap-1 px-6 pt-3 border-b border-slate-100">${[['dept', '🏢 Phòng ban & chức danh'], ['formula', '🧮 Công thức lương, thưởng, KPI']]
      .map(([k, l]) => `<button data-otab="${k}" class="px-3 py-2 text-sm font-bold border-b-2 ${tab === k ? 'border-redsun-700 text-redsun-800' : 'border-transparent text-slate-500 hover:text-slate-800'}">${l}</button>`).join('')}</div>`;
    const bindTabs = () => document.querySelectorAll('[data-otab]').forEach((b) => b.onclick = () => { tab = b.dataset.otab; draw(); });

    /* ----- Tab phòng ban ----- */
    const deptCard = (d) => {
      const f = formulaOfDept(d), keys = deptTitleKeys(d);
      return `<div class="border border-slate-200 rounded-2xl ${d.active ? '' : 'opacity-60'}">
        <div class="px-4 py-3 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100">
          <div><b class="text-slate-900">${esc(d.name)}</b>${d.active ? '' : ' <span class="text-[11px] text-slate-500">(ngừng sử dụng)</span>'}
            <span class="block text-[11px] text-slate-500">${d.users} nhân viên đang hoạt động • Công thức: <b class="${f && f.template ? 'text-emerald-700' : 'text-amber-700'}">${esc(f ? f.name : '')}</b>${f && f.template ? ` <span class="text-slate-400">(${esc(tplName(f))})</span>` : ''}</span></div>
          <div class="flex gap-3 text-xs"><button data-dedit="${d.id}" class="font-bold text-slate-700 hover:underline">Sửa phòng</button><button data-ddel="${d.id}" class="text-redsun-700 hover:underline">Xóa</button></div></div>
        <div class="px-4 py-3">
          <div class="divide-y divide-slate-100">${keys.length ? keys.map((k) => { const t = S.titles[k]; return `<div class="py-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 ${t.active === false ? 'opacity-50' : ''}">
              <b class="text-sm text-slate-900 ${t.active === false ? 'line-through' : ''}">${esc(t.name)}</b>${t.mgr ? '<span class="text-[10px] font-bold px-1.5 rounded bg-amber-100 text-amber-800">QUẢN LÝ</span>' : ''}${t.builtin ? '<span class="text-[10px] px-1.5 rounded bg-slate-100 text-slate-500">gốc</span>' : ''}
              <span class="text-[11px] text-slate-500 flex-grow">${esc(paramText(k))} • ${t.used || 0} người</span>
              <span class="text-xs whitespace-nowrap"><button data-tedit="${k}" class="font-bold text-slate-700 hover:underline">✎ Sửa</button>${t.custom ? ` <button data-tdel="${k}" class="ml-2 text-slate-400 hover:text-redsun-700">Xóa</button>` : ''}</span></div>`; }).join('') : '<p class="text-xs text-slate-400 py-1">Chưa có chức danh.</p>'}</div>
          <button data-tadd="${d.id}" class="mt-2 text-xs font-bold text-redsun-700 hover:underline">＋ Thêm chức danh${f && f.template ? ' (tham số điền sẵn theo mẫu công thức)' : ''}</button>
        </div></div>`;
    };
    const deptTab = () => `<div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p class="text-xs font-bold text-slate-600 mb-2">THÊM PHÒNG BAN</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input id="og-name" maxlength="80" placeholder="Tên phòng ban, vd: Phòng Kế toán" class="${inputCls} sm:col-span-3">
              <select id="og-formula" class="${inputCls} sm:col-span-2">${fOpts('none')}</select><button id="og-add" class="${BTN_P} whitespace-nowrap">＋ Thêm phòng</button></div>
            <p class="text-[11px] text-slate-500 mt-1.5">Chưa có công thức phù hợp? Tạo ở tab <b>🧮 Công thức</b> rồi chọn cho phòng.</p></div>
          ${S.depts.map(deptCard).join('')}`;

    /* ----- Tab công thức ----- */
    const formulaTab = () => `<div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p class="text-xs font-bold text-slate-600 mb-2">TẠO CÔNG THỨC MỚI TỪ MẪU</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${Object.entries(S.templates).map(([k, T]) => `<label class="p-3 rounded-xl border border-slate-200 bg-white cursor-pointer has-[:checked]:border-redsun-600 has-[:checked]:ring-2 has-[:checked]:ring-redsun-100">
                <input type="radio" name="og-tpl" value="${k}" class="mr-1" ${k === 'kpi_score' ? 'checked' : ''}><b class="text-sm">${esc(T.name)}</b><span class="block text-[11px] text-slate-500 mt-1">${esc(T.desc)}</span></label>`).join('')}</div>
            <div class="flex gap-2 mt-2"><input id="og-fname" maxlength="100" placeholder="Tên công thức, vd: Lương 3P – Phòng Kế toán" class="${inputCls}"><button id="og-fadd" class="${BTN_P} whitespace-nowrap">＋ Tạo công thức</button></div></div>
          ${Object.values(S.formulas).filter((f) => f.template).map((f) => `<div class="border border-slate-200 rounded-2xl px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-2"><div><b class="text-slate-900">${esc(f.name)}</b>${f.builtin ? ' <span class="text-[10px] px-1.5 rounded bg-slate-100 text-slate-500">gốc</span>' : ''}
              <span class="block text-[11px] text-slate-500">Mẫu: ${esc(S.templates[f.template].name)} • ${f.depts} phòng ban đang dùng: ${esc(S.depts.filter((d) => d.formula === f.id).map((d) => d.name).join(', ') || '—')}</span>
              ${f.description ? `<span class="block text-xs text-slate-600 mt-1">${esc(f.description)}</span>` : ''}</div>
              <div class="flex gap-3 text-xs whitespace-nowrap"><button data-fedit="${f.id}" class="font-bold text-slate-700 hover:underline">✎ Sửa công thức</button><button data-fcopy="${f.id}" class="text-slate-600 hover:underline">Nhân bản</button>${f.builtin ? '' : `<button data-fdel="${f.id}" class="text-redsun-700 hover:underline">Xóa</button>`}</div></div></div>`).join('')}`;

    const draw = () => {
      openModal(`${modalHead('Phòng ban, chức danh & công thức', 'Mỗi phòng ban chọn một công thức tính lương, thưởng, KPI. Mỗi chức danh có tham số riêng (khung lương, % lương cơ bản, hệ số KPI…) điền sẵn theo mẫu.')}
        ${tabs()}<div class="px-6 py-5 space-y-4 max-h-[68vh] overflow-y-auto">${errBox('og-err')}${tab === 'dept' ? deptTab() : formulaTab()}</div>
        <div class="px-6 pb-5 flex justify-end"><button onclick="closeModal()" class="${BTN_P}">Xong</button></div>`, false, true);
      bindTabs();
      const box = document.getElementById('modal-box');
      const run = async (fn, next) => { try { const r = await fn(); await after(); if (next) next(r); else draw(); } catch (e) { showErr('og-err', e.message); } };
      const on = (sel, fn) => box.querySelectorAll(sel).forEach(fn);
      if (tab === 'dept') {
        document.getElementById('og-add').onclick = () => run(() => api('/api/org/departments', { method: 'POST', body: { name: document.getElementById('og-name').value, formula: document.getElementById('og-formula').value } }));
        on('[data-dedit]', (b) => b.onclick = () => deptForm(deptOf(b.dataset.dedit)));
        on('[data-ddel]', (b) => b.onclick = () => { const d = deptOf(b.dataset.ddel); if (confirm(`Xóa phòng ban "${d.name}" và các chức danh tự tạo của phòng?`)) run(() => api('/api/org/departments/' + d.id, { method: 'DELETE' })); });
        on('[data-tadd]', (b) => b.onclick = () => titleForm(null, b.dataset.tadd));
        on('[data-tedit]', (b) => b.onclick = () => titleForm(b.dataset.tedit));
        on('[data-tdel]', (b) => b.onclick = () => { const k = b.dataset.tdel; if (confirm(`Xóa chức danh "${titleName(k)}"?`)) run(() => api('/api/org/titles/' + k, { method: 'DELETE' })); });
      } else {
        document.getElementById('og-fadd').onclick = () => run(() => api('/api/org/formulas', { method: 'POST', body: { template: (box.querySelector('[name=og-tpl]:checked') || {}).value, name: document.getElementById('og-fname').value } }), (r) => formulaForm(r.id));
        on('[data-fedit]', (b) => b.onclick = () => formulaForm(b.dataset.fedit));
        on('[data-fcopy]', (b) => b.onclick = () => { const f = S.formulas[b.dataset.fcopy], name = prompt('Tên công thức mới:', f.name + ' (bản sao)'); if (name) run(() => api('/api/org/formulas', { method: 'POST', body: { from: f.id, name } }), (r) => formulaForm(r.id)); });
        on('[data-fdel]', (b) => b.onclick = () => { const f = S.formulas[b.dataset.fdel]; if (confirm(`Xóa công thức "${f.name}"?`)) run(() => api('/api/org/formulas/' + f.id, { method: 'DELETE' })); });
      }
    };

    /* ----- Form chức danh: tên + tham số theo mẫu công thức của phòng ----- */
    const titleForm = (k, deptId) => {
      const isNew = !k, t = isNew ? { name: '', en: '', custom: true, dept_id: deptId, active: true, params: null, used: 0 } : S.titles[k];
      const d = deptOf(t.dept_id) || (t.builtin ? S.depts.find((x) => x.formula === 'sales') : null);
      const f = t.builtin ? S.formulas.sales : formulaOfDept(d), tp = t.builtin ? 'sales_3p' : (f && f.template), T = tp ? S.templates[tp] : null;
      let p = t.params || (T ? JSON.parse(JSON.stringify(T.params.staff)) : null);
      const moveDepts = S.depts;
      const paramBox = () => {
        if (!T) return `<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">Phòng ban chưa có công thức: chức danh chỉ lưu tên. Chọn công thức cho phòng để khai báo khung lương và cách tính.</div>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="tf-mgr" ${t.mgr ? 'checked' : ''}> Là chức danh quản lý</label>`;
        const ctv = p.type === 'ctv', mgr = p.type === 'mgr';
        return `<div class="p-4 rounded-2xl border border-slate-200 space-y-3"><p class="text-xs font-bold text-slate-600">THAM SỐ TÍNH LƯƠNG • ${esc(f ? f.name : '')}</p>
          ${field('Loại chức danh', `<select id="tf-type" class="${inputCls}" ${t.builtin ? 'disabled' : ''}>${Object.entries(T.types).map(([v, l]) => `<option value="${v}" ${p.type === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`, t.builtin ? 'Chức danh gốc giữ nguyên loại.' : 'Đổi loại sẽ điền lại tham số mặc định của loại đó.')}
          ${ctv ? `<p class="text-xs text-slate-500">Cộng tác viên không có lương cố định; hoa hồng theo bậc doanh số của công thức.</p>` : `
          <div class="grid grid-cols-2 gap-3">${field('Khung lương W tối thiểu', vndIn('tf-min', p.min))}${field('Khung lương W tối đa', vndIn('tf-max', p.max))}</div>
          ${tp !== 'fixed' ? `<div class="grid grid-cols-2 gap-3">${field('% lương cơ bản (CB)', pctIn('tf-cb', p.cb), 'Phần còn lại là lương hiệu suất tối đa H.')}
            ${tp === 'sales_3p' ? field('Hệ số KPI X', `<input id="tf-x" type="number" step="0.5" min="0.5" max="50" value="${p.X ?? ''}" class="${inputCls}">`, 'Target doanh số = H × X.') : field('Phụ cấp cố định / tháng', vndIn('tf-allow', p.allowance))}</div>` : field('Phụ cấp cố định / tháng', vndIn('tf-allow', p.allowance))}
          ${tp === 'sales_3p' ? `${field('Hệ số X tăng dần cho người mới (tùy chọn)', `<input id="tf-ramp" value="${esc((p.ramp || []).join(', '))}" placeholder="VD: 6, 7, 8 (tháng 1, 2, 3)" class="${inputCls}">`)}
            ${mgr ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${field('Trọng số cá nhân', pctIn('tf-wcn', p.wCn), 'Còn lại: đơn vị')}${field('Ngưỡng thưởng QL', pctIn('tf-t0', p.c2 && p.c2.t0), '% đạt đơn vị')}
              ${field('Thưởng QL khi đạt 100%', pctIn('tf-a', p.c2 && p.c2.a), '% DS đơn vị')}${field('Thưởng QL khi đạt 120%', pctIn('tf-b', p.c2 && p.c2.b), '% DS đơn vị')}</div>` : ''}` : ''}`}
          <p class="text-[11px] text-slate-500" id="tf-preview"></p></div>`;
      };
      const readParams = () => {
        if (!T) return null;
        const v = (id) => { const e = document.getElementById(id); return e ? e.value : undefined; };
        const out = { type: t.builtin ? p.type : v('tf-type') };
        if (out.type === 'ctv') return out;
        out.min = parseVND(v('tf-min')); out.max = parseVND(v('tf-max'));
        if (tp !== 'fixed') out.cb = fromP(v('tf-cb'));
        if (tp === 'sales_3p') {
          out.X = +v('tf-x'); out.ramp = v('tf-ramp') || '';
          if (out.type === 'mgr') { out.wCn = fromP(v('tf-wcn')); out.c2 = { t0: fromP(v('tf-t0')), a: fromP(v('tf-a')), b: fromP(v('tf-b')) }; }
        } else out.allowance = parseVND(v('tf-allow'));
        return out;
      };
      const preview = () => {
        const el = document.getElementById('tf-preview'); if (!el || !T) return;
        const q = readParams(); if (q.type === 'ctv') { el.textContent = ''; return; }
        const W = (q.min + q.max) / 2;
        if (tp === 'sales_3p') el.innerHTML = `Ví dụ W = ${fmt(W)}: lương cơ bản ${fmt(W * q.cb)} • lương hiệu suất tối đa H ${fmt(W * (1 - q.cb))} • target doanh số ${fmt(W * (1 - q.cb) * q.X)}`;
        else if (tp === 'kpi_score') el.innerHTML = `Ví dụ W = ${fmt(W)}: lương cơ bản ${fmt(W * q.cb)} • lương hiệu suất tối đa ${fmt(W * (1 - q.cb))} • phụ cấp ${fmt(q.allowance)}`;
        else el.innerHTML = `Ví dụ W = ${fmt(W)}: thu nhập ${fmt(W + q.allowance)}/tháng (đã gồm phụ cấp).`;
      };
      const render = () => {
        openModal(`${modalHead(isNew ? 'Thêm chức danh' : 'Sửa chức danh', `${esc(d ? d.name : 'Khối Kinh doanh')}${t.builtin ? ` • tên gốc: ${esc(t.default_name)}` : ''}`)}<form id="tfm" class="px-6 py-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${field('Tên chức danh (tiếng Việt)', `<input id="tfm-name" maxlength="80" value="${esc(t.name)}" class="${inputCls}" required>`)}
            ${field('Tên tiếng Anh', `<input id="tfm-en" maxlength="80" value="${esc(t.en || '')}" placeholder="${esc(t.default_en || 'VD: Chief Accountant')}" class="${inputCls}">`, 'Dùng cho proposal tiếng Anh.')}</div>
          ${paramBox()}
          ${t.custom && !isNew ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${field('Phòng ban', `<select id="tfm-dept" class="${inputCls}" ${t.used ? 'disabled' : ''}>${moveDepts.map((x) => `<option value="${x.id}" ${x.id === t.dept_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`, t.used ? `${t.used} người đang giữ: chưa chuyển phòng được.` : '')}
            ${field('Thứ tự hiển thị', `<input id="tfm-sort" type="number" min="0" max="999" value="${t.sort || 0}" class="${inputCls}">`)}
            ${field('Trạng thái', `<select id="tfm-active" class="${inputCls}"><option value="1" ${t.active !== false ? 'selected' : ''}>Đang sử dụng</option><option value="0" ${t.active === false ? 'selected' : ''}>Ngừng sử dụng</option></select>`)}</div>` : ''}
          ${errBox('tfm-err')}
          <div class="flex justify-between gap-2">${t.builtin ? '<button type="button" id="tfm-reset" class="text-xs text-slate-500 hover:underline">Khôi phục tên & tham số gốc</button>' : '<span></span>'}
            <span class="flex gap-2"><button type="button" id="tfm-back" class="${BTN_S}">Quay lại</button><button class="${BTN_P}">${isNew ? 'Thêm chức danh' : 'Lưu'}</button></span></div></form>`, false, true);
        const box = document.getElementById('modal-box');
        bindVnd(box);
        box.querySelectorAll('input,select').forEach((e) => e.addEventListener('input', preview));
        const ty = document.getElementById('tf-type');
        if (ty) ty.onchange = () => { t.name = document.getElementById('tfm-name').value; t.en = document.getElementById('tfm-en').value; p = JSON.parse(JSON.stringify(T.params[ty.value])); render(); };
        document.getElementById('tfm-back').onclick = draw;
        const save = async (body) => {
          try {
            if (isNew) await api(`/api/org/departments/${deptId}/titles`, { method: 'POST', body });
            else await api('/api/org/titles/' + k, { method: 'PUT', body });
            await after(); draw();
          } catch (err) { showErr('tfm-err', err.message); }
        };
        const rs = document.getElementById('tfm-reset');
        if (rs) rs.onclick = () => save({ name: t.default_name, en: t.default_en || '', params: t.default_params });
        document.getElementById('tfm').onsubmit = (e) => {
          e.preventDefault();
          const body = { name: document.getElementById('tfm-name').value, en: document.getElementById('tfm-en').value };
          if (T) body.params = readParams(); else body.mgr = document.getElementById('tf-mgr').checked;
          if (t.custom && !isNew) Object.assign(body, { sort: +document.getElementById('tfm-sort').value, active: document.getElementById('tfm-active').value === '1', dept_id: document.getElementById('tfm-dept').value || t.dept_id });
          if (body.dept_id && body.dept_id !== t.dept_id) delete body.params;     // chuyển phòng: lấy tham số theo công thức phòng mới
          save(body);
        };
        preview();
      };
      render();
    };

    /* ----- Form công thức: tham số chung theo mẫu ----- */
    const formulaForm = (id) => {
      const f = S.formulas[id], T = S.templates[f.template];
      const cfg = JSON.parse(JSON.stringify(f.config || {}));
      const bandRows = (key, kind) => (cfg[key] || []).map((b, i, a) => `<tr><td class="py-1 pr-2">${i === a.length - 1 ? '<span class="text-xs text-slate-500">Phần còn lại (trở lên)</span>'
          : kind === 'money' ? `<input data-b="${key}" data-i="${i}" data-j="0" inputmode="numeric" value="${fmt(b[0])}" class="${inputCls}" data-vnd>` : `<div class="relative"><input data-b="${key}" data-i="${i}" data-j="0" type="number" step="1" value="${P100(b[0])}" class="${inputCls} pr-7"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div>`}</td>
        <td class="py-1 pr-2"><div class="relative"><input data-b="${key}" data-i="${i}" data-j="1" type="number" step="0.1" value="${P100(b[1])}" class="${inputCls} pr-7"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div></td>
        <td class="py-1 text-right">${a.length > 1 ? `<button type="button" data-brm="${key}" data-i="${i}" class="text-slate-400 hover:text-redsun-700 text-lg leading-none">×</button>` : ''}</td></tr>`).join('');
      const bandTable = (key, title, h0, kind, hint) => `<div class="p-4 rounded-2xl border border-slate-200"><p class="text-xs font-bold text-slate-600">${title}</p><p class="text-[11px] text-slate-500 mb-2">${hint}</p>
        <table class="w-full text-sm"><thead class="text-[11px] text-slate-500"><tr><th class="text-left font-semibold pb-1">${h0}</th><th class="text-left font-semibold pb-1">Tỷ lệ áp dụng cho phần trong bậc</th><th></th></tr></thead><tbody>${bandRows(key, kind)}</tbody></table>
        <button type="button" data-badd="${key}" class="mt-1 text-xs font-bold text-redsun-700 hover:underline">＋ Thêm bậc</button></div>`;
      const critRows = () => (cfg.criteria || []).map((c, i) => `<tr><td class="py-1 pr-2"><input data-c="name" data-i="${i}" value="${esc(c.name)}" class="${inputCls}" placeholder="Tên tiêu chí"></td>
        <td class="py-1 pr-2 w-28"><div class="relative"><input data-c="weight" data-i="${i}" type="number" step="1" value="${P100(c.weight)}" class="${inputCls} pr-7"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div></td>
        <td class="py-1 pr-2"><input data-c="note" data-i="${i}" value="${esc(c.note || '')}" class="${inputCls}" placeholder="Cách đo (tùy chọn)"></td>
        <td class="py-1 text-right"><button type="button" data-crm="${i}" class="text-slate-400 hover:text-redsun-700 text-lg leading-none">×</button></td></tr>`).join('');
      const titlesUsing = () => Object.entries(S.titles).filter(([, t]) => t.formula === f.id && (t.builtin ? f.id === 'sales' : true));
      const body = () => {
        if (f.template === 'sales_3p') return `${bandTable('c1', 'THƯỞNG DOANH SỐ CÁ NHÂN C₁ (lũy tiến theo % đạt KPI cá nhân)', 'Đến mốc % đạt KPI', 'pct', 'Mỗi phần doanh số trong một bậc nhân với tỷ lệ của bậc đó. VD: mốc 50% tỷ lệ 2% nghĩa là phần doanh số từ 0 đến 50% target được thưởng 2%.')}
          ${bandTable('ctv', 'HOA HỒNG CỘNG TÁC VIÊN (lũy tiến theo doanh số)', 'Đến mốc doanh số (VNĐ)', 'money', 'Áp dụng cho chức danh loại Cộng tác viên.')}
          ${field('Target đội minh họa trên Bảng tính (× lương hiệu suất H)', `<input id="ff-kteam" type="number" min="1" max="500" value="${cfg.kteam_mult ?? 40}" class="${inputCls} sm:w-40">`)}
          <p class="text-[11px] text-slate-500">Khung lương, % lương cơ bản, hệ số X, thưởng quản lý C₂ khai báo riêng cho từng chức danh (bên dưới).</p>`;
        if (f.template === 'kpi_score') return `<div class="p-4 rounded-2xl border border-slate-200"><p class="text-xs font-bold text-slate-600">TIÊU CHÍ KPI & TRỌNG SỐ</p><p class="text-[11px] text-slate-500 mb-2">Cuối tháng chấm % hoàn thành từng tiêu chí; điểm KPI = Σ trọng số × % hoàn thành. Tổng trọng số phải bằng 100% (hiện <b id="ff-wsum"></b>).</p>
            <table class="w-full text-sm"><thead class="text-[11px] text-slate-500"><tr><th class="text-left font-semibold">Tiêu chí</th><th class="text-left font-semibold">Trọng số</th><th class="text-left font-semibold">Cách đo</th><th></th></tr></thead><tbody>${critRows()}</tbody></table>
            <button type="button" id="ff-cadd" class="mt-1 text-xs font-bold text-redsun-700 hover:underline">＋ Thêm tiêu chí</button></div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${field('Trần % mỗi tiêu chí', pctIn('ff-cap', cfg.item_cap), 'VD 120%: vượt hơn cũng chỉ tính 120%.')}
            ${field('Điểm sàn', pctIn('ff-min', cfg.min_score), 'Dưới điểm này không hưởng lương hiệu suất.')}${field('Trần lương hiệu suất', pctIn('ff-hscap', cfg.hs_cap), 'B = H × điểm KPI, tối đa H × mức này.')}</div>
          <div class="p-4 rounded-2xl border border-slate-200"><p class="text-xs font-bold text-slate-600">THƯỞNG HIỆU SUẤT THEO BẬC ĐIỂM</p><p class="text-[11px] text-slate-500 mb-2">Đạt từ mốc điểm nào thì thưởng = tỷ lệ × W của bậc cao nhất đạt được.</p>
            <table class="w-full text-sm"><thead class="text-[11px] text-slate-500"><tr><th class="text-left font-semibold">Điểm KPI từ</th><th class="text-left font-semibold">Thưởng (% W)</th><th></th></tr></thead><tbody>${(cfg.bonus || []).map((b, i) => `<tr>
              <td class="py-1 pr-2"><div class="relative"><input data-bn="0" data-i="${i}" type="number" step="1" value="${P100(b[0])}" class="${inputCls} pr-7"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div></td>
              <td class="py-1 pr-2"><div class="relative"><input data-bn="1" data-i="${i}" type="number" step="0.5" value="${P100(b[1])}" class="${inputCls} pr-7"><span class="absolute right-2 top-2 text-xs text-slate-400">%</span></div></td>
              <td class="py-1 text-right"><button type="button" data-bnrm="${i}" class="text-slate-400 hover:text-redsun-700 text-lg leading-none">×</button></td></tr>`).join('')}</tbody></table>
            <button type="button" id="ff-bnadd" class="mt-1 text-xs font-bold text-redsun-700 hover:underline">＋ Thêm bậc thưởng</button></div>
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200"><p class="text-xs font-bold text-slate-600 mb-2">THỬ TÍNH</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">${field('W', vndIn('tt-w', 12e6))}${field('% CB', pctIn('tt-cb', 0.7))}${field('Phụ cấp', vndIn('tt-al', 0))}${field('Hoàn thành mọi tiêu chí', pctIn('tt-all', 1))}</div><div id="tt-out"></div></div>`;
        return '<p class="text-sm text-slate-600">Mẫu này không có tham số chung. Khung lương và phụ cấp khai báo theo từng chức danh.</p>';
      };
      const readCfg = () => {
        const box = document.getElementById('modal-box');
        box.querySelectorAll('[data-b]').forEach((e) => { const b = cfg[e.dataset.b][+e.dataset.i]; b[+e.dataset.j] = e.hasAttribute('data-vnd') ? parseVND(e.value) : fromP(e.value); });
        box.querySelectorAll('[data-c]').forEach((e) => { const c = cfg.criteria[+e.dataset.i]; c[e.dataset.c] = e.dataset.c === 'weight' ? fromP(e.value) : e.value; });
        box.querySelectorAll('[data-bn]').forEach((e) => { cfg.bonus[+e.dataset.i][+e.dataset.bn] = fromP(e.value); });
        const v = (id) => document.getElementById(id);
        if (v('ff-kteam')) cfg.kteam_mult = +v('ff-kteam').value;
        if (v('ff-cap')) { cfg.item_cap = fromP(v('ff-cap').value); cfg.min_score = fromP(v('ff-min').value); cfg.hs_cap = fromP(v('ff-hscap').value); }
        f.name = v('ff-name').value; f.description = v('ff-desc').value;
      };
      const render = () => {
        openModal(`${modalHead('Sửa công thức', `Mẫu: ${esc(T.name)}`)}<form id="ffm" class="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          ${field('Tên công thức', `<input id="ff-name" maxlength="100" value="${esc(f.name)}" class="${inputCls}" required>`)}
          ${field('Mô tả / ghi chú áp dụng (tùy chọn)', `<textarea id="ff-desc" rows="2" maxlength="1000" class="${inputCls}">${esc(f.description || '')}</textarea>`, esc(T.desc))}
          ${body()}
          <div class="p-4 rounded-2xl border border-slate-200"><p class="text-xs font-bold text-slate-600 mb-1">CHỨC DANH DÙNG CÔNG THỨC NÀY</p>
            ${titlesUsing().length ? titlesUsing().map(([k, t]) => `<div class="py-1 flex items-center gap-2 text-sm"><b>${esc(t.name)}</b><span class="text-[11px] text-slate-500 flex-grow">${esc(paramText(k))}</span><button type="button" data-tedit2="${k}" class="text-xs font-bold text-slate-700 hover:underline">✎ Sửa</button></div>`).join('')
              : '<p class="text-xs text-slate-400">Chưa có chức danh nào. Chọn công thức này cho một phòng ban rồi thêm chức danh cho phòng.</p>'}</div>
          ${errBox('ffm-err')}
          <div class="flex justify-end gap-2"><button type="button" id="ffm-back" class="${BTN_S}">Quay lại</button><button class="${BTN_P}">Lưu công thức</button></div></form>`, false, true);
        const box = document.getElementById('modal-box');
        bindVnd(box);
        const sum = () => { const e = document.getElementById('ff-wsum'); if (!e) return; readCfg(); const t = cfg.criteria.reduce((s, c) => s + (c.weight || 0), 0); e.textContent = (Math.round(t * 1000) / 10) + '%'; e.className = Math.abs(t - 1) < 0.001 ? 'text-emerald-700' : 'text-redsun-700'; };
        const test = () => { const o = document.getElementById('tt-out'); if (!o) return; readCfg();
          const all = fromP(document.getElementById('tt-all').value) || 0;
          try { o.innerHTML = scoreRows(calcScore(cfg, { cb: fromP(document.getElementById('tt-cb').value), allowance: parseVND(document.getElementById('tt-al').value) }, parseVND(document.getElementById('tt-w').value), cfg.criteria.map(() => all))); } catch (e) { o.textContent = ''; } };
        box.querySelectorAll('input').forEach((e) => e.addEventListener('input', () => { sum(); test(); }));
        const redraw = () => { readCfg(); render(); };
        box.querySelectorAll('[data-badd]').forEach((b) => b.onclick = () => { readCfg(); const a = cfg[b.dataset.badd], last = a[a.length - 1], prev = a.length > 1 ? a[a.length - 2][0] : 0;
          a.splice(a.length - 1, 0, [b.dataset.badd === 'ctv' ? (prev || 0) + 50e6 : (prev || 0) + 0.2, last[1]]); render(); });
        box.querySelectorAll('[data-brm]').forEach((b) => b.onclick = () => { readCfg(); const a = cfg[b.dataset.brm]; a.splice(+b.dataset.i, 1); a[a.length - 1][0] = null; render(); });
        const ca = document.getElementById('ff-cadd'); if (ca) ca.onclick = () => { readCfg(); cfg.criteria.push({ name: '', weight: 0, note: '' }); render(); };
        box.querySelectorAll('[data-crm]').forEach((b) => b.onclick = () => { readCfg(); cfg.criteria.splice(+b.dataset.crm, 1); render(); });
        const ba = document.getElementById('ff-bnadd'); if (ba) ba.onclick = () => { readCfg(); const l = cfg.bonus[cfg.bonus.length - 1]; cfg.bonus.push([l ? l[0] + 0.1 : 1, l ? l[1] + 0.05 : 0.05]); render(); };
        box.querySelectorAll('[data-bnrm]').forEach((b) => b.onclick = () => { readCfg(); cfg.bonus.splice(+b.dataset.bnrm, 1); render(); });
        box.querySelectorAll('[data-tedit2]').forEach((b) => b.onclick = () => titleForm(b.dataset.tedit2));
        document.getElementById('ffm-back').onclick = () => { tab = 'formula'; draw(); };
        document.getElementById('ffm').onsubmit = async (e) => {
          e.preventDefault(); readCfg();
          try { await api('/api/org/formulas/' + f.id, { method: 'PUT', body: { name: f.name, description: f.description, config: cfg } }); await after(); tab = 'formula'; draw(); }
          catch (err) { showErr('ffm-err', err.message); }
        };
        void redraw; sum(); test();
      };
      render();
    };

    const deptForm = (d) => {
      openModal(`${modalHead('Sửa phòng ban', esc(d.name))}<form id="dfm" class="px-6 py-5 space-y-3">
        ${field('Tên phòng ban', `<input id="dfm-name" maxlength="80" value="${esc(d.name)}" class="${inputCls}" required>`)}
        ${field('Công thức lương, thưởng, KPI', `<select id="dfm-formula" class="${inputCls}">${fOpts(d.formula)}</select>`, d.users ? 'Phòng đang có nhân viên: chỉ đổi được sang công thức cùng mẫu.' : 'Đổi sang mẫu khác: tham số các chức danh tự tạo của phòng được điền lại theo mẫu mới.')}
        <div id="dfm-desc" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"></div>
        ${field('Thứ tự hiển thị', `<input id="dfm-sort" type="number" min="0" max="999" value="${d.sort || 0}" class="${inputCls}">`)}
        ${field('Trạng thái', `<select id="dfm-active" class="${inputCls}"><option value="1" ${d.active ? 'selected' : ''}>Đang sử dụng</option><option value="0" ${d.active ? '' : 'selected'}>Ngừng sử dụng (ẩn khỏi danh sách chọn khi thêm nhân viên)</option></select>`)}
        ${errBox('dfm-err')}
        <div class="flex justify-end gap-2"><button type="button" id="dfm-back" class="${BTN_S}">Quay lại</button><button class="${BTN_P}">Lưu</button></div></form>`, false, true);
      const fSel = document.getElementById('dfm-formula'), desc = () => { document.getElementById('dfm-desc').textContent = fDesc(S.formulas[fSel.value]); };
      fSel.onchange = desc; desc();
      document.getElementById('dfm-back').onclick = draw;
      document.getElementById('dfm').onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api('/api/org/departments/' + d.id, { method: 'PUT', body: { name: document.getElementById('dfm-name').value, formula: fSel.value, sort: +document.getElementById('dfm-sort').value, active: document.getElementById('dfm-active').value === '1' } });
          await after(); draw();
        } catch (err) { showErr('dfm-err', err.message); }
      };
    };
    draw();
  }

  /* ---------- Nhập nhân viên từ CSV (vd: danh-sach-tai-khoan.csv của công cụ cũ) ---------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',' || ch === ';') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((v) => v.trim())) rows.push(row); row = []; }
      else cell += ch;
    }
    row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
    const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }
  function guessTitle(s) {
    s = (s || '').toLowerCase();
    if (/giám đốc kinh doanh|\bcco\b/.test(s)) return 'cco';
    if (/trưởng phòng|\bsm\b/.test(s)) return 'sm';
    if (/trưởng nhóm|team lead|\btl\b/.test(s)) return 'tl';
    if (/chuyên viên|senior/.test(s)) return 'senior';
    if (/tập sự|fresher|intern/.test(s)) return 'intern';
    if (/cộng tác|\bctv\b/.test(s)) return 'ctv';
    if (/nhân viên|sales/.test(s)) return 'sales';
    return 'other';
  }
  function importCsv() {
    openModal(`${modalHead('Nhập nhân viên từ file CSV', 'Dùng được file danh-sach-tai-khoan.csv của công cụ cũ, hoặc file Excel lưu dạng CSV UTF-8.')}
      <div class="px-6 py-5 space-y-3 text-sm">
        <p class="text-slate-600">Các cột được nhận: <code>tai_khoan</code> hoặc <code>email</code>, <code>ho_ten</code>, <code>phong_ban</code> (tên phòng ban; để trống thì chức danh kinh doanh vào Phòng Kinh doanh), <code>chuc_danh</code>, <code>mat_khau</code> (nếu có, giữ nguyên mật khẩu đã cấp), <code>luong_w</code>, <code>ty_le_cb</code> (% lương cơ bản), <code>quan_ly</code> (email quản lý trực tiếp). Ai đã có tài khoản sẽ được bỏ qua.</p>
        <input type="file" id="ic-file" accept=".csv,text/csv" class="block w-full text-sm">
        <div id="ic-prev"></div>${errBox('ic-err')}
        <div class="flex justify-end gap-2"><button onclick="closeModal()" class="${BTN_S}">Hủy</button><button id="ic-go" class="${BTN_P}" disabled>Nhập</button></div>
      </div>`);
    let rows = [];
    document.getElementById('ic-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const recs = parseCSV(await f.text());
      rows = recs.map((r) => {
        const email = (r.tai_khoan || r.email || '').toLowerCase();
        const dpt = r.phong_ban && S.depts.find((d) => d.name.toLowerCase() === r.phong_ban.trim().toLowerCase());
        const own = dpt ? deptTitleKeys(dpt).find((k) => titleName(k).toLowerCase() === (r.chuc_danh || '').trim().toLowerCase()) : null;
        const title = own || guessTitle(r.chuc_danh);
        return { email, name: r.ho_ten || email, dept_name: r.phong_ban || undefined, title, app_role: email === 'admin' ? 'admin' : isMgrTitle(title) ? 'manager' : 'staff',
          password: r.mat_khau || '', salary_w: parseVND(r.luong_w || ''), cb_ratio: (() => { if (!r.ty_le_cb) return null; const v = parseFloat(String(r.ty_le_cb).replace('%', '').replace(',', '.')); return isNaN(v) ? null : (v > 1 ? v / 100 : v); })(), manager_email: r.quan_ly || r.quan_ly_email || '' };
      }).filter((r) => r.email);
      const exist = new Set((S.users || []).map((u) => u.email));
      document.getElementById('ic-prev').innerHTML = `<div class="border border-slate-200 rounded-xl max-h-64 overflow-y-auto"><table class="w-full text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase"><tr><th class="py-1.5 px-2 text-left">Email</th><th class="py-1.5 px-2 text-left">Họ tên</th><th class="py-1.5 px-2 text-left">Chức danh</th><th class="py-1.5 px-2 text-left">Quyền</th><th class="py-1.5 px-2 text-left">Mật khẩu</th></tr></thead>
        <tbody class="divide-y divide-slate-100">${rows.map((r) => `<tr class="${exist.has(r.email) ? 'opacity-40' : ''}"><td class="py-1.5 px-2">${esc(r.email)}${exist.has(r.email) ? ' <i>(đã có)</i>' : ''}</td><td class="py-1.5 px-2">${esc(r.name)}</td><td class="py-1.5 px-2">${esc(titleName(r.title))}</td><td class="py-1.5 px-2">${ROLE_LABEL[r.app_role]}</td><td class="py-1.5 px-2">${r.password ? 'Giữ mật khẩu cũ' : 'Tạo mật khẩu tạm'}</td></tr>`).join('')}</tbody></table></div>
        <p class="text-[11px] text-slate-500 mt-1">${rows.length} dòng. Sau khi nhập, có thể sửa chức danh, lương W, quản lý trực tiếp ở danh sách nhân viên. Mọi người sẽ được yêu cầu tự đặt mật khẩu riêng ở lần đăng nhập đầu.</p>`;
      document.getElementById('ic-go').disabled = !rows.length;
    };
    document.getElementById('ic-go').onclick = async () => {
      try {
        const d = await api('/api/users/import', { method: 'POST', body: { users: rows } });
        const temps = d.created.filter((c) => c.temp_password);
        const text = temps.map((c) => `${c.email}: ${c.temp_password}`).join('\n');
        openModal(`${modalHead('Đã nhập danh sách')}<div class="px-6 py-5 space-y-3 text-sm">
          <p>✔ Đã tạo <b>${d.created.length}</b> tài khoản${d.skipped.length ? `, bỏ qua <b>${d.skipped.length}</b> dòng` : ''}.</p>
          ${d.skipped.length ? `<div class="p-3 rounded-lg bg-amber-50 text-amber-900 text-xs">${d.skipped.map((s) => `${esc(s.email || '(trống)')}: ${esc(s.reason)}`).join('<br>')}</div>` : ''}
          ${temps.length ? `<p>Mật khẩu tạm cho người chưa có mật khẩu (chỉ hiện một lần):</p><div class="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap">${esc(text)}</div>` : ''}
          <div class="flex justify-end"><button onclick="closeModal()" class="${BTN_P}">Xong</button></div></div>`);
        renderStaff(true);
      } catch (e) { showErr('ic-err', e.message); }
    };
  }

  function resetPw(u) {
    openModal(`${modalHead('Cấp lại mật khẩu', esc(u.name) + ' • ' + esc(u.email))}<div class="px-6 py-5 text-sm text-slate-700">
      Hệ thống sẽ tạo mật khẩu tạm mới, đăng xuất nhân viên khỏi mọi thiết bị và yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.
      ${errBox('rp-err')}
      <div class="flex justify-end gap-2 pt-4"><button onclick="closeModal()" class="${BTN_S}">Hủy</button><button id="rp-go" class="${BTN_P}">Cấp lại mật khẩu</button></div></div>`);
    document.getElementById('rp-go').onclick = async () => {
      try { const d = await api(`/api/users/${u.id}/reset-password`, { method: 'POST', body: {} }); showTempPw(u.email, d.temp_password, false); renderStaff(true); }
      catch (e) { showErr('rp-err', e.message); }
    };
  }

  function showTempPw(email, pw, isNew) {
    const msg = `Tài khoản Quy chế lương thưởng Redsun\nĐịa chỉ: ${location.origin}\nEmail: ${email}\nMật khẩu tạm: ${pw}\n(Vui lòng đổi mật khẩu ở lần đăng nhập đầu tiên)`;
    openModal(`${modalHead(isNew ? 'Đã tạo tài khoản' : 'Đã cấp lại mật khẩu', 'Mật khẩu tạm chỉ hiển thị một lần. Hãy sao chép và gửi riêng cho nhân viên.')}
      <div class="px-6 py-5 space-y-3 text-sm">
        <div class="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[13px] whitespace-pre-wrap" id="tp-msg">${esc(msg)}</div>
        <div class="flex justify-end gap-2"><button id="tp-copy" class="${BTN_S}">📋 Sao chép nội dung</button><button onclick="closeModal()" class="${BTN_P}">Xong</button></div></div>`);
    document.getElementById('tp-copy').onclick = async (e) => {
      try { await navigator.clipboard.writeText(msg); e.target.textContent = '✔ Đã sao chép'; }
      catch { const r = document.createRange(); r.selectNodeContents(document.getElementById('tp-msg')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); e.target.textContent = 'Nhấn Ctrl+C để sao chép'; }
    };
  }

  /* =========================================================================
     TRANG: PHIẾU KHẢO SÁT DỰ ÁN
     ========================================================================= */
  const SV = { lib: null, view: 'home', tpl: null, id: null, status: 'draft', ans: {}, dirty: false, saving: false, timer: null, q: '', settings: null, list: [] };
  const STATUS = {
    draft: ['Nháp', 'bg-slate-100 text-slate-600'],
    sent: ['Đã gửi email', 'bg-emerald-100 text-emerald-800'],
    sent_test: ['Đã gửi (thử nghiệm)', 'bg-emerald-100 text-emerald-800'],
    failed: ['Gửi email lỗi', 'bg-redsun-100 text-redsun-800'],
    not_configured: ['Hoàn tất – chưa cấu hình email', 'bg-amber-100 text-amber-800'],
    no_recipients: ['Đã lưu – tài khoản chưa có email', 'bg-amber-100 text-amber-800']
  };
  const svStatus = (r) => r.status === 'draft' ? STATUS.draft : (STATUS[r.email_status] || ['Hoàn tất', 'bg-blue-100 text-blue-800']);
  const pill = ([t, c]) => `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${c}">${t}</span>`;
  async function svLib() { if (!SV.lib) SV.lib = await import('/survey-lib.js'); return SV.lib; }
  const svEl = () => document.getElementById('tab-survey');

  async function renderSurvey() {
    await svLib();
    if (SV.view === 'fill') return renderFill();
    if (SV.view === 'result') return renderResult();
    return renderSurveyHome();
  }
  function goHome() { SV.view = 'home'; SV.id = null; SV.tpl = null; SV.ans = {}; SV.dirty = false; clearTimeout(SV.timer); renderSurvey(); window.scrollTo(0, 0); }

  /* ---------- Trang chính: chọn phiếu + danh sách đã lập ---------- */
  async function renderSurveyHome() {
    const el = svEl(); el.innerHTML = loading;
    try {
      const [d, st] = await Promise.all([api('/api/surveys'), api('/api/settings/survey')]);
      SV.list = d.surveys; SV.settings = st;
      const admin = isAll(), many = !isSelf();
      const mailOk = st.mail_ready;
      const toSettings = admin ? ' <button data-go-settings class="font-bold underline">Mở Cài đặt</button>' : ' Vui lòng báo Admin.';
      const mailInfo = !mailOk
        ? `<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">Hệ thống <b>chưa cấu hình máy chủ gửi email (SMTP)</b>. Phiếu vẫn được lưu và xuất PDF bình thường; email gửi được sau khi Admin cấu hình.${toSettings}</div>`
        : `<div class="text-sm text-slate-600">Phiếu hoàn tất sẽ được gửi tới email của người lập phiếu (bạn: <b>${esc(S.me.email)}</b>)${st.cc.length ? ` • bản copy: ${st.cc.map(esc).join(', ')}` : ''}.${admin ? ' <button data-go-settings class="text-redsun-700 font-semibold hover:underline">Cài đặt</button>' : ''}</div>`;
      const tplCards = SV.lib.TEMPLATES.map((t) => card(`<div class="p-5 flex flex-col h-full">
          <div class="text-3xl">${t.icon}</div><h3 class="font-extrabold text-slate-900 mt-2">${esc(t.name)}</h3>
          <p class="text-sm text-slate-500 mt-1 flex-grow">${esc(t.description)}</p>
          ${canDo('survey', 'add') ? `<button data-start="${t.id}" class="${BTN_P} mt-4 self-start">Bắt đầu điền phiếu →</button>` : ''}</div>`)).join('');
      el.innerHTML = pageHead('Phiếu khảo sát dự án', 'Chọn phiếu, điền cùng khách hàng; kết quả được lưu, gửi email và xuất PDF.')
        + `<div class="space-y-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${tplCards}</div>${mailInfo}
          ${card(`<div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><h3 class="font-bold text-slate-900">${many ? 'Phiếu đã lập' : 'Phiếu của bạn'}</h3><p class="text-xs text-slate-500">${d.surveys.length} phiếu${many && !admin ? ' (của bạn và nhân viên dưới quyền)' : ''}</p></div>
              <input id="sv-q" placeholder="Tìm khách hàng, mã phiếu…" value="${esc(SV.q)}" class="${inputCls} sm:w-72"></div>
            <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>
              <th class="py-2.5 px-3 text-left">Mã</th><th class="py-2.5 px-3 text-left">Khách hàng</th><th class="py-2.5 px-3 text-left">Phiếu</th>
              ${many ? '<th class="py-2.5 px-3 text-left">Sales</th>' : ''}<th class="py-2.5 px-3 text-left">Trạng thái</th><th class="py-2.5 px-3 text-left">Cập nhật</th><th></th></tr></thead>
              <tbody id="sv-rows" class="divide-y divide-slate-100"></tbody></table></div>`)}</div>`;
      const drawRows = () => {
        const q = SV.q.toLowerCase();
        const rows = SV.list.filter((r) => !q || (r.title + ' ' + r.code + ' ' + (r.user_name || '') + ' ' + (r.answers.a_lien_he || '')).toLowerCase().includes(q));
        document.getElementById('sv-rows').innerHTML = rows.length ? rows.map((r) => {
          const t = SV.lib.getTemplate(r.template_id), mine = r.user_id === S.me.id;
          return `<tr><td class="py-2.5 px-3 font-mono text-xs">${r.code}</td>
            <td class="py-2.5 px-3"><b class="text-slate-900">${esc(r.title)}</b><br><span class="text-[11px] text-slate-500">${esc([r.answers.a_lien_he, r.answers.a_dien_thoai].filter(Boolean).join(' • '))}</span></td>
            <td class="py-2.5 px-3 text-xs">${esc(t ? t.short : r.template_id)}</td>${many ? `<td class="py-2.5 px-3 text-xs">${esc(r.user_name)}</td>` : ''}
            <td class="py-2.5 px-3">${pill(svStatus(r))}</td><td class="py-2.5 px-3 text-xs text-slate-500">${fmtDate(r.updated_at)}</td>
            <td class="py-2.5 px-3 text-right whitespace-nowrap">${r.status === 'draft' && (mine || admin) && canDo('survey', 'edit') ? `<button data-open="${r.id}" class="text-xs font-bold text-redsun-700 hover:underline mr-2">Tiếp tục điền</button>` : `<button data-view="${r.id}" class="text-xs font-bold text-redsun-700 hover:underline mr-2">Xem</button>`}
              ${((r.status === 'draft' && mine) || admin) && canDo('survey', 'delete') ? `<button data-del="${r.id}" class="text-xs text-slate-500 hover:underline">Xóa</button>` : ''}</td></tr>`;
        }).join('') : `<tr><td colspan="7" class="py-8 text-center text-slate-400">${SV.list.length ? 'Không có phiếu phù hợp.' : 'Chưa có phiếu nào. Chọn một mẫu phiếu ở trên để bắt đầu.'}</td></tr>`;
        el.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => openSurvey(+b.dataset.open, 'fill'));
        el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => openSurvey(+b.dataset.view, 'result'));
        el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
          if (!confirm('Xóa phiếu này? Không thể khôi phục.')) return;
          try { await api('/api/surveys/' + b.dataset.del, { method: 'DELETE', body: {} }); renderSurveyHome(); } catch (e) { alert(e.message); }
        });
      };
      drawRows();
      document.getElementById('sv-q').oninput = (e) => { SV.q = e.target.value; drawRows(); };
      el.querySelectorAll('[data-start]').forEach((b) => b.onclick = () => startSurvey(b.dataset.start));
      el.querySelectorAll('[data-go-settings]').forEach((b) => b.onclick = () => switchTab('settings'));
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  function startSurvey(tplId) {
    const tpl = SV.lib.getTemplate(tplId);
    SV.tpl = tpl; SV.id = null; SV.status = 'draft'; SV.dirty = false;
    SV.ans = {};
    for (const s of tpl.sections) for (const b of s.blocks) if (b.type === 'table') for (const r of b.rows) {
      if (r.auto === 'today') SV.ans[r.id] = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
      if (r.auto === 'me') SV.ans[r.id] = S.me.name;
    }
    SV.view = 'fill'; renderFill(); window.scrollTo(0, 0);
  }
  async function openSurvey(id, view) {
    const el = svEl(); el.innerHTML = loading;
    try {
      const d = await api('/api/surveys/' + id);
      SV.cur = d.survey; SV.id = id; SV.tpl = SV.lib.getTemplate(d.survey.template_id); SV.ans = d.survey.answers; SV.status = d.survey.status; SV.dirty = false;
      SV.view = view; renderSurvey(); window.scrollTo(0, 0);
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  /* ---------- Điền phiếu ---------- */
  function renderFill() {
    const el = svEl(), tpl = SV.tpl, A = SV.ans;
    const inp = (r) => {
      const v = esc(A[r.id] || '');
      if (r.kind === 'textarea') return `<textarea data-f="${r.id}" rows="2" class="${inputCls} resize-y" placeholder="${esc(r.placeholder || '')}">${v}</textarea>`;
      return `<input data-f="${r.id}" type="${r.kind === 'date' ? 'date' : 'text'}" value="${v}" class="${inputCls}" placeholder="${esc(r.placeholder || '')}">`;
    };
    const block = (b) => {
      if (b.type === 'note') return b.report ? `<p class="text-sm text-slate-600 italic border-l-4 border-slate-200 pl-3 py-1">${esc(b.text)}</p>` : `<p class="text-sm text-slate-500">${esc(b.text)}</p>`;
      if (b.type === 'grid') {
        const cell = (r, c) => {
          const k = `${b.id}:${r.v}:${c.k}`, v = A[k] || '';
          if (c.kind === 'yesno') return `<div class="inline-flex rounded-lg border border-slate-300 overflow-hidden text-xs font-semibold" data-yn="${k}">${[['co', 'Có'], ['khong', 'Không']].map(([x, t]) => `<button type="button" data-ynv="${x}" class="px-3 py-1.5 ${v === x ? (x === 'co' ? 'bg-redsun-700 text-white' : 'bg-slate-600 text-white') : 'bg-white text-slate-600 hover:bg-slate-50'}">${t}</button>`).join('')}</div>`;
          if (c.kind === 'check') return `<input type="checkbox" data-gchk="${k}" ${v === '1' ? 'checked' : ''} class="w-4 h-4 accent-red-700">`;
          return `<input data-f="${k}" value="${esc(v)}" class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm">`;
        };
        return `<div class="border border-slate-200 rounded-xl overflow-x-auto"><table class="w-full text-sm min-w-[640px]"><thead class="bg-slate-50 text-xs text-slate-600"><tr>
            <th class="text-left px-3 py-2 font-bold">${esc(b.head || b.label)}</th>${b.cols.map((c) => `<th class="text-left px-3 py-2 font-bold ${c.kind !== 'text' ? 'whitespace-nowrap' : ''} ${c.width === 'sm' ? 'w-40' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
          <tbody class="divide-y divide-slate-100">${b.rows.map((r) => `<tr><td class="px-3 py-2 font-semibold text-slate-700">${esc(r.label)}</td>${b.cols.map((c) => `<td class="px-3 py-2">${cell(r, c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      if (b.type === 'table') return `<div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">${b.rows.map((r) => `
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-2 p-3 ${r.required ? 'bg-redsun-50/40' : ''}"><label class="sm:col-span-2 text-sm font-semibold text-slate-700 pt-2">${esc(r.label)}${r.required ? ' <span class="text-redsun-600">*</span>' : ''}</label><div class="sm:col-span-3">${inp(r)}</div></div>`).join('')}</div>`;
      const multi = b.type === 'checks';
      const sel = multi ? (A[b.id] || []) : [A[b.id]];
      return `<div class="p-4 border border-slate-200 rounded-xl"><div class="text-sm font-bold text-slate-800 mb-2">${esc(b.label)}${b.max ? ` <span class="font-normal text-xs text-slate-500">(đã chọn <span data-cnt="${b.id}">${sel.length}</span>/${b.max})</span>` : ''}
          ${!multi ? ` <button data-clear="${b.id}" class="ml-2 text-xs font-normal text-slate-400 hover:text-redsun-700">bỏ chọn</button>` : ''}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">${b.options.map((o) => {
          const on = sel.includes(o.v), k = `${b.id}:${o.v}`;
          return `<div class="py-1"><label class="flex items-start gap-2.5 text-sm cursor-pointer"><input type="${multi ? 'checkbox' : 'radio'}" name="${b.id}" data-opt="${b.id}" value="${o.v}" ${on ? 'checked' : ''} class="mt-0.5 w-4 h-4 accent-red-700 shrink-0"><span>${esc(o.label)}</span></label>
            ${o.input ? `<input data-f="${k}" value="${esc(A[k] || '')}" placeholder="${esc(o.input)}" ${on ? '' : 'disabled'} class="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400">` : ''}</div>`;
        }).join('')}</div></div>`;
    };
    const editingSubmitted = SV.status === 'submitted';
    el.innerHTML = `<div class="sticky top-[7.5rem] z-40 -mx-4 sm:mx-0 mb-6 bg-white/95 backdrop-blur border border-slate-200 sm:rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <button id="sv-back" class="${BTN_S}">← Danh sách</button>
        <div class="min-w-0 flex-grow"><div class="text-[11px] text-slate-500 truncate">${esc(tpl.name)}${SV.cur && SV.id ? ' • ' + esc(SV.cur.code || '') : ''}</div>
          <div class="flex items-center gap-2"><div class="h-2 w-32 sm:w-48 bg-slate-200 rounded-full overflow-hidden"><div id="sv-prog" class="h-full bg-redsun-600 rounded-full transition-all"></div></div><span id="sv-prog-t" class="text-xs font-bold text-slate-700"></span><span id="sv-saved" class="text-[11px] text-slate-400"></span></div></div>
        <button id="sv-draft" class="${BTN_S}">${editingSubmitted ? 'Lưu thay đổi' : 'Lưu nháp'}</button>
        <button id="sv-submit" class="${BTN_P}">${editingSubmitted ? 'Lưu & gửi lại email' : 'Lưu & gửi email'}</button></div>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside class="hidden lg:block lg:col-span-3 lg:sticky lg:top-56">${card(`<div class="p-3"><p class="text-[11px] font-bold uppercase text-slate-400 px-2 mb-1">Các mục</p>
          ${tpl.sections.map((s) => `<button data-jump="${s.id}" class="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-redsun-50 ${s.internal ? 'text-amber-800' : 'text-slate-700'}"><b class="text-redsun-700 mr-1">${s.id}.</b>${esc(s.title)}</button>`).join('')}</div>`)}</aside>
        <div class="lg:col-span-9 space-y-6">
          ${card(`<details class="p-5" ${SV.id ? '' : 'open'}><summary class="font-bold text-slate-900 cursor-pointer">Cách dùng phiếu</summary>
            <p class="text-sm text-slate-600 mt-2">${esc(tpl.description)}</p><ul class="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600">${tpl.guide.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></details>`)}
          ${tpl.sections.map((s) => card(`<div class="p-5 space-y-4 ${s.internal ? 'bg-amber-50/40' : ''}" id="sv-sec-${s.id}">
            <h3 class="text-lg font-extrabold ${s.internal ? 'text-amber-900' : 'text-slate-900'} flex items-center gap-2"><span class="inline-flex w-8 h-8 rounded-lg ${s.internal ? 'bg-amber-600' : 'bg-redsun-700'} text-white text-sm items-center justify-center">${s.id}</span>${esc(s.title)}</h3>
            ${s.internal ? '<p class="text-xs text-amber-800 -mt-2">Sales tự điền sau buổi gặp. Mục này không có trong bản PDF gửi khách.</p>' : ''}
            ${s.blocks.map(block).join('')}</div>`, s.internal ? 'border-amber-300' : '')).join('')}
          ${errBox('sv-err')}
          <div class="flex justify-end gap-2 pb-10"><button id="sv-draft2" class="${BTN_S}">${editingSubmitted ? 'Lưu thay đổi' : 'Lưu nháp'}</button><button id="sv-submit2" class="${BTN_P}">${editingSubmitted ? 'Lưu & gửi lại email' : 'Lưu & gửi email'}</button></div>
        </div></div>`;

    const upd = () => { const p = SV.lib.progress(tpl, SV.ans); document.getElementById('sv-prog').style.width = p.pct + '%'; document.getElementById('sv-prog-t').textContent = `${p.pct}%`; };
    const touch = () => { SV.dirty = true; upd(); document.getElementById('sv-saved').textContent = '• chưa lưu';
      clearTimeout(SV.timer); if (SV.status === 'draft') SV.timer = setTimeout(() => saveSurvey(false, true), 4000); };
    el.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('input', () => { const v = i.value; if (v === '') delete SV.ans[i.dataset.f]; else SV.ans[i.dataset.f] = v; touch(); }));
    el.querySelectorAll('[data-opt]').forEach((i) => i.addEventListener('change', () => {
      const id = i.dataset.opt, b = tpl.sections.flatMap((s) => s.blocks).find((x) => x.id === id);
      if (b.type === 'radio') SV.ans[id] = i.value;
      else {
        let arr = (SV.ans[id] || []).filter((v) => v !== i.value);
        if (i.checked) arr.push(i.value);
        if (b.max && arr.length > b.max) { i.checked = false; arr = arr.filter((v) => v !== i.value); alert(`Chỉ chọn tối đa ${b.max} mục.`); }
        if (arr.length) SV.ans[id] = arr; else delete SV.ans[id];
        const c = el.querySelector(`[data-cnt="${id}"]`); if (c) c.textContent = arr.length;
      }
      b.options.forEach((o) => { if (!o.input) return; const f = el.querySelector(`[data-f="${id}:${o.v}"]`); const on = b.type === 'radio' ? SV.ans[id] === o.v : (SV.ans[id] || []).includes(o.v); f.disabled = !on; if (!on) { f.value = ''; delete SV.ans[`${id}:${o.v}`]; } else if (i.value === o.v && i.checked) f.focus(); });
      touch();
    }));
    el.querySelectorAll('[data-yn]').forEach((g) => g.querySelectorAll('[data-ynv]').forEach((btn) => btn.onclick = () => {
      const k = g.dataset.yn, x = btn.dataset.ynv;
      if (SV.ans[k] === x) delete SV.ans[k]; else SV.ans[k] = x;
      g.querySelectorAll('[data-ynv]').forEach((o) => { const on = SV.ans[k] === o.dataset.ynv; o.className = 'px-3 py-1.5 ' + (on ? (o.dataset.ynv === 'co' ? 'bg-redsun-700 text-white' : 'bg-slate-600 text-white') : 'bg-white text-slate-600 hover:bg-slate-50'); });
      touch();
    }));
    el.querySelectorAll('[data-gchk]').forEach((i) => i.addEventListener('change', () => { if (i.checked) SV.ans[i.dataset.gchk] = '1'; else delete SV.ans[i.dataset.gchk]; touch(); }));
    el.querySelectorAll('[data-clear]').forEach((b) => b.onclick = () => { delete SV.ans[b.dataset.clear]; el.querySelectorAll(`[data-opt="${b.dataset.clear}"]`).forEach((r) => r.checked = false); touch(); });
    el.querySelectorAll('[data-jump]').forEach((b) => b.onclick = () => document.getElementById('sv-sec-' + b.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' }));
    document.getElementById('sv-back').onclick = async () => { if (SV.dirty && SV.status === 'draft') await saveSurvey(false, true); else if (SV.dirty && !confirm('Có thay đổi chưa lưu. Rời trang?')) return; goHome(); };
    ['sv-draft', 'sv-draft2'].forEach((x) => document.getElementById(x).onclick = () => saveSurvey(false));
    ['sv-submit', 'sv-submit2'].forEach((x) => document.getElementById(x).onclick = () => saveSurvey(true));
    upd();
  }

  // Thanh chờ khi lưu & gửi email: khóa các nút để không bấm lặp
  function svBusy(on, text) {
    const ids = ['sv-submit', 'sv-submit2', 'sv-draft', 'sv-draft2', 'sv-back', 'sv-resend', 'sv-resend2'];
    ids.forEach((id) => { const b = document.getElementById(id); if (b) { b.disabled = on; b.classList.toggle('opacity-50', on); b.classList.toggle('cursor-not-allowed', on); } });
    let bar = document.getElementById('sv-busy');
    if (!on) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'sv-busy'; document.body.appendChild(bar); }
    bar.className = 'fixed inset-x-0 top-0 z-[100]';
    bar.innerHTML = `<div class="h-1 w-full bg-redsun-100 overflow-hidden"><div class="h-full w-1/3 bg-redsun-600 sv-indet"></div></div>
      <div class="mx-auto mt-3 w-fit max-w-[92vw] flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold shadow-xl">
        <span class="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>${esc(text)}</div>`;
    if (!document.getElementById('sv-indet-css')) { const st = document.createElement('style'); st.id = 'sv-indet-css';
      st.textContent = '@keyframes svIndet{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}.sv-indet{animation:svIndet 1.2s ease-in-out infinite}'; document.head.appendChild(st); }
  }

  async function saveSurvey(submit, auto) {
    if (SV.saving) return; SV.saving = true; clearTimeout(SV.timer);
    const errEl = document.getElementById('sv-err'); if (errEl) errEl.classList.add('hidden');
    try {
      if (submit) {
        const errs = SV.lib.validateAnswers(SV.tpl, SV.ans);
        if (errs.length) { showErr('sv-err', errs.join(' ')); document.getElementById('sv-sec-A').scrollIntoView({ behavior: 'smooth' }); return; }
        svBusy(true, 'Đang lưu & gửi email, vui lòng chờ…');
      }
      if (auto && !SV.id && !Object.keys(SV.ans).some((k) => !['a_ngay', 'a_sales'].includes(k))) return;   // chưa có gì để lưu
      const body = { answers: SV.ans, submit };
      const d = SV.id ? await api('/api/surveys/' + SV.id, { method: 'PUT', body }) : await api('/api/surveys', { method: 'POST', body: { ...body, template_id: SV.tpl.id } });
      SV.id = d.id; SV.dirty = false;
      const sv = document.getElementById('sv-saved'); if (sv) sv.textContent = `• đã lưu ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      if (submit) { SV.lastMail = d; await openSurvey(SV.id, 'result'); window.scrollTo(0, 0); }
    } catch (e) { if (errEl) showErr('sv-err', e.message); else alert(e.message); }
    finally { SV.saving = false; if (submit) svBusy(false); }
  }

  /* ---------- Kết quả ---------- */
  function renderResult() {
    const el = svEl(), r = SV.cur, tpl = SV.tpl;
    const canEdit = canDo('survey', 'edit') && (r.user_id === S.me.id || isAll());
    const meta = { sales: r.user_name, submitted: r.submitted_at ? new Date(r.submitted_at * 1000).toLocaleString('vi-VN', { hour12: false }) : '', code: r.code };
    const [st] = svStatus(r);
    const mailBox = r.email_status === 'sent' || r.email_status === 'sent_test'
      ? `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">✔ Phiếu đã được lưu và ${r.email_status === 'sent_test' ? 'đã gửi email (chế độ thử, chỉ ghi log)' : 'đã gửi email'} đến <b>${esc(r.email_to || '')}</b>.</div>`
      : `<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">${esc(st)}${r.email_error ? ': ' + esc(r.email_error) : ''}. Phiếu đã được lưu; bạn vẫn xuất PDF được. <button id="sv-resend2" class="ml-2 font-bold underline">Thử gửi lại</button></div>`;
    el.innerHTML = `<div class="flex flex-wrap items-center gap-2 mb-4">
        <button id="sv-back" class="${BTN_S}">← Danh sách</button><div class="flex-grow"></div>
        ${canEdit ? `<button id="sv-edit" class="${BTN_S}">Sửa phiếu</button>` : ''}
        <button id="sv-resend" class="${BTN_S}">Gửi lại email</button>
        <button id="sv-pdf-in" class="${BTN_S}">⬇ PDF nội bộ (đủ mục H)</button>
        <button id="sv-pdf-out" class="${BTN_P}">⬇ PDF gửi khách</button></div>
      <div class="space-y-4">${mailBox}${card(`<div class="p-5 sm:p-8">${SV.lib.renderReport(tpl, SV.ans, { internal: true, meta: { ...meta, company: S.company } })}</div>`)}</div>`;
    document.getElementById('sv-back').onclick = goHome;
    if (canEdit) document.getElementById('sv-edit').onclick = () => { SV.view = 'fill'; renderFill(); window.scrollTo(0, 0); };
    const resend = async () => { svBusy(true, 'Đang gửi email, vui lòng chờ…');
      try { await api(`/api/surveys/${SV.id}/send`, { method: 'POST', body: {} }); await openSurvey(SV.id, 'result'); } catch (e) { alert(e.message); } finally { svBusy(false); } };
    document.getElementById('sv-resend').onclick = (e) => resend(e.target);
    const r2 = document.getElementById('sv-resend2'); if (r2) r2.onclick = (e) => resend(e.target);
    document.getElementById('sv-pdf-in').onclick = (e) => exportPdf(true, meta, e.target);
    document.getElementById('sv-pdf-out').onclick = (e) => exportPdf(false, meta, e.target);
  }

  const loadScript = (src) => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Không tải được ' + src)); document.head.appendChild(s); });
  const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  async function exportPdf(internal, meta, btn) {
    const label = btn.textContent; btn.disabled = true; btn.textContent = 'Đang tạo PDF…';
    try {
      await loadScript('/vendor/pdfmake.min.js'); await loadScript('/vendor/vfs_fonts.js');
      const bg = getComputedStyle(document.querySelector('.rs-logo')).backgroundImage;
      const logo = (bg.match(/url\("?(data:image\/png;base64,[^")]+)"?\)/) || [])[1];
      const doc = SV.lib.buildPdfDoc(SV.tpl, SV.ans, { internal, meta: { ...meta, company: S.company || CONFIG.company }, logo });
      const name = `Khao-sat-${slug(SV.lib.surveyTitle(SV.tpl, SV.ans))}-${meta.code}${internal ? '-noi-bo' : ''}.pdf`;
      window.pdfMake.createPdf(doc).download(name);
    } catch (e) { alert('Không tạo được PDF: ' + e.message); }
    finally { setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 800); }
  }

  /* =========================================================================
     TRANG: CÀI ĐẶT HỆ THỐNG (chỉ Admin)
     ========================================================================= */
  const SMTP_PRESETS = {
    gmail: { label: 'Gmail / Google Workspace', smtp_host: 'smtp.gmail.com', smtp_port: 465, smtp_security: 'ssl', hint: 'Bật xác minh 2 bước cho tài khoản, rồi tạo "Mật khẩu ứng dụng" (App Password) 16 ký tự và dán vào ô Mật khẩu. Không dùng mật khẩu đăng nhập Gmail.' },
    m365: { label: 'Microsoft 365 / Outlook', smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_security: 'starttls', hint: 'Admin Microsoft 365 cần bật "Authenticated SMTP" cho hộp thư gửi.' },
    zoho: { label: 'Zoho Mail', smtp_host: 'smtp.zoho.com', smtp_port: 465, smtp_security: 'ssl', hint: 'Tài khoản bật 2 bước cần tạo Application-specific password.' }
  };
  async function renderSettings() {
    const el = document.getElementById('tab-settings');
    if (!canDo('settings')) { el.innerHTML = errorCard('Bạn không có quyền xem cài đặt hệ thống.'); return; }
    el.innerHTML = loading;
    try {
      const d = await api('/api/admin/settings');
      const c = d.settings;
      const sec = (title, sub, inner) => card(`<div class="p-5 sm:p-6"><h3 class="text-lg font-extrabold text-slate-900">${title}</h3>${sub ? `<p class="text-sm text-slate-500 mt-0.5 mb-4">${sub}</p>` : '<div class="mb-4"></div>'}${inner}</div>`);
      const inp = (id, val, attrs = '') => `<input id="cf-${id}" value="${esc(val)}" class="${inputCls}" ${attrs}>`;
      const chk = (id, on, label) => `<label class="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" id="cf-${id}" ${on ? 'checked' : ''} class="mt-0.5 w-4 h-4 accent-red-700"> <span>${label}</span></label>`;
      const ta = (id, val, ph) => `<textarea id="cf-${id}" rows="2" class="${inputCls}" placeholder="${ph}">${esc(String(val || '').split(',').filter(Boolean).join(', '))}</textarea>`;
      const status = d.mail_mode === 'smtp' ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Đã cấu hình</span>`
        : d.mail_mode === 'log' ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">Chế độ thử (chỉ ghi log)</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Chưa cấu hình</span>`;
      el.innerHTML = pageHead('Cài đặt hệ thống', 'Chỉ Admin xem và thay đổi được các cài đặt này.') + `<div class="space-y-6 max-w-4xl">
        ${sec('1. Thông tin công ty', 'Hiển thị trên email, PDF phiếu khảo sát, slide cuối của proposal và chữ ký email gửi proposal. Tên người gửi email proposal: [Tên nhân viên] - [Tên viết tắt].', `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">${field('Tên công ty (đầy đủ)', inp('company_name', c.company_name))}</div>
          ${field('Tên viết tắt', inp('company_short', c.company_short, 'placeholder="Redsun"'))}
          ${field('Website', inp('company_website', c.company_website, 'placeholder="redsun.vn"'))}
          <div class="sm:col-span-2">${field('Địa chỉ', inp('company_address', c.company_address))}</div>
          ${field('Điện thoại', inp('company_phone', c.company_phone))}
          ${field('Hotline', inp('company_hotline', c.company_hotline))}
          ${field('Email công ty', inp('company_email', c.company_email, 'type="email"'))}
          <div class="sm:col-span-2">${field('Tên công ty (tiếng Anh – dùng cho proposal EN)', inp('company_name_en', c.company_name_en))}</div>
          <div class="sm:col-span-2">${field('Địa chỉ (tiếng Anh – dùng cho proposal EN)', inp('company_address_en', c.company_address_en))}</div></div>`)}
        ${sec(`2. Máy chủ gửi email (SMTP) ${status}`, 'Dùng để gửi email phiếu khảo sát. Cloudflare chặn cổng 25 – dùng cổng 465 (SSL/TLS) hoặc 587 (STARTTLS).', `
          <div class="flex flex-wrap items-center gap-2 mb-4"><span class="text-xs text-slate-500">Điền nhanh:</span>${Object.entries(SMTP_PRESETS).map(([k, v]) => `<button data-preset="${k}" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">${v.label}</button>`).join('')}</div>
          <div id="cf-hint" class="hidden mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900"></div>
          <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div class="sm:col-span-3">${field('Máy chủ SMTP', inp('smtp_host', c.smtp_host, 'placeholder="smtp.gmail.com"'))}</div>
            <div class="sm:col-span-1">${field('Cổng', inp('smtp_port', c.smtp_port, 'type="number" min="1" max="65535"'))}</div>
            <div class="sm:col-span-2">${field('Bảo mật', `<select id="cf-smtp_security" class="${inputCls}">
              <option value="ssl" ${c.smtp_security === 'ssl' ? 'selected' : ''}>SSL/TLS (cổng 465)</option>
              <option value="starttls" ${c.smtp_security === 'starttls' ? 'selected' : ''}>STARTTLS (cổng 587)</option>
              <option value="none" ${c.smtp_security === 'none' ? 'selected' : ''}>Không mã hóa (không khuyến nghị)</option></select>`)}</div>
            <div class="sm:col-span-3">${field('Tên đăng nhập SMTP', inp('smtp_user', c.smtp_user, 'autocomplete="off" placeholder="thường là địa chỉ email"'))}</div>
            <div class="sm:col-span-3">${field('Mật khẩu SMTP', `<input id="cf-smtp_pass" type="password" autocomplete="new-password" class="${inputCls}" placeholder="${d.smtp_pass_set ? '•••••••• đã lưu – để trống nếu không đổi' : 'Nhập mật khẩu / mật khẩu ứng dụng'}">`,
              d.smtp_pass_set ? `<label class="inline-flex items-center gap-1.5 mt-1"><input type="checkbox" id="cf-pass_clear"> Xóa mật khẩu đã lưu</label>` : '')}</div>
            <div class="sm:col-span-3">${field('Email người gửi (From)', inp('smtp_from_email', c.smtp_from_email, 'type="email" placeholder="khaosat@redsun.vn"'), 'Thường phải trùng tài khoản đăng nhập SMTP hoặc là bí danh hợp lệ của tài khoản đó.')}</div>
            <div class="sm:col-span-3">${field('Tên người gửi', inp('smtp_from_name', c.smtp_from_name))}</div>
          </div>
          <p class="text-[11px] text-slate-500 mt-3">🔒 Mật khẩu SMTP không bao giờ hiển thị lại trên giao diện. ${d.has_settings_key ? 'Mật khẩu được mã hóa bằng khóa SETTINGS_KEY của máy chủ.' : 'Có thể tăng bảo mật bằng cách thêm secret <code>SETTINGS_KEY</code> cho Worker trên Cloudflare (mật khẩu sẽ được mã hóa khi lưu lại).'}</p>
          <div class="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
            <span class="text-sm font-semibold text-slate-700">Gửi email thử tới</span>
            <input id="cf-test_to" type="email" value="${esc(S.me.email)}" class="${inputCls} sm:w-72">
            <button id="cf-test" class="${BTN_S} whitespace-nowrap">Lưu & gửi thử</button>
          </div><div id="cf-test-res" class="mt-2 text-sm"></div>`)}
        ${sec('3. Email nhận bản copy', 'Áp dụng cho email phiếu khảo sát và email gửi proposal cho khách hàng. Người gửi luôn nhận bản CC; các ô bên dưới là tùy chọn.', `<div class="space-y-4">
          ${field('Gửi thêm bản copy (CC) – tùy chọn', ta('survey_cc', c.survey_cc, 'truongphong@redsun.vn'), 'Để trống nếu không cần. Người nhận (kể cả khách hàng khi gửi proposal) thấy được danh sách CC.')}
          ${field('Gửi thêm bản copy ẩn (BCC) – tùy chọn', ta('survey_bcc', c.survey_bcc, 'luutru@redsun.vn'), 'Để trống nếu không cần. Khách hàng không thấy địa chỉ BCC – phù hợp để quản lý theo dõi và lưu trữ.')}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${field('Tiền tố tiêu đề email', inp('survey_subject_prefix', c.survey_subject_prefix, 'placeholder="[Khảo sát]"'))}</div>
          ${chk('survey_include_internal', c.survey_include_internal === '1', 'Kèm mục nội bộ (Sales đánh giá) trong email')}
        </div>`)}
        ${sec('4. Bảo mật đăng nhập', 'Thời hạn phiên áp dụng cho lần đăng nhập tiếp theo; thời gian không hoạt động áp dụng ngay.', `<div class="space-y-5"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${field('Tự đăng xuất khi không thao tác (phút)', inp('idle_minutes', c.idle_minutes, 'type="number" min="0" max="1440"'), 'Hết hạn phiên sau số phút người dùng không thao tác. 0 = tắt; tối thiểu 2, tối đa 1440 phút. Người dùng được cảnh báo trước 1 phút.')}
          ${field('Thời hạn tối đa của phiên (ngày)', inp('session_days', c.session_days, 'type="number" min="1" max="90"'), 'Dù vẫn thao tác, sau số ngày này phải đăng nhập lại. 1–90 ngày.')}
          ${field('Số lần nhập sai trước khi tạm khóa', inp('max_fails', c.max_fails, 'type="number" min="3" max="50"'), '3–50 lần')}
          ${field('Thời gian tạm khóa (phút)', inp('lock_minutes', c.lock_minutes, 'type="number" min="1" max="1440"'), '1–1440 phút')}</div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            ${chk('login_notify', c.login_notify === '1', '<b>Gửi email thông báo mỗi lần đăng nhập</b> tới email của chủ tài khoản (thời gian, IP, vị trí ước tính, thiết bị)')}
            ${field('Tiêu đề email thông báo', inp('login_notify_subject', c.login_notify_subject, 'placeholder="Thông báo đăng nhập tài khoản {email} của {ten_mien}"'), 'Để trống = dùng tiêu đề mặc định. Có thể chèn: <code>{email}</code> email tài khoản · <code>{ten}</code> họ tên · <code>{ten_mien}</code> tên miền (sales-kpi.redsun.vn) · <code>{thoi_gian}</code> thời gian đăng nhập.')}
            ${field('Gửi thêm 1 bản thông báo (BCC) tới – tùy chọn', inp('login_notify_bcc', c.login_notify_bcc, 'type="email" placeholder="baomat@redsun.vn"'), 'Chỉ 1 email. Người dùng không thấy địa chỉ này. Để trống nếu không cần.')}
            ${d.mail_mode ? '' : '<p class="text-xs text-amber-800">⚠ Chưa cấu hình máy chủ gửi email (mục 2) nên chưa gửi được thông báo.</p>'}
          </div></div>`)}
        ${errBox('cf-err')}
        <div class="sticky bottom-4 z-30 flex items-center justify-end gap-3 p-3 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg">
          <span id="cf-ok" class="text-sm text-emerald-700"></span><button id="cf-save" class="${BTN_P}">Lưu cài đặt</button></div>
      </div>`;
      const v = (id) => document.getElementById('cf-' + id);
      el.querySelectorAll('[data-preset]').forEach((b) => b.onclick = () => {
        const p = SMTP_PRESETS[b.dataset.preset];
        v('smtp_host').value = p.smtp_host; v('smtp_port').value = p.smtp_port; v('smtp_security').value = p.smtp_security;
        const h = v('hint'); h.textContent = p.hint; h.classList.remove('hidden');
      });
      v('smtp_security').onchange = () => { const s2 = v('smtp_security').value; if (s2 === 'ssl') v('smtp_port').value = 465; if (s2 === 'starttls') v('smtp_port').value = 587; };
      const collect = () => {
        const b = {};
        for (const k of ['company_name', 'company_short', 'company_website', 'company_address', 'company_name_en', 'company_address_en', 'company_phone', 'company_hotline', 'company_email', 'smtp_host', 'smtp_port', 'smtp_security', 'smtp_user', 'smtp_from_email', 'smtp_from_name', 'survey_cc', 'survey_bcc', 'survey_subject_prefix', 'session_days', 'max_fails', 'lock_minutes', 'idle_minutes', 'login_notify_bcc', 'login_notify_subject']) b[k] = v(k).value;
        b.survey_include_internal = v('survey_include_internal').checked; b.login_notify = v('login_notify').checked;
        if (v('smtp_pass').value) b.smtp_pass = v('smtp_pass').value;
        if (v('pass_clear') && v('pass_clear').checked) b.smtp_pass_clear = true;
        return b;
      };
      const save = async () => {
        v('err').classList.add('hidden'); v('ok').textContent = '';
        await api('/api/admin/settings', { method: 'PUT', body: collect() });
        v('smtp_pass').value = '';
      };
      v('save').onclick = async () => {
        try { await save(); S.company = v('company_name').value; await renderSettings(); const ok = document.getElementById('cf-ok'); if (ok) { ok.textContent = '✔ Đã lưu cài đặt'; setTimeout(() => { ok.textContent = ''; }, 4000); } }
        catch (e) { showErr('cf-err', e.message); }
      };
      v('test').onclick = async () => {
        const res = v('test-res'); res.className = 'mt-2 text-sm text-slate-500'; res.textContent = 'Đang lưu và gửi thử…'; v('test').disabled = true;
        try {
          await save();
          const r = await api('/api/admin/test-email', { method: 'POST', body: { to: v('test_to').value } });
          res.className = 'mt-2 text-sm text-emerald-700';
          res.textContent = r.mode === 'log' ? '✔ Chế độ thử: email đã được ghi log (chưa gửi thật).' : `✔ Đã gửi email thử tới ${v('test_to').value}. Kiểm tra hộp thư (cả mục Spam).`;
        } catch (e) { res.className = 'mt-2 text-sm text-redsun-700'; res.textContent = '✖ ' + e.message; }
        finally { v('test').disabled = false; }
      };
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  /* =========================================================================
     TRANG: PROPOSAL – xem/trình chiếu (có ghi chú), xuất PDF và gửi khách (không ghi chú)
     ========================================================================= */
  const PR = { data: null, q: '' };
  const prEl = () => document.getElementById('tab-proposal');
  const fmtDT = (ts) => ts ? new Date(ts * 1000).toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  // Thông tin nhân viên (hồ sơ trong tab Nhân viên) + công ty (tab Cài đặt) – máy chủ trả về sẵn
  const prLang = (pid) => { const p = PR.data && PR.data.proposals.find((x) => x.id === pid); return p && p.lang === 'en' ? 'en' : 'vi'; };
  const prMe = (pid) => ({ ...((PR.data && (pid && prLang(pid) === 'en' ? PR.data.fields_en : PR.data.fields)) || {}) });
  const prQuery = (f) => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const prProp = (pid) => (PR.data && PR.data.proposals.find((x) => x.id === pid)) || {};
  const prKind = (pid) => prProp(pid).kind || 'html';
  const prDay = (d, en) => en ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : d.toLocaleDateString('vi-VN');
  // Thông tin điền thử (proposal PDF): hồ sơ của bạn + ngày gửi hôm nay, hiệu lực 30 ngày
  const prSample = (pid, extra = {}) => { const en = prLang(pid) === 'en', t = new Date();
    return { ...prMe(pid), ngay: prDay(t, en), han: prDay(new Date(t.getTime() + 30 * 864e5), en), ...extra }; };
  let rspdfP = null;
  const loadRspdf = () => rspdfP || (rspdfP = new Promise((res, rej) => {
    if (window.RSPDF) return res(window.RSPDF);
    const s = document.createElement('script'); s.src = '/proposal/_shared/pdfprop.js';
    s.onload = () => res(window.RSPDF); s.onerror = () => { rspdfP = null; rej(new Error('Không tải được bộ xử lý PDF.')); };
    document.head.appendChild(s);
    if (!document.querySelector('link[data-rsfont]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/proposal/_shared/fonts/fonts.css'; l.dataset.rsfont = '1'; document.head.appendChild(l); }
  }));
  async function ptplBytes(pid) {
    const r = await fetch(`/api/ptpl/${encodeURIComponent(pid)}/file`, { credentials: 'same-origin' });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Không tải được file PDF.'); }
    return new Uint8Array(await r.arrayBuffer());
  }
  const shareStatus = (s) => s.revoked ? ['Đã thu hồi', 'bg-slate-200 text-slate-600'] : s.expired ? ['Hết hạn', 'bg-slate-200 text-slate-600']
    : s.views ? ['Khách đã xem', 'bg-emerald-100 text-emerald-800'] : (STATUS[s.email_status] || ['Đã tạo link', 'bg-blue-100 text-blue-800']);

  async function renderProposal() {
    const el = prEl(); el.innerHTML = loading;
    try {
      const d = await api('/api/proposals'); PR.data = d;
      const me = prMe(), many = !isSelf();
      const mailNote = d.mail_ready ? '' : `<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">Hệ thống <b>chưa cấu hình máy chủ gửi email (SMTP)</b>. Bạn vẫn tạo được đường dẫn để gửi khách qua Zalo/email riêng; gửi email trực tiếp dùng được sau khi Admin cấu hình.</div>`;
      const mgr = canDo('ptpl', 'add') || canDo('ptpl', 'edit') || canDo('ptpl', 'delete');
      const cards = d.proposals.map((p) => {
        const pdf = p.kind === 'pdf', usable = !pdf || p.ready;
        const badges = pdf ? [pill(['PDF tải lên', 'bg-blue-100 text-blue-800']),
          !p.ready ? pill(['Chưa có file', 'bg-amber-100 text-amber-800']) : !p.active ? pill(['Đang ẩn với nhân viên', 'bg-slate-200 text-slate-600']) : '',
          p.ready && !p.layout.length ? pill(['Chưa đặt ô thông tin', 'bg-amber-100 text-amber-800']) : ''].join(' ') : '';
        return card(`<div class="p-5 flex flex-col h-full">
          <div class="h-1.5 w-12 rounded-full ${pdf ? 'bg-amber-500' : 'bg-redsun-700'} mb-3"></div>
          ${pdf && mgr ? `<div class="flex flex-wrap gap-1 mb-2">${badges}</div>` : ''}
          <h3 class="font-extrabold text-slate-900">${esc(p.title)}</h3>
          <p class="text-sm text-slate-500 mt-1 flex-grow">${esc(p.description)}</p>
          <p class="text-[11px] text-slate-400 mt-3">${p.version ? `Tài liệu v${esc(p.version)} • ` : ''}${p.slides} ${pdf ? 'trang' : 'slide'} • cập nhật ${esc(p.updated.split('-').reverse().join('/'))}</p>
          <div class="flex flex-wrap gap-2 mt-4">
            ${usable ? `<button data-present="${p.id}" class="${BTN_S}">▶ Trình chiếu</button>
            <button data-pdf="${p.id}" class="${BTN_S}">⬇ Xuất PDF</button>
            ${canDo('proposal', 'add') ? `<button data-send="${p.id}" class="${BTN_P}">✉ Gửi khách hàng</button>` : ''}` : ''}
            ${pdf && p.ready && canDo('ptpl', 'edit') ? `<button data-pt-layout="${p.id}" class="${BTN_S}">⌖ Đặt ô thông tin</button>` : ''}
            ${pdf && mgr ? `<button data-pt-edit="${p.id}" class="${BTN_S}">⚙ Sửa</button>` : ''}
          </div></div>`);
      }).join('');
      const meCard = `<div class="p-3 rounded-xl ${me.sdt ? 'bg-slate-50 border border-slate-200 text-slate-600' : 'bg-amber-50 border border-amber-200 text-amber-900'} text-sm">
          Slide cuối và chữ ký email dùng thông tin trong hồ sơ của bạn: <b>${esc([me.tv, me.cv, me.sdt, me.email].filter(Boolean).join(' • '))}</b>.
          ${me.sdt ? '' : '<b>Hồ sơ chưa có số điện thoại.</b> '}${canDo('staff', 'edit') ? 'Sửa ở tab Nhân viên.' : 'Cần sửa, vui lòng báo Admin cập nhật ở tab Nhân viên.'}</div>`;
      el.innerHTML = pageHead('Proposal', 'Trình chiếu có ghi chú cho Sales. Bản PDF và bản gửi khách luôn bỏ phần ghi chú.',
          canDo('ptpl', 'add') ? `<button id="pt-new" class="${BTN_P}">＋ Tải lên proposal PDF</button>` : '')
        + `<div class="space-y-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>${meCard}${mailNote}
          ${card(`<div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><h3 class="font-bold text-slate-900">Proposal đã gửi</h3><p class="text-xs text-slate-500">${d.shares.length} lần gửi${many ? (isAll() ? ' (toàn công ty)' : ' (của bạn và nhân viên dưới quyền)') : ''} • lượt xem tính khi khách mở đường dẫn</p></div>
              <input id="pr-q" placeholder="Tìm khách hàng, email…" value="${esc(PR.q)}" class="${inputCls} sm:w-72"></div>
            <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>
              <th class="py-2.5 px-3 text-left">Khách hàng</th><th class="py-2.5 px-3 text-left">Proposal</th>${many ? '<th class="py-2.5 px-3 text-left">Sales</th>' : ''}
              <th class="py-2.5 px-3 text-left">Trạng thái</th><th class="py-2.5 px-3 text-left">Lượt xem</th><th class="py-2.5 px-3 text-left">Hiệu lực đến</th><th></th></tr></thead>
              <tbody id="pr-rows" class="divide-y divide-slate-100"></tbody></table></div>`)}</div>`;
      el.querySelectorAll('[data-present]').forEach((b) => b.onclick = () => {
        const id = b.dataset.present;
        window.open(prKind(id) === 'pdf' ? `/proposal/_shared/pdfviewer?id=${encodeURIComponent(id)}&${prQuery(prSample(id))}` : `/proposal/${id}/?${prQuery(prMe(id))}`, '_blank');
      });
      el.querySelectorAll('[data-pt-layout]').forEach((b) => b.onclick = () => ptplEditor(b.dataset.ptLayout));
      el.querySelectorAll('[data-pt-edit]').forEach((b) => b.onclick = () => ptplForm(d.proposals.find((x) => x.id === b.dataset.ptEdit)));
      const ptNew = document.getElementById('pt-new'); if (ptNew) ptNew.onclick = () => ptplForm(null);
      el.querySelectorAll('[data-pdf]').forEach((b) => b.onclick = () => openPdfModal(b.dataset.pdf));
      el.querySelectorAll('[data-send]').forEach((b) => b.onclick = () => openSendModal(b.dataset.send));
      const drawRows = () => {
        const q = PR.q.toLowerCase();
        const rows = d.shares.filter((s) => !q || [s.customer_company, s.customer_name, s.customer_email, s.user_name].join(' ').toLowerCase().includes(q));
        document.getElementById('pr-rows').innerHTML = rows.length ? rows.map((s) => {
          const mine = s.user_id === S.me.id, can = (mine || isAll()) && canDo('proposal', 'add'), live = !s.revoked && !s.expired;
          return `<tr><td class="py-2.5 px-3"><b class="text-slate-900">${esc(s.customer_company)}</b><br><span class="text-[11px] text-slate-500">${esc([s.customer_name, s.customer_email].filter(Boolean).join(' • ') || 'Chỉ tạo đường dẫn')}</span></td>
            <td class="py-2.5 px-3 text-xs">${esc(s.proposal_title)}<br><span class="text-slate-400">${fmtDT(s.created_at)}</span></td>
            ${many ? `<td class="py-2.5 px-3 text-xs">${esc(s.user_name)}</td>` : ''}
            <td class="py-2.5 px-3">${pill(shareStatus(s))}${s.email_error ? `<div class="text-[11px] text-redsun-700 mt-1 max-w-xs">${esc(s.email_error)}</div>` : ''}</td>
            <td class="py-2.5 px-3 text-xs">${s.views ? `<b>${s.views}</b> lần<br><span class="text-slate-400">gần nhất ${fmtDT(s.last_viewed_at)}</span>` : '<span class="text-slate-400">Chưa xem</span>'}</td>
            <td class="py-2.5 px-3 text-xs text-slate-500">${fmtDate(s.expires_at)}</td>
            <td class="py-2.5 px-3 text-right whitespace-nowrap">${live ? `<button data-copy="${esc(s.link)}" class="text-xs font-bold text-redsun-700 hover:underline mr-2">Sao chép link</button><a href="${esc(s.link)}" target="_blank" rel="noopener" class="text-xs font-bold text-redsun-700 hover:underline mr-2">Mở</a>` : ''}
              ${live && can && s.customer_email ? `<button data-resend="${s.id}" class="text-xs text-slate-600 hover:underline mr-2">Gửi lại</button>` : ''}
              ${live && (mine || isAll()) && canDo('proposal', 'delete') ? `<button data-revoke="${s.id}" class="text-xs text-slate-500 hover:underline">Thu hồi</button>` : ''}</td></tr>`;
        }).join('') : `<tr><td colspan="7" class="py-8 text-center text-slate-400">${d.shares.length ? 'Không có kết quả phù hợp.' : 'Chưa gửi proposal nào. Bấm "Gửi khách hàng" ở trên để bắt đầu.'}</td></tr>`;
        el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy, b));
        el.querySelectorAll('[data-resend]').forEach((b) => b.onclick = async () => {
          if (!confirm('Gửi lại email proposal cho khách hàng này?')) return;
          if (b.disabled) return;
          b.disabled = true; b.textContent = 'Đang gửi...'; b.classList.add('cursor-wait');
          try { const r = await api(`/api/proposals/shares/${b.dataset.resend}/send`, { method: 'POST', body: {} }); if (r.email_error) alert(r.email_error); renderProposal(); }
          catch (e) { alert(e.message); b.disabled = false; b.textContent = 'Gửi lại'; b.classList.remove('cursor-wait'); }
        });
        el.querySelectorAll('[data-revoke]').forEach((b) => b.onclick = async () => {
          if (!confirm('Thu hồi đường dẫn? Khách sẽ không mở được proposal này nữa.')) return;
          try { await api(`/api/proposals/shares/${b.dataset.revoke}/revoke`, { method: 'POST', body: {} }); renderProposal(); } catch (e) { alert(e.message); }
        });
      };
      drawRows();
      document.getElementById('pr-q').oninput = (e) => { PR.q = e.target.value; drawRows(); };
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }
  async function copyText(t, btn) {
    try { await navigator.clipboard.writeText(t); } catch (e) { prompt('Sao chép đường dẫn:', t); return; }
    if (btn) { const o = btn.textContent; btn.textContent = 'Đã sao chép'; setTimeout(() => { btn.textContent = o; }, 1500); }
  }

  // Tạo PDF bản gửi khách (không ghi chú) trong một khung ẩn rồi tải về
  function buildPdf(pid, fields, onProgress) {
    if (prKind(pid) === 'pdf') {                   // proposal PDF tải lên: in chữ vào file gốc
      const p = prProp(pid);
      return Promise.all([loadRspdf(), ptplBytes(pid)]).then(([R, bytes]) => R.buildPdf(bytes, p.layout, prSample(pid, fields), onProgress))
        .then((out) => {
          const who = (fields.kh || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
          if (onProgress) onProgress(1, 1);
          return { blob: new Blob([out], { type: 'application/pdf' }), name: (p.pdf_name || 'Redsun-Proposal') + (who ? '-' + who : '') + '.pdf' };
        });
    }
    return new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:720px;border:0;opacity:0;pointer-events:none';
      f.src = `/proposal/${pid}/client?embed=1&${prQuery(fields)}`;
      const done = (fn, v) => { setTimeout(() => f.remove(), 500); fn(v); };
      f.onload = async () => {
        try {
          const w = f.contentWindow; let n = 0;
          while (!w.RS && n++ < 50) await new Promise((r) => setTimeout(r, 100));
          if (!w.RS) throw new Error('Không mở được proposal.');
          const blob = await w.RS.exportPdf(onProgress);
          done(resolve, { blob, name: w.RS.pdfName() });
        } catch (e) { done(reject, e); }
      };
      document.body.appendChild(f);
    });
  }
  function openPdfModal(pid) {
    const p = PR.data.proposals.find((x) => x.id === pid);
    openModal(`${modalHead('Xuất PDF – ' + esc(p.short), 'Bản PDF gửi khách: không có ghi chú người thuyết trình.')}
      <form id="pdf-form" class="px-6 py-5 space-y-3">
        <p class="text-xs text-slate-500">${prKind(pid) === 'pdf' ? 'Điền vào các ô thông tin đã đặt trên proposal.' : 'Trang bìa: "Kính gửi" + người nhận + doanh nghiệp.'}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${field('Người nhận', `<input id="pdf-nguoi" maxlength="120" class="${inputCls}" placeholder="Anh Nguyễn Văn Minh – Giám đốc">`)}
          ${field('Doanh nghiệp khách hàng', `<input id="pdf-kh" maxlength="160" class="${inputCls}" placeholder="Công ty Cổ phần ABC">`)}
        </div>
        <p class="text-xs text-slate-500">${prKind(pid) === 'pdf' ? 'Thông tin nhân viên' : 'Slide cuối ghi chuyên viên'}: <b>${esc([prMe(pid).tv, prMe(pid).sdt].filter(Boolean).join(' • '))}</b> (theo hồ sơ nhân viên).</p>
        <div id="pdf-prog" class="hidden"><div class="h-2 rounded-full bg-slate-100 overflow-hidden"><div id="pdf-bar" class="h-2 bg-redsun-700" style="width:0%"></div></div><p id="pdf-txt" class="text-xs text-slate-500 mt-1"></p></div>
        ${errBox('pdf-err')}
        <div class="flex justify-end gap-2 pt-2"><button type="button" onclick="closeModal()" class="${BTN_S}">Đóng</button><button id="pdf-go" class="${BTN_P}">Tạo PDF</button></div>
      </form>`);
    document.getElementById('pdf-form').onsubmit = async (e) => {
      e.preventDefault();
      const go = document.getElementById('pdf-go'); go.disabled = true;
      document.getElementById('pdf-prog').classList.remove('hidden');
      try {
        const { blob, name } = await buildPdf(pid, { ...prMe(pid), kh: document.getElementById('pdf-kh').value.trim(), nguoi: document.getElementById('pdf-nguoi').value.trim() }, (k, n) => {
          document.getElementById('pdf-bar').style.width = Math.round(k / n * 100) + '%';
          document.getElementById('pdf-txt').textContent = k < n ? `Đang tạo trang ${k + 1}/${n}…` : 'Hoàn tất.';
        });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        document.getElementById('pdf-txt').textContent = `Đã tải ${name} (${(blob.size / 1048576).toFixed(1)} MB).`;
      } catch (err) { showErr('pdf-err', 'Không tạo được PDF: ' + err.message); }
      finally { go.disabled = false; }
    };
  }
  function openSendModal(pid) {
    const p = PR.data.proposals.find((x) => x.id === pid), mailOk = PR.data.mail_ready, me = prMe(pid);
    openModal(`${modalHead('Gửi khách hàng – ' + esc(p.short), 'Khách nhận đường dẫn xem proposal (không có ghi chú) và tự tải PDF trên trang.')}
      <form id="send-form" class="px-6 py-5 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${field('Người nhận', `<input id="sd-name" maxlength="120" class="${inputCls}" placeholder="Anh Nguyễn Văn Minh">`, 'Hiện ở trang bìa ("Kính gửi") và lời chào email.')}
          ${field('Doanh nghiệp khách hàng *', `<input id="sd-company" required maxlength="160" class="${inputCls}" placeholder="Công ty Cổ phần ABC">`, 'Hiện ở trang bìa và tiêu đề email.')}
        </div>
        ${field('Email khách hàng' + (mailOk ? ' *' : ''), `<input id="sd-email" type="text" class="${inputCls}" placeholder="khachhang@congty.vn">`, 'Nhiều email: cách nhau bằng dấu phẩy.')}
        ${field('CC thêm (tùy chọn)', `<input id="sd-cc" class="${inputCls}" placeholder="truongphong@redsun.vn">`, `Bạn (${esc(me.email)}) luôn nhận bản CC; khách trả lời sẽ về email của bạn.`)}
        ${field('Lời nhắn', `<textarea id="sd-msg" rows="4" maxlength="2000" class="${inputCls}">${prLang(pid) === 'en' ? `Thank you for taking the time to speak with Redsun. Please find attached our ${esc(p.short.replace(/\s*\(EN\)$/, ''))} proposal for your review. If you have any questions, please feel free to contact me using the details below.` : `Cảm ơn Quý khách đã dành thời gian trao đổi với Redsun. Em xin gửi Quý khách bản đề xuất ${esc(p.short.replace(/\s*\(VN\)$/, ''))} để tham khảo. Nếu cần trao đổi thêm, Quý khách vui lòng liên hệ em theo thông tin bên dưới.`}</textarea>`)}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          ${field('Đường dẫn có hiệu lực', `<select id="sd-days" class="${inputCls}"><option value="7">7 ngày</option><option value="14">14 ngày</option><option value="30" selected>30 ngày (bằng hiệu lực báo giá)</option><option value="60">60 ngày</option><option value="90">90 ngày</option></select>`)}
          <label class="flex items-center gap-2 text-sm text-slate-700 pb-2"><input id="sd-send" type="checkbox" ${mailOk ? 'checked' : 'disabled'} class="w-4 h-4"> Gửi email ngay cho khách</label>
        </div>
        <p class="text-xs text-slate-500">Người gửi: <b>${esc(PR.data.from_name || '')}</b> • Slide cuối và chữ ký: <b>${esc([me.tv, me.cv, me.sdt, me.email].filter(Boolean).join(' • '))}</b>.${me.sdt ? '' : ' <span class="text-amber-700">Hồ sơ chưa có số điện thoại (Admin cập nhật ở tab Nhân viên).</span>'}</p>
        ${errBox('send-err')}
        <div class="flex justify-end gap-2 pt-2"><button type="button" onclick="closeModal()" class="${BTN_S}">Hủy</button><button id="sd-go" class="${BTN_P}">${mailOk ? 'Gửi proposal' : 'Tạo đường dẫn'}</button></div>
      </form>`);
    const sendBox = document.getElementById('sd-send'), goBtn = document.getElementById('sd-go');
    sendBox.onchange = () => { goBtn.textContent = sendBox.checked ? 'Gửi proposal' : 'Tạo đường dẫn'; };
    document.getElementById('send-form').onsubmit = async (e) => {
      e.preventDefault();
      const v = (id) => document.getElementById(id).value.trim();
      if (sendBox.checked && !v('sd-email')) return showErr('send-err', 'Nhập email khách hàng hoặc bỏ chọn "Gửi email ngay".');
      if (goBtn.disabled) return;                           // chặn bấm lặp khi đang gửi
      const label = goBtn.textContent;
      goBtn.disabled = true; sendBox.disabled = true;
      goBtn.classList.add('opacity-60', 'cursor-wait');
      goBtn.textContent = sendBox.checked ? 'Đang gửi...' : 'Đang tạo đường dẫn...';
      const cancel = document.querySelector('#send-form button[type="button"]'); if (cancel) cancel.disabled = true;
      try {
        const r = await api('/api/proposals/shares', { method: 'POST', body: { proposal_id: pid, customer_company: v('sd-company'), customer_name: v('sd-name'),
          customer_email: v('sd-email'), cc: v('sd-cc'), message: v('sd-msg'), days: +v('sd-days'), send_email: sendBox.checked } });
        const sent = r.email_status === 'sent' || r.email_status === 'sent_test';
        openModal(`${modalHead(sent ? 'Đã gửi proposal' : 'Đã tạo đường dẫn')}
          <div class="px-6 py-5 space-y-3 text-sm text-slate-700">
            ${sent ? `<p>Email đã gửi tới <b>${esc(v('sd-email'))}</b>${r.email_status === 'sent_test' ? ' (chế độ thử nghiệm: chỉ ghi log)' : ''}, bạn nhận bản CC.</p>`
              : r.email_error ? `<div class="p-3 rounded-lg bg-redsun-50 text-redsun-800">Chưa gửi được email: ${esc(r.email_error)}</div>` : '<p>Gửi đường dẫn này cho khách qua Zalo hoặc email riêng:</p>'}
            <div class="flex gap-2"><input id="sd-link" readonly value="${esc(r.link)}" class="${inputCls} font-mono text-xs"><button id="sd-copy" class="${BTN_S}">Sao chép</button></div>
            <div class="flex justify-end gap-2 pt-2"><a href="${esc(r.link)}" target="_blank" rel="noopener" class="${BTN_S}">Xem như khách</a><button onclick="closeModal()" class="${BTN_P}">Xong</button></div>
          </div>`);
        document.getElementById('sd-copy').onclick = (ev) => copyText(r.link, ev.target);
        renderProposal();
      } catch (err) {
        showErr('send-err', err.message);
        goBtn.disabled = false; sendBox.disabled = !mailOk; goBtn.textContent = label; goBtn.classList.remove('opacity-60', 'cursor-wait');
        if (cancel) cancel.disabled = false;
      }
    };
  }

  /* ----- Proposal PDF tải lên: thông tin mẫu + file ----- */
  function ptplForm(p) {
    const isNew = !p, en = p && p.lang === 'en';
    const maxMb = (PR.data && PR.data.ptpl_max_mb) || 25;
    openModal(`${modalHead(isNew ? 'Tải lên proposal PDF' : 'Sửa proposal PDF – ' + esc(p.short), 'Thiết kế proposal bằng PowerPoint/Canva, chừa chỗ trống cho tên khách và thông tin nhân viên, xuất ra PDF rồi tải lên đây.')}
      <form id="pt-form" class="px-6 py-5 space-y-3">
        ${field('Tiêu đề proposal *', `<input id="pt-title" required maxlength="160" value="${esc(p ? p.title : '')}" class="${inputCls}" placeholder="Redsun BOS – Đề xuất giải pháp 2026 (VN)">`, 'Hiện trên thẻ proposal và trang khách xem.')}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${field('Tên ngắn', `<input id="pt-short" maxlength="60" value="${esc(p ? p.short : '')}" class="${inputCls}" placeholder="Redsun BOS (VN)">`, 'Dùng trong danh sách đã gửi.')}
          ${field('Ngôn ngữ', `<select id="pt-lang" class="${inputCls}"><option value="vi">Tiếng Việt</option><option value="en" ${en ? 'selected' : ''}>Tiếng Anh</option></select>`, 'Email, ngày tháng, chức danh theo ngôn ngữ này.')}
          ${field('Phiên bản', `<input id="pt-ver" maxlength="20" value="${esc(p ? p.version : '')}" class="${inputCls}" placeholder="1.0">`)}
        </div>
        ${field('Mô tả ngắn', `<textarea id="pt-desc" rows="2" maxlength="600" class="${inputCls}" placeholder="Giải pháp gì, gồm những gói nào…">${esc(p ? p.description : '')}</textarea>`)}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${field('Tiêu đề email gửi khách', `<input id="pt-subj" maxlength="200" value="${esc(p ? p.email_subject : '')}" class="${inputCls}" placeholder="Redsun – Đề xuất giải pháp cho {khach}">`, '{khach} = tên doanh nghiệp khách hàng.')}
          ${field('Tên file PDF khi tải về', `<input id="pt-pdfname" maxlength="80" value="${esc(p ? p.pdf_name : '')}" class="${inputCls}" placeholder="Redsun-Proposal-BOS-VN">`, 'Tự thêm tên khách ở cuối.')}
        </div>
        ${field(`File PDF${isNew || !p.ready ? ' *' : ' (chọn để thay file)'}`, `<input id="pt-file" type="file" accept="application/pdf,.pdf" class="${inputCls}">`,
          (p && p.ready ? `Đang dùng: <b>${esc(p.file_name || '')}</b> (${(p.file_size / 1048576).toFixed(1)} MB, ${p.slides} trang). Thay file cùng bố cục thì các ô thông tin giữ nguyên. ` : '') + `Tối đa ${maxMb} MB.`)}
        <label class="flex items-start gap-2 text-sm text-slate-700"><input id="pt-active" type="checkbox" class="w-4 h-4 mt-0.5" ${p && p.active ? 'checked' : ''}>
          <span><b>Hiển thị cho nhân viên</b><span class="block text-[11px] text-slate-400">Bỏ chọn để chuẩn bị xong (đặt ô, xem thử) rồi mới mở cho nhân viên gửi khách.</span></span></label>
        <div id="pt-prog" class="hidden"><div class="h-2 rounded-full bg-slate-100 overflow-hidden"><div id="pt-bar" class="h-2 bg-redsun-700" style="width:0%"></div></div><p id="pt-txt" class="text-xs text-slate-500 mt-1"></p></div>
        ${errBox('pt-err')}
        <div class="flex justify-between gap-2 pt-2">
          <div>${p && canDo('ptpl', 'delete') ? `<button type="button" id="pt-del" class="${btn('bg-white border border-redsun-200 text-redsun-700 hover:bg-redsun-50')}">Xóa</button>` : ''}</div>
          <div class="flex gap-2"><button type="button" id="pt-cancel" onclick="closeModal()" class="${BTN_S}">Hủy</button><button id="pt-go" class="${BTN_P}">${isNew ? 'Tải lên & đặt ô' : 'Lưu'}</button></div></div>
      </form>`, false, true);
    const del = document.getElementById('pt-del');
    if (del) del.onclick = async () => {
      if (!confirm(`Xóa proposal "${p.short}"? Các đường dẫn đã gửi còn hiệu lực vẫn xem được đến khi hết hạn.`)) return;
      try { await api(`/api/ptpl/${p.id}`, { method: 'DELETE' }); closeModal(); renderProposal(); } catch (e) { showErr('pt-err', e.message); }
    };
    document.getElementById('pt-form').onsubmit = async (e) => {
      e.preventDefault();
      const v = (id) => document.getElementById(id).value.trim();
      const file = document.getElementById('pt-file').files[0];
      const wantActive = document.getElementById('pt-active').checked;
      if ((isNew || !p.ready) && !file) return showErr('pt-err', 'Chọn file PDF của proposal.');
      if (file && file.size > maxMb * 1048576) return showErr('pt-err', `File vượt quá ${maxMb} MB. Hãy nén PDF (giảm chất lượng ảnh) rồi tải lại.`);
      const go = document.getElementById('pt-go'), lbl = go.textContent; go.disabled = true; go.textContent = 'Đang lưu…';
      document.getElementById('pt-cancel').disabled = true;
      const meta = { title: v('pt-title'), short: v('pt-short'), lang: v('pt-lang'), version: v('pt-ver'), description: v('pt-desc'),
        email_subject: v('pt-subj'), pdf_name: v('pt-pdfname'), active: wantActive && !!(p && p.ready) && !file };
      try {
        let id = p && p.id, pages = 0;
        if (file) {                                         // đọc thử PDF trước khi tải: đếm trang, báo lỗi file hỏng
          const R = await loadRspdf();
          const doc = await R.open(new Uint8Array(await file.arrayBuffer())).catch(() => { throw new Error('Không đọc được file PDF (file hỏng hoặc có mật khẩu).'); });
          pages = doc.numPages; try { (doc.loadingTask || doc).destroy(); } catch (x) { /* bỏ qua */ }
        }
        if (isNew) id = (await api('/api/ptpl', { method: 'POST', body: meta })).id;
        else await api(`/api/ptpl/${id}`, { method: 'PUT', body: meta });
        if (file) {
          document.getElementById('pt-prog').classList.remove('hidden');
          await uploadPdf(id, file, (pc) => { document.getElementById('pt-bar').style.width = pc + '%'; document.getElementById('pt-txt').textContent = pc < 100 ? `Đang tải lên ${pc}%…` : 'Đang lưu file…'; },
            `/api/ptpl/${id}/file`, { 'x-pages': pages });
          if (wantActive) await api(`/api/ptpl/${id}`, { method: 'PUT', body: { ...meta, active: true } });
        }
        closeModal();
        await renderProposal();
        if (isNew || (file && !(p && p.layout.length))) ptplEditor(id);
      } catch (err) {
        showErr('pt-err', err.message); go.disabled = false; go.textContent = lbl; document.getElementById('pt-cancel').disabled = false;
      }
    };
  }

  /* ----- Trình đặt ô thông tin lên trang PDF (kéo thả, chỉnh cỡ chữ, màu, căn lề) ----- */
  async function ptplEditor(id) {
    const old = document.getElementById('pt-ed'); if (old) old.remove();
    const ed = document.createElement('div');
    ed.id = 'pt-ed'; ed.className = 'fixed inset-0 z-[60] bg-slate-100 flex flex-col';
    ed.innerHTML = '<div class="p-10 text-center text-slate-500 text-sm">Đang mở trình đặt ô…</div>';
    document.body.appendChild(ed); document.body.style.overflow = 'hidden';
    const close = () => { ed.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
    let R, doc, P;
    try {
      [R, P] = await Promise.all([loadRspdf(), api(`/api/ptpl/${encodeURIComponent(id)}`).then((d) => d.proposal)]);
      doc = await R.open(await ptplBytes(id));
      await R.fontsReady();
    } catch (e) {
      ed.innerHTML = `<div class="p-10 text-center text-sm text-redsun-800">${esc(e.message)}<div class="mt-4"><button id="pe-x" class="${BTN_S}">Đóng</button></div></div>`;
      document.getElementById('pe-x').onclick = close; return;
    }
    const FL = (PR.data && PR.data.ptpl_fields) || {};
    const N = doc.numPages, pages = {}, sizes = {};
    let L = JSON.parse(JSON.stringify(P.layout || [])), cur = 0, sel = null, dirty = false, plain = false;
    const sample = prSample(id, { kh: P.lang === 'en' ? 'ABC Technology Joint Stock Company' : 'Công ty Cổ phần Công nghệ ABC', nguoi: P.lang === 'en' ? 'Mr. John Smith – CEO' : 'Anh Nguyễn Văn Minh – Giám đốc' });
    const SW = ['#0f172a', '#003049', '#ba0000', '#edad32', '#ffffff', '#475569'];
    const uid = () => Math.random().toString(36).slice(2, 10);
    const onPage = (b) => b.page === 0 || b.page === cur + 1;
    const keyLabel = (t) => String(t).replace(/\{(\w+)\}/g, (_, k) => `[${FL[k] || k}]`);
    ed.innerHTML = `
      <div class="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200">
        <div class="min-w-0 flex-1"><h3 class="font-extrabold text-slate-900 truncate">Đặt ô thông tin – ${esc(P.short)}</h3>
          <p class="text-[11px] text-slate-500">Chọn thông tin ở cột phải để thêm ô, kéo ô vào chỗ trống trên trang, kéo góc dưới phải để đổi kích thước. Chữ dài tự thu nhỏ cho vừa ô.</p></div>
        <div class="flex items-center gap-1"><button id="pe-prev" class="${BTN_S}" aria-label="Trang trước">‹</button>
          <span class="text-sm text-slate-600 px-1">Trang <input id="pe-pg" type="number" min="1" max="${N}" value="1" class="w-14 px-1 py-1 border border-slate-300 rounded text-center text-sm"> / ${N}</span>
          <button id="pe-next" class="${BTN_S}" aria-label="Trang sau">›</button></div>
        <label class="flex items-center gap-1.5 text-xs text-slate-600 px-2"><input id="pe-plain" type="checkbox" class="w-4 h-4"> Xem như khách</label>
        <button id="pe-cancel" class="${BTN_S}">Đóng</button><button id="pe-save" class="${BTN_P}">Lưu</button>
      </div>
      <div class="flex-1 flex min-h-0">
        <div id="pe-main" class="flex-1 overflow-auto p-4 sm:p-6"><div id="pe-page" class="relative mx-auto bg-white shadow-lg select-none" style="max-width:1100px"><canvas class="absolute inset-0 w-full h-full"></canvas><div id="pe-lay" class="absolute inset-0"></div></div>
          <p id="pe-thumbs" class="text-center text-[11px] text-slate-400 mt-3"></p></div>
        <aside class="w-80 shrink-0 bg-white border-l border-slate-200 overflow-y-auto p-4 space-y-5">
          <div><h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Thêm ô vào trang này</h4>
            <div class="grid grid-cols-2 gap-1.5">${Object.entries(FL).map(([k, t]) => `<button data-add="${k}" class="text-left text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:border-redsun-400 hover:bg-redsun-50">＋ ${esc(t)}</button>`).join('')}</div></div>
          <div id="pe-prop"></div>
          <div><h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Dữ liệu xem thử</h4>
            <div class="space-y-2">${field('Doanh nghiệp khách', `<input id="pe-s-kh" value="${esc(sample.kh)}" class="${inputCls}">`)}
            ${field('Người nhận', `<input id="pe-s-nguoi" value="${esc(sample.nguoi)}" class="${inputCls}">`, 'Thử tên dài để kiểm tra chữ có vừa ô. Thông tin nhân viên lấy theo hồ sơ của bạn.')}</div></div>
        </aside>
      </div>`;
    const $ = (s) => ed.querySelector(s);
    const page = $('#pe-page'), lay = $('#pe-lay'), canvas = page.querySelector('canvas');

    async function showPage(i) {
      cur = Math.max(0, Math.min(N - 1, i)); $('#pe-pg').value = cur + 1;
      if (sel && !onPage(L.find((b) => b.id === sel) || {})) sel = null;
      if (!pages[cur]) { pages[cur] = await doc.getPage(cur + 1); sizes[cur] = R.pageSize(pages[cur]); }
      const s = sizes[cur], main = $('#pe-main');
      const maxW = Math.min(1100, main.clientWidth - 48, (main.clientHeight - 60) * s.w / s.h);
      page.style.width = Math.max(320, Math.floor(maxW)) + 'px'; page.style.aspectRatio = `${s.w} / ${s.h}`;
      await R.renderPage(pages[cur], canvas, page.clientWidth).catch(() => {});
      drawBoxes(); drawProps();
      const used = [...new Set(L.map((b) => b.page))].filter((x) => x > 0).sort((a, b) => a - b);
      $('#pe-thumbs').textContent = L.length ? `${L.length} ô • có ô ở trang: ${[L.some((b) => b.page === 0) ? 'mọi trang' : '', ...used].filter(Boolean).join(', ')}` : 'Chưa có ô nào.';
    }
    function drawBoxes() {
      const s = sizes[cur], k = lay.clientWidth / s.w;
      lay.innerHTML = '';
      const data = { ...sample, kh: $('#pe-s-kh').value.trim(), nguoi: $('#pe-s-nguoi').value.trim() };
      L.filter(onPage).forEach((b) => {
        const text = R.fill(b.text, data), on = b.id === sel;
        const show = text || keyLabel(b.text), sz = R.fit(R.measure(show, b.size, b.weight), b.size, b.w * s.w);
        const d = document.createElement('div');
        d.dataset.box = b.id;
        d.style.cssText = `position:absolute;left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%;display:flex;align-items:center;white-space:nowrap;line-height:1;cursor:move;touch-action:none;`
          + `justify-content:${b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start'};font-family:'Be Vietnam Pro',Arial,sans-serif;font-weight:${b.weight};`
          + `color:${text ? b.color : '#94a3b8'};font-size:${sz * k}px;font-style:${text ? 'normal' : 'italic'};`
          + (plain && !on ? '' : `outline:${on ? '2px solid #2563eb' : '1.5px dashed #2563eb'};outline-offset:0;background:${on ? 'rgba(37,99,235,.10)' : 'rgba(37,99,235,.05)'};`);
        d.textContent = show;
        if (b.page === 0 && !plain) { const t = document.createElement('span'); t.textContent = 'mọi trang'; t.style.cssText = 'position:absolute;top:-15px;left:0;font:600 9px Arial;color:#2563eb;font-style:normal'; d.appendChild(t); }
        if (on) { const h = document.createElement('div'); h.dataset.rs = '1'; h.style.cssText = 'position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;background:#2563eb;border:2px solid #fff;border-radius:3px;cursor:nwse-resize'; d.appendChild(h); }
        lay.appendChild(d);
      });
    }
    function drawProps() {
      const b = L.find((x) => x.id === sel), el = $('#pe-prop');
      if (!b) { el.innerHTML = `<div class="p-3 rounded-lg bg-slate-50 text-xs text-slate-500">Bấm vào một ô trên trang để chỉnh. Phím mũi tên: dịch ô (giữ Shift: dịch nhanh), Delete: xóa ô.</div>`; return; }
      el.innerHTML = `<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Ô đang chọn</h4><div class="space-y-3">
        ${field('Nội dung', `<input id="pp-text" maxlength="300" value="${esc(b.text)}" class="${inputCls} font-mono text-xs">`, 'Có thể gõ thêm chữ cố định, vd: <code>Kính gửi: {nguoi}</code>. Ô có thông tin trống sẽ để trống.')}
        <select id="pp-ins" class="${inputCls} text-xs"><option value="">＋ Chèn thông tin vào nội dung…</option>${Object.entries(FL).map(([k, t]) => `<option value="${k}">${esc(t)} – {${k}}</option>`).join('')}</select>
        <div class="grid grid-cols-2 gap-2">
          ${field('Cỡ chữ (pt)', `<input id="pp-size" type="number" min="3" max="300" step="0.5" value="${b.size}" class="${inputCls}">`)}
          ${field('Độ đậm', `<select id="pp-w" class="${inputCls}"><option value="400">Thường</option><option value="600" ${b.weight === 600 ? 'selected' : ''}>Đậm vừa</option><option value="700" ${b.weight === 700 ? 'selected' : ''}>Đậm</option></select>`)}</div>
        <div><span class="block text-xs font-bold text-slate-600 mb-1">Màu chữ</span><div class="flex items-center gap-1.5">
          <input id="pp-color" type="color" value="${b.color}" class="w-9 h-8 p-0 border border-slate-300 rounded cursor-pointer">
          ${SW.map((c) => `<button data-sw="${c}" title="${c}" class="w-6 h-6 rounded-full border ${b.color === c ? 'ring-2 ring-blue-500' : 'border-slate-300'}" style="background:${c}"></button>`).join('')}</div></div>
        <div><span class="block text-xs font-bold text-slate-600 mb-1">Căn lề</span><div class="grid grid-cols-3 gap-1">
          ${[['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải']].map(([a, t]) => `<button data-al="${a}" class="text-xs py-1.5 rounded-lg border ${b.align === a ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200'}">${t}</button>`).join('')}</div></div>
        <label class="flex items-center gap-2 text-xs text-slate-700"><input id="pp-all" type="checkbox" class="w-4 h-4" ${b.page === 0 ? 'checked' : ''}> Lặp lại ở mọi trang (vd: chân trang)</label>
        <div class="flex gap-2"><button id="pp-dup" class="${BTN_S} flex-1">Nhân bản</button><button id="pp-del" class="${btn('bg-white border border-redsun-200 text-redsun-700 hover:bg-redsun-50')} flex-1">Xóa ô</button></div></div>`;
      const up = (fn) => { fn(b); dirty = true; drawBoxes(); };
      $('#pp-text').oninput = (e) => up((x) => { x.text = e.target.value; });
      $('#pp-ins').onchange = (e) => { if (!e.target.value) return; const t = $('#pp-text'); up((x) => { x.text = (x.text ? x.text + ' ' : '') + `{${e.target.value}}`; }); t.value = b.text; e.target.value = ''; };
      $('#pp-size').oninput = (e) => up((x) => { x.size = Math.max(3, Math.min(300, +e.target.value || x.size)); });
      $('#pp-w').onchange = (e) => up((x) => { x.weight = +e.target.value; });
      $('#pp-color').oninput = (e) => up((x) => { x.color = e.target.value; });
      el.querySelectorAll('[data-sw]').forEach((s) => s.onclick = () => { up((x) => { x.color = s.dataset.sw; }); drawProps(); });
      el.querySelectorAll('[data-al]').forEach((s) => s.onclick = () => { up((x) => { x.align = s.dataset.al; }); drawProps(); });
      $('#pp-all').onchange = (e) => { up((x) => { x.page = e.target.checked ? 0 : cur + 1; }); showPage(cur); };
      $('#pp-dup').onclick = () => { const c = { ...b, id: uid(), y: Math.min(1 - b.h, b.y + b.h + 0.01) }; L.push(c); sel = c.id; dirty = true; drawBoxes(); drawProps(); };
      $('#pp-del').onclick = () => { L = L.filter((x) => x.id !== b.id); sel = null; dirty = true; showPage(cur); };
    }
    // Thêm ô mới ở giữa trang
    ed.querySelectorAll('[data-add]').forEach((a) => a.onclick = () => {
      const s = sizes[cur], k = a.dataset.add;
      const b = { id: uid(), page: cur + 1, x: 0.3, y: 0.45, w: 0.4, h: 0.06, text: `{${k}}`, size: Math.round(s.h * 0.03 * 2) / 2, color: '#0f172a', align: 'left', weight: k === 'kh' ? 700 : 400 };
      b.h = Math.min(0.2, Math.max(0.03, (b.size * 1.6) / s.h));
      L.push(b); sel = b.id; dirty = true; showPage(cur);
    });
    // Kéo thả / đổi kích thước bằng chuột hoặc cảm ứng
    let drag = null;
    lay.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-box]');
      if (!el) { if (sel) { sel = null; drawBoxes(); drawProps(); } return; }
      const b = L.find((x) => x.id === el.dataset.box); if (!b) return;
      e.preventDefault();
      if (sel !== b.id) { sel = b.id; drawBoxes(); drawProps(); }
      const r = lay.getBoundingClientRect();
      drag = { b, resize: !!e.target.dataset.rs, sx: e.clientX, sy: e.clientY, x: b.x, y: b.y, w: b.w, h: b.h, W: r.width, H: r.height, moved: false };
      lay.setPointerCapture(e.pointerId);
    });
    lay.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.sx) / drag.W, dy = (e.clientY - drag.sy) / drag.H, b = drag.b;
      if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 3) return;
      drag.moved = true;
      if (drag.resize) { b.w = Math.max(0.01, Math.min(1 - b.x, drag.w + dx)); b.h = Math.max(0.01, Math.min(1 - b.y, drag.h + dy)); }
      else { b.x = Math.max(0, Math.min(1 - b.w, drag.x + dx)); b.y = Math.max(0, Math.min(1 - b.h, drag.y + dy)); }
      dirty = true; drawBoxes();
    });
    const endDrag = () => { drag = null; };
    lay.addEventListener('pointerup', endDrag); lay.addEventListener('pointercancel', endDrag);
    function onKey(e) {
      if (!sel || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
      const b = L.find((x) => x.id === sel); if (!b) return;
      const st = e.shiftKey ? 0.01 : 0.002, mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (mv) { e.preventDefault(); b.x = Math.max(0, Math.min(1 - b.w, b.x + mv[0])); b.y = Math.max(0, Math.min(1 - b.h, b.y + mv[1])); dirty = true; drawBoxes(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); L = L.filter((x) => x.id !== sel); sel = null; dirty = true; showPage(cur); }
      else if (e.key === 'Escape') { sel = null; drawBoxes(); drawProps(); }
    }
    document.addEventListener('keydown', onKey);
    let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => showPage(cur), 150); };
    window.addEventListener('resize', onResize);
    $('#pe-prev').onclick = () => showPage(cur - 1); $('#pe-next').onclick = () => showPage(cur + 1);
    $('#pe-pg').onchange = (e) => showPage((+e.target.value || 1) - 1);
    $('#pe-plain').onchange = (e) => { plain = e.target.checked; drawBoxes(); };
    $('#pe-s-kh').oninput = $('#pe-s-nguoi').oninput = () => drawBoxes();
    $('#pe-cancel').onclick = () => { if (dirty && !confirm('Đóng mà không lưu các thay đổi?')) return; close(); };
    $('#pe-save').onclick = async () => {
      const bt = $('#pe-save'); bt.disabled = true; bt.textContent = 'Đang lưu…';
      try {
        const r = await api(`/api/ptpl/${encodeURIComponent(id)}/layout`, { method: 'PUT', body: { layout: L } });
        dirty = false; close(); await renderProposal();
        if (!P.active && canDo('ptpl', 'edit')) alert(`Đã lưu ${r.boxes} ô. Proposal đang ẩn với nhân viên: bấm "⚙ Sửa" và chọn "Hiển thị cho nhân viên" khi đã sẵn sàng.`);
      } catch (e) { alert(e.message); bt.disabled = false; bt.textContent = 'Lưu'; }
    };
    showPage(0);
  }

  /* =========================================================================
     TRANG: TÀI LIỆU NỘI BỘ – Admin đăng PDF; nhân viên chỉ đọc trong tool (không tải về), mỗi lần mở được ghi lại
     ========================================================================= */
  const DOC = { data: null, q: '', group: '' };
  const docEl = () => document.getElementById('tab-docs');
  const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const fmtDT2 = (ts) => ts ? new Date(ts * 1000).toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const noAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  async function renderDocs() {
    const el = docEl(); el.innerHTML = loading;
    try {
      const d = await api('/api/docs'); DOC.data = d;
      const groups = [...new Set(d.docs.map((x) => x.group_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
      if (DOC.group && !groups.includes(DOC.group)) DOC.group = '';
      el.innerHTML = pageHead('Tài liệu nội bộ', 'Chỉ đọc trong tool, không tải về. Mỗi lần mở tài liệu đều được ghi lại.',
          d.can && d.can.add ? `<button id="doc-add" class="${BTN_P}">＋ Đăng tài liệu</button>` : '')
        + `<div class="flex flex-col sm:flex-row gap-3 mb-5">
            <input id="doc-q" value="${esc(DOC.q)}" placeholder="Tìm tên, mô tả tài liệu…" class="${inputCls} sm:max-w-sm">
            <select id="doc-g" class="${inputCls} sm:max-w-xs"><option value="">Tất cả nhóm (${d.docs.length})</option>${groups.map((g) => `<option ${g === DOC.group ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
          </div><div id="doc-list" class="space-y-6"></div>`;
      const draw = () => {
        const q = noAccent(DOC.q.trim());
        const rows = d.docs.filter((x) => (!DOC.group || x.group_name === DOC.group) && (!q || noAccent(x.title + ' ' + x.description + ' ' + x.group_name).includes(q)));
        const by = {};
        rows.forEach((x) => { (by[x.group_name || ''] = by[x.group_name || ''] || []).push(x); });
        const keys = Object.keys(by).sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'vi'));
        document.getElementById('doc-list').innerHTML = keys.length ? keys.map((g) => `<section>
            <h3 class="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2">${esc(g || 'Chưa phân nhóm')} <span class="text-slate-400">· ${by[g].length}</span></h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">${by[g].map(docCard).join('')}</div></section>`).join('')
          : card(`<div class="p-10 text-center text-slate-400 text-sm">${d.docs.length ? 'Không có tài liệu phù hợp.' : (d.can_manage ? 'Chưa có tài liệu. Bấm "Đăng tài liệu" để thêm file PDF đầu tiên.' : 'Chưa có tài liệu nào.')}</div>`);
        el.querySelectorAll('[data-read]').forEach((b) => b.onclick = () => openDocViewer(d.docs.find((x) => x.id === +b.dataset.read)));
        el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => openDocForm(d.docs.find((x) => x.id === +b.dataset.edit)));
        el.querySelectorAll('[data-views]').forEach((b) => b.onclick = () => openDocViews(d.docs.find((x) => x.id === +b.dataset.views)));
        el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
          const x = d.docs.find((y) => y.id === +b.dataset.del);
          if (!confirm(`Xóa tài liệu "${x.title}"? File và lịch sử lượt xem sẽ bị xóa.`)) return;
          try { await api(`/api/docs/${x.id}`, { method: 'DELETE' }); renderDocs(); } catch (e) { alert(e.message); }
        });
      };
      const docCard = (x) => card(`<div class="p-4 flex gap-4 h-full">
          <div class="shrink-0 w-11 h-14 rounded-md bg-redsun-50 border border-redsun-100 flex items-center justify-center text-[11px] font-extrabold text-redsun-700">PDF</div>
          <div class="min-w-0 flex-grow flex flex-col">
            <div class="flex items-start gap-2"><h4 class="font-bold text-slate-900 leading-snug">${esc(x.title)}</h4>${x.chunks && !x.my_last_view ? '<span class="shrink-0 px-1.5 py-0.5 rounded bg-gold-100 text-amber-800 text-[10px] font-bold">CHƯA ĐỌC</span>' : ''}</div>
            ${x.description ? `<p class="text-sm text-slate-600 mt-1 whitespace-pre-line">${esc(x.description)}</p>` : ''}
            <p class="text-[11px] text-slate-400 mt-2 leading-relaxed">Đăng ${fmtDate(x.created_at)}${x.created_by_name ? ' · ' + esc(x.created_by_name) : ''}
              ${x.updated_at > x.created_at + 60 ? ` • Sửa ${fmtDate(x.updated_at)}${x.updated_by_name ? ' · ' + esc(x.updated_by_name) : ''}` : ''}
              ${x.chunks ? ` • ${fmtSize(x.file_size)}` : ' • <span class="text-redsun-700 font-semibold">chưa có file</span>'} • 👁 ${x.views} lượt xem${x.viewers ? ` (${x.viewers} người)` : ''}</p>
            <div class="flex flex-wrap gap-2 mt-3">
              ${x.chunks ? `<button data-read="${x.id}" class="${BTN_P} !py-1.5">Đọc tài liệu</button>` : ''}
              ${d.can && d.can.edit ? `<button data-edit="${x.id}" class="${BTN_S} !py-1.5">Sửa</button><button data-views="${x.id}" class="${BTN_S} !py-1.5">Lượt xem</button>` : ''}${d.can && d.can.delete ? `<button data-del="${x.id}" class="text-xs text-slate-500 hover:text-redsun-700 px-2">Xóa</button>` : ''}
            </div></div></div>`, 'h-full');
      draw();
      document.getElementById('doc-q').oninput = (e) => { DOC.q = e.target.value; draw(); };
      document.getElementById('doc-g').onchange = (e) => { DOC.group = e.target.value; draw(); };
      const add = document.getElementById('doc-add'); if (add) add.onclick = () => openDocForm(null);
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  // Admin: đăng mới / sửa thông tin / thay file PDF
  function openDocForm(x) {
    const d = DOC.data, groups = [...new Set(d.docs.map((y) => y.group_name).filter(Boolean))];
    openModal(`${modalHead(x ? 'Sửa tài liệu' : 'Đăng tài liệu', `File PDF, tối đa ${d.max_mb} MB. Nhân viên chỉ đọc trong tool, không tải về.`)}
      <form id="doc-form" class="px-6 py-5 space-y-3">
        ${field('Tên tài liệu *', `<input id="df-title" required maxlength="200" value="${esc(x ? x.title : '')}" class="${inputCls}">`)}
        ${field('Nhóm tài liệu', `<select id="df-gsel" class="${inputCls}">
            <option value="">— Chưa phân nhóm —</option>
            ${groups.sort((a, b) => a.localeCompare(b, 'vi')).map((g) => `<option value="${esc(g)}" ${x && x.group_name === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
            <option value="__new__" ${groups.length ? '' : 'selected'}>＋ Thêm nhóm mới…</option></select>
          <input id="df-gnew" maxlength="80" placeholder="Nhập tên nhóm mới, VD: Quy trình bán hàng" class="${inputCls} mt-2 ${groups.length ? 'hidden' : ''}">`,
          groups.length ? 'Chọn nhóm có sẵn, hoặc chọn "＋ Thêm nhóm mới…" để tạo nhóm.' : 'Chưa có nhóm nào — nhập tên nhóm đầu tiên (có thể để trống).')}
        ${field('Mô tả', `<textarea id="df-desc" rows="3" maxlength="2000" class="${inputCls}">${esc(x ? x.description : '')}</textarea>`)}
        ${field(x ? 'Thay file PDF (để trống nếu giữ file cũ)' : 'File PDF *', `<input id="df-file" type="file" accept="application/pdf,.pdf" ${x ? '' : 'required'} class="block w-full text-sm text-slate-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold">`,
          x && x.chunks ? `File hiện tại: ${esc(x.file_name || '')} (${fmtSize(x.file_size)}), cập nhật ${fmtDT2(x.file_updated_at)}` : '')}
        <div id="df-prog" class="hidden"><div class="h-2 rounded-full bg-slate-100 overflow-hidden"><div id="df-bar" class="h-2 bg-redsun-700" style="width:0%"></div></div><p id="df-txt" class="text-xs text-slate-500 mt-1"></p></div>
        ${errBox('df-err')}
        <div class="flex justify-end gap-2 pt-2"><button type="button" id="df-cancel" onclick="closeModal()" class="${BTN_S}">Hủy</button><button id="df-go" class="${BTN_P}">${x ? 'Lưu' : 'Đăng tài liệu'}</button></div>
      </form>`);
    const gSel = document.getElementById('df-gsel'), gNew = document.getElementById('df-gnew');
    gSel.onchange = () => { const nw = gSel.value === '__new__'; gNew.classList.toggle('hidden', !nw); if (nw) gNew.focus(); };
    document.getElementById('doc-form').onsubmit = async (e) => {
      e.preventDefault();
      const v = (id) => document.getElementById(id).value.trim();
      if (gSel.value === '__new__' && v('df-gnew')) {           // gõ trùng tên nhóm đã có (khác hoa/thường) thì dùng nhóm đó
        const same = groups.find((g) => g.toLocaleLowerCase('vi') === v('df-gnew').replace(/\s+/g, ' ').toLocaleLowerCase('vi'));
        if (same) { gSel.value = same; gNew.classList.add('hidden'); }
      }
      const file = document.getElementById('df-file').files[0];
      if (file && (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')) return showErr('df-err', 'Chỉ nhận file PDF.');
      if (file && file.size > d.max_mb * 1048576) return showErr('df-err', `File ${fmtSize(file.size)} vượt quá ${d.max_mb} MB.`);
      const go = document.getElementById('df-go'), lbl = go.textContent;
      go.disabled = true; document.getElementById('df-cancel').disabled = true; go.textContent = 'Đang lưu...';
      let id = x && x.id, created = false;
      try {
        const gsel = document.getElementById('df-gsel').value;
        const meta = { title: v('df-title'), group_name: gsel === '__new__' ? v('df-gnew') : gsel, description: document.getElementById('df-desc').value.trim() };
        if (x) await api(`/api/docs/${id}`, { method: 'PUT', body: meta });
        else { id = (await api('/api/docs', { method: 'POST', body: meta })).id; created = true; }
        if (file) {
          go.textContent = 'Đang tải file...';
          document.getElementById('df-prog').classList.remove('hidden');
          await uploadPdf(id, file, (pct) => {
            document.getElementById('df-bar').style.width = pct + '%';
            document.getElementById('df-txt').textContent = pct < 100 ? `Đang tải lên ${pct}%…` : 'Đang lưu file…';
          });
        }
        closeModal(); renderDocs();
      } catch (err) {
        if (created) { try { await api(`/api/docs/${id}`, { method: 'DELETE' }); } catch (e2) { /* bỏ qua */ } }
        showErr('df-err', err.message);
        go.disabled = false; go.textContent = lbl; document.getElementById('df-cancel').disabled = false;
      }
    };
  }
  function uploadPdf(id, file, onProgress, path, headers) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', path || `/api/docs/${id}/file`);
      xhr.setRequestHeader('content-type', 'application/pdf');
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
      Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, String(v)));
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = () => {
        let d = {}; try { d = JSON.parse(xhr.responseText); } catch (e) { /* bỏ qua */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(d); else reject(new Error(d.error || `Tải file thất bại (mã ${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error('Mất kết nối khi tải file. Vui lòng thử lại.'));
      xhr.send(file);
    });
  }

  // Admin: ai đã xem, bao nhiêu lần
  async function openDocViews(x) {
    openModal(`${modalHead('Lượt xem – ' + esc(x.title))}<div id="dv-body" class="px-6 py-5">${loading}</div>`);
    try {
      const r = await api(`/api/docs/${x.id}/views`);
      document.getElementById('dv-body').innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="p-3 rounded-xl bg-slate-50"><p class="text-[11px] font-bold text-slate-500 uppercase">Tổng lượt xem</p><p class="text-2xl font-extrabold text-slate-900">${r.total}</p></div>
          <div class="p-3 rounded-xl bg-slate-50"><p class="text-[11px] font-bold text-slate-500 uppercase">Số người đã xem</p><p class="text-2xl font-extrabold text-slate-900">${r.viewers.length}</p></div>
        </div>
        ${r.viewers.length ? `<div class="overflow-x-auto max-h-[50vh] overflow-y-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500 sticky top-0"><tr>
            <th class="py-2 px-3 text-left">Nhân viên</th><th class="py-2 px-3 text-right">Số lần</th><th class="py-2 px-3 text-left">Lần đầu</th><th class="py-2 px-3 text-left">Gần nhất</th></tr></thead>
          <tbody class="divide-y divide-slate-100">${r.viewers.map((u) => `<tr><td class="py-2 px-3"><b class="text-slate-900">${esc(u.name)}</b><br><span class="text-[11px] text-slate-400">${esc(u.email)}</span></td>
            <td class="py-2 px-3 text-right font-bold">${u.views}</td><td class="py-2 px-3 text-xs">${fmtDT2(u.first_at)}</td><td class="py-2 px-3 text-xs">${fmtDT2(u.last_at)}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="text-sm text-slate-400 text-center py-6">Chưa có ai xem tài liệu này.</p>'}
        <p class="text-[11px] text-slate-400 mt-3">Mỗi lần mở tài liệu tính một lượt; mở lại trong vòng 10 phút không tính thêm.</p>`;
    } catch (e) { document.getElementById('dv-body').innerHTML = `<p class="text-sm text-redsun-800">${esc(e.message)}</p>`; }
  }

  /* ---------- Trình đọc PDF: vẽ từng trang lên canvas, có dấu chìm tên người xem, chặn tải/in/sao chép ---------- */
  let pdfjsLib = null;
  async function loadPdfJs() {
    if (!pdfjsLib) {
      pdfjsLib = await import('/vendor/pdfjs/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
    }
    return pdfjsLib;
  }
  function watermarkUrl(text) {
    const t = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="260"><text x="230" y="130" text-anchor="middle" transform="rotate(-28 230 130)" font-family="Arial, sans-serif" font-size="15" fill="rgba(15,23,42,0.13)">${t}</text></svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }
  function closeDocViewer() {
    const v = document.getElementById('doc-viewer'); if (!v) return;
    if (v._cleanup) v._cleanup();
    v.remove(); document.body.classList.remove('doc-viewing');
    if (!document.getElementById('tab-docs').classList.contains('hidden')) renderDocs();   // cập nhật lượt xem, bỏ nhãn "Chưa đọc"
  }
  async function openDocViewer(x) {
    closeDocViewer();
    if (!document.getElementById('doc-viewer-css')) {
      const st = document.createElement('style'); st.id = 'doc-viewer-css';
      st.textContent = `body.doc-viewing{overflow:hidden}
        #doc-viewer{position:fixed;inset:0;z-index:70;background:#1e293b;display:flex;flex-direction:column;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
        #doc-viewer canvas{display:block;width:100%;height:auto;pointer-events:none}
        #doc-viewer .dv-page{position:relative;margin:0 auto 16px;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.35)}
        #doc-viewer .dv-wm{position:absolute;inset:0;pointer-events:none;background-repeat:repeat}
        @media print{body.doc-viewing *{display:none!important}body.doc-viewing::after{content:"Tài liệu nội bộ – không được in.";display:block!important;padding:40px;font:16px Arial}}`;
      document.head.appendChild(st);
    }
    const wm = `${S.me.name} · ${S.me.email} · ${fmtDT2(Math.floor(Date.now() / 1000))}`;
    const v = document.createElement('div'); v.id = 'doc-viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', x.title);
    v.innerHTML = `<div class="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 bg-slate-900 text-white shrink-0">
        <div class="min-w-0 flex-grow"><p class="font-bold truncate">${esc(x.title)}</p><p class="text-[11px] text-slate-400 truncate">Tài liệu nội bộ · chỉ đọc · lượt xem của bạn đã được ghi lại</p></div>
        <span id="dv-page" class="text-xs text-slate-300 whitespace-nowrap"></span>
        <button id="dv-out" class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 font-bold" title="Thu nhỏ" aria-label="Thu nhỏ">−</button>
        <button id="dv-fit" class="hidden sm:block px-2 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold" title="Vừa chiều ngang">Vừa khung</button>
        <button id="dv-in" class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 font-bold" title="Phóng to" aria-label="Phóng to">+</button>
        <button id="dv-close" class="w-9 h-9 rounded-lg bg-redsun-700 hover:bg-redsun-800 font-bold text-lg leading-none" title="Đóng (Esc)" aria-label="Đóng">×</button></div>
      <div id="dv-scroll" class="flex-grow overflow-auto py-4 px-2 sm:px-6"><p id="dv-status" class="text-center text-slate-300 text-sm py-20">Đang mở tài liệu…</p></div>`;
    document.body.appendChild(v); document.body.classList.add('doc-viewing');
    const block = (e) => e.preventDefault();
    const keys = (e) => {
      if (e.key === 'Escape') { closeDocViewer(); return; }
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'a', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); }
    };
    v.addEventListener('contextmenu', block); v.addEventListener('dragstart', block); v.addEventListener('copy', block);
    document.addEventListener('keydown', keys, true);
    let pdf = null, task = null, observer = null, zoom = 1, closed = false;
    v._cleanup = () => { closed = true; document.removeEventListener('keydown', keys, true); if (observer) observer.disconnect(); try { if (task) task.destroy(); } catch (e) { /* bỏ qua */ } };
    document.getElementById('dv-close').onclick = closeDocViewer;
    try {
      const [lib, res] = await Promise.all([loadPdfJs(), fetch(`/api/docs/${x.id}/file?view=1`, { credentials: 'same-origin', cache: 'no-store' })]);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Không mở được tài liệu.'); }
      const data = new Uint8Array(await res.arrayBuffer());
      if (closed) return;
      task = lib.getDocument({ data, cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/vendor/pdfjs/standard_fonts/', isEvalSupported: false, enableXfa: false });
      pdf = await task.promise;
      if (closed) return;
      const scroll = document.getElementById('dv-scroll'); scroll.innerHTML = '';
      const first = await pdf.getPage(1), base = first.getViewport({ scale: 1 });
      const fitW = () => Math.min(1100, scroll.clientWidth - (window.innerWidth < 640 ? 16 : 48));
      const pages = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const box = document.createElement('div'); box.className = 'dv-page'; box.dataset.n = n;
        box.innerHTML = `<canvas></canvas><div class="dv-wm" style="background-image:${watermarkUrl(wm)}"></div>`;
        scroll.appendChild(box); pages.push(box);
      }
      const layout = () => {
        const w = Math.round(fitW() * zoom);
        pages.forEach((b) => { b.style.width = w + 'px'; b.style.height = Math.round(w * base.height / base.width) + 'px'; b.dataset.done = ''; });
        pages.forEach((b) => { if (b.getBoundingClientRect().top < window.innerHeight * 2) render(b); });
      };
      const render = async (b) => {
        if (b.dataset.done === String(zoom) || closed) return;
        b.dataset.done = String(zoom);
        const page = await pdf.getPage(+b.dataset.n);
        const w = b.clientWidth, vp1 = page.getViewport({ scale: 1 });
        const scale = (w / vp1.width) * Math.min(2, window.devicePixelRatio || 1);
        const vp = page.getViewport({ scale });
        const c = b.querySelector('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        b.style.height = Math.round(w * vp1.height / vp1.width) + 'px';
        try { await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; } catch (e) { /* trang lỗi: bỏ qua */ }
      };
      observer = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) render(en.target); }), { root: scroll, rootMargin: '1200px 0px' });
      pages.forEach((b) => observer.observe(b));
      const pageLbl = document.getElementById('dv-page');
      const upd = () => { const mid = scroll.scrollTop + scroll.clientHeight / 3; let cur = 1; pages.forEach((b) => { if (b.offsetTop <= mid) cur = +b.dataset.n; }); pageLbl.textContent = `Trang ${cur} / ${pdf.numPages}`; };
      scroll.addEventListener('scroll', upd, { passive: true });
      const setZoom = (z) => { const r = scroll.scrollTop / (scroll.scrollHeight || 1); zoom = Math.max(0.5, Math.min(3, z)); layout(); scroll.scrollTop = r * scroll.scrollHeight; upd(); };
      document.getElementById('dv-in').onclick = () => setZoom(zoom + 0.25);
      document.getElementById('dv-out').onclick = () => setZoom(zoom - 0.25);
      document.getElementById('dv-fit').onclick = () => setZoom(1);
      const onResize = () => { if (!closed) layout(); };
      window.addEventListener('resize', onResize);
      const prev = v._cleanup; v._cleanup = () => { window.removeEventListener('resize', onResize); prev(); };
      layout(); upd();
      x.my_last_view = Math.floor(Date.now() / 1000);
    } catch (e) {
      const s = document.getElementById('dv-status'); if (s) s.textContent = e.message || 'Không mở được tài liệu.';
    }
  }
})();
