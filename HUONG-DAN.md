# Hướng dẫn sử dụng – sales-kpi.redsun.vn

## 1. Đăng nhập lần đầu
1. Mở `https://sales-kpi.redsun.vn`, nhập **email** và **mật khẩu tạm** được cấp.
2. Hệ thống yêu cầu **đặt mật khẩu riêng** (tối thiểu 8 ký tự) trước khi dùng.
3. Quên mật khẩu: liên hệ Admin để được **cấp lại mật khẩu tạm**.

## 2. Admin: tạo tài khoản nhân viên
**Cách 1 – Từng người:** tab **Nhân viên** → **＋ Thêm nhân viên** → nhập email, họ tên, chức danh, quyền, quản lý trực tiếp, lương W → **Tạo tài khoản** → bấm **Sao chép nội dung** và gửi riêng cho nhân viên.

**Cách 2 – Nhiều người từ file:** tab **Nhân viên** → **⇪ Nhập từ file CSV**. Các cột: `tai_khoan` (hoặc `email`), `ho_ten`, `chuc_danh`, `mat_khau` (có thì giữ nguyên, trống thì tạo mật khẩu tạm), `luong_w`, `quan_ly` (email quản lý trực tiếp). Dùng được luôn file `danh-sach-tai-khoan.csv` của công cụ cũ.

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

## 4. Nhân viên: xem KPI & ước tính thu nhập
- Tab **KPI của bạn**: chỉ tiêu tháng hiện tại và cả năm.
- Bấm **Ước tính thu nhập với KPI này** → bảng tính tự điền hệ số X, target; nhập doanh số thực tế để xem thu nhập dự kiến.
- Trong bảng tính có thể tự sửa **Hệ số X** và **Target cá nhân** để thử các kịch bản (không ảnh hưởng KPI đã giao).
