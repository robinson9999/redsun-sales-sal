/* Danh mục proposal trong tab "Proposal" (dùng chung trình duyệt & máy chủ).
   Thêm proposal mới: đặt bộ trình chiếu vào public/proposal/<id>/ (index.html nội bộ có ghi chú + client.html gửi khách)
   rồi khai báo một dòng ở đây. */
export const PROPOSALS = [
  {
    id: 'redsun-ai-crm',
    title: 'Redsun AI CRM – Đề xuất giải pháp 2026',
    short: 'Redsun AI CRM',
    version: '2.7',
    description: 'Bán hàng, marketing tự động và chăm sóc khách hàng có AI trên nền tảng Redsun BOS. Gồm gói giá Starter / Business / Enterprise và điều kiện báo giá.',
    slides: 30,
    updated: '2026-11-15',
    email_subject: 'Redsun AI CRM – Đề xuất giải pháp cho {khach}',
    pdf_name: 'Redsun-AI-CRM-Proposal'
  },
  {
    id: 'webino-ecommerce',
    title: 'Đề xuất giải pháp Thiết Kế & Triển khai Web Bán Hàng',
    short: 'Web Bán Hàng',
    version: '3.0',
    description: 'Website bán hàng trên nền tảng Webino Builder: 16 tính năng cốt lõi, tính năng nâng cao, gói thuê bao Webino Shop / Growth / Enterprise, luồng đơn hàng, thanh toán & vận chuyển, đồng hành sau go-live.',
    slides: 29,
    updated: '2026-11-15',
    email_subject: 'Redsun – Đề xuất giải pháp Thiết Kế & Triển khai Web Bán Hàng cho {khach}',
    pdf_name: 'Redsun-Proposal-Website-Ban-hang'
  },
  {
    id: 'webino-doanh-nghiep',
    title: 'Đề xuất giải pháp Thiết Kế & Triển khai Web Doanh Nghiệp',
    short: 'Web Doanh Nghiệp',
    version: '3.5',
    description: 'Website giới thiệu doanh nghiệp trên nền tảng Webino Builder: năm trang chính mở rộng theo nhu cầu, gói thuê bao Webino, gói bổ sung, tính năng nâng cao, quy trình triển khai bốn giai đoạn.',
    slides: 15,
    updated: '2026-11-15',
    email_subject: 'Redsun – Đề xuất giải pháp Thiết Kế & Triển khai Web Doanh Nghiệp cho {khach}',
    pdf_name: 'Redsun-Proposal-Website-Doanh-nghiep'
  }
];
export const getProposal = (id) => PROPOSALS.find((p) => p.id === id) || null;
