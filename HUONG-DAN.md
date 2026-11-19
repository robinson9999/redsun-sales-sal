# Hướng dẫn sử dụng – Hệ thống KPI & Đào tạo (sales-kpi.redsun.vn)

## 1. Đăng nhập lần đầu
1. Mở `https://sales-kpi.redsun.vn`, nhập **email** và **mật khẩu tạm** được cấp.
2. Hệ thống yêu cầu **đặt mật khẩu riêng** (tối thiểu 8 ký tự) trước khi dùng.
3. Quên mật khẩu: liên hệ Admin để được **cấp lại mật khẩu tạm**.

## 2. Admin: công thức lương thưởng KPI, phòng ban & chức danh
Tab **Nhân viên** → **🧮 Công thức lương** (hoặc **🏢 Phòng ban & chức danh**). Hộp thoại có 2 tab.

**Công thức** – tạo từ 3 mẫu, sửa được mọi tham số chung:
- **Lương 3P theo doanh số** (khối Kinh doanh): bậc thưởng doanh số cá nhân C₁, bậc hoa hồng CTV, target đội minh họa. Công thức gốc *Lương 3P – Khối Kinh doanh* là Quy chế hiện hành (sửa được, không xóa được); sửa ở đây thì Quy chế, Bảng tính, KPI cập nhật theo.
- **Lương 3P theo điểm KPI** (văn phòng, kỹ thuật, CSKH…): danh sách tiêu chí KPI + trọng số (tổng 100%), trần % mỗi tiêu chí, điểm sàn, trần lương hiệu suất, bậc thưởng hiệu suất theo điểm (% × W). Có ô **Thử tính**.
- **Lương cố định + phụ cấp**: không có tham số chung.

Có thể **Nhân bản** một công thức để làm biến thể cho phòng khác. Chỉ xóa được công thức không còn phòng nào dùng.

**Phòng ban** – mỗi phòng chọn một công thức. Phòng đang có nhân viên chỉ đổi được sang công thức cùng mẫu (riêng phòng *Chưa có công thức* thì gán được mọi công thức). Phòng dùng công thức gốc có sẵn 7 chức danh kinh doanh.

**Chức danh** – bấm **＋ Thêm chức danh** trong phòng: tham số được **điền sẵn theo mẫu** công thức của phòng, sửa lại tùy ý:
- Theo doanh số: loại (Nhân viên KD / Quản lý KD / CTV), khung lương W, % lương cơ bản, hệ số KPI X, hệ số tăng dần cho người mới; quản lý thêm trọng số cá nhân, ngưỡng và mức thưởng quản lý C₂ (khi đạt 100% và 120%).
- Theo điểm KPI: loại (Nhân viên / Quản lý), khung lương W, % lương cơ bản, phụ cấp cố định.
- Cố định: khung lương W, phụ cấp.

**✎ Sửa** chức danh để đổi tên VN/EN, tham số, thứ tự, ngừng sử dụng, chuyển phòng (khi chưa có ai giữ). 7 chức danh gốc có nút **Khôi phục tên & tham số gốc**.

Nhân viên phòng *theo điểm KPI* xem tiêu chí và tự ước tính thu nhập ở tab **KPI của bạn**. Giao KPI doanh số (tab Giao KPI) áp dụng cho chức danh theo doanh số.

Chỉ xóa được phòng ban/chức danh khi không còn nhân viên nào gán vào. Phòng **Ngừng sử dụng** sẽ ẩn khỏi danh sách chọn khi thêm nhân viên.

## 1b. Quy chế: đọc, soạn thảo, ban hành (tab Quy chế)
Mọi người đọc **bản đang ban hành** (ghi số phiên bản, ngày ban hành). Người có quyền mục *Quy chế lương thưởng* (tab 🔐 Phân quyền) thấy thêm các nút:
- **✎ Soạn bản mới / Soạn tiếp bản nháp** (quyền Sửa): sửa tiêu đề, lời mở đầu, từng mục (thêm, xóa, đổi thứ tự). Thanh công cụ: đậm/nghiêng, tiêu đề nhỏ, danh sách, ô Ghi chú/Mẹo/Cảnh báo, công thức, liên kết, bảng, hỏi đáp.
  - **📊 Chèn bảng số liệu tự động**: khung lương, thưởng doanh số, ví dụ thu nhập, thưởng quản lý, hoa hồng CTV… Số liệu lấy từ *Công thức lương* nên luôn khớp Bảng tính, HR không phải gõ số.
  - **🔤 Tham số**: ngày giao target, ngày chốt, ngày chi trả, đầu mối… sửa một lần ở tab Tham số, mọi chỗ trong văn bản tự cập nhật.
  - **👁 Xem trước**, **💾 Lưu nháp**. Nhân viên chưa thấy bản nháp.
- **Ban hành…** (quyền Thêm): bản nháp thành phiên bản chính thức (tự đánh số 1.1, 1.2…), mọi người thấy ngay.
- **🕘 Lịch sử phiên bản**: xem lại mọi bản đã ban hành, **Lấy làm bản nháp** để khôi phục bản cũ. **Hủy nháp** (quyền Xóa).
- **＋ Quy chế mới**: tạo quy chế cho phòng ban khác.

Gợi ý: tạo nhóm quyền *Nhân sự (HR)* có Xem + Sửa mục Quy chế (soạn thảo), để quyền Thêm (ban hành) cho Ban Giám đốc.

## 2a. Phân quyền (tab 🔐 Phân quyền)
Mỗi tài khoản thuộc một **nhóm quyền**. Nhóm quyền gồm:
- **Ma trận Xem / Thêm / Sửa / Xóa** cho từng mục: Quy chế, Bảng tính, KPI của bạn, Phiếu khảo sát, Proposal, Tài liệu nội bộ, Giao KPI, Nhân viên, Phòng ban – chức danh – công thức, Phân quyền, Cài đặt. Bên dưới tên mỗi mục ghi rõ từng quyền cho phép làm gì (vd Nhân viên: Xóa = khóa tài khoản). Có Thêm/Sửa/Xóa thì tự có Xem. Tab chỉ hiện với người có quyền Xem.
- **Phạm vi dữ liệu**: Toàn công ty / Bản thân & cấp dưới (theo cây quản lý trực tiếp) / Chỉ bản thân – áp dụng cho nhân viên, KPI, phiếu khảo sát, proposal.

3 nhóm gốc giữ đúng quyền cũ: **Admin** (toàn quyền, không sửa được), **Quản lý**, **Nhân viên** (sửa được ma trận). Tạo nhóm mới bằng **＋ Tạo nhóm** hoặc **Nhân bản nhóm**. Chỉ xóa được nhóm tự tạo khi không còn tài khoản nào.

Gán nhóm cho từng người: tab **Nhân viên** → **Sửa** → **Nhóm quyền** (cần quyền Sửa mục Phân quyền). Chỉ tài khoản nhóm Admin được tạo/sửa tài khoản Admin; không ai tự khóa hoặc tự đổi nhóm của chính mình.

## 2b. Admin: tạo tài khoản nhân viên
**Cách 1 – Từng người:** tab **Nhân viên** → **＋ Thêm nhân viên** → nhập email, họ tên, chọn **Phòng ban** → chọn **Chức danh** của phòng (form hiện cách tính lương, thưởng, KPI theo công thức của phòng), quyền, quản lý trực tiếp, **tổng lương W** và **tỷ lệ lương cơ bản (%)** (để trống = theo tham số của chức danh) → form hiện ngay lương cơ bản S, lương hiệu suất H và target mặc định → **Tạo tài khoản** → bấm **Sao chép nội dung** và gửi riêng cho nhân viên.

**Cách 2 – Nhiều người từ file:** tab **Nhân viên** → **⇪ Nhập từ file CSV**. Các cột: `tai_khoan` (hoặc `email`), `ho_ten`, `phong_ban` (tên phòng; trống thì chức danh kinh doanh vào Phòng Kinh doanh), `chuc_danh` (phòng tự tạo chức danh: ghi đúng tên chức danh), `mat_khau` (có thì giữ nguyên, trống thì tạo mật khẩu tạm), `luong_w`, `ty_le_cb` (% lương cơ bản, vd 40), `quan_ly` (email quản lý trực tiếp). Dùng được luôn file `danh-sach-tai-khoan.csv` của công cụ cũ.

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
3. **Lưu & gửi email**: nút bị khóa và hiện thanh "Đang lưu & gửi email, vui lòng chờ…". Xong thì phiếu hiển thị kết quả kèm thông báo "Phiếu đã được lưu và đã gửi email đến [email người lập phiếu]". Email luôn gửi tới **người lập phiếu**; Admin có thể cài thêm CC/BCC nếu cần.
4. Ở màn hình kết quả: **⬇ PDF gửi khách** (ẩn mục H nội bộ) hoặc **⬇ PDF nội bộ** (đủ mục H); **Gửi lại email**; **Sửa phiếu**.

Quyền xem: Sales xem phiếu của mình; Quản lý xem phiếu của mình và nhân viên dưới quyền; Admin xem tất cả. Chỉ người lập (hoặc Admin) được sửa; Sales chỉ xóa được phiếu nháp.

### Admin: cài đặt email khảo sát
Chỉ **Admin** thấy tab **⚙ Cài đặt** (Quản lý và Sales không thấy và không gọi được API cài đặt). Xem mục 7.

### Các mẫu phiếu hiện có
- 🌐 **Website Doanh nghiệp** (mục A–H, H là nội bộ).
- 🛒 **Website Bán hàng** (mục A–J, J là nội bộ). Mục C có bảng kênh đang bán (Có/Không, số đơn/ngày, ghi chú); mục J có bảng tín hiệu chọn gói.
- 🤖 **Redsun AI CRM** (mục A–J, J là nội bộ). Hỏi điểm nghẽn, quy trình bán, kênh liên lạc, nhu cầu AI và module BOS; mục J có bảng tín hiệu chọn gói Starter / Business / Enterprise. CRM chỉ kết nối Zalo OA, không kết nối Zalo cá nhân.

### Thêm mẫu phiếu mới
Mẫu phiếu khai báo trong `public/survey-lib.js` (mảng `TEMPLATES`): mỗi phiếu gồm các mục, mỗi mục gồm bảng câu hỏi, nhóm chọn nhiều (`checks`, có thể giới hạn `max`), chọn một (`radio`), bảng nhiều cột (`grid`, cột kiểu Có/Không, đánh dấu hoặc chữ) và ghi chú (`note`, thêm `report: true` để hiện cả trong email/PDF). Thêm phiếu mới chỉ cần thêm một phần tử vào mảng; màn hình điền, email và PDF tự hiển thị theo.

## 6b. Proposal (tab Proposal)
Mọi nhân viên đều dùng được. Mỗi proposal có 3 nút:
- **▶ Trình chiếu**: mở bản nội bộ ở tab mới. Phím `N` hoặc nút **Ghi chú** bật/tắt ghi chú người thuyết trình (mặc định tắt); `←` `→` chuyển trang, `F` toàn màn hình. Có thể bấm vào tên khách ở bìa và các dòng chuyên viên ở slide cuối để sửa trước khi trình chiếu.
- **⬇ Xuất PDF**: nhập tên doanh nghiệp khách (hiện ở trang bìa) → **Tạo PDF**. PDF tạo ngay trên trình duyệt, **không có ghi chú**.
- **✉ Gửi khách hàng**: nhập doanh nghiệp, người nhận, email khách, lời nhắn và thời hạn đường dẫn (mặc định 30 ngày, bằng hiệu lực báo giá) → **Gửi proposal**. Khách nhận email có nút **Xem đề xuất**; trang khách mở là bản **không có ghi chú** (ghi chú không có trong mã trang), khách tự bấm **Tải PDF**. Người gửi luôn nhận bản CC, cùng các email ở mục "3. Email nhận bản copy" trong Cài đặt (CC và BCC); khách trả lời sẽ về email của người gửi. Bỏ chọn "Gửi email ngay" để chỉ tạo đường dẫn rồi gửi qua Zalo.

**Thông tin tự điền vào proposal**: trang bìa ghi "Kính gửi" + người nhận + doanh nghiệp khách; slide cuối lấy họ tên, chức danh, **số điện thoại** và **email liên hệ** từ hồ sơ nhân viên (Admin nhập ở tab Nhân viên; email liên hệ để trống thì dùng email đăng nhập) và thông tin công ty ở tab ⚙ Cài đặt (tên đầy đủ, tên viết tắt, địa chỉ, điện thoại, hotline, email, website).

**Mã QR gọi điện**: slide cuối (và ô "Quét mã QR đặt lịch" ở hai proposal website) tự tạo mã QR từ số điện thoại của chuyên viên; khách quét bằng điện thoại để gọi ngay. Hồ sơ chưa có số điện thoại thì mã QR dùng số tổng đài công ty.

**Email gửi proposal**: tên người gửi là "[Tên nhân viên] - [Tên viết tắt công ty]". Chữ ký gồm: Tên - Chức danh; Số điện thoại - Email nhân viên; Tên công ty đầy đủ; Địa chỉ; Email công ty - Website.

**Proposal đã gửi**: theo dõi trạng thái email, số lần khách mở đường dẫn (không tính khi nhân viên đang đăng nhập tự mở), sao chép link, gửi lại hoặc **Thu hồi** (khách mở sẽ thấy thông báo liên hệ chuyên viên). Nhân viên thấy của mình, Quản lý thấy cả cấp dưới, Admin thấy toàn bộ.

**Thêm proposal mới**: đặt bộ trình chiếu vào `public/proposal/<mã>/` gồm `index.html` (nội bộ, có ghi chú trong thẻ `<aside>`), `client.html` (gửi khách, không có `<aside>`) và `assets/`, dùng chung `public/proposal/_shared/` (trình chiếu, xuất PDF, font). Sau đó khai báo một dòng trong `public/proposal/catalog.js`.

### Proposal PDF tải lên (không cần lập trình)
Dùng khi có proposal mới thiết kế bằng PowerPoint / Canva / Word.
1. Thiết kế proposal, **chừa chỗ trống** ở chỗ cần điền (vd "Kính gửi: ______", tên tư vấn viên ở trang cuối), xuất ra **PDF** (tối đa 25 MB).
2. Tab Proposal → **＋ Tải lên proposal PDF**: nhập tiêu đề, ngôn ngữ, tiêu đề email, chọn file → **Tải lên & đặt ô**.
3. Trình đặt ô mở ra: bấm thông tin ở cột phải (Tên doanh nghiệp KH, Người nhận, Tên/SĐT/Email nhân viên, Ngày gửi, Hiệu lực…) để thêm ô, **kéo ô vào chỗ trống**, kéo góc dưới phải để đổi kích thước; chỉnh cỡ chữ, độ đậm, màu, căn lề. Ô có thể kèm chữ cố định, vd `Kính gửi: {nguoi}`; tick "Lặp lại ở mọi trang" cho chân trang. Chữ dài tự thu nhỏ cho vừa ô. Bấm **Lưu**.
4. Xem thử bằng **▶ Trình chiếu / ⬇ Xuất PDF**, rồi **⚙ Sửa → Hiển thị cho nhân viên**. Từ đó nhân viên gửi như proposal thường; khách xem trên web, trình chiếu và tải PDF đã điền sẵn thông tin.
- Thay file (cùng bố cục) ở **⚙ Sửa**: các ô giữ nguyên. Xóa proposal: đường dẫn đã gửi còn hiệu lực vẫn mở được đến khi hết hạn.
- Quyền: mục **"Mẫu proposal PDF (tải lên)"** trong tab Phân quyền (Thêm = tải lên, Sửa = đặt ô/sửa/ẩn hiện, Xóa). Mặc định chỉ nhóm Admin.
- Các proposal có sẵn (AI CRM, Web Bán Hàng, Web Doanh Nghiệp) không thay đổi.

## 6c. Tài liệu nội bộ (tab Tài liệu nội bộ)
Mọi nhân viên đều đọc được; chỉ **Admin** đăng, sửa, xóa tài liệu.
- **Đăng tài liệu** (Admin): bấm **＋ Đăng tài liệu**, nhập tên, nhóm tài liệu (chọn nhóm có sẵn trong danh sách, hoặc chọn "＋ Thêm nhóm mới…" rồi nhập tên nhóm), mô tả và chọn file **PDF** (tối đa 25 MB). Bấm **Sửa** để đổi thông tin hoặc thay file; ngày sửa và người sửa được ghi lại.
- **Đọc tài liệu**: tài liệu mở ngay trong tool, không có nút tải về hay in; mỗi trang có dấu chìm họ tên, email và thời điểm xem của người đang đọc; chuột phải, Ctrl/Cmd + S, P, C bị chặn. Lưu ý: không công cụ nào chặn được tuyệt đối việc chụp màn hình — dấu chìm giúp truy được người làm lộ.
- **Lượt xem**: mỗi lần mở tài liệu tính một lượt (mở lại trong 10 phút không tính thêm). Mọi người thấy tổng lượt xem; Admin bấm **Lượt xem** để biết ai đã xem, bao nhiêu lần, lần đầu và lần gần nhất. Tài liệu chưa mở hiện nhãn **CHƯA ĐỌC**.
- Tìm theo tên, mô tả; lọc theo nhóm.

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

**3. Email phiếu khảo sát:**
- Phiếu luôn được gửi tới **email của người lập phiếu**, không cần cài người nhận.
- **CC / BCC (tùy chọn)**: thêm người nhận bản copy, ví dụ trưởng phòng (CC) hoặc hộp thư lưu trữ (BCC). Để trống nếu không cần.
- **Tiền tố tiêu đề**, ví dụ `[Khảo sát]`; tùy chọn **kèm mục nội bộ** (Sales đánh giá) trong email.
- Phiếu hoàn tất khi chưa cấu hình SMTP vẫn được lưu; sau khi cấu hình xong, mở phiếu và bấm **Gửi lại email**.

**4. Bảo mật đăng nhập:**
- **Tự đăng xuất khi không thao tác (phút)**: người dùng không bấm, gõ, cuộn hay rê chuột quá số phút này thì phiên hết hạn. Trước 1 phút sẽ có cảnh báo; chỉ cần thao tác là tiếp tục. Nhập 0 để tắt; tối thiểu 2 phút. Áp dụng ngay, kể cả với người đang đăng nhập.
- **Thời hạn tối đa của phiên (ngày)**: dù vẫn thao tác, sau số ngày này phải đăng nhập lại.
- Số lần nhập sai trước khi tạm khóa, thời gian tạm khóa (phút).
- **Gửi email thông báo mỗi lần đăng nhập** tới email chủ tài khoản (thời gian, IP, vị trí ước tính, thiết bị), kèm tùy chọn gửi thêm **1 bản BCC** tới một email (ví dụ hộp thư bảo mật). Cần cấu hình SMTP (mục 2) trước.
- **Tiêu đề email thông báo**: để trống thì dùng mặc định "Thông báo đăng nhập tài khoản {email} của {ten_mien}". Có thể chèn `{email}`, `{ten}`, `{ten_mien}`, `{thoi_gian}`.

*(Tùy chọn, tăng bảo mật)* Cloudflare → Workers & Pages → redsun-quy-che → Settings → Variables and Secrets → thêm **Secret** `SETTINGS_KEY` (chuỗi ngẫu nhiên dài) để mã hóa mật khẩu SMTP bằng khóa riêng. Sau khi thêm, vào Cài đặt nhập lại mật khẩu SMTP một lần.
