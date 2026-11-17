/* Danh mục proposal trong tab "Proposal" (dùng chung trình duyệt & máy chủ).
   Thêm proposal mới: đặt bộ trình chiếu vào public/proposal/<id>/ (index.html nội bộ có ghi chú + client.html gửi khách)
   rồi khai báo một dòng ở đây. */
export const PROPOSALS = [
  {
    id: 'redsun-ai-crm',
    title: 'Redsun AI CRM – Đề xuất giải pháp 2026 (VN)',
    short: 'Redsun AI CRM (VN)',
    version: '2.7',
    description: 'Bán hàng, marketing tự động và chăm sóc khách hàng có AI trên nền tảng Redsun BOS. Gồm gói giá Starter / Business / Enterprise và điều kiện báo giá.',
    slides: 30,
    updated: '2026-11-15',
    email_subject: 'Redsun AI CRM – Đề xuất giải pháp cho {khach}',
    pdf_name: 'Redsun-AI-CRM-Proposal-VN',
    lang: 'vi'
  },
  {
    id: 'redsun-ai-crm-en',
    title: 'Redsun AI CRM – Solution Proposal 2026 (EN)',
    short: 'Redsun AI CRM (EN)',
    version: '2.7',
    description: 'English version. AI-powered sales, marketing automation and customer care on the Redsun BOS platform, with Starter / Business / Enterprise plans and quotation terms.',
    slides: 30,
    updated: '2026-11-17',
    email_subject: 'Redsun AI CRM – Solution proposal for {khach}',
    pdf_name: 'Redsun-AI-CRM-Proposal-EN',
    lang: 'en'
  },
  {
    id: 'webino-ecommerce',
    title: 'Đề xuất giải pháp Thiết Kế & Triển khai Web Bán Hàng (VN)',
    short: 'Web Bán Hàng (VN)',
    version: '3.0',
    description: 'Website bán hàng trên nền tảng Webino Builder: 16 tính năng cốt lõi, tính năng nâng cao, gói thuê bao Webino Shop / Growth / Enterprise, luồng đơn hàng, thanh toán & vận chuyển, đồng hành sau go-live.',
    slides: 29,
    updated: '2026-11-15',
    email_subject: 'Redsun – Đề xuất giải pháp Thiết Kế & Triển khai Web Bán Hàng cho {khach}',
    pdf_name: 'Redsun-Proposal-Website-Ban-hang-VN',
    lang: 'vi'
  },
  {
    id: 'webino-ecommerce-en',
    title: 'E-commerce Website Design & Deployment Proposal (EN)',
    short: 'E-commerce Website (EN)',
    version: '3.0',
    description: 'English version. E-commerce website on the Webino Builder platform: 16 core features, advanced features, Webino Shop / Growth / Enterprise plans, order flow, payment & shipping, post-launch support.',
    slides: 29,
    updated: '2026-11-17',
    email_subject: 'Redsun – E-commerce website proposal for {khach}',
    pdf_name: 'Redsun-Proposal-Ecommerce-Website-EN',
    lang: 'en'
  },
  {
    id: 'webino-doanh-nghiep',
    title: 'Đề xuất giải pháp Thiết Kế & Triển khai Web Doanh Nghiệp (VN)',
    short: 'Web Doanh Nghiệp (VN)',
    version: '3.5',
    description: 'Website giới thiệu doanh nghiệp trên nền tảng Webino Builder: năm trang chính mở rộng theo nhu cầu, gói thuê bao Webino, gói bổ sung, tính năng nâng cao, quy trình triển khai bốn giai đoạn.',
    slides: 15,
    updated: '2026-11-15',
    email_subject: 'Redsun – Đề xuất giải pháp Thiết Kế & Triển khai Web Doanh Nghiệp cho {khach}',
    pdf_name: 'Redsun-Proposal-Website-Doanh-nghiep-VN',
    lang: 'vi'
  },
  {
    id: 'webino-doanh-nghiep-en',
    title: 'Corporate Website Design & Deployment Proposal (EN)',
    short: 'Corporate Website (EN)',
    version: '3.5',
    description: 'English version. Corporate website on the Webino Builder platform: five core pages expandable as needed, Webino plans, add-on packages, advanced features, four-phase implementation.',
    slides: 15,
    updated: '2026-11-17',
    email_subject: 'Redsun – Corporate website proposal for {khach}',
    pdf_name: 'Redsun-Proposal-Corporate-Website-EN',
    lang: 'en'
  }
];
export const getProposal = (id) => PROPOSALS.find((p) => p.id === id) || null;
