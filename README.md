# REDSUN – Quy chế Lương, Thưởng & KPI Khối Kinh Doanh

Tài liệu quy chế lương thưởng và bảng tính thu nhập cho Khối Kinh Doanh, kèm công cụ phát hành bản **có đăng nhập** (nội dung được mã hóa, chỉ người có tài khoản và mật khẩu mới xem được).

> Repo nội bộ, để chế độ **private**. Không commit danh sách tài khoản thật hoặc file mật khẩu (đã chặn trong `.gitignore`).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `quy-che.html` | Trang quy chế + bảng tính, bản gốc chưa mã hóa. Sửa nội dung, tham số tại đây (khối `CONFIG` và `ROLES` trong phần script). |
| `build-secure.js` | Công cụ tạo bản phát hành có đăng nhập (Node.js 18+, không cần cài thư viện). |
| `login-template.html` | Giao diện trang đăng nhập. |
| `tai-khoan-mau.csv` | Mẫu danh sách tài khoản. |
| `HUONG-DAN.md` | Hướng dẫn chi tiết cho HR: tạo tài khoản, phát hành, thêm/xóa người, đổi mật khẩu. |
| `docs/phan-tich-so-sanh-phuong-an.html` | Công cụ phân tích nội bộ: so sánh phương án hiện hành và đề xuất. Không phát hành cho nhân sự. |

## Phát hành nhanh

```bash
cp tai-khoan-mau.csv tai-khoan.csv      # điền danh sách nhân sự thật (file này không bị commit)
node build-secure.js --src quy-che.html --accounts tai-khoan.csv --out ban-phat-hanh
```

- `ban-phat-hanh/index.html`: đưa lên máy chủ nội bộ (ưu tiên https).
- `ban-phat-hanh/danh-sach-mat-khau.csv`: HR giữ và gửi riêng cho từng người.

Chi tiết xem [HUONG-DAN.md](HUONG-DAN.md).
