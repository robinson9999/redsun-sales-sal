/* Danh mục proposal trong tab "Proposal" (dùng chung trình duyệt & máy chủ).
   Thêm proposal mới: đặt bộ trình chiếu vào public/proposal/<id>/ (index.html nội bộ có ghi chú + client.html gửi khách)
   rồi khai báo một dòng ở đây. */
export const PROPOSALS = [
  {
    id: 'redsun-ai-crm',
    title: 'Redsun AI CRM – Đề xuất giải pháp 2026',
    short: 'Redsun AI CRM',
    description: 'Bán hàng, marketing tự động và chăm sóc khách hàng có AI trên nền tảng Redsun BOS. Gồm gói giá Starter / Business / Enterprise và điều kiện báo giá.',
    slides: 27,
    updated: '2026-11-15',
    email_subject: 'Redsun AI CRM – Đề xuất giải pháp cho {khach}',
    pdf_name: 'Redsun-AI-CRM-Proposal'
  }
];
export const getProposal = (id) => PROPOSALS.find((p) => p.id === id) || null;
