/* =============================================================================
   PROPOSAL TẢI LÊN (PDF) – mẫu proposal là file PDF + danh sách ô thông tin đặt trên trang.
   Khi nhân viên gửi, trang khách hiện PDF và in chữ (tên khách, thông tin nhân viên…) chồng lên đúng ô.
   Ô lưu tọa độ theo tỉ lệ trang (0–1) nên không phụ thuộc kích thước hiển thị.
   ============================================================================= */

// Các thông tin điền được (khớp FIELD_KEYS ở worker/index.js); nhãn hiện trong trình đặt ô
export const PTPL_FIELDS = {
  kh: 'Tên doanh nghiệp khách hàng',
  nguoi: 'Người nhận (khách)',
  tv: 'Tên nhân viên',
  cv: 'Chức danh nhân viên',
  sdt: 'SĐT nhân viên',
  email: 'Email nhân viên',
  ngay: 'Ngày gửi',
  han: 'Hiệu lực đến ngày',
  ct: 'Tên công ty',
  ctdc: 'Địa chỉ công ty',
  ctdt: 'Điện thoại công ty',
  cthl: 'Hotline công ty',
  ctemail: 'Email công ty',
  ctweb: 'Website công ty'
};

export const PTPL_MAX_MB = 25;
export const PTPL_MAX_BOXES = 300;
const ALIGNS = ['left', 'center', 'right'];
const WEIGHTS = [400, 600, 700];
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const r4 = (n) => Math.round(n * 10000) / 10000;

// Chuẩn hóa danh sách ô: page = số trang (0 = lặp lại ở mọi trang); x,y,w,h theo tỉ lệ trang; size = cỡ chữ (pt của PDF)
export function cleanLayout(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const b of arr.slice(0, PTPL_MAX_BOXES)) {
    if (!b || typeof b !== 'object') continue;
    const text = String(b.text ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 300);
    if (!text.trim()) continue;
    const w = num(b.w, 0.005, 1, 0.3), h = num(b.h, 0.005, 1, 0.05);
    out.push({
      id: String(b.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20) || Math.random().toString(36).slice(2, 10),
      page: Math.round(num(b.page, 0, 9999, 1)),
      x: r4(num(b.x, 0, 1 - w, 0)), y: r4(num(b.y, 0, 1 - h, 0)), w: r4(w), h: r4(h),
      text,
      size: Math.round(num(b.size, 3, 300, 14) * 10) / 10,
      color: /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color.toLowerCase() : '#0f172a',
      align: ALIGNS.includes(b.align) ? b.align : 'left',
      weight: WEIGHTS.includes(+b.weight) ? +b.weight : 400
    });
  }
  return out;
}

// Thông tin mẫu proposal (tiêu đề, mô tả, ngôn ngữ…) – trả về {error} nếu thiếu
export function cleanMeta(b) {
  const s = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const title = s(b.title, 160);
  if (!title) return { error: 'Chưa nhập tiêu đề proposal.' };
  const lang = b.lang === 'en' ? 'en' : 'vi';
  return {
    title,
    short: s(b.short, 60) || title.slice(0, 60),
    description: String(b.description ?? '').trim().slice(0, 600),
    lang,
    version: s(b.version, 20),
    email_subject: s(b.email_subject, 200),
    pdf_name: s(b.pdf_name, 80).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''),
    active: b.active ? 1 : 0
  };
}
