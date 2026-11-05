# REDSUN – Quy chế Lương, Thưởng & KPI Khối Kinh Doanh

Ứng dụng nội bộ chạy trên **Cloudflare Workers + D1** tại `sales-kpi.redsun.vn`:

- **Quy chế**: tài liệu lương thưởng 12 mục.
- **Bảng tính thu nhập**: ước tính thu nhập; sửa được hệ số X và target cá nhân; áp trực tiếp KPI được giao.
- **KPI của bạn**: chỉ tiêu được giao theo từng tháng.
- **Giao KPI** (Admin/Quản lý): chọn nhân viên, chọn tháng/năm, giao target; target đội tự cộng từ cấp dưới.
- **Nhân viên**: Admin xem & quản lý toàn bộ; Quản lý chỉ xem cấp dưới của mình (mọi tầng).
- **Phiếu khảo sát dự án**: Sales chọn phiếu, điền cùng khách, hoàn tất → lưu, gửi email tới danh sách cài sẵn, xuất PDF (bản gửi khách / bản nội bộ).
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
