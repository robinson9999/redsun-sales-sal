/* =============================================================================
   REDSUN – Phần ứng dụng: tài khoản, KPI của bạn, Giao KPI, Nhân viên
   Dùng chung các hàm của trang (ROLES, compute, fmt, parseVND, switchTab...).
   ============================================================================= */
(function () {
  'use strict';

  const ROLE_LABEL = { admin: 'Admin', manager: 'Quản lý', staff: 'Nhân viên' };
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const S = { me: null, manager: null, titles: {}, users: null, year: new Date().getFullYear(), rendered: {} };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const titleName = (t) => (S.titles[t] && S.titles[t].name) || t || '—';
  const isMgrTitle = (t) => !!(S.titles[t] && S.titles[t].mgr);
  const fmtDate = (ts) => ts ? new Date(ts * 1000).toLocaleDateString('vi-VN') : '';
  const money = (n) => (n == null ? '—' : fmt(n));

  /* ------------------------------ Gọi API ------------------------------ */
  async function api(path, opts = {}) {
    const o = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    const r = await fetch(path, o);
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== '/api/me/password') { location.replace('/login'); throw new Error('Hết phiên đăng nhập.'); }
    if (!r.ok) {
      if (r.status === 403 && /đổi mật khẩu/.test(d.error || '')) openPwModal(true);
      throw new Error(d.error || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
    return d;
  }

  /* ------------------------------ Hộp thoại ------------------------------ */
  function openModal(html, locked) {
    const m = document.getElementById('modal');
    document.getElementById('modal-box').innerHTML = html;
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
  window.appInit = async function () {
    try {
      const d = await api('/api/me');
      S.me = d.user; S.manager = d.manager; S.titles = d.titles;
      document.getElementById('me-name').textContent = S.me.name;
      document.getElementById('me-role').textContent = `${ROLE_LABEL[S.me.app_role]}${S.me.title !== 'other' ? ' • ' + titleName(S.me.title) : ''}`;
      const canAssign = ['admin', 'manager'].includes(S.me.app_role);
      document.getElementById('tab-btn-assign').classList.toggle('hidden', !canAssign);
      document.getElementById('tab-btn-staff').classList.toggle('hidden', !canAssign);
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
  const cbText = (u) => { const cb = u.cb_ratio != null ? u.cb_ratio : ((S.titles[u.title] || {}).cb || 0); return `${Math.round(cb * 1000) / 10}% CB – ${Math.round((1 - cb) * 1000) / 10}% HS`; };
  async function initCalc() {
    const box = document.getElementById('calc-person-box'), sel = document.getElementById('calc-person');
    const canMgr = ['admin', 'manager'].includes(S.me.app_role), admin = S.me.app_role === 'admin';
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
    if (t === 'assign') renderAssign();
    if (t === 'staff') renderStaff(true);
  };

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

      const rows = MONTHS.map((m) => {
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
      const users = (await loadUsers(true)).filter((u) => u.active && (S.me.app_role === 'admin' || u.id !== S.me.id));
      S.rendered.assign = true;
      el.innerHTML = pageHead('Giao KPI', S.me.app_role === 'admin' ? 'Giao chỉ tiêu cho bất kỳ nhân viên nào.' : 'Giao chỉ tiêu cho nhân viên thuộc quyền quản lý của bạn.')
        + `<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-5">${card(`<div class="p-5">
            <h3 class="font-bold text-slate-900 mb-1">1. Chọn nhân viên</h3>
            <div class="flex gap-2 mb-2"><input id="as-q" placeholder="Tìm tên hoặc email…" value="${esc(A.q)}" class="${inputCls}">
              <select id="as-title" class="px-2 border border-slate-300 rounded-lg text-sm"><option value="">Mọi chức danh</option>${Object.entries(S.titles).map(([k, v]) => `<option value="${k}" ${A.title === k ? 'selected' : ''}>${esc(v.name.replace(/ \(.+\)$/, ''))}</option>`).join('')}</select></div>
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
          const mine = d.kpis.filter((k) => S.me.app_role === 'admin' || k.user_id !== S.me.id);
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
            try { await api('/api/kpis/' + b.dataset.del, { method: 'DELETE' }); drawAssigned(); } catch (e) { alert(e.message); }
          });
        } catch (e) { box.innerHTML = errorCard(e.message); }
      }
      drawAssigned();
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  /* =========================================================================
     TRANG: NHÂN VIÊN
     ========================================================================= */
  const ST = { q: '', showInactive: false };
  async function renderStaff(force) {
    const el = document.getElementById('tab-staff');
    if (!S.rendered.staff) el.innerHTML = loading;
    try {
      const users = await loadUsers(force);
      S.rendered.staff = true;
      const admin = S.me.app_role === 'admin';
      const byId = Object.fromEntries(users.map((u) => [u.id, u]));
      const mgrName = (id) => id === S.me.id ? esc(S.me.name) + ' (bạn)' : (byId[id] ? esc(byId[id].name) : '—');
      const q = ST.q.toLowerCase();
      const rows = users.filter((u) => (ST.showInactive || u.active) && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)));
      el.innerHTML = pageHead('Nhân viên', admin ? 'Toàn bộ tài khoản trong hệ thống.' : 'Nhân viên thuộc quyền quản lý của bạn (trực tiếp và gián tiếp).',
          admin ? `<div class="flex gap-2"><button id="st-import" class="${BTN_S}">⇪ Nhập từ file CSV</button><button id="st-add" class="${BTN_P}">＋ Thêm nhân viên</button></div>` : '')
        + card(`<div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <input id="st-q" placeholder="Tìm tên hoặc email…" value="${esc(ST.q)}" class="${inputCls} sm:w-72">
            <div class="flex items-center gap-4 text-sm text-slate-600"><span>${rows.length} người</span>
            <label class="flex items-center gap-2"><input type="checkbox" id="st-inactive" ${ST.showInactive ? 'checked' : ''}> Hiện cả tài khoản đã khóa</label></div></div>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>
            <th class="py-2.5 px-3 text-left">Nhân viên</th><th class="py-2.5 px-3 text-left">Chức danh</th><th class="py-2.5 px-3 text-left">Quyền</th>
            <th class="py-2.5 px-3 text-left">Quản lý trực tiếp</th><th class="py-2.5 px-3 text-right">Lương W • Cơ cấu</th><th class="py-2.5 px-3 text-left">Trạng thái</th><th></th></tr></thead>
            <tbody class="divide-y divide-slate-100">${rows.length ? rows.map((u) => `<tr class="${u.active ? '' : 'opacity-50'}">
              <td class="py-2.5 px-3"><b class="text-slate-900">${esc(u.name)}</b><br><span class="text-[11px] text-slate-500">${esc(u.email)}</span></td>
              <td class="py-2.5 px-3">${esc(titleName(u.title))}</td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${u.app_role === 'admin' ? 'bg-redsun-100 text-redsun-800' : u.app_role === 'manager' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">${ROLE_LABEL[u.app_role]}</span></td>
              <td class="py-2.5 px-3">${u.manager_id ? mgrName(u.manager_id) : '—'}</td>
              <td class="py-2.5 px-3 text-right"><span class="font-mono">${u.salary_w ? fmt(u.salary_w) : '—'}</span>${u.salary_w && ROLES[u.title] && ROLES[u.title].type !== 'ctv' ? `<br><span class="text-[11px] text-slate-500">${cbText(u)}</span>` : ''}</td>
              <td class="py-2.5 px-3 text-xs">${!u.active ? 'Đã khóa' : u.must_change ? '<span class="text-amber-700">Chưa đổi mật khẩu tạm</span>' : '<span class="text-emerald-700">Đang hoạt động</span>'}</td>
              <td class="py-2.5 px-3 text-right whitespace-nowrap">
                ${u.active && (admin || u.id !== S.me.id) ? `<button data-kpi="${u.id}" class="text-xs font-bold text-redsun-700 hover:underline mr-2">Giao KPI</button>` : ''}
                ${admin ? `<button data-edit="${u.id}" class="text-xs font-bold text-slate-700 hover:underline mr-2">Sửa</button><button data-reset="${u.id}" class="text-xs text-slate-500 hover:underline">Cấp lại MK</button>` : ''}
              </td></tr>`).join('') : '<tr><td colspan="7" class="py-8 text-center text-slate-400">Chưa có nhân viên nào.</td></tr>'}</tbody></table></div>`);
      const qi = document.getElementById('st-q');
      qi.oninput = (e) => { ST.q = e.target.value; const p = e.target.selectionStart; renderStaff().then(() => { const i = document.getElementById('st-q'); i.focus(); i.setSelectionRange(p, p); }); };
      document.getElementById('st-inactive').onchange = (e) => { ST.showInactive = e.target.checked; renderStaff(); };
      if (admin) { document.getElementById('st-add').onclick = () => userForm(null, users); document.getElementById('st-import').onclick = importCsv; }
      el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => userForm(byId[+b.dataset.edit], users));
      el.querySelectorAll('[data-reset]').forEach((b) => b.onclick = () => resetPw(byId[+b.dataset.reset]));
      el.querySelectorAll('[data-kpi]').forEach((b) => b.onclick = () => { A.sel = new Set([+b.dataset.kpi]); S.rendered.assign = false; switchTab('assign'); });
    } catch (e) { el.innerHTML = errorCard(e.message); }
  }

  function userForm(u, users) {
    const isNew = !u;
    u = u || { email: '', name: '', title: 'sales', app_role: 'staff', manager_id: '', salary_w: '', start_date: '', active: 1 };
    const mgrOpts = users.filter((x) => x.active && (!u.id || x.id !== u.id))
      .map((x) => `<option value="${x.id}" ${u.manager_id === x.id ? 'selected' : ''}>${esc(x.name)} – ${esc(titleName(x.title))}</option>`).join('');
    const range = (t) => ROLES[t] && ROLES[t].type !== 'ctv' ? `Khung ${rng(ROLES[t].min, ROLES[t].max)}` : 'Không áp dụng lương cố định';
    openModal(`${modalHead(isNew ? 'Thêm nhân viên' : 'Sửa thông tin nhân viên', isNew ? 'Hệ thống sẽ tạo mật khẩu tạm; nhân viên phải đổi ở lần đăng nhập đầu.' : esc(u.email))}
      <form id="uf" class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">${field('Email đăng nhập', `<input id="uf-email" type="email" value="${esc(u.email)}" class="${inputCls}" required>`)}</div>
        <div class="sm:col-span-2">${field('Họ tên', `<input id="uf-name" value="${esc(u.name)}" class="${inputCls}" required>`)}</div>
        ${field('Chức danh', `<select id="uf-title" class="${inputCls}">${Object.entries(S.titles).map(([k, v]) => `<option value="${k}" ${u.title === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>`)}
        ${field('Quyền trên hệ thống', `<select id="uf-role" class="${inputCls}">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${u.app_role === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`, 'Admin: toàn quyền • Quản lý: xem & giao KPI cho cấp dưới • Nhân viên: chỉ xem của mình')}
        ${field('Quản lý trực tiếp', `<select id="uf-mgr" class="${inputCls}"><option value="">— Không có —</option>${mgrOpts}</select>`)}
        ${field('Tổng lương thỏa thuận W (VNĐ)', `<input id="uf-w" inputmode="numeric" value="${u.salary_w ? fmt(u.salary_w) : ''}" class="${inputCls}">`, `<span id="uf-range">${range(u.title)}</span>`)}
        ${field('Tỷ lệ lương cơ bản (%)', `<div class="flex items-center gap-2"><input id="uf-cb" type="number" min="0" max="100" step="1" value="${u.cb_ratio != null ? Math.round(u.cb_ratio * 1000) / 10 : ''}" class="${inputCls}"><span class="text-xs text-slate-500 whitespace-nowrap">CB / <b id="uf-hs"></b> HS</span></div>`, 'Để trống: theo chức danh (quản lý 40%, nhân viên 50%).')}
        <div class="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600" id="uf-split"></div>
        ${field('Ngày vào làm', `<input id="uf-start" type="date" value="${esc(u.start_date || '')}" class="${inputCls}">`)}
        ${isNew ? '' : field('Trạng thái', `<select id="uf-active" class="${inputCls}"><option value="1" ${u.active ? 'selected' : ''}>Đang hoạt động</option><option value="0" ${u.active ? '' : 'selected'}>Khóa tài khoản</option></select>`)}
        <div class="sm:col-span-2">${errBox('uf-err')}</div>
        <div class="sm:col-span-2 flex justify-end gap-2 pt-1"><button type="button" onclick="closeModal()" class="${BTN_S}">Hủy</button><button class="${BTN_P}">${isNew ? 'Tạo tài khoản' : 'Lưu'}</button></div>
      </form>`);
    const tSel = document.getElementById('uf-title'), rSel = document.getElementById('uf-role');
    tSel.onchange = () => {
      document.getElementById('uf-range').textContent = range(tSel.value);
      if (isNew && rSel.value !== 'admin') rSel.value = isMgrTitle(tSel.value) ? 'manager' : 'staff';
    };
    const wIn = document.getElementById('uf-w'), cbIn = document.getElementById('uf-cb');
    const split = () => {
      const t = S.titles[tSel.value] || {}, W = parseVND(wIn.value);
      const cbDef = t.cb || 0, cb = cbIn.value === '' ? cbDef : Math.min(100, Math.max(0, +cbIn.value)) / 100;
      cbIn.placeholder = `Mặc định ${Math.round(cbDef * 100)}`;
      document.getElementById('uf-hs').textContent = `${Math.round((1 - cb) * 1000) / 10}%`;
      const isCtv = !ROLES[tSel.value] || ROLES[tSel.value].type === 'ctv';
      document.getElementById('uf-split').innerHTML = isCtv ? 'Chức danh này không áp dụng lương cố định.'
        : `Lương cơ bản S = <b>${fmt(W * cb)}</b> • Lương hiệu suất tối đa H = <b>${fmt(W * (1 - cb))}</b> • Target cá nhân mặc định (x${t.X}) = <b>${fmt(W * (1 - cb) * t.X)}</b>`;
    };
    wIn.oninput = split; cbIn.oninput = split; tSel.addEventListener('change', split); split();
    wIn.onblur = () => { const v = parseVND(wIn.value); wIn.value = v ? fmt(v) : ''; };
    document.getElementById('uf').onsubmit = async (e) => {
      e.preventDefault();
      const body = { email: document.getElementById('uf-email').value, name: document.getElementById('uf-name').value, title: tSel.value, app_role: rSel.value,
        manager_id: document.getElementById('uf-mgr').value || null, salary_w: parseVND(wIn.value), start_date: document.getElementById('uf-start').value || null,
        cb_ratio: cbIn.value === '' ? null : Math.min(100, Math.max(0, +cbIn.value)) / 100 };
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
        <p class="text-slate-600">Các cột được nhận: <code>tai_khoan</code> hoặc <code>email</code>, <code>ho_ten</code>, <code>chuc_danh</code>, <code>mat_khau</code> (nếu có, giữ nguyên mật khẩu đã cấp), <code>luong_w</code>, <code>ty_le_cb</code> (% lương cơ bản), <code>quan_ly</code> (email quản lý trực tiếp). Ai đã có tài khoản sẽ được bỏ qua.</p>
        <input type="file" id="ic-file" accept=".csv,text/csv" class="block w-full text-sm">
        <div id="ic-prev"></div>${errBox('ic-err')}
        <div class="flex justify-end gap-2"><button onclick="closeModal()" class="${BTN_S}">Hủy</button><button id="ic-go" class="${BTN_P}" disabled>Nhập</button></div>
      </div>`);
    let rows = [];
    document.getElementById('ic-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const recs = parseCSV(await f.text());
      rows = recs.map((r) => {
        const email = (r.tai_khoan || r.email || '').toLowerCase(), title = guessTitle(r.chuc_danh);
        return { email, name: r.ho_ten || email, title, app_role: email === 'admin' ? 'admin' : isMgrTitle(title) ? 'manager' : 'staff',
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
})();
