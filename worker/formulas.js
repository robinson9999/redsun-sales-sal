/* =============================================================================
   CÔNG THỨC LƯƠNG, THƯỞNG, KPI
   - Mỗi công thức được tạo từ một MẪU (template). Admin tạo/sửa công thức trong tool.
   - Mỗi phòng ban chọn một công thức; mỗi chức danh của phòng có THAM SỐ riêng
     (khung lương, % lương cơ bản, hệ số KPI, thưởng quản lý, phụ cấp…) điền sẵn theo mẫu.
   - Đơn vị lưu: tỷ lệ dạng thập phân (0.5 = 50%), tiền VNĐ, mốc "Infinity" lưu là null.
   ============================================================================= */

export const SALES_TITLES = ['cco', 'sm', 'tl', 'senior', 'sales', 'intern', 'ctv'];
export const BUILTIN_FORMULA = 'sales';           // công thức gốc của khối Kinh doanh (không xóa được)

// Thưởng quản lý C₂: 0 dưới ngưỡng t0; đạt 100% hưởng a × DS đơn vị; đạt 120% hưởng b × DS đơn vị; trên 120% giữ biên b.
export function c2Bands(c2) {
  const t0 = c2.t0, a = c2.a, b = c2.b;
  return [[t0, 0], [1.0, a / (1 - t0)], [1.2, (b * 1.2 - a) / 0.2], [null, b]];
}

// Tham số mặc định của 7 chức danh kinh doanh gốc (đúng Quy chế hiện hành)
export const BUILTIN_PARAMS = {
  cco:    { type: 'mgr',   min: 40e6, max: 60e6, cb: 0.4, X: 5,  wCn: 0.4, wQl: 0.6, team: 'Khối',  c2: { t0: 0.7, a: 0.007, b: 0.010 } },
  sm:     { type: 'mgr',   min: 20e6, max: 40e6, cb: 0.4, X: 6,  wCn: 0.4, wQl: 0.6, team: 'Phòng', c2: { t0: 0.7, a: 0.010, b: 0.015 } },
  tl:     { type: 'mgr',   min: 15e6, max: 20e6, cb: 0.4, X: 10, wCn: 0.5, wQl: 0.5, team: 'Nhóm',  c2: { t0: 0.7, a: 0.018, b: 0.022 } },
  senior: { type: 'staff', min: 12e6, max: 15e6, cb: 0.5, X: 10 },
  sales:  { type: 'staff', min: 8e6,  max: 12e6, cb: 0.5, X: 10 },
  intern: { type: 'staff', min: 6e6,  max: 8e6,  cb: 0.5, X: 10, ramp: [6, 7, 8] },
  ctv:    { type: 'ctv',   min: 0,    max: 0,    cb: 0,   X: 0 }
};

export const TEMPLATES = {
  sales_3p: {
    name: 'Lương 3P theo doanh số (khối Kinh doanh)',
    short: 'Theo doanh số',
    kpi: 'revenue',
    desc: 'Tổng lương W = Lương cơ bản (A = W × %CB) + Lương hiệu suất tối đa (H). KPI doanh số = H × hệ số X. Thu nhập = A + B (H × % đạt KPI, tối đa 100%) + C₁ (thưởng doanh số cá nhân lũy tiến theo % đạt) + C₂ (thưởng quản lý theo % đạt của đơn vị). Cộng tác viên hưởng hoa hồng lũy tiến theo doanh số, không có lương cố định.',
    types: { staff: 'Nhân viên kinh doanh', mgr: 'Quản lý kinh doanh (có đội)', ctv: 'Cộng tác viên (hoa hồng)' },
    config: {
      c1: [[0.5, 0.02], [1.0, 0.14], [1.2, 0.15], [null, 0.12]],          // [mốc % đạt KPI cá nhân, tỷ lệ thưởng phần doanh số trong khoảng]
      ctv: [[20e6, 0.12], [50e6, 0.15], [100e6, 0.18], [null, 0.15]],     // [mốc doanh số VNĐ, tỷ lệ hoa hồng]
      kteam_mult: 40
    },
    params: {
      staff: { type: 'staff', min: 8e6, max: 12e6, cb: 0.5, X: 10 },
      mgr:   { type: 'mgr', min: 15e6, max: 20e6, cb: 0.4, X: 10, wCn: 0.5, wQl: 0.5, c2: { t0: 0.7, a: 0.018, b: 0.022 } },
      ctv:   { type: 'ctv', min: 0, max: 0, cb: 0, X: 0 }
    }
  },
  kpi_score: {
    name: 'Lương 3P theo điểm KPI (khối văn phòng, kỹ thuật, CSKH)',
    short: 'Theo điểm KPI',
    kpi: 'score',
    desc: 'Tổng lương W = Lương cơ bản (A = W × %CB) + Lương hiệu suất tối đa (H). Cuối tháng chấm điểm từng tiêu chí KPI theo % hoàn thành, nhân trọng số ra điểm KPI. Lương hiệu suất B = H × điểm KPI (tối đa theo mức trần); dưới điểm sàn không hưởng B. Thưởng hiệu suất = % × W theo bậc điểm. Cộng phụ cấp cố định của chức danh.',
    types: { staff: 'Nhân viên', mgr: 'Quản lý' },
    config: {
      criteria: [
        { name: 'Khối lượng công việc hoàn thành', weight: 0.4 },
        { name: 'Chất lượng, đúng hạn', weight: 0.3 },
        { name: 'Tuân thủ quy trình, nội quy', weight: 0.2 },
        { name: 'Phối hợp & phát triển bản thân', weight: 0.1 }
      ],
      item_cap: 1.2,       // % hoàn thành tối đa được tính cho mỗi tiêu chí
      min_score: 0.5,      // dưới điểm sàn: không hưởng lương hiệu suất
      hs_cap: 1.0,         // lương hiệu suất tối đa = H × hs_cap
      bonus: [[1.0, 0.05], [1.1, 0.10], [1.2, 0.15]]   // [điểm KPI từ, thưởng = tỷ lệ × W]
    },
    params: {
      staff: { type: 'staff', min: 8e6, max: 12e6, cb: 0.7, allowance: 0 },
      mgr:   { type: 'mgr', min: 15e6, max: 25e6, cb: 0.6, allowance: 1e6 }
    }
  },
  fixed: {
    name: 'Lương cố định + phụ cấp',
    short: 'Cố định',
    kpi: null,
    desc: 'Thu nhập = Tổng lương thỏa thuận W + phụ cấp cố định của chức danh. Không gắn KPI; thưởng (nếu có) do Ban Giám đốc quyết định theo từng kỳ.',
    types: { staff: 'Nhân viên', mgr: 'Quản lý' },
    config: {},
    params: {
      staff: { type: 'staff', min: 6e6, max: 10e6, allowance: 0 },
      mgr:   { type: 'mgr', min: 12e6, max: 20e6, allowance: 1e6 }
    }
  }
};

export const NONE_FORMULA = { id: 'none', name: 'Chưa có công thức', template: null, builtin: true,
  description: 'Phòng ban này chưa có công thức tính lương, thưởng, KPI. Hệ thống chỉ lưu thông tin nhân sự.' };

/* ---------------------------- Kiểm tra dữ liệu ---------------------------- */
const num = (v, min, max, name) => {
  const n = +v;
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} không hợp lệ.`);
  return n;
};
const rate = (v, name, max = 1) => Math.round(num(v, 0, max, name) * 100000) / 100000;
const money = (v, name) => Math.round(num(v || 0, 0, 1e11, name));

// Bậc lũy tiến: mốc tăng dần, mốc cuối = null (∞)
function bands(list, name, kind) {
  if (!Array.isArray(list) || !list.length || list.length > 12) throw new Error(`${name}: cần 1–12 bậc.`);
  let prev = 0;
  return list.map((b, i) => {
    const last = i === list.length - 1;
    const t = last ? null : (kind === 'money' ? money(b[0], `${name} – mốc ${i + 1}`) : rate(b[0], `${name} – mốc ${i + 1}`, 10));
    if (!last && t <= prev) throw new Error(`${name}: các mốc phải tăng dần.`);
    if (!last) prev = t;
    return [t, rate(b[1], `${name} – tỷ lệ bậc ${i + 1}`)];
  });
}

export function cleanConfig(template, c) {
  const T = TEMPLATES[template];
  if (!T) throw new Error('Mẫu công thức không hợp lệ.');
  c = c || {};
  if (template === 'sales_3p') {
    return { c1: bands(c.c1, 'Thưởng doanh số cá nhân C₁'), ctv: bands(c.ctv, 'Hoa hồng CTV', 'money'),
      kteam_mult: num(c.kteam_mult ?? 40, 1, 500, 'Hệ số target đội minh họa') };
  }
  if (template === 'kpi_score') {
    if (!Array.isArray(c.criteria) || !c.criteria.length || c.criteria.length > 15) throw new Error('Cần 1–15 tiêu chí KPI.');
    const criteria = c.criteria.map((x, i) => {
      const name = String(x.name || '').trim().slice(0, 120);
      if (!name) throw new Error(`Tiêu chí ${i + 1} chưa có tên.`);
      return { name, weight: rate(x.weight, `Trọng số tiêu chí ${i + 1}`), note: String(x.note || '').trim().slice(0, 300) };
    });
    const sum = criteria.reduce((s, x) => s + x.weight, 0);
    if (Math.abs(sum - 1) > 0.001) throw new Error(`Tổng trọng số các tiêu chí phải bằng 100% (hiện ${Math.round(sum * 1000) / 10}%).`);
    const bonus = (Array.isArray(c.bonus) ? c.bonus : []).slice(0, 10).map((b, i) => [rate(b[0], `Bậc thưởng ${i + 1} – điểm`, 5), rate(b[1], `Bậc thưởng ${i + 1} – tỷ lệ`, 5)])
      .sort((a, b) => a[0] - b[0]);
    return { criteria, item_cap: rate(c.item_cap ?? 1.2, 'Trần % mỗi tiêu chí', 5), min_score: rate(c.min_score ?? 0.5, 'Điểm sàn', 2),
      hs_cap: rate(c.hs_cap ?? 1, 'Trần lương hiệu suất', 5), bonus };
  }
  return {};
}

export function cleanParams(template, p) {
  const T = TEMPLATES[template];
  if (!T) throw new Error('Mẫu công thức không hợp lệ.');
  p = p || {};
  const type = T.types[p.type] ? p.type : 'staff';
  const out = { type, min: money(p.min, 'Khung lương tối thiểu'), max: money(p.max, 'Khung lương tối đa') };
  if (out.max < out.min) throw new Error('Khung lương tối đa phải ≥ tối thiểu.');
  if (template === 'sales_3p') {
    if (type === 'ctv') return { type, min: 0, max: 0, cb: 0, X: 0 };
    out.cb = rate(p.cb, '% lương cơ bản');
    out.X = num(p.X, 0.5, 50, 'Hệ số KPI X');
    if (p.ramp && String(p.ramp).trim()) {
      const r = (Array.isArray(p.ramp) ? p.ramp : String(p.ramp).split(/[,;\s]+/)).filter((x) => x !== '').map((x) => num(x, 0.5, 50, 'Hệ số tập sự'));
      if (r.length > 6) throw new Error('Hệ số tăng dần tối đa 6 tháng.');
      if (r.length) out.ramp = r;
    }
    if (type === 'mgr') {
      out.wCn = rate(p.wCn, 'Trọng số cá nhân');
      out.wQl = Math.round((1 - out.wCn) * 100000) / 100000;
      const c2 = p.c2 || {};
      out.c2 = { t0: rate(c2.t0, 'Ngưỡng thưởng quản lý', 0.99), a: rate(c2.a, 'Thưởng quản lý khi đạt 100%', 0.2), b: rate(c2.b, 'Thưởng quản lý khi đạt 120%', 0.2) };
      if (p.team) out.team = String(p.team).slice(0, 20);
    }
    return out;
  }
  if (template === 'kpi_score') out.cb = rate(p.cb, '% lương cơ bản');
  out.allowance = money(p.allowance, 'Phụ cấp');
  return out;
}

export const defaultParams = (template, type) => JSON.parse(JSON.stringify((TEMPLATES[template] || TEMPLATES.fixed).params[type] || (TEMPLATES[template] || TEMPLATES.fixed).params.staff));
export const templatesPublic = () => JSON.parse(JSON.stringify(TEMPLATES));
