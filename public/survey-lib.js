/* =============================================================================
   REDSUN – Thư viện Phiếu khảo sát (dùng chung cho trình duyệt và máy chủ)
   - TEMPLATES: định nghĩa các phiếu. Thêm phiếu mới = thêm một phần tử vào mảng.
   - renderReport(): HTML kết quả (màn hình + email, style inline)
   - buildPdfDoc(): định nghĩa tài liệu pdfmake để xuất PDF
   Kiểu khối (block):
     table   – bảng Câu hỏi / Ghi chú: rows [{ id, label, kind?: 'text'|'textarea'|'date', required?, placeholder? }]
     checks  – chọn nhiều: { id, label, options: [{ v, label, input?: 'gợi ý ô nhập' }], max? }
     radio   – chọn một:  { id, label, options: [...] }
     grid    – bảng nhiều cột: { id, label, head, cols: [{ k, label, kind: 'text'|'yesno'|'check' }], rows: [{ v, label }] }
               câu trả lời: answers[`${id}:${row.v}:${col.k}`] ('co'|'khong' cho yesno, '1' cho check)
     note    – đoạn hướng dẫn (hiện khi điền; report: true thì hiện cả trên kết quả, email, PDF)
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
  },
  {
    id: 'website-bh',
    version: 1,
    name: 'Phiếu khảo sát nhu cầu Website Bán hàng',
    short: 'Website Bán hàng',
    icon: '🛒',
    description: 'Dùng trong buổi gặp đầu (45–60 phút) hoặc gửi khách tự điền trước. Điền đủ mục A–I là đủ dữ liệu để chọn gói và lập báo giá riêng trong 24 giờ làm việc.',
    titleField: 'a_ten_dn',
    guide: [
      'Hỏi B → C trước: mục tiêu và cách khách đang bán. Hai mục này quyết định gói nhiều hơn số trang hay giao diện.',
      'Mục D, E, F là phần kỹ thuật. Nếu người gặp không nắm, hẹn người vận hành (kho, kế toán, chủ shop) bổ sung.',
      'Ghi đúng con số khách nói (số SKU, số đơn/ngày, số kho). Đây là căn cứ chọn gói.',
      'Mục J do Sales tự điền sau buổi gặp, không đưa cho khách.'
    ],
    sections: [
      { id: 'A', title: 'Thông tin doanh nghiệp & người liên hệ', blocks: [
        { type: 'table', head: ['Thông tin', 'Ghi chú'], rows: [
          { id: 'a_ten_dn', label: 'Tên doanh nghiệp / thương hiệu', required: true },
          { id: 'a_loai_hinh', label: 'Loại hình: công ty / hộ kinh doanh' },
          { id: 'a_nganh', label: 'Ngành hàng chính (điện máy, thời trang, mỹ phẩm, F&B, nông sản...)' },
          { id: 'a_quy_mo', label: 'Số cửa hàng / chi nhánh · số nhân sự bán hàng' },
          { id: 'a_lien_he', label: 'Người liên hệ · chức vụ' },
          { id: 'a_dien_thoai', label: 'Điện thoại · Zalo' },
          { id: 'a_email', label: 'Email' },
          { id: 'a_ngay', label: 'Ngày khảo sát', kind: 'date', auto: 'today' },
          { id: 'a_sales', label: 'Sales phụ trách', auto: 'me' }
        ] }
      ] },
      { id: 'B', title: 'Mô hình kinh doanh & mục tiêu bán online', blocks: [
        { type: 'checks', id: 'b_ban_cho', label: 'Quý khách bán cho ai? (chọn tất cả mục phù hợp)', options: [
          { v: 'b2c', label: 'Bán lẻ cho người tiêu dùng (B2C)' },
          { v: 'b2b', label: 'Bán sỉ cho doanh nghiệp (B2B)' },
          { v: 'b2b2c', label: 'Bán qua đại lý, nhà phân phối (B2B2C)' },
          { v: 'nuoc_ngoai', label: 'Bán ra nước ngoài' }
        ] },
        { type: 'checks', id: 'b_muc_tieu', label: 'Mục tiêu chính của website (chọn tối đa 2)', max: 2, options: [
          { v: 'kenh_rieng', label: 'Có kênh bán riêng, giảm phụ thuộc vào sàn và phí sàn' },
          { v: 'doanh_thu', label: 'Tăng doanh thu online, chạy quảng cáo về website' },
          { v: 'gop_don', label: 'Gộp đơn từ nhiều kênh về một nơi, hết nhập đơn hai lần' },
          { v: 'dai_ly', label: 'Cho đại lý tự đặt hàng, xem giá sỉ và công nợ' },
          { v: 'giu_chan', label: 'Giữ chân khách cũ (tích điểm, hạng thành viên)' },
          { v: 'khac', label: 'Khác', input: 'Ghi rõ mục tiêu khác' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'b_ty_le_online', label: 'Doanh thu online hiện tại chiếm bao nhiêu % tổng doanh thu?' },
          { id: 'b_muc_tieu_12t', label: 'Mục tiêu sau 12 tháng: số đơn / ngày hoặc doanh thu online / tháng', kind: 'textarea' },
          { id: 'b_nhom_sp', label: '3 nhóm sản phẩm muốn đẩy mạnh nhất', kind: 'textarea' },
          { id: 'b_khac_biet', label: 'Điểm khác biệt so với đối thủ, nói trong một câu (giá, chất lượng, giao nhanh, bảo hành...)', kind: 'textarea' }
        ] }
      ] },
      { id: 'C', title: 'Hiện trạng bán hàng', blocks: [
        { type: 'grid', id: 'c_kenh', label: 'Kênh đang bán', head: 'Kênh đang bán', cols: [
          { k: 'co', label: 'Có / Không', kind: 'yesno' },
          { k: 'don', label: 'Số đơn / ngày (ước tính)', kind: 'text', width: 'sm' },
          { k: 'note', label: 'Ghi chú (tên shop, link)', kind: 'text' }
        ], rows: [
          { v: 'website', label: 'Website riêng' },
          { v: 'shopee', label: 'Shopee' },
          { v: 'lazada', label: 'Lazada' },
          { v: 'tiktok', label: 'TikTok Shop' },
          { v: 'facebook', label: 'Facebook / Instagram' },
          { v: 'zalo', label: 'Zalo OA' },
          { v: 'livestream', label: 'Livestream' },
          { v: 'cua_hang', label: 'Cửa hàng trực tiếp' },
          { v: 'dai_ly', label: 'Đại lý / bán sỉ' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'c_phan_mem', label: 'Đang dùng phần mềm gì để bán hàng, quản lý kho, kế toán? (Sapo, KiotViet, Haravan, MISA, Excel...)', kind: 'textarea' },
          { id: 'c_chua_hai_long', label: 'Điều chưa hài lòng nhất với cách bán hiện tại (nhập đơn tay, lệch tồn kho, phí sàn cao, website chậm...)', kind: 'textarea' },
          { id: 'c_web_cu', label: 'Website cũ (nếu có): địa chỉ, nền tảng, có cần chuyển dữ liệu sản phẩm / khách hàng / đơn cũ sang không?', kind: 'textarea' },
          { id: 'c_ten_mien', label: 'Tên miền: đã có / chưa có; ai giữ tài khoản quản trị?', kind: 'textarea' },
          { id: 'c_doi_thu', label: '2–3 website đối thủ hoặc website Quý khách thích (ghi rõ thích điểm gì)', kind: 'textarea' }
        ] }
      ] },
      { id: 'D', title: 'Sản phẩm, giá & kho', blocks: [
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'd_sku', label: 'Số sản phẩm (SKU) hiện tại · dự kiến sau 12 tháng' },
          { id: 'd_bien_the', label: 'Có biến thể không? (màu, size, dung tích...) · trung bình mỗi sản phẩm bao nhiêu biến thể' },
          { id: 'd_danh_muc', label: 'Số cấp danh mục (ví dụ: Thời trang › Nữ › Áo)' },
          { id: 'd_du_lieu', label: 'Dữ liệu sản phẩm đang nằm ở đâu? (Excel, phần mềm kho, sàn) — có cần nhập hàng loạt không?', kind: 'textarea' },
          { id: 'd_kho', label: 'Số kho hàng · vị trí từng kho', kind: 'textarea' },
          { id: 'd_ton_kho', label: 'Ai cập nhật tồn kho, bao lâu một lần?' }
        ] },
        { type: 'checks', id: 'd_chinh_sach_gia', label: 'Chính sách giá đang dùng', options: [
          { v: 'mot_gia', label: 'Một giá bán lẻ' },
          { v: 'gia_si', label: 'Giá sỉ / giá theo cấp đại lý' },
          { v: 'nhom_khach', label: 'Giá theo nhóm khách (VIP, thành viên)' },
          { v: 'khu_vuc', label: 'Giá theo khu vực' },
          { v: 'combo', label: 'Combo, mua kèm, flash sale theo giờ' },
          { v: 'voucher', label: 'Mã giảm giá, voucher' }
        ] }
      ] },
      { id: 'E', title: 'Thanh toán & vận chuyển', blocks: [
        { type: 'checks', id: 'e_thanh_toan', label: 'Hình thức thanh toán cần có', options: [
          { v: 'cod', label: 'Trả khi nhận hàng (COD)' },
          { v: 'chuyen_khoan', label: 'Chuyển khoản / QR ngân hàng, tự đối soát' },
          { v: 'vi', label: 'Ví điện tử (VNPay, MoMo...)' },
          { v: 'the', label: 'Thẻ nội địa / thẻ quốc tế' },
          { v: 'cong_no', label: 'Công nợ cho đại lý, khách sỉ' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'e_cong_tt', label: 'Đã có tài khoản cổng thanh toán nào chưa? (tên cổng, đứng tên công ty hay cá nhân)', kind: 'textarea' },
          { id: 'e_van_chuyen', label: 'Đang gửi hàng qua đơn vị vận chuyển nào? Có hợp đồng giá riêng không?', kind: 'textarea' },
          { id: 'e_pham_vi', label: 'Giao nội thành, toàn quốc hay quốc tế? Có tự giao bằng đội riêng không?', kind: 'textarea' },
          { id: 'e_phi_ship', label: 'Cách tính phí ship: cố định, theo khu vực, theo khối lượng, miễn phí từ mức đơn bao nhiêu', kind: 'textarea' },
          { id: 'e_hoa_don', label: 'Cần xuất hóa đơn điện tử cho khách mua online không? Đang dùng phần mềm hóa đơn nào?', kind: 'textarea' }
        ] },
        { type: 'note', report: true, text: 'Phí cổng thanh toán và phí vận chuyển do đối tác thu theo biểu phí riêng, không nằm trong giá của Redsun.' }
      ] },
      { id: 'F', title: 'Kênh bán & kết nối hệ thống', blocks: [
        { type: 'checks', id: 'f_dong_bo', label: 'Cần đồng bộ đơn hàng và tồn kho với', options: [
          { v: 'shopee', label: 'Shopee' },
          { v: 'lazada', label: 'Lazada' },
          { v: 'tiktok', label: 'TikTok Shop' },
          { v: 'fb_zalo', label: 'Facebook · Zalo OA (chốt đơn từ tin nhắn)' },
          { v: 'pos', label: 'Máy bán hàng tại cửa hàng (POS)' },
          { v: 'erp', label: 'Phần mềm kế toán / ERP', input: 'Tên phần mềm' },
          { v: 'crm', label: 'Phần mềm quản lý khách hàng (CRM)', input: 'Tên phần mềm' },
          { v: 'app', label: 'Ứng dụng di động riêng (trong 12 tháng tới)' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'f_dai_ly', label: 'Có cần cổng riêng cho đại lý đặt hàng, xem giá sỉ, công nợ không? Số đại lý hiện có', kind: 'textarea' },
          { id: 'f_da_thuong_hieu', label: 'Có nhiều thương hiệu cần website riêng nhưng quản trị chung không?', kind: 'textarea' },
          { id: 'f_ngon_ngu', label: 'Cần bao nhiêu ngôn ngữ, đơn vị tiền tệ?' },
          { id: 'f_quan_tri', label: 'Số nhân viên cần tài khoản quản trị · các vai trò (biên tập, kho, kế toán, CSKH)', kind: 'textarea' }
        ] }
      ] },
      { id: 'G', title: 'Marketing & chăm sóc khách hàng', blocks: [
        { type: 'checks', id: 'g_marketing', label: 'Những việc Quý khách đang làm hoặc muốn làm', options: [
          { v: 'quang_cao', label: 'Chạy quảng cáo Facebook / Google / TikTok về website' },
          { v: 'landing', label: 'Trang đích riêng cho từng chiến dịch' },
          { v: 'seo', label: 'Viết bài chuẩn SEO để khách tìm thấy trên Google' },
          { v: 'loyalty', label: 'Tích điểm, hạng thành viên, ưu đãi khách quen (Customer 360 & Loyalty)' },
          { v: 'bo_gio', label: 'Nhắc khách bỏ giỏ hàng, gửi email / SMS / ZNS tự động' },
          { v: 'chatbot', label: 'AI Chatbot trả lời 24/7' },
          { v: 'pm_marketing', label: 'Phần mềm Quản lý Marketing' },
          { v: 'pm_crm', label: 'Phần mềm CRM' },
          { v: 'gom_tin', label: 'Gom tin nhắn Messenger, Zalo, email về một màn hình' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'g_ngan_sach_qc', label: 'Ngân sách quảng cáo online / tháng (ước tính)' },
          { id: 'g_phu_trach', label: 'Ai phụ trách marketing: nội bộ hay agency?' },
          { id: 'g_khach_cu', label: 'Số khách hàng cũ đang có dữ liệu (số điện thoại, email)' },
          { id: 'g_cskh', label: 'Bao nhiêu người trực tin nhắn, chăm sóc khách?' }
        ] }
      ] },
      { id: 'H', title: 'Giao diện, nội dung & tuân thủ pháp luật TMĐT', blocks: [
        { type: 'checks', id: 'h_giao_dien', label: 'Giao diện', options: [
          { v: 'co_san', label: 'Dùng giao diện có sẵn từ kho 500+ mẫu (nhiều mẫu miễn phí)' },
          { v: 'doc_ban', label: 'Thiết kế giao diện độc bản (từ 15 triệu)' },
          { v: 'lap_trinh', label: 'Có chức năng riêng cần lập trình', input: 'Mô tả chức năng' }
        ] },
        { type: 'checks', id: 'h_noi_dung', label: 'Nội dung đã sẵn sàng', options: [
          { v: 'logo', label: 'Logo, bộ nhận diện thương hiệu' },
          { v: 'anh_sp', label: 'Ảnh sản phẩm chụp thật, đủ cho từng biến thể' },
          { v: 'mo_ta', label: 'Mô tả sản phẩm, thông số, giấy tờ chất lượng (nếu ngành hàng yêu cầu)' },
          { v: 'banner', label: 'Banner, video giới thiệu' }
        ] },
        { type: 'note', report: true, text: 'Luật Thương mại điện tử 2025 và Nghị định 248/2026/NĐ-CP có hiệu lực từ 01/7/2026, yêu cầu website bán hàng công khai các chính sách dưới đây.' },
        { type: 'checks', id: 'h_chinh_sach', label: 'Chính sách công khai trên website – đánh dấu những chính sách đã có văn bản', options: [
          { v: 'bao_mat', label: 'Chính sách bảo mật, xử lý dữ liệu cá nhân' },
          { v: 'gia_tt', label: 'Chính sách giá, thanh toán' },
          { v: 'giao_hang', label: 'Chính sách giao hàng' },
          { v: 'doi_tra', label: 'Chính sách đổi trả, bảo hành' },
          { v: 'khieu_nai', label: 'Cách tiếp nhận và giải quyết khiếu nại' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'h_bct', label: 'Website cũ đã được xác nhận thông báo / đăng ký với Bộ Công Thương chưa?' },
          { id: 'h_ho_tro', label: 'Cần Redsun hỗ trợ soạn chính sách, viết mô tả sản phẩm, thiết kế banner không?', kind: 'textarea' },
          { id: 'h_duyet', label: 'Ai duyệt thiết kế và nội dung? Ai cập nhật sản phẩm sau bàn giao?', kind: 'textarea' }
        ] }
      ] },
      { id: 'I', title: 'Ngân sách, thời hạn & người ra quyết định', blocks: [
        { type: 'radio', id: 'i_ngan_sach', label: 'Ngân sách dự kiến cho năm đầu (gồm thuê bao, thiết kế, tính năng thêm và gói vận hành)', options: [
          { v: 'duoi_15', label: 'Dưới 15 triệu' },
          { v: '15_50', label: '15 – 50 triệu' },
          { v: '50_150', label: '50 – 150 triệu' },
          { v: 'tren_150', label: 'Trên 150 triệu' },
          { v: 'chua_xd', label: 'Chưa xác định, cần Redsun tư vấn' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'i_ngay_ban', label: 'Ngày mong muốn website bắt đầu bán? Có gắn với mùa cao điểm nào không (Tết, 11/11, Black Friday)?', kind: 'textarea' },
          { id: 'i_quyet_dinh', label: 'Ai là người quyết định cuối cùng? Có cần trình duyệt cấp trên không?', kind: 'textarea' },
          { id: 'i_doi_thu', label: 'Đang tham khảo bên cung cấp nào khác? (Haravan, Sapo, agency thiết kế riêng...)', kind: 'textarea' },
          { id: 'i_thanh_toan', label: 'Thanh toán thuê bao theo tháng hay theo năm? Cần hóa đơn VAT không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'J', title: 'Sales đánh giá (nội bộ, không gửi khách)', internal: true, blocks: [
        { type: 'note', report: true, text: 'Chọn gói theo tín hiệu rõ nhất ở mục C, D, F. Chỉ cần một tín hiệu của gói cao hơn là nên đề xuất gói đó.' },
        { type: 'grid', id: 'j_tin_hieu', label: 'Tín hiệu từ khách', head: 'Tín hiệu từ khách', cols: [
          { k: 'khop', label: 'Khách có tín hiệu này', kind: 'check' },
          { k: 'goi', label: 'Gói gợi ý', kind: 'text', width: 'sm' },
          { k: 'thue_bao', label: 'Thuê bao', kind: 'text', width: 'sm' }
        ], rows: [
          { v: 'g1', label: 'Shop mới, một kênh, tối đa 300 sản phẩm, 1 ngôn ngữ' },
          { v: 'g2', label: 'Trên 300 sản phẩm, chạy quảng cáo về web, cần AI viết nội dung' },
          { v: 'g3', label: 'Bán trên sàn hoặc có cửa hàng, nhiều kho, có đại lý giá theo cấp, cần chatbot hoặc 2 ngôn ngữ' },
          { v: 'g4', label: 'Chuỗi, tập đoàn, nhiều thương hiệu, cần kết nối ERP, tích điểm, AI Marketing' }
        ] },
        { type: 'table', head: ['Đánh giá', 'Ghi chú'], rows: [
          { id: 'j_goi', label: 'Gói gợi ý' },
          { id: 'j_giao_dien', label: 'Giao diện: có sẵn / độc bản / lập trình riêng' },
          { id: 'j_nang_cao', label: 'Tính năng nâng cao cần báo giá thêm', kind: 'textarea' },
          { id: 'j_van_hanh', label: 'Gói vận hành gợi ý (hoàn thiện website, 15 bài SEO, banner, đào tạo, quản lý vận hành)', kind: 'textarea' },
          { id: 'j_ban_them', label: 'Cơ hội bán thêm: SIPOS Retail (có cửa hàng), Redsun AI CRM, AI Marketing Automation, Redsun BOS', kind: 'textarea' }
        ] },
        { type: 'radio', id: 'j_tiem_nang', label: 'Mức độ tiềm năng', options: [
          { v: 'nong', label: 'Nóng' }, { v: 'am', label: 'Ấm' }, { v: 'lanh', label: 'Lạnh' }
        ] },
        { type: 'table', head: ['Đánh giá', 'Ghi chú'], rows: [
          { id: 'j_thieu', label: 'Thông tin còn thiếu, cần hỏi bổ sung', kind: 'textarea' }
        ] },
        { type: 'checks', id: 'j_buoc_tiep', label: 'Bước tiếp theo', options: [
          { v: 'crm', label: 'Nhập dữ liệu vào CRM' },
          { v: 'bao_gia', label: 'Gửi báo giá riêng trong 24 giờ làm việc' },
          { v: 'web_mau', label: 'Gửi website mẫu cùng ngành hàng' },
          { v: 'demo', label: 'Hẹn demo trang quản trị và Webino Builder' },
          { v: 'gap_vh', label: 'Hẹn gặp người vận hành (kho, kế toán) nếu mục D–F còn thiếu' },
          { v: 'gap_qd', label: 'Hẹn gặp người ra quyết định' }
        ] }
      ] }
    ]
  },
  {
    id: 'ai-crm',
    version: 1,
    name: 'Phiếu khảo sát nhu cầu Redsun AI CRM',
    short: 'Redsun AI CRM',
    icon: '🤖',
    description: 'Dùng trong buổi gặp đầu (45–60 phút) hoặc gửi khách tự điền trước. Điền đủ mục A–I là đủ dữ liệu để chọn gói, ước số tài khoản và lập báo giá riêng trong 24 giờ làm việc.',
    titleField: 'a_ten_dn',
    guide: [
      'Hỏi B → C → D trước: khách muốn CRM giải quyết việc gì, đang quản lý khách ra sao, đội bán hàng làm việc thế nào. Ba mục này quyết định gói nhiều hơn danh sách tính năng.',
      'Ghi đúng con số khách nói: số người dùng, số khách hàng đang có, số khách mới mỗi tháng, số tin nhắn mỗi ngày. Đây là căn cứ chọn gói và số tài khoản.',
      'Mục G (kết nối hệ thống) và H (triển khai) là phần kỹ thuật. Nếu người gặp không nắm, hẹn người phụ trách IT hoặc kế toán bổ sung.',
      'CRM chỉ kết nối Zalo OA, không kết nối Zalo cá nhân. Ứng dụng di động đang trong lộ trình, không hứa ngày có.',
      'Mục J do Sales tự điền sau buổi gặp, không đưa cho khách.'
    ],
    sections: [
      { id: 'A', title: 'Thông tin doanh nghiệp & người liên hệ', blocks: [
        { type: 'table', head: ['Thông tin', 'Ghi chú'], rows: [
          { id: 'a_ten_dn', label: 'Tên doanh nghiệp', required: true },
          { id: 'a_mst', label: 'Mã số thuế' },
          { id: 'a_nganh', label: 'Ngành nghề chính (bất động sản, giáo dục, bán lẻ, sản xuất, dịch vụ, phân phối...)' },
          { id: 'a_quy_mo', label: 'Quy mô: tổng nhân sự · số chi nhánh / văn phòng' },
          { id: 'a_web', label: 'Website · Fanpage' },
          { id: 'a_lien_he', label: 'Người liên hệ · chức vụ' },
          { id: 'a_dien_thoai', label: 'Điện thoại · Zalo' },
          { id: 'a_email', label: 'Email' },
          { id: 'a_ngay', label: 'Ngày khảo sát', kind: 'date', auto: 'today' },
          { id: 'a_sales', label: 'Sales phụ trách', auto: 'me' }
        ] }
      ] },
      { id: 'B', title: 'Mô hình bán hàng & điểm nghẽn hiện tại', blocks: [
        { type: 'checks', id: 'b_ban_cho', label: 'Quý khách bán cho ai? (chọn tất cả mục phù hợp)', options: [
          { v: 'b2b', label: 'Doanh nghiệp (B2B)' },
          { v: 'b2c', label: 'Khách cá nhân (B2C)' },
          { v: 'dai_ly', label: 'Qua đại lý, nhà phân phối' },
          { v: 'nuoc_ngoai', label: 'Khách nước ngoài' }
        ] },
        { type: 'radio', id: 'b_chu_ky', label: 'Chu kỳ bán hàng thường gặp (từ lúc có khách quan tâm đến lúc chốt)', options: [
          { v: 'ngay', label: 'Trong ngày' },
          { v: 'duoi_1t', label: 'Dưới 1 tháng' },
          { v: '1_3t', label: '1–3 tháng' },
          { v: 'tren_3t', label: 'Trên 3 tháng' }
        ] },
        { type: 'checks', id: 'b_diem_nghen', label: 'Doanh nghiệp đang gặp những điểm nghẽn nào? (chọn tất cả; ghi điểm nặng nhất vào bảng bên dưới)', options: [
          { v: 'phan_manh', label: 'Dữ liệu khách nằm rải rác (Zalo cá nhân, Excel, sổ tay); nhân viên nghỉ hoặc sao chép mang theo khách' },
          { v: 'trung', label: 'Trùng khách, tranh chấp khách / hoa hồng; thông tin khách thiếu, sai, không cập nhật' },
          { v: 'cham', label: 'Phản hồi chậm, quên gọi lại; khách nóng sang đối thủ trước khi được chăm' },
          { v: 'sai_nguoi', label: 'Tư vấn sai người: người liên hệ không có quyền ký, dự báo doanh thu ảo' },
          { v: 'treo', label: 'Không biết cơ hội đang ở bước nào, nhiều cơ hội "treo" lâu; không ghi lại lý do mất khách' },
          { v: 'bao_gia', label: 'Báo giá làm bằng Word / Excel, chiết khấu không ai kiểm soát' },
          { v: 'nhap_lieu', label: 'Sales mất nhiều thời gian nhập liệu, làm báo cáo tay thay vì bán hàng' },
          { v: 'hieu_suat', label: 'Không đo được hiệu suất từng người; báo cáo chậm, lệch số; không dự báo được doanh thu' },
          { v: 'nhan_vien', label: 'Nhân viên mới chậm làm quen; khó quản lý sales ngoài hiện trường, nhiều chi nhánh' },
          { v: 'marketing', label: 'Không biết kênh quảng cáo nào ra doanh thu; lead từ marketing sang sales bị bỏ sót' },
          { v: 'sau_ban', label: 'Khách mua xong bị quên (không nhắc gia hạn, không tích điểm); khiếu nại không ai theo đến cùng' },
          { v: 'phoi_hop', label: 'Phối hợp rời rạc giữa sales – kế toán – kho – triển khai (công nợ, giao hàng, bàn giao)' },
          { v: 'khac', label: 'Khác', input: 'Ghi rõ điểm nghẽn khác' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'b_quy_mo_ban', label: 'Sản phẩm / dịch vụ chính · giá trị đơn trung bình · số lead mới / tháng · số khách chốt / tháng', kind: 'textarea' },
          { id: 'b_nang_nhat', label: 'Điểm nghẽn nặng nhất là gì, đang làm mất bao nhiêu (khách, doanh thu, thời gian)?', kind: 'textarea' },
          { id: 'b_thanh_cong', label: 'Sau 6 tháng dùng CRM, thế nào là thành công? (tỉ lệ chốt, thời gian phản hồi, doanh số...)', kind: 'textarea' }
        ] }
      ] },
      { id: 'C', title: 'Hiện trạng quản lý khách hàng', blocks: [
        { type: 'grid', id: 'c_cong_cu', label: 'Công cụ đang dùng', head: 'Công cụ đang dùng', cols: [
          { k: 'co', label: 'Có / Không', kind: 'yesno' },
          { k: 'ten', label: 'Tên phần mềm · số người dùng', kind: 'text' },
          { k: 'note', label: 'Ghi chú', kind: 'text' }
        ], rows: [
          { v: 'excel', label: 'Excel / Google Sheets' },
          { v: 'so_tay', label: 'Sổ tay, Zalo cá nhân của từng nhân viên' },
          { v: 'crm', label: 'Phần mềm CRM khác (Salesforce, HubSpot, Getfly, MISA AMIS CRM...)' },
          { v: 'pos', label: 'Phần mềm bán hàng / POS (KiotViet, Sapo, SIPOS...)' },
          { v: 'ke_toan', label: 'Phần mềm kế toán / ERP' },
          { v: 'tong_dai', label: 'Tổng đài điện thoại' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'c_du_lieu', label: 'Tổng số khách / liên hệ đang có, nằm ở đâu; có cần chuyển sang CRM không (khách hàng, lịch sử mua, cơ hội đang theo)?', kind: 'textarea' },
          { id: 'c_doi_crm', label: 'Nếu đã dùng CRM: vì sao muốn đổi? Nhân viên có chịu dùng không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'D', title: 'Quy trình bán hàng & đội ngũ', blocks: [
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'd_doi', label: 'Đội kinh doanh: số nhân viên · số quản lý · số nhóm / khu vực / chi nhánh' },
          { id: 'd_quy_trinh', label: 'Quy trình bán: các bước hiện tại (ví dụ tiếp nhận → tư vấn → báo giá → đàm phán → ký); có mấy quy trình khác nhau theo sản phẩm / nhóm khách?', kind: 'textarea' },
          { id: 'd_quy_tac', label: 'Quy tắc vận hành: chia khách mới cho ai, phải phản hồi trong bao lâu (SLA), ai duyệt chiết khấu đến mức nào?', kind: 'textarea' },
          { id: 'd_kpi', label: 'KPI đang dùng để đánh giá nhân viên kinh doanh', kind: 'textarea' }
        ] },
        { type: 'checks', id: 'd_can_lam', label: 'Những việc cần làm trên CRM', options: [
          { v: 'ho_so', label: 'Hồ sơ khách 360° (lịch sử tương tác, mua hàng, tài liệu); phân loại, gắn thẻ khách' },
          { v: 'chong_trung', label: 'Chống trùng khách theo số điện thoại; nhập dữ liệu hàng loạt từ Excel' },
          { v: 'chia_khach', label: 'Tự động chia khách mới (xoay vòng, theo vùng, theo sản phẩm); thu hồi khách quá hạn không chăm' },
          { v: 'bant', label: 'Chấm điểm khách theo BANT, chặn chuyển thành cơ hội khi chưa gặp người quyết định' },
          { v: 'sla', label: 'Đồng hồ SLA theo giờ làm việc, leo thang khi sắp trễ' },
          { v: 'pipeline', label: 'Nhiều quy trình bán (pipeline); nhắc việc, lịch hẹn; ghi lý do thắng / thua' },
          { v: 'bao_gia', label: 'Danh mục sản phẩm, bảng giá; báo giá theo mẫu, duyệt chiết khấu nhiều cấp, lưu vết' },
          { v: 'hop_dong', label: 'Hợp đồng, đơn hàng, thu tiền, công nợ; xem tồn kho trên hồ sơ khách' },
          { v: 'kpi', label: 'Giao KPI, báo cáo theo thời gian thực, dự báo doanh thu' },
          { v: 'hoa_hong', label: 'Tính hoa hồng, thưởng; quản lý đại lý, cộng tác viên' },
          { v: 'phan_quyen', label: 'Phân quyền theo sơ đồ tổ chức, nhật ký thao tác' },
          { v: 'ho_tro', label: 'Tiếp nhận và xử lý yêu cầu hỗ trợ, khiếu nại, bảo hành' },
          { v: 'sau_ban', label: 'Chăm sóc sau bán: nhắc gia hạn, sinh nhật, tích điểm, hạng thành viên, khảo sát hài lòng' },
          { v: 'mobile', label: 'Ứng dụng di động cho nhân viên: ghi chú, chụp ảnh, check-in tại khách (đang trong lộ trình)' },
          { v: 'khac', label: 'Khác', input: 'Ghi rõ nhu cầu khác' }
        ] }
      ] },
      { id: 'E', title: 'Kênh liên lạc & chăm sóc khách hàng', blocks: [
        { type: 'grid', id: 'e_kenh', label: 'Kênh khách liên hệ', head: 'Kênh khách liên hệ', cols: [
          { k: 'co', label: 'Có / Không', kind: 'yesno' },
          { k: 'so', label: 'Số khách / tin nhắn mỗi ngày', kind: 'text', width: 'sm' },
          { k: 'note', label: 'Ghi chú', kind: 'text' }
        ], rows: [
          { v: 'zalo_oa', label: 'Zalo OA' },
          { v: 'zalo_cn', label: 'Zalo cá nhân của nhân viên (CRM chỉ kết nối Zalo OA — tư vấn chuyển sang OA)' },
          { v: 'messenger', label: 'Facebook Messenger / Fanpage' },
          { v: 'email', label: 'Email' },
          { v: 'tong_dai', label: 'Tổng đài / hotline' },
          { v: 'website', label: 'Website (form, chat)' },
          { v: 'quang_cao', label: 'Quảng cáo thu lead (Facebook, Google, TikTok)' },
          { v: 'su_kien', label: 'Cửa hàng, sự kiện, hội chợ' },
          { v: 'gioi_thieu', label: 'Giới thiệu, đối tác, cộng tác viên' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'e_tong_dai', label: 'Tổng đài đang dùng (nhà cung cấp, có ghi âm không) · số người trực tin nhắn / CSKH và khung giờ trực', kind: 'textarea' },
          { id: 'e_tin_nhan', label: 'Có 3–5 tin nhắn thật của khách (đã che thông tin) để Redsun demo AI đọc hiểu không?' }
        ] }
      ] },
      { id: 'F', title: 'Trợ lý AI & AI Marketing Automation', blocks: [
        { type: 'checks', id: 'f_tro_ly', label: 'Trợ lý AI cho đội bán hàng — Quý khách muốn dùng', options: [
          { v: 'ban_tin', label: 'AI chủ động báo cáo: bản tin mỗi sáng bằng giọng nói và văn bản (gọi ai trước, deal nào sắp trễ, báo giá nào chờ duyệt)' },
          { v: 'co_van', label: 'Cố vấn 4 ô trên mỗi hồ sơ: khách cần gì, đã làm gì, đang vướng ở đâu, nên làm gì tiếp' },
          { v: 'chat', label: 'Khung chat ra lệnh: tóm tắt lịch sử khách, tạo lịch gọi lại, soạn nháp trả lời' },
          { v: 'voice', label: 'AI voice & chat, ghi âm cuộc gọi thành văn bản' },
          { v: 'so_lieu', label: 'Trợ lý số liệu: hỏi báo cáo bằng lời; kết nối Claude / ChatGPT qua MCP' },
          { v: 'khac', label: 'Yêu cầu khác', input: 'Ghi rõ yêu cầu' }
        ] },
        { type: 'checks', id: 'f_marketing', label: 'AI Marketing Automation — những việc đang làm hoặc muốn làm', options: [
          { v: 'noi_dung', label: 'Nghiên cứu xu hướng, viết bài, thiết kế hình ảnh / video bằng AI' },
          { v: 'dang_bai', label: 'Lập lịch và đăng bài tự động đa nền tảng, gom tương tác mạng xã hội' },
          { v: 'chien_dich', label: 'Quản lý chiến dịch và quảng cáo tập trung, giữ nguồn UTM đến tận doanh thu' },
          { v: 'landing', label: 'Landing page (Webino) và Lead Form chống trùng số điện thoại' },
          { v: 'nuoi_duong', label: 'Kịch bản nuôi dưỡng tự động qua Email / SMS / Zalo ZNS' },
          { v: 'bao_cao', label: 'Báo cáo hiệu quả kênh, chi phí trên lead, doanh thu theo chiến dịch' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'f_quy_mo', label: 'Quy mô sử dụng: số người dùng AI hằng ngày · số email marketing / tháng · ngân sách quảng cáo / tháng · marketing nội bộ hay agency (tham khảo: 1 sales dùng bản tin sáng + 10 lượt tóm tắt / ngày ≈ 300 credit / tháng)', kind: 'textarea' },
          { id: 'f_tai_lieu', label: 'Tài liệu sẵn có cho AI học (bảng giá, mô tả sản phẩm, câu hỏi thường gặp, kịch bản tư vấn)', kind: 'textarea' },
          { id: 'f_lo_ngai', label: 'Lo ngại về AI (tự ý nhắn khách, chi phí, lộ dữ liệu)? Cần đặt trần credit theo người / phòng ban không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'G', title: 'Kết nối hệ thống & module Redsun BOS', blocks: [
        { type: 'note', report: true, text: 'AI CRM nằm chung dữ liệu với Redsun BOS: bật thêm module khi cần, không nhập lại dữ liệu.' },
        { type: 'checks', id: 'g_bos', label: 'Quý khách có nhu cầu quản lý thêm', options: [
          { v: 'pos', label: 'Bán hàng / POS: đơn hàng, POS, sàn TMĐT' },
          { v: 'kho', label: 'Mua hàng & Kho vận: đa kho, lô / serial, giao vận, COD' },
          { v: 'tai_chinh', label: 'Quản trị Tài chính: thu chi, công nợ, hóa đơn điện tử, dòng tiền' },
          { v: 'san_xuat', label: 'Vận hành & Sản xuất: BOM, yêu cầu nội bộ' },
          { v: 'nhan_su', label: 'Quản trị Nhân sự: chấm công, lương, BHXH' },
          { v: 'phan_tich', label: 'Phân tích & Dự báo: BI đa chiều, dự báo doanh thu' },
          { v: 'van_phong', label: 'Văn phòng số: công việc, phê duyệt điện tử, ký số' },
          { v: 'ke_hoach', label: 'Kế hoạch & Ngân sách: OKR / KPI, phân bổ ngân sách' }
        ] },
        { type: 'checks', id: 'g_ket_noi', label: 'Hệ thống sẵn có cần kết nối', options: [
          { v: 'website', label: 'Website', input: 'Nền tảng website' },
          { v: 'phan_mem', label: 'Phần mềm đã nêu ở mục C (kế toán / ERP, POS, tổng đài)', input: 'Tên phần mềm' },
          { v: 'email', label: 'Email công ty (Google Workspace, Microsoft 365)' },
          { v: 'api', label: 'Hệ thống khác qua API', input: 'Tên hệ thống' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'g_it', label: 'Người phụ trách IT / kết nối phía khách (tên, liên hệ)' },
          { id: 'g_mau_nganh', label: 'Ngành có trong 17 mẫu ngành dựng sẵn không? Trường thông tin riêng và báo cáo quản lý cần xem (ngày / tuần / tháng)', kind: 'textarea' }
        ] }
      ] },
      { id: 'H', title: 'Người dùng, bảo mật & triển khai', blocks: [
        { type: 'radio', id: 'h_so_user', label: 'Số tài khoản dự kiến (quyết định gói)', options: [
          { v: 'duoi_5', label: 'Dưới 5 người' },
          { v: '5_20', label: '5 – 20 người' },
          { v: '21_50', label: '21 – 50 người' },
          { v: '51_100', label: '51 – 100 người' },
          { v: '101_300', label: '101 – 300 người' },
          { v: 'tren_300', label: 'Trên 300 người' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'h_tai_khoan', label: 'Số tài khoản cần ngay · sau 12 tháng · chia theo vai trò (sales, quản lý, CSKH, marketing, kế toán)', kind: 'textarea' },
          { id: 'h_bao_mat', label: 'Phân quyền & bảo mật: ai được xem dữ liệu gì, có che số điện thoại / chặn xuất tệp khách không; yêu cầu nơi lưu dữ liệu, SSO, đa pháp nhân', kind: 'textarea' },
          { id: 'h_trien_khai', label: 'Triển khai: ai là quản trị hệ thống phía khách; đào tạo bao nhiêu buổi, trực tiếp hay online', kind: 'textarea' },
          { id: 'h_lo_ngai', label: 'Lo ngại lớn nhất khi triển khai (nhân viên ngại dùng, gián đoạn bán hàng, mất dữ liệu)? Ai sẽ thúc đội ngũ dùng hằng ngày?', kind: 'textarea' }
        ] },
        { type: 'note', report: true, text: 'Theo Luật Bảo vệ dữ liệu cá nhân 2025 và Nghị định 356/2025/NĐ-CP (hiệu lực từ 01/01/2026), doanh nghiệp là bên kiểm soát dữ liệu khách hàng, Redsun là bên xử lý và ký thỏa thuận xử lý dữ liệu. Doanh nghiệp cần có sự đồng ý của khách khi thu thập dữ liệu.' }
      ] },
      { id: 'I', title: 'Ngân sách, thời hạn & người ra quyết định', blocks: [
        { type: 'radio', id: 'i_ngan_sach', label: 'Ngân sách dự kiến cho năm đầu (thuê bao, triển khai, đào tạo)', options: [
          { v: 'duoi_50', label: 'Dưới 50 triệu' },
          { v: '50_150', label: '50 – 150 triệu' },
          { v: '150_500', label: '150 – 500 triệu' },
          { v: 'tren_500', label: 'Trên 500 triệu' },
          { v: 'chua_xd', label: 'Chưa xác định, cần Redsun tư vấn' }
        ] },
        { type: 'table', head: ['Câu hỏi', 'Ghi chú'], rows: [
          { id: 'i_thoi_diem', label: 'Thời điểm muốn bắt đầu dùng; có gắn với mốc nào không (đầu năm tài chính, mùa cao điểm, đợt tuyển sales mới)?', kind: 'textarea' },
          { id: 'i_quyet_dinh', label: 'Ra quyết định: ai quyết cuối cùng, có cần trình duyệt không; tiêu chí quan trọng nhất khi chọn nhà cung cấp (giá, tính năng, kết nối Zalo OA, AI, dễ dùng, hỗ trợ, bảo mật)', kind: 'textarea' },
          { id: 'i_so_sanh', label: 'Đang so sánh với bên nào (MISA AMIS CRM, Getfly, Bitrix24, HubSpot...)? Muốn dùng thử 14 ngày, thanh toán tháng hay năm (giảm 15%), cần hóa đơn VAT không?', kind: 'textarea' }
        ] }
      ] },
      { id: 'J', title: 'Sales đánh giá (nội bộ, không gửi khách)', internal: true, blocks: [
        { type: 'note', report: true, text: 'Chọn gói theo tín hiệu rõ nhất ở mục D, E, F, G, H. Chỉ cần một tín hiệu của gói cao hơn là nên đề xuất gói đó. Business là gói nên chốt cho phần lớn khách.' },
        { type: 'grid', id: 'j_tin_hieu', label: 'Tín hiệu từ khách', head: 'Tín hiệu từ khách → gói gợi ý', cols: [
          { k: 'khop', label: 'Khách có tín hiệu này', kind: 'check' },
          { k: 'note', label: 'Ghi chú', kind: 'text' }
        ], rows: [
          { v: 'starter', label: '5–20 người dùng, 1 quy trình bán, hộp thư Zalo OA / Facebook / Email, báo giá theo mẫu → AI CRM Starter' },
          { v: 'business', label: '21–300 người dùng; hoặc cần tổng đài, AI voice, AI Marketing 12 cấu phần, duyệt báo giá nhiều cấp, nhiều nhóm / khu vực, POS → AI CRM + AI Marketing (Business)' },
          { v: 'enterprise', label: 'Trên 300 người dùng; hoặc cần Kho, Tài chính, Nhân sự, Sản xuất, đa chi nhánh, đa pháp nhân, MCP → Redsun BOS Suite (Enterprise)' }
        ] },
        { type: 'table', head: ['Đánh giá', 'Ghi chú'], rows: [
          { id: 'j_goi', label: 'Gói gợi ý · số tài khoản · thanh toán tháng / năm · AI credit dự kiến, có cần nạp thêm' },
          { id: 'j_bao_gia_them', label: 'Cần báo giá thêm: module BOS, kết nối, chuyển dữ liệu, cấu hình quy trình, đào tạo', kind: 'textarea' },
          { id: 'j_demo', label: 'Điểm nghẽn nặng nhất của khách → phần demo cần tập trung', kind: 'textarea' },
          { id: 'j_ban_them', label: 'Cơ hội bán thêm: Website (Webino), SIPOS Retail, module Redsun BOS', kind: 'textarea' }
        ] },
        { type: 'radio', id: 'j_tiem_nang', label: 'Mức độ tiềm năng', options: [
          { v: 'nong', label: 'Nóng' }, { v: 'am', label: 'Ấm' }, { v: 'lanh', label: 'Lạnh' }
        ] },
        { type: 'table', head: ['Đánh giá', 'Ghi chú'], rows: [
          { id: 'j_thieu', label: 'Thông tin còn thiếu, cần hỏi bổ sung', kind: 'textarea' }
        ] },
        { type: 'checks', id: 'j_buoc_tiep', label: 'Bước tiếp theo', options: [
          { v: 'crm', label: 'Nhập dữ liệu vào CRM' },
          { v: 'bao_gia', label: 'Gửi báo giá riêng trong 24 giờ làm việc' },
          { v: 'dung_thu', label: 'Cấp tài khoản dùng thử 14 ngày' },
          { v: 'demo', label: 'Hẹn demo đúng điểm nghẽn, dùng tin nhắn thật của khách (đã che thông tin)' },
          { v: 'gap_it', label: 'Hẹn gặp người phụ trách IT nếu mục G–H còn thiếu' },
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
const gKey = (b, r, c) => `${b.id}:${r.v}:${c.k}`;
function gridCell(c, v) {
  if (isEmpty(v)) return '';
  if (c.kind === 'yesno') return v === 'co' ? 'Có' : v === 'khong' ? 'Không' : '';
  if (c.kind === 'check') return v === '1' ? '✔' : '';
  return String(v);
}
const gridRowFilled = (b, r, ans) => b.cols.some((c) => !isEmpty(ans[gKey(b, r, c)]));

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
    if (b.type === 'grid') for (const r of b.rows) for (const c of b.cols) {
      const k = gKey(b, r, c), v = ans[k];
      if (isEmpty(v)) continue;
      if (c.kind === 'yesno') { if (v === 'co' || v === 'khong') out[k] = v; }
      else if (c.kind === 'check') { if (v === '1' || v === true) out[k] = '1'; }
      else out[k] = str(v, 500);
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
      if (b.type === 'grid') { total++; if (b.rows.some((r) => gridRowFilled(b, r, ans))) done++; }
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
      if (b.type === 'note') { if (b.report) h += `<div style="font-size:12.5px;color:#475569;font-style:italic;border-left:3px solid ${C.line};padding:4px 10px;margin:6px 0 10px;">${esc(b.text)}</div>`; continue; }
      if (b.type === 'grid') {
        const th = `padding:7px 10px;background:${C.soft};color:#334155;font-size:12.5px;font-weight:700;text-align:left;border-bottom:1px solid ${C.line};`;
        h += `<table style="width:100%;border-collapse:collapse;border:1px solid ${C.line};margin:6px 0 10px;"><tr><th style="${th}">${esc(b.head || b.label)}</th>${b.cols.map((c) => `<th style="${th}">${esc(c.label)}</th>`).join('')}</tr>`;
        for (const r of b.rows) {
          const on = gridRowFilled(b, r, ans);
          h += `<tr><td style="${td}width:34%;font-weight:600;${on ? 'color:#334155;' : 'color:#94a3b8;'}">${esc(r.label)}</td>${b.cols.map((c) => {
            const t = gridCell(c, ans[gKey(b, r, c)]);
            const col = t === 'Có' || t === '✔' ? `color:${C.red};font-weight:800;` : '';
            return `<td style="${td}${col}">${t ? nl2br(t) : empty}</td>`;
          }).join('')}</tr>`;
        }
        h += `</table>`;
        continue;
      }
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
      if (b.type === 'note' && b.report) lines.push(`(${b.text})`);
      if (b.type === 'table') for (const r of b.rows) lines.push(`- ${r.label}: ${isEmpty(ans[r.id]) ? '—' : valueText(r, ans[r.id])}`);
      if (b.type === 'grid') {
        lines.push(`- ${b.label}:`);
        const filled = b.rows.filter((r) => gridRowFilled(b, r, ans));
        if (!filled.length) lines.push('    —');
        for (const r of filled) lines.push(`    • ${r.label}: ${b.cols.map((c) => { const t = gridCell(c, ans[gKey(b, r, c)]); return !t ? '' : c.kind === 'text' ? `${c.label}: ${t}` : c.kind === 'check' ? c.label : t; }).filter(Boolean).join(' · ')}`);
      }
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
      if (b.type === 'note' && b.report) content.push({ text: b.text, italics: true, fontSize: 9, color: '#475569', margin: [0, 2, 0, 6] });
      if (b.type === 'grid') {
        const hd = [{ text: b.head || b.label, bold: true, fillColor: '#f8fafc', color: '#334155' }, ...b.cols.map((c) => ({ text: c.label, bold: true, fillColor: '#f8fafc', color: '#334155' }))];
        const body = b.rows.map((r) => [
          { text: r.label, bold: true, color: gridRowFilled(b, r, ans) ? '#334155' : '#94a3b8' },
          ...b.cols.map((c) => { const t = gridCell(c, ans[gKey(b, r, c)]); return t ? { text: t === '✔' ? 'Có' : t, bold: t === 'Có' || t === '✔', color: t === 'Có' || t === '✔' ? '#B91C1C' : '#0f172a' } : { text: '—', color: '#94a3b8' }; })
        ]);
        content.push({ table: { headerRows: 1, widths: ['34%', ...b.cols.map((c) => c.width === 'sm' || c.kind !== 'text' ? 'auto' : '*')], dontBreakRows: true, body: [hd, ...body] }, layout: { hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0', paddingTop: () => 4, paddingBottom: () => 4 }, fontSize: 9.5, margin: [0, 2, 0, 6] });
      }
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
  // Phông Roboto của pdfmake thiếu một số ký tự mũi tên: thay bằng ký tự tương đương
  const fixGlyphs = (n) => {
    if (typeof n === 'string') return n.replace(/→/g, '->').replace(/›/g, '>').replace(/←/g, '<-');
    if (Array.isArray(n)) return n.map(fixGlyphs);
    if (n && typeof n === 'object' && !(n.image)) { const o = {}; for (const k in n) o[k] = (k === 'text' || k === 'stack' || k === 'columns' || k === 'table' || k === 'body') ? fixGlyphs(n[k]) : n[k]; return o; }
    return n;
  };
  return {
    pageSize: 'A4', pageMargins: [40, 40, 40, 48], content: fixGlyphs(content),
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
    info: { title: `${tpl.short} – ${surveyTitle(tpl, ans)}`, author: meta.sales || 'Redsun' },
    footer: (page, pages) => ({ columns: [
      { text: internal ? 'Bản nội bộ' : 'Bản gửi khách hàng', fontSize: 8, color: '#94a3b8' },
      { text: `Trang ${page}/${pages}`, alignment: 'right', fontSize: 8, color: '#94a3b8' }
    ], margin: [40, 16, 40, 0] })
  };
}
