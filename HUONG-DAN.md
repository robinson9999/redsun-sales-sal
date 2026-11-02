# Hướng dẫn phát hành Quy chế Lương thưởng có đăng nhập

Bộ công cụ này tạo ra **một file `index.html` duy nhất**, gồm trang đăng nhập và nội dung quy chế đã được mã hóa. Chỉ người có đúng tài khoản và mật khẩu mới mở được nội dung. Người không có mật khẩu xem mã nguồn cũng chỉ thấy dữ liệu đã mã hóa.

## Thành phần

| File | Vai trò |
|---|---|
| `quy-che.html` | Trang quy chế gốc (chưa bảo mật). **Không đưa file này lên máy chủ.** |
| `tai-khoan-mau.csv` | Mẫu danh sách tài khoản. |
| `build-secure.js` | Công cụ tạo file phát hành. |
| `login-template.html` | Giao diện trang đăng nhập (công cụ tự dùng). |

## Yêu cầu

Máy tính cài **Node.js 18 trở lên** (tải tại nodejs.org). Không cần cài thêm thư viện, không cần Internet khi chạy.

## Các bước phát hành

**1. Lập danh sách tài khoản.** Mở `tai-khoan-mau.csv` bằng Excel, mỗi nhân sự một dòng:

| tai_khoan | ho_ten | chuc_danh | mat_khau |
|---|---|---|---|
| nguyenvana | Nguyễn Văn A | Trưởng phòng kinh doanh | *(để trống)* |

- `tai_khoan`: không phân biệt hoa thường, nên dùng mã nhân viên hoặc phần trước @ của email công ty.
- `mat_khau`: **để trống** thì công cụ tự tạo mật khẩu mặc định ngẫu nhiên, dạng `Ab3d-Ef5g`. Nếu tự đặt, dùng tối thiểu 8 ký tự.
- Lưu lại dưới dạng **CSV UTF-8**.

**2. Chạy công cụ** trong thư mục chứa bộ công cụ:

```
node build-secure.js --src quy-che.html --accounts tai-khoan-mau.csv --out ban-phat-hanh
```

**3. Nhận kết quả** trong thư mục `ban-phat-hanh`:

- `index.html`: file đưa lên máy chủ nội bộ, website hoặc ổ chia sẻ.
- `danh-sach-mat-khau.csv`: tài khoản và mật khẩu mặc định. **HR giữ file này và gửi riêng cho từng người** (email cá nhân, Zalo riêng). Không đưa lên máy chủ, không gửi vào nhóm chung.

**4. Đưa `index.html` lên máy chủ**, ưu tiên địa chỉ **https**. Trang cũng mở được trực tiếp từ máy tính bằng Chrome hoặc Edge.

## Các tình huống thường gặp

| Tình huống | Cách làm |
|---|---|
| Thêm nhân sự mới | Thêm dòng vào CSV, chạy lại bước 2, thay `index.html` trên máy chủ. Người cũ vẫn giữ mật khẩu nếu cột `mat_khau` đã điền sẵn. |
| Nhân sự nghỉ việc | Xóa dòng của người đó, chạy lại bước 2, thay `index.html`. Mỗi lần chạy, khóa mã hóa được tạo mới, nên mật khẩu cũ không mở được file mới. |
| Quên mật khẩu, đổi mật khẩu | HR đặt mật khẩu mới vào cột `mat_khau` của người đó, chạy lại bước 2, thay `index.html`. |
| Cập nhật nội dung quy chế | Sửa `quy-che.html`, chạy lại bước 2, thay `index.html`. |

> **Mẹo:** sau lần phát hành đầu, hãy chép mật khẩu từ `danh-sach-mat-khau.csv` vào cột `mat_khau` của file tài khoản gốc. Như vậy các lần chạy sau, mọi người giữ nguyên mật khẩu, chỉ người mới được cấp mật khẩu mới.

## Giới hạn cần biết

- **Nhân sự không tự đổi mật khẩu được**, vì đây là file tĩnh, không có máy chủ lưu dữ liệu. Mọi thay đổi do HR thực hiện bằng cách chạy lại công cụ.
- **Người đã được cấp quyền và từng tải file về máy** vẫn mở được bản cũ bằng mật khẩu cũ. Khi nhân sự nghỉ việc, họ không mở được bản mới, nhưng bản họ đã tải thì vẫn còn đọc được.
- Phiên đăng nhập chỉ giữ trong tab đang mở. Đóng tab hoặc bấm **Đăng xuất** thì phải đăng nhập lại.
- Mật khẩu mặc định do công cụ tạo đủ mạnh để chống dò mật khẩu. Nếu HR tự đặt mật khẩu, tránh dạng dễ đoán như `123456` hay ngày sinh.

## Nếu cần bảo mật cao hơn

Nếu cần nhân sự tự đổi mật khẩu, khóa tài khoản ngay lập tức, hoặc ghi nhật ký ai đã xem, cần đặt trang sau một lớp đăng nhập phía máy chủ. Ví dụ: đăng nhập Google Workspace hoặc Microsoft 365 của công ty, hoặc Cloudflare Access (gửi mã đăng nhập qua email công ty). Khi đó vẫn dùng `quy-che.html` làm nội dung.
