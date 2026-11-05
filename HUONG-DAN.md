# Hướng dẫn sử dụng – sales-kpi.redsun.vn

## 1. Đăng nhập lần đầu
1. Mở `https://sales-kpi.redsun.vn`, nhập **email** và **mật khẩu tạm** được cấp.
2. Hệ thống yêu cầu **đặt mật khẩu riêng** (tối thiểu 8 ký tự) trước khi dùng.
3. Quên mật khẩu: liên hệ Admin để được **cấp lại mật khẩu tạm**.

## 2. Admin: tạo tài khoản nhân viên
**Cách 1 – Từng người:** tab **Nhân viên** → **＋ Thêm nhân viên** → nhập email, họ tên, chức danh, quyền, quản lý trực tiếp, **tổng lương W** và **tỷ lệ lương cơ bản (%)** (để trống = theo chức danh: quản lý 40%, nhân viên 50%) → form hiện ngay lương cơ bản S, lương hiệu suất H và target mặc định → **Tạo tài khoản** → bấm **Sao chép nội dung** và gửi riêng cho nhân viên.

**Cách 2 – Nhiều người từ file:** tab **Nhân viên** → **⇪ Nhập từ file CSV**. Các cột: `tai_khoan` (hoặc `email`), `ho_ten`, `chuc_danh`, `mat_khau` (có thì giữ nguyên, trống thì tạo mật khẩu tạm), `luong_w`, `ty_le_cb` (% lương cơ bản, vd 40), `quan_ly` (email quản lý trực tiếp). Dùng được luôn file `danh-sach-tai-khoan.csv` của công cụ cũ.

Sau khi nhập: kiểm tra và bổ sung **lương W**, **quản lý trực tiếp** cho từng người (nút **Sửa**). Lương W và quản lý trực tiếp quyết định target và phạm vi quản lý.

**Khóa tài khoản** (nghỉ việc): **Sửa** → Trạng thái **Khóa tài khoản**. Người đó bị đăng xuất ngay.

## 3. Admin/Quản lý: giao KPI
Tab **Giao KPI**:
1. Chọn nhân viên (tìm theo tên, lọc theo chức danh, chọn nhiều người).
2. Chọn năm và tháng (có nút nhanh: Cả năm, Quý 1–4, Tháng này).
3. Chỉ tiêu: để trống thì hệ thống tự tính (X theo chức danh, target = H × X theo lương W). Có thể nhập X hoặc target cụ thể.
4. **Target đội** (CCO/SM/Team Lead): tự cộng target đơn vị của cấp dưới trực tiếp × hệ số (mặc định 1,0), hoặc nhập tay.
5. **Xem trước** → **Giao KPI**. Tháng đã có KPI sẽ được hỏi trước khi ghi đè.

> Thứ tự nên làm: giao cho **nhân viên** trước → **Team Lead** → **Trưởng phòng** → **Giám đốc KD**, để target đội cộng đúng số mới nhất.

## 4. Bảng tính thu nhập
- **Nhân viên khối kinh doanh**: bảng tính tự mở đúng **bảng lương của mình** (chức danh, lương W, tỷ lệ CB/HS theo hồ sơ) và áp KPI tháng hiện tại. Chỉ cần nhập doanh số thực tế.
- **Quản lý**: ô **Bảng tính lương của** cho phép chọn chính mình hoặc **nhân viên dưới quyền** để xem bảng tính của họ; ô **Áp dụng KPI tháng** chọn tháng cần xem.
- **Admin**: chọn được mọi nhân viên, hoặc **Mô phỏng tự do** để thử kịch bản với chức danh/lương bất kỳ.
- Doanh số nhập vào bảng tính chỉ để ước tính, không được lưu.

## 5. Nhân viên: xem KPI & ước tính thu nhập
- Tab **KPI của bạn**: chỉ tiêu tháng hiện tại và cả năm.
- Bấm **Ước tính thu nhập với KPI này** → bảng tính tự điền hệ số X, target; nhập doanh số thực tế để xem thu nhập dự kiến.
- Trong bảng tính có thể tự sửa **Hệ số X** và **Target cá nhân** để thử các kịch bản (không ảnh hưởng KPI đã giao).

## 6. Phiếu khảo sát dự án
Tab **Phiếu khảo sát**:
1. Chọn mẫu phiếu (hiện có: **Phiếu khảo sát nhu cầu Website Doanh nghiệp**) → **Bắt đầu điền phiếu**. Ngày khảo sát và Sales phụ trách được điền sẵn.
2. Điền các mục A–H. Phiếu **tự lưu nháp** sau vài giây; có thể quay lại danh sách và **Tiếp tục điền** sau.
3. **Hoàn tất & gửi**: phiếu được lưu, hiển thị kết quả trên màn hình và **gửi email** tới danh sách nhận đã cài đặt (kèm bản sao cho Sales nếu bật). Người nhận bấm Trả lời sẽ trả lời thẳng cho Sales.
4. Ở màn hình kết quả: **⬇ PDF gửi khách** (ẩn mục H nội bộ) hoặc **⬇ PDF nội bộ** (đủ mục H); **Gửi lại email**; **Sửa phiếu**.

Quyền xem: Sales xem phiếu của mình; Quản lý xem phiếu của mình và nhân viên dưới quyền; Admin xem tất cả. Chỉ người lập (hoặc Admin) được sửa; Sales chỉ xóa được phiếu nháp.

### Admin: cài đặt email
**a) Email nhận phiếu:** tab **Phiếu khảo sát** → khung **Cài đặt email nhận phiếu** → nhập các email (cách nhau bởi dấu phẩy) → **Lưu cài đặt**.

**b) Dịch vụ gửi email (làm 1 lần)** – khuyến nghị **Resend**, không ảnh hưởng hộp thư công ty đang dùng:
1. Tạo tài khoản tại resend.com → **Domains → Add domain** → nhập tên miền phụ, ví dụ `mail.redsun.vn` → thêm các bản ghi DNS Resend yêu cầu vào DNS của redsun.vn trên Cloudflare → chờ **Verified**.
2. **API Keys → Create API key** (quyền Sending) → sao chép khóa.
3. Cloudflare Dashboard → **Workers & Pages → redsun-quy-che → Settings → Variables and Secrets**:
   - `RESEND_API_KEY` – loại **Secret** – dán khóa vừa tạo
   - `MAIL_FROM` – loại **Text** – ví dụ `Redsun Khảo sát <khaosat@mail.redsun.vn>` (đuôi email phải là tên miền đã xác minh)
4. Mở lại tab Phiếu khảo sát: dòng "Dịch vụ gửi" hiện **Resend**. Các phiếu đã hoàn tất trước đó bấm **Gửi lại email** để gửi.

Phương án khác: dịch vụ email của Cloudflare (binding `send_email` tên `EMAIL` + biến `MAIL_FROM`). Lưu ý gói miễn phí chỉ gửi tới địa chỉ đã xác minh trong Email Routing, và bật Email Routing sẽ thay bản ghi MX của tên miền.

### Thêm mẫu phiếu mới
Mẫu phiếu khai báo trong `public/survey-lib.js` (mảng `TEMPLATES`): mỗi phiếu gồm các mục, mỗi mục gồm bảng câu hỏi, nhóm chọn nhiều (`checks`, có thể giới hạn `max`), chọn một (`radio`). Thêm phiếu mới chỉ cần thêm một phần tử vào mảng; màn hình điền, email và PDF tự hiển thị theo.
