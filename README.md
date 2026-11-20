# REDSUN – Hệ thống KPI & Đào tạo

Ứng dụng nội bộ chạy trên **Cloudflare Workers + D1** tại `sales-kpi.redsun.vn`:

- **Quy chế**: tài liệu lương thưởng 12 mục.
- **Bảng tính thu nhập**: ước tính thu nhập; sửa được hệ số X và target cá nhân; áp trực tiếp KPI được giao.
- **KPI của bạn**: chỉ tiêu được giao theo từng tháng.
- **Giao KPI** (Admin/Quản lý): chọn nhân viên, chọn tháng/năm, giao target; target đội tự cộng từ cấp dưới.
- **Nhân viên**: Admin xem & quản lý toàn bộ; Quản lý chỉ xem cấp dưới của mình (mọi tầng).
- **Phiếu khảo sát dự án**: Sales chọn phiếu, điền cùng khách, hoàn tất → lưu, gửi email tới danh sách cài sẵn, xuất PDF (bản gửi khách / bản nội bộ).
- **Proposal**: danh sách proposal (hiện có Redsun AI CRM); trình chiếu có ghi chú bật/tắt, xuất PDF không ghi chú, gửi khách qua email bằng đường dẫn `/p/<mã>/` (bản không ghi chú, có hạn dùng, thu hồi được, đếm lượt xem).
- **Tài liệu nội bộ**: Admin đăng PDF theo nhóm kèm mô tả; nhân viên chỉ đọc trong tool (pdf.js vẽ lên canvas, dấu chìm tên người xem, không có nút tải/in); ghi lại từng lượt xem. File lưu trong D1 thành các khúc 1 MB (bảng `doc_chunks`).
- **Cài đặt hệ thống** (chỉ Admin): máy chủ SMTP gửi email (gửi thử), email nhận phiếu To/CC/BCC, bảo mật đăng nhập. Gửi qua thư viện `worker-mailer` (cổng 465/587; Cloudflare chặn cổng 25).

> Repo private. Không commit mật khẩu, danh sách tài khoản thật (đã chặn trong `.gitignore`).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `worker/index.js` | Máy chủ: đăng nhập, phiên, phân quyền, API nhân viên & KPI, tạo bảng D1 tự động. |
| `public/index.html` | Giao diện chính: quy chế + bảng tính (tham số trong `CONFIG`, `ROLES`). |
| `public/app.js` | Giao diện: KPI của bạn, Giao KPI, Nhân viên, đổi mật khẩu. |
| `public/survey-lib.js` | Mẫu phiếu khảo sát + hiển thị kết quả, email, PDF (dùng chung trình duyệt & máy chủ). |
| `public/vendor/` | pdfmake (tạo PDF trên trình duyệt). |
| `public/proposal/` | Proposal: `catalog.js` (danh mục), `<mã>/index.html` (nội bộ, có ghi chú), `<mã>/client.html` (gửi khách), `_shared/` (trình chiếu, xuất PDF bằng html-to-image + jsPDF, font Be Vietnam Pro). Trang `/p/<mã>/` là trang công khai duy nhất ngoài `/login`, chỉ phục vụ `client.html`. |
| `public/login.html` | Trang đăng nhập (trang duy nhất xem được khi chưa đăng nhập). |
| `public/app.css` | CSS biên dịch từ Tailwind (`npm run css` sau khi đổi giao diện). |
| `wrangler.jsonc` | Cấu hình Worker + D1 (`redsun-quy-che-db`, Cloudflare tự tạo ở lần deploy đầu). |
| `docs/phan-tich-so-sanh-phuong-an.html` | Công cụ phân tích nội bộ, không phục vụ trên web. |

## Phân quyền

| Quyền | Xem | Làm |
|---|---|---|
| **Admin** | Toàn bộ nhân viên & KPI | Thêm/sửa/khóa nhân viên, cấp lại mật khẩu, nhập CSV, giao KPI cho mọi người |
| **Quản lý** | Cấp dưới (trực tiếp và gián tiếp) & KPI của họ | Giao KPI cho cấp dưới (không tự giao cho mình) |
| **Nhân viên** | KPI của chính mình | Dùng bảng tính, đổi mật khẩu |

Tài khoản Admin đầu tiên: `sondo@redsun.vn` (mật khẩu tạm được gửi riêng, bắt buộc đổi ở lần đăng nhập đầu).

## Triển khai

Cloudflare Workers Builds tự deploy mỗi khi đẩy lên nhánh `main`. Lần đầu, D1 được tạo tự động và bảng dữ liệu được tạo khi có truy cập đầu tiên.

## Chạy thử trên máy

```bash
npm install
npx wrangler dev        # http://localhost:8787 (D1 cục bộ trong .wrangler/)
# Tạo file .dev.vars với dòng MAIL_MODE=log để email chỉ ghi log (không gửi thật)
npm run css             # biên dịch lại CSS khi sửa giao diện
```

## Ghi chú kỹ thuật
- Cấu trúc dữ liệu: khi thêm bảng / cột / dữ liệu gốc trong `migrateSchema` (worker/index.js), **đổi chuỗi `SCHEMA_V`** để máy chủ chạy lại bước nâng cấp; nếu không đổi, máy chủ chỉ kiểm tra phiên bản (1 truy vấn) cho nhanh.
- File tĩnh cho trang gửi khách (`/proposal/_shared/*`, `/vendor/pdfjs/*`, `/proposal/<id>/assets/*`) được Cloudflare phục vụ thẳng, không qua đăng nhập (xem `run_worker_first` trong wrangler.jsonc) – không đặt nội dung nội bộ ở các thư mục này.
- File PDF của proposal tải lên lưu ở R2 (binding `FILES`).
