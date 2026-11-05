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

### Admin: cài đặt email khảo sát
Chỉ **Admin** thấy tab **⚙ Cài đặt** (Quản lý và Sales không thấy và không gọi được API cài đặt). Xem mục 7.

### Thêm mẫu phiếu mới
Mẫu phiếu khai báo trong `public/survey-lib.js` (mảng `TEMPLATES`): mỗi phiếu gồm các mục, mỗi mục gồm bảng câu hỏi, nhóm chọn nhiều (`checks`, có thể giới hạn `max`), chọn một (`radio`). Thêm phiếu mới chỉ cần thêm một phần tử vào mảng; màn hình điền, email và PDF tự hiển thị theo.

## 7. Admin: Cài đặt hệ thống (tab ⚙ Cài đặt)
Gồm 4 phần, bấm **Lưu cài đặt** ở cuối trang để lưu.

**1. Thông tin chung:** tên công ty (hiện trong email và PDF).

**2. Máy chủ gửi email (SMTP):** dùng chính một hộp thư công ty để gửi (khuyến nghị tạo riêng hộp thư `khaosat@redsun.vn`).
- Bấm **Gmail / Google Workspace**, **Microsoft 365** hoặc **Zoho** để điền sẵn máy chủ, cổng và kiểu bảo mật.
- Nhập **Tài khoản SMTP** (địa chỉ email), **Mật khẩu**, **Email người gửi** (nên trùng tài khoản) và **Tên người gửi**.
- Gmail / Google Workspace: bật **Xác minh 2 bước** cho tài khoản, rồi vào myaccount.google.com → **Bảo mật** → **Mật khẩu ứng dụng** → tạo mật khẩu 16 ký tự và dán vào ô Mật khẩu. Máy chủ `smtp.gmail.com`, cổng **465**, **SSL/TLS**.
- Microsoft 365: máy chủ `smtp.office365.com`, cổng **587**, **STARTTLS**; quản trị M365 cần bật **Authenticated SMTP** cho hộp thư này.
- Cloudflare chặn cổng 25, chỉ dùng **465 (SSL/TLS)** hoặc **587 (STARTTLS)**.
- Mật khẩu được mã hóa khi lưu và **không bao giờ hiển thị lại**. Ô mật khẩu để trống = giữ mật khẩu cũ.
- Bấm **Lưu & gửi thử** để gửi một email thử tới địa chỉ nhập bên cạnh. Nếu lỗi, hệ thống báo nguyên nhân bằng tiếng Việt (sai mật khẩu, sai cổng, máy chủ từ chối người gửi…).

**3. Email nhận phiếu khảo sát:**
- **To**: những người nhận chính (bắt buộc ít nhất 1 email).
- **CC**: bản copy, người nhận thấy danh sách này. **BCC**: bản copy ẩn, phù hợp để lưu trữ.
- **Tiền tố tiêu đề**, ví dụ `[Khảo sát]`.
- Tùy chọn **gửi kèm bản sao cho Sales lập phiếu** và **kèm mục H nội bộ** trong email.
- Người nhận bấm *Trả lời* sẽ trả lời thẳng cho Sales lập phiếu. Phiếu hoàn tất khi chưa cấu hình email vẫn được lưu; sau khi cấu hình xong, mở phiếu và bấm **Gửi lại email**.

**4. Bảo mật đăng nhập:** thời hạn phiên đăng nhập (ngày), số lần nhập sai trước khi tạm khóa, thời gian tạm khóa (phút).

*(Tùy chọn, tăng bảo mật)* Cloudflare → Workers & Pages → redsun-quy-che → Settings → Variables and Secrets → thêm **Secret** `SETTINGS_KEY` (chuỗi ngẫu nhiên dài) để mã hóa mật khẩu SMTP bằng khóa riêng. Sau khi thêm, vào Cài đặt nhập lại mật khẩu SMTP một lần.
