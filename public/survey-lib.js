/* =============================================================================
   REDSUN – Thư viện Phiếu khảo sát (dùng chung cho trình duyệt và máy chủ)
   - TEMPLATES: định nghĩa các phiếu. Thêm phiếu mới = thêm một phần tử vào mảng.
   - renderReport(): HTML kết quả (màn hình + email, style inline)
   - buildPdfDoc(): định nghĩa tài liệu pdfmake để xuất PDF
   Kiểu khối (block):
     table   – bảng Câu hỏi / Ghi chú: rows [{ id, label, kind?: 'text'|'textarea'|'date', required?, placeholder? }]
     checks  – chọn nhiều: { id, label, options: [{ v, label, input?: 'gợi ý ô nhập' }], max? }
     radio   – chọn một:  { id, label, options: [...] }
     note    – đoạn hướng dẫn (chỉ hiện khi điền)
   Câu trả lời lưu phẳng: answers[id] (chuỗi | mảng), ô nhập kèm lựa chọn: answers[`${id}:${v}`]
   ============================================================================= */

export const TEMPLATES = [
  {
    id: 'website-dn',
    version: 1,
    name: 'Phiếu khảo sát nhu cầu Website Doanh nghiệp',
    short: 'Website Doanh nghiệp',
    icon: '🌐',
    description: 'Dùng trong buổi gặp đầu tiên (30–45 phút) hoặc gửi khách tự điền trước. Điền đủ mục A–G là đủ dữ liệu để lập báo giá riêng trong 24 giờ.',
    titleField: 'a_ten_dn',
    guide: [
      'Hỏi theo thứ tự B → C → D: mục tiêu trước, phạm vi sau. Khách nói về mục tiêu sẽ dễ chốt gói hơn khách nói về số trang.',
      'Ghi đúng lời khách ở cột "Ghi chú", không diễn giải.',
      'Câu nào khách chưa trả lời được thì để trống và ghi vào mục H để hẹn bổ sung.',
      'Mục H do Sales tự điền sau buổi gặp, không đưa cho khách.'
    ],
    sections: [
      { id: 'A', title: 'Thông tin doanh nghiệp & người liên hệ', blocks: [
        { type: 'table', head: ['Thông tin', 'Ghi chú'], rows: [
          { id: 'a_ten_dn', label: 'Tên doanh nghiệp', required: true },
          { id: 'a_nganh', label: 'Ngành nghề chính' },
          { id: 'a_quy_mo', label: 'Quy mô (số nhân sự, số chi nhánh)' },
          { id: 'a_nam_tl', label: 'Năm thành lập' },
          { id: 'a_lien_he', label: 'Người liên hệ · chức vụ' },
          { id: 'a_dien_thoai', label: 'Điện thoại · Zalo' },
          { id: 'a_email', label: 'Email' },
          { id: 'a_ngay', label: 'Ngày khảo sát', kind: 'date', auto: 'today' },
          { id: 'a_sales', label: 'Sales phụ trách', auto: 'me' }
        ] }
      ] },
      { id: 'B', title: 'Mục tiêu website & khách hàng mục tiêu', blocks: [
        { type: 'checks', id: 'b_muc_tieu', label: 'Mục tiêu chính của website (chọn tối đa 2)', max: 2, options: [
          { v: 'uy_tin', label: 'Giới thiệu doanh nghiệp, tạo uy tín với đối tác và khách hàng' },
          { v: 'tiem_nang', label: 'Thu hút khách hàng tiềm năng (form, cuộc gọi, chat)' },
          { v: 'quang_cao', label: 'Hỗ trợ quảng cáo Google / Facebook (trang đích)' },
          { v: 'tuyen_dung', label: 'Tuyển dụng, xây dựng thương hiệu nhà tuyển dụng' },
          { v: 'quoc_te', label: 'Phục vụ khách quốc tế, đối tác nước ngoài' },
          { v: 'khac', label: 'Khác', input: 'Ghi rõ mục tiêu khác' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'b_khach_hang', label: 'Khách hàng chính của Quý khách là ai? (cá nhân / doanh nghiệp, độ tuổi, khu vực)', kind: 'textarea' },
          { id: 'b_dich_vu', label: '3 dịch vụ / sản phẩm muốn khách thấy đầu tiên', kind: 'textarea' },
          { id: 'b_khac_biet', label: 'Điểm khác biệt so với đối thủ, nói trong một câu', kind: 'textarea' },
          { id: 'b_thanh_cong', label: 'Sau 6 tháng, thế nào là website thành công? (số yêu cầu tư vấn / tháng, lượt truy cập...)', kind: 'textarea' }
        ] }
      ] },
      { id: 'C', title: 'Hiện trạng', blocks: [
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'c_website', label: 'Đã có website chưa? Địa chỉ website hiện tại', kind: 'textarea' },
          { id: 'c_chua_hai_long', label: 'Điều chưa hài lòng với website hiện tại (nội dung, giao diện, khó cập nhật, không có khách từ Google...)', kind: 'textarea' },
          { id: 'c_ten_mien', label: 'Tên miền: đã có / chưa có. Đang đăng ký ở đâu, ai giữ tài khoản?', kind: 'textarea' },
          { id: 'c_hosting', label: 'Hosting / email tên miền đang dùng ở đâu?', kind: 'textarea' },
          { id: 'c_doi_thu', label: '2–3 website đối thủ hoặc website Quý khách thích (ghi rõ thích điểm gì)', kind: 'textarea' },
          { id: 'c_nhan_dien', label: 'Đã có bộ nhận diện thương hiệu chưa? (logo, màu, font, brand guideline)', kind: 'textarea' }
        ] }
      ] },
      { id: 'D', title: 'Phạm vi website', blocks: [
        { type: 'checks', id: 'd_trang_chinh', label: 'Năm trang chính (mặc định, đủ cho hầu hết doanh nghiệp vừa và nhỏ)', options: [
          { v: 'trang_chu', label: 'Trang chủ' },
          { v: 'gioi_thieu', label: 'Giới thiệu' },
          { v: 'dich_vu', label: 'Dịch vụ / Sản phẩm', input: 'Số dịch vụ cần trang riêng' },
          { v: 'tin_tuc', label: 'Tin tức & kiến thức' },
          { v: 'lien_he', label: 'Liên hệ + bản đồ + biểu mẫu' },
          { v: 'dieu_khoan', label: 'Điều khoản sử dụng + Thỏa thuận bảo mật' },
          { v: 'cookies', label: 'Chấp nhận cookies' }
        ] },
        { type: 'checks', id: 'd_trang_tuy_chon', label: 'Trang tuỳ chọn (chỉ bật khi đã có nội dung)', options: [
          { v: 'doi_ngu', label: 'Đội ngũ' },
          { v: 'du_an', label: 'Dự án / ví dụ thực tế' },
          { v: 'su_kien', label: 'Sự kiện / tin nội bộ' },
          { v: 'doi_tac', label: 'Đối tác / chứng nhận' },
          { v: 'tuyen_dung', label: 'Tuyển dụng' },
          { v: 'dai_ly', label: 'Đại lý & Hệ thống phân phối' },
          { v: 'khac', label: 'Trang khác', input: 'Tên trang khác' }
        ] },
        { type: 'checks', id: 'd_ngon_ngu', label: 'Ngôn ngữ', options: [
          { v: 'vi', label: 'Tiếng Việt' },
          { v: 'en', label: 'Tiếng Anh' },
          { v: 'khac', label: 'Ngôn ngữ khác (Trung, Nhật, Hàn...)', input: 'Ngôn ngữ nào' }
        ] },
        { type: 'checks', id: 'd_module', label: 'Module tuỳ chọn', options: [
          { v: 'da_ngon_ngu', label: 'Đa ngôn ngữ (từ 3 ngôn ngữ trở lên)' },
          { v: 'da_thuong_hieu', label: 'Đa thương hiệu', input: 'Số thương hiệu / website' },
          { v: 'chatbot', label: 'AI Chatbot 24/7' },
          { v: 'landing', label: 'Trang đích chiến dịch', input: 'Số trang' }
        ] },
        { type: 'checks', id: 'd_giao_dien', label: 'Giao diện', options: [
          { v: 'co_san', label: 'Dùng giao diện có sẵn từ kho 500+ mẫu (có nhiều mẫu miễn phí)' },
          { v: 'doc_ban', label: 'Thiết kế giao diện độc bản (từ 7 triệu)' },
          { v: 'lap_trinh', label: 'Có chức năng riêng cần lập trình', input: 'Mô tả chức năng' }
        ] }
      ] },
      { id: 'E', title: 'Nội dung & người cập nhật', blocks: [
        { type: 'checks', id: 'e_noi_dung', label: 'Nội dung là yếu tố quyết định website có xong đúng hạn hay không. Đánh dấu những gì đã sẵn sàng:', options: [
          { v: 'gioi_thieu', label: 'Giới thiệu công ty, sứ mệnh, câu chuyện thương hiệu' },
          { v: 'mo_ta_dv', label: 'Mô tả từng dịch vụ / sản phẩm' },
          { v: 'anh_that', label: 'Ảnh thật: văn phòng, đội ngũ, sản phẩm, dự án' },
          { v: 'so_lieu', label: 'Số liệu có thật (năm hoạt động, số khách hàng, số dự án)' },
          { v: 'logo_doi_tac', label: 'Logo đối tác, chứng nhận, giải thưởng' },
          { v: 'video', label: 'Video giới thiệu' },
          { v: 'ho_so', label: 'Hồ sơ năng lực (file PDF / bản in)' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'e_duyet', label: 'Ai sẽ là người duyệt nội dung và thiết kế?' },
          { id: 'e_cap_nhat', label: 'Ai cập nhật website sau bàn giao? Tần suất đăng bài dự kiến', kind: 'textarea' },
          { id: 'e_dich_vu_them', label: 'Cần Redsun viết bài chuẩn SEO, thiết kế banner, hoặc quản lý vận hành thay không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'F', title: 'Kết nối & mở rộng', blocks: [
        { type: 'checks', id: 'f_chuyen_ve', label: 'Khách điền form hoặc nhắn tin trên website cần được chuyển về đâu?', options: [
          { v: 'email', label: 'Email' },
          { v: 'crm', label: 'Phần mềm CRM đang dùng', input: 'Tên CRM' },
          { v: 'ai_crm', label: 'Chưa có CRM, muốn tìm hiểu Redsun AI CRM' },
          { v: 'zalo_fb', label: 'Zalo OA / Facebook Messenger' }
        ] },
        { type: 'checks', id: 'f_cong_cu', label: 'Công cụ cần cài đặt', options: [
          { v: 'ga4', label: 'Google Analytics 4 / Search Console / Meta Pixel' },
          { v: 'ads', label: 'Mã quảng cáo Meta (Facebook) / Google Ads' },
          { v: 'chat', label: 'Khung chat tự động / AI chatbot' },
          { v: 'ket_noi', label: 'Kết nối hệ thống khác (ERP, phần mềm bán hàng...)', input: 'Hệ thống nào' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'f_quang_cao', label: 'Doanh nghiệp đang chạy quảng cáo online không? Kênh nào, ngân sách / tháng', kind: 'textarea' },
          { id: 'f_mo_rong', label: 'Trong 12 tháng tới có kế hoạch mở chi nhánh, thương hiệu hoặc thị trường mới không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'G', title: 'Ngân sách, thời hạn & ra quyết định', blocks: [
        { type: 'radio', id: 'g_ngan_sach', label: 'Ngân sách dự kiến cho năm đầu (gồm thuê bao, thiết kế và gói bổ sung)', options: [
          { v: 'duoi_10', label: 'Dưới 10 triệu' },
          { v: '10_30', label: '10 – 30 triệu' },
          { v: '30_80', label: '30 – 80 triệu' },
          { v: 'tren_80', label: 'Trên 80 triệu' },
          { v: 'chua_xd', label: 'Chưa xác định, cần Redsun tư vấn' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'g_ngay_chay', label: 'Ngày mong muốn website chính thức hoạt động? Có mốc sự kiện nào gắn với ngày đó không?', kind: 'textarea' },
          { id: 'g_quyet_dinh', label: 'Ai là người quyết định cuối cùng? Có cần trình duyệt cấp trên / hội đồng không?', kind: 'textarea' },
          { id: 'g_doi_thu', label: 'Đang tham khảo thêm bên cung cấp nào khác không?', kind: 'textarea' },
          { id: 'g_thanh_toan', label: 'Hình thức thanh toán ưu tiên: theo tháng hay theo năm; cần hóa đơn VAT không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'H', title: 'Sales đánh giá (nội bộ, không gửi khách)', internal: true, blocks: [
        { type: 'radio', id: 'h_tin_hieu', label: 'Tín hiệu từ khách (dựa trên câu trả lời mục D và F)', options: [
          { v: 'nhom1', label: '5–7 trang, 1 ngôn ngữ, dùng giao diện có sẵn, ít cập nhật' },
          { v: 'nhom2', label: '7–10 trang, 2 ngôn ngữ, cần tin tức / đội ngũ, muốn dùng AI viết bài và thiết kế' },
          { v: 'nhom3', label: 'Nhiều thương hiệu, từ 3 ngôn ngữ, cần chatbot hoặc kết nối hệ thống sẵn có' }
        ] },
        { type: 'table', head: ['Đánh giá', 'Ghi chú'], rows: [
          { id: 'h_goi', label: 'Gói gợi ý' },
          { id: 'h_giao_dien', label: 'Giao diện: có sẵn / độc bản / lập trình riêng' },
          { id: 'h_module', label: 'Module & gói bổ sung gợi ý', kind: 'textarea' },
          { id: 'h_ban_them', label: 'Cơ hội bán thêm (Redsun AI CRM, AI Marketing Automation, Redsun BOS)', kind: 'textarea' }
        ] },
        { type: 'radio', id: 'h_tiem_nang', label: 'Mức độ tiềm năng', options: [
          { v: 'nong', label: 'Nóng' }, { v: 'am', label: 'Ấm' }, { v: 'lanh', label: 'Lạnh' }
        ] },
        { type: 'table', head: ['Đánh giá', 'Ghi chú'], rows: [
          { id: 'h_thieu', label: 'Thông tin còn thiếu, cần hỏi bổ sung', kind: 'textarea' }
        ] },
        { type: 'checks', id: 'h_buoc_tiep', label: 'Bước tiếp theo', options: [
          { v: 'crm', label: 'Nhập kết quả vào CRM' },
          { v: 'bao_gia', label: 'Gửi báo giá riêng trong 24 giờ làm việc' },
          { v: 'web_mau', label: 'Gửi website mẫu cùng ngành' },
          { v: 'demo', label: 'Hẹn buổi demo Webino Builder' },
          { v: 'gap_qd', label: 'Hẹn gặp người ra quyết định' }
        ] }
      ] }
    ]
  }
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || null;

/* ------------------------------ Tiện ích ------------------------------ */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const isEmpty = (v) => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
export function fmtDateVN(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s);
}
function valueText(row, v) { return row.kind === 'date' ? fmtDateVN(v) : String(v ?? ''); }

/** Làm sạch câu trả lời theo mẫu: chỉ giữ khóa hợp lệ, giới hạn độ dài */
export function sanitizeAnswers(tpl, ans) {
  const out = {};
  const str = (v, n) => String(v ?? '').slice(0, n);
  for (const s of tpl.sections) for (const b of s.blocks) {
    if (b.type === 'table') for (const r of b.rows) { if (!isEmpty(ans[r.id])) out[r.id] = str(ans[r.id], 4000); }
    if (b.type === 'checks') {
      const valid = new Set(b.options.map((o) => o.v));
      let arr = Array.isArray(ans[b.id]) ? ans[b.id].filter((v) => valid.has(v)) : [];
      arr = [...new Set(arr)];
      if (b.max) arr = arr.slice(0, b.max);
      if (arr.length) out[b.id] = arr;
      for (const o of b.options) if (o.input && arr.includes(o.v) && !isEmpty(ans[`${b.id}:${o.v}`])) out[`${b.id}:${o.v}`] = str(ans[`${b.id}:${o.v}`], 500);
    }
    if (b.type === 'radio') {
      if (b.options.some((o) => o.v === ans[b.id])) out[b.id] = ans[b.id];
    }
  }
  return out;
}

/** Kiểm tra trước khi hoàn tất. Trả về danh sách lỗi (chuỗi). */
export function validateAnswers(tpl, ans) {
  const errs = [];
  for (const s of tpl.sections) for (const b of s.blocks) {
    if (b.type === 'table') for (const r of b.rows) if (r.required && isEmpty(ans[r.id])) errs.push(`Mục ${s.id}: chưa nhập "${r.label}".`);
    if (b.type === 'checks' && b.max && Array.isArray(ans[b.id]) && ans[b.id].length > b.max) errs.push(`Mục ${s.id}: "${b.label}" chỉ được chọn tối đa ${b.max}.`);
  }
  return errs;
}

/** Thống kê mức độ hoàn thành (không tính mục nội bộ) */
export function progress(tpl, ans) {
  let total = 0, done = 0;
  for (const s of tpl.sections) {
    if (s.internal) continue;
    for (const b of s.blocks) {
      if (b.type === 'table') for (const r of b.rows) { total++; if (!isEmpty(ans[r.id])) done++; }
      if (b.type === 'checks' || b.type === 'radio') { total++; if (!isEmpty(ans[b.id])) done++; }
    }
  }
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
}

export function surveyTitle(tpl, ans) { return String(ans[tpl.titleField] || '').trim() || '(Chưa có tên doanh nghiệp)'; }

/* ------------------------------ Báo cáo HTML (màn hình + email) ------------------------------ */
const C = { red: '#B91C1C', ink: '#0f172a', mute: '#64748b', line: '#e2e8f0', soft: '#f8fafc', amber: '#FFFBEB' };
export function renderReport(tpl, ans, opts = {}) {
  const internal = opts.internal !== false;
  const meta = opts.meta || {};
  const td = `padding:8px 10px;border-top:1px solid ${C.line};vertical-align:top;font-size:13.5px;line-height:1.55;`;
  const empty = `<span style="color:#94a3b8">—</span>`;
  let h = `<div style="font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;color:${C.ink};max-width:860px;margin:0 auto;">`;
  h += `<div style="border-bottom:3px solid ${C.red};padding-bottom:12px;margin-bottom:16px;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.red};font-weight:700;">${esc(meta.company || 'Công ty Đầu tư Công nghệ Redsun')}</div>
    <div style="font-size:21px;font-weight:800;margin-top:4px;">${esc(tpl.name)}</div>
    <div style="font-size:15px;font-weight:700;margin-top:6px;">${esc(surveyTitle(tpl, ans))}</div>
    <div style="font-size:12.5px;color:${C.mute};margin-top:4px;">${[meta.sales ? 'Sales: ' + esc(meta.sales) : '', meta.submitted ? 'Hoàn tất: ' + esc(meta.submitted) : '', meta.code ? 'Mã phiếu: ' + esc(meta.code) : ''].filter(Boolean).join(' • ')}</div>
  </div>`;
  for (const s of tpl.sections) {
    if (s.internal && !internal) continue;
    h += `<div style="margin:18px 0 6px;font-size:16px;font-weight:800;color:${s.internal ? '#92400E' : C.ink};">${esc(s.id)}. ${esc(s.title)}</div>`;
    if (s.internal) h += `<div style="font-size:12px;color:#92400E;background:${C.amber};padding:6px 10px;border-radius:6px;margin-bottom:6px;">Nội bộ – không gửi khách</div>`;
    for (const b of s.blocks) {
      if (b.type === 'note') continue;
      if (b.type === 'table') {
        h += `<table style="width:100%;border-collapse:collapse;border:1px solid ${C.line};border-radius:8px;margin:6px 0 10px;">`;
        for (const r of b.rows) {
          const v = ans[r.id];
          h += `<tr><td style="${td}width:38%;background:${C.soft};color:#334155;font-weight:600;">${esc(r.label)}</td><td style="${td}">${isEmpty(v) ? empty : nl2br(valueText(r, v))}</td></tr>`;
        }
        h += `</table>`;
      }
      if (b.type === 'checks' || b.type === 'radio') {
        const sel = b.type === 'radio' ? (isEmpty(ans[b.id]) ? [] : [ans[b.id]]) : (ans[b.id] || []);
        h += `<div style="margin:8px 0 4px;font-size:13.5px;font-weight:700;color:#334155;">${esc(b.label)}</div><div style="margin:0 0 10px;">`;
        for (const o of b.options) {
          const on = sel.includes(o.v);
          const extra = on && o.input && !isEmpty(ans[`${b.id}:${o.v}`]) ? `: <b>${esc(ans[`${b.id}:${o.v}`])}</b>` : '';
          h += `<div style="font-size:13.5px;line-height:1.7;${on ? '' : 'color:#94a3b8;'}">${on ? `<span style="color:${C.red};font-weight:800;">☑</span>` : '☐'} ${esc(o.label)}${extra}</div>`;
        }
        h += `</div>`;
      }
    }
  }
  h += `</div>`;
  return h;
}

export function renderText(tpl, ans, opts = {}) {
  const internal = opts.internal !== false;
  const lines = [tpl.name, surveyTitle(tpl, ans), ''];
  for (const s of tpl.sections) {
    if (s.internal && !internal) continue;
    lines.push(`${s.id}. ${s.title}`.toUpperCase());
    for (const b of s.blocks) {
      if (b.type === 'table') for (const r of b.rows) lines.push(`- ${r.label}: ${isEmpty(ans[r.id]) ? '—' : valueText(r, ans[r.id])}`);
      if (b.type === 'checks' || b.type === 'radio') {
        const sel = b.type === 'radio' ? (isEmpty(ans[b.id]) ? [] : [ans[b.id]]) : (ans[b.id] || []);
        const picked = b.options.filter((o) => sel.includes(o.v)).map((o) => o.label + (o.input && ans[`${b.id}:${o.v}`] ? ` (${ans[`${b.id}:${o.v}`]})` : ''));
        lines.push(`- ${b.label}: ${picked.length ? picked.join('; ') : '—'}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/* ------------------------------ PDF (pdfmake) ------------------------------ */
export function buildPdfDoc(tpl, ans, opts = {}) {
  const internal = opts.internal !== false;
  const meta = opts.meta || {};
  const content = [];
  const head = [];
  if (opts.logo) head.push({ image: opts.logo, width: 110, margin: [0, 0, 0, 6] });
  content.push({ columns: [
    { stack: [
      { text: (meta.company || 'CÔNG TY ĐẦU TƯ CÔNG NGHỆ REDSUN').toUpperCase(), fontSize: 9, bold: true, color: '#B91C1C', characterSpacing: 0.5 },
      { text: tpl.name, fontSize: 16, bold: true, margin: [0, 3, 0, 0] },
      { text: surveyTitle(tpl, ans), fontSize: 12.5, bold: true, margin: [0, 4, 0, 0] },
      { text: [meta.sales ? 'Sales: ' + meta.sales : '', meta.submitted ? 'Hoàn tất: ' + meta.submitted : '', meta.code ? 'Mã phiếu: ' + meta.code : ''].filter(Boolean).join('  •  '), fontSize: 9, color: '#64748b', margin: [0, 3, 0, 0] }
    ] },
    head.length ? { width: 120, stack: head, alignment: 'right' } : { width: 0, text: '' }
  ] });
  content.push({ canvas: [{ type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 2, lineColor: '#B91C1C' }], margin: [0, 6, 0, 8] });
  for (const s of tpl.sections) {
    if (s.internal && !internal) continue;
    content.push({ text: `${s.id}. ${s.title}`, fontSize: 12.5, bold: true, color: s.internal ? '#92400E' : '#0f172a', margin: [0, 10, 0, 4] });
    if (s.internal) content.push({ text: 'Nội bộ – không gửi khách', fontSize: 8.5, color: '#92400E', margin: [0, 0, 0, 4] });
    for (const b of s.blocks) {
      if (b.type === 'table') {
        content.push({ table: { widths: ['38%', '*'], dontBreakRows: true, body: b.rows.map((r) => [
          { text: r.label, bold: true, fillColor: '#f8fafc', color: '#334155' },
          isEmpty(ans[r.id]) ? { text: '—', color: '#94a3b8' } : { text: valueText(r, ans[r.id]) }
        ]) }, layout: { hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0', paddingTop: () => 4, paddingBottom: () => 4 }, fontSize: 9.5, margin: [0, 2, 0, 6] });
      }
      if (b.type === 'checks' || b.type === 'radio') {
        const sel = b.type === 'radio' ? (isEmpty(ans[b.id]) ? [] : [ans[b.id]]) : (ans[b.id] || []);
        content.push({ text: b.label, bold: true, fontSize: 9.5, color: '#334155', margin: [0, 4, 0, 2] });
        content.push({ stack: b.options.map((o) => {
          const on = sel.includes(o.v);
          const extra = on && o.input && !isEmpty(ans[`${b.id}:${o.v}`]) ? ': ' + ans[`${b.id}:${o.v}`] : '';
          return { text: [{ text: on ? '[x] ' : '[  ] ', bold: on, color: on ? '#B91C1C' : '#94a3b8' }, { text: o.label, color: on ? '#0f172a' : '#94a3b8' }, { text: extra, bold: true }], fontSize: 9.5, margin: [6, 1, 0, 1] };
        }), margin: [0, 0, 0, 6] });
      }
    }
  }
  return {
    pageSize: 'A4', pageMargins: [40, 40, 40, 48], content,
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
    info: { title: `${tpl.short} – ${surveyTitle(tpl, ans)}`, author: meta.sales || 'Redsun' },
    footer: (page, pages) => ({ columns: [
      { text: internal ? 'Bản nội bộ' : 'Bản gửi khách hàng', fontSize: 8, color: '#94a3b8' },
      { text: `Trang ${page}/${pages}`, alignment: 'right', fontSize: 8, color: '#94a3b8' }
    ], margin: [40, 16, 40, 0] })
  };
}
