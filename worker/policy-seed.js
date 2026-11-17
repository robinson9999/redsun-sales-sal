/* Nội dung khởi tạo của Quy chế Lương, Thưởng & KPI khối Kinh doanh.
   - SEED_CURRENT: bản hiện hành (chuyển nguyên văn từ tài liệu cũ) → ban hành sẵn là Phiên bản 1.0.
   - SEED_PROPOSED: bản viết lại dễ hiểu cho nhân viên → nạp làm BẢN NHÁP chờ duyệt, không tự ban hành.
   Khối <div data-block="..."> do giao diện tự điền số liệu từ công thức lương; <span data-cfg="..."> là tham số. */

const cfg = (k) => `<span data-cfg="${k}"></span>`;
const block = (k) => `<div data-block="${k}"></div>`;

export const SEED_CURRENT = {
  title: 'Quy Chế Lương, Thưởng & Giao KPI Khối Kinh Doanh',
  intro: `<p>Tài liệu này giải thích <b>bạn được trả lương như thế nào</b>, <b>KPI được giao ra sao</b>, và <b>cần điều kiện gì để nhận thưởng</b>. Mọi con số trong tài liệu và trong Bảng tính thu nhập dùng chung một bộ tham số, nên luôn thống nhất với nhau.</p>`,
  sections: [
    { id: 's1', title: 'Phạm vi & đối tượng áp dụng', html: `<p>Áp dụng cho toàn bộ nhân sự Khối Kinh Doanh, gồm 7 chức danh:</p>
<ul><li><b>Cấp quản lý:</b> Giám đốc kinh doanh (CCO), Trưởng phòng kinh doanh (SM), Trưởng nhóm kinh doanh (Team Lead).</li>
<li><b>Cấp nhân viên:</b> Chuyên viên kinh doanh (Senior), Nhân viên kinh doanh (Sales Exec), Tập sự kinh doanh (Fresher).</li>
<li><b>Cộng tác viên (CTV):</b> làm việc theo hợp đồng cộng tác, hưởng hoa hồng thuần, áp dụng chính sách riêng tại Mục 8.</li></ul>
<p>Những nội dung không quy định trong tài liệu này thực hiện theo Hợp đồng lao động, Nội quy lao động và Quy chế tài chính của Công ty.</p>` },
    { id: 's2', title: 'Cấu trúc thu nhập hàng tháng', html: `<p>Thu nhập của nhân sự chính thức gồm tối đa 4 khoản:</p>
<div class="formula">N = S + B + C₁ + C₂</div>
<div class="boxes"><div class="box"><b>S – Lương cơ bản</b><p>Khoản cố định, trả theo ngày công thực tế. Chiếm 40% tổng lương thỏa thuận (W) với cấp quản lý và 50% với cấp nhân viên.</p></div>
<div class="box blue"><b>B – Lương hiệu suất</b><p>Phần còn lại của W (60% hoặc 50%), gọi là H. Nhận theo % hoàn thành KPI, tối đa 100% H.</p></div>
<div class="box green"><b>C₁ – Thưởng doanh số cá nhân</b><p>Tính lũy tiến từng phần trên doanh số do chính bạn mang về. Áp dụng cho mọi chức danh.</p></div>
<div class="box amber"><b>C₂ – Thưởng quản lý</b><p>Chỉ áp dụng cho CCO, SM, Team Lead. Tính theo kết quả của đơn vị, trả trên doanh số của đội.</p></div></div>
<p>Tổng lương thỏa thuận <b>W</b> được ghi trong hợp đồng/quyết định lương và luôn nằm trong khung lương của chức danh (Mục 3).</p>` },
    { id: 's3', title: 'Khung lương & định mức KPI theo chức danh', html: `<p>Target cá nhân hàng tháng được xác định bằng công thức <b>K_cn = H × X</b>, trong đó H là lương hiệu suất tối đa và X là hệ số KPI của chức danh.</p>
${block('khung_luong')}${block('lo_trinh_tap_su')}` },
    { id: 's4', title: 'Cách thức giao và nhận KPI/Target', html: `<h3>4.1. Quy trình hàng tháng</h3>
<ol><li><b>Giao target:</b> chậm nhất ngày ${cfg('ngayGiaoTarget')} hàng tháng, quản lý trực tiếp giao target cá nhân (K_cn) cho từng nhân sự trên hệ thống CRM/HRM. Target bằng định mức tại Mục 3, tính theo W thực tế của từng người.</li>
<li><b>Xác nhận:</b> nhân sự xác nhận target trong vòng ${cfg('ngayXacNhan')} ngày làm việc. Quá thời hạn mà không có phản hồi thì target được coi là đã được chấp nhận.</li>
<li><b>Theo dõi:</b> doanh số được cập nhật trên CRM. Nhân sự và quản lý cùng theo dõi % hoàn thành trong tháng.</li>
<li><b>Chốt kết quả:</b> doanh số tính lương được chốt vào ${cfg('ngayChotDS')} (xem Mục 10).</li></ol>
<h3>4.2. Target của đội và của đơn vị (dành cho quản lý)</h3>
<ul><li><b>Target đội (K_đội)</b> bằng tổng target cá nhân của các thành viên trực thuộc × hệ số từ 1,0 đến 1,1, không gồm target cá nhân của quản lý. Với SM, đội gồm các nhóm trực thuộc; với CCO, đội gồm các phòng trực thuộc.</li>
<li><b>Target đơn vị</b> = target cá nhân của quản lý + target đội.</li></ul>
<h3>4.3. Trường hợp đặc biệt</h3>
<ul><li><b>Vào làm hoặc nghỉ việc giữa tháng:</b> target, lương cơ bản S và lương hiệu suất H được tính theo tỷ lệ ngày công thực tế / ngày công chuẩn của tháng.</li>
<li><b>Nghỉ phép năm, nghỉ lễ có hưởng lương:</b> không giảm target.</li>
<li><b>Nghỉ không lương hoặc nghỉ dài ngày được duyệt</b> (từ ${cfg('ngayNghiGiamTarget')} ngày làm việc trở lên trong tháng): target giảm theo số ngày nghỉ.</li>
<li><b>Thay đổi thành viên đội trong tháng:</b> target đội được điều chỉnh theo phần target đã tính theo ngày công của thành viên vào/ra.</li>
<li><b>Điều chỉnh target giữa kỳ</b> chỉ thực hiện khi có biến động khách quan (thay đổi sản phẩm, giá bán, địa bàn) và phải được Giám đốc kinh doanh phê duyệt bằng văn bản.</li></ul>` },
    { id: 's5', title: 'Cách tính Lương hiệu suất (B)', html: `<p><b>Cấp nhân viên:</b></p>
<div class="formula">B = H × min(% hoàn thành KPI cá nhân, 100%)</div>
<p><b>Cấp quản lý:</b> B kết hợp kết quả cá nhân và kết quả của đơn vị:</p>
<div class="formula">B = H × [ tỷ trọng cá nhân × min(% cá nhân, 100%) + tỷ trọng đơn vị × min(% đơn vị, 100%) ]</div>
<ul><li>CCO và SM: <b>40% cá nhân + 60% đơn vị</b>. Team Lead: <b>50% cá nhân + 50% đơn vị</b>.</li>
<li><b>% đơn vị</b> = [min(doanh số cá nhân QL, target cá nhân QL) + doanh số đội] ÷ target đơn vị.</li>
<li>Doanh số cá nhân của quản lý chỉ được tính vào % đơn vị <b>tối đa bằng target cá nhân</b>. Phần bán vượt vẫn được thưởng đầy đủ qua C₁, nhưng không dùng để bù cho kết quả của đội.</li></ul>
<div class="note">B không vượt quá H. Phần vượt KPI được thưởng qua C₁ và C₂.</div>` },
    { id: 's6', title: 'Thưởng doanh số cá nhân (C₁)', html: `<p>C₁ được tính <b>lũy tiến từng phần</b>: doanh số được chia thành các khoảng theo % target cá nhân (K_cn), mỗi khoảng có một tỷ lệ thưởng riêng và <b>chỉ áp dụng cho phần doanh số nằm trong khoảng đó</b>. Bán thêm bao nhiêu thì thưởng tăng thêm bấy nhiêu, không có "bước nhảy" ở các mốc, nên không cần dồn đơn hoặc giữ đơn sang tháng sau.</p>
<div class="note"><b>Lưu ý khi đọc bảng:</b> cột "Tỷ lệ cho phần này" <u>không phải</u> tỷ lệ trên toàn bộ doanh số. Tỷ lệ thực nhận trên toàn bộ doanh số là cột cuối "Tỷ lệ bình quân".</div>
${block('bang_c1')}
<h3>Ví dụ: Nhân viên kinh doanh</h3>
${block('vi_du_nhan_vien')}` },
    { id: 's7', title: 'Thưởng quản lý (C₂) – dành cho CCO, SM, Team Lead', html: `<ul><li>Mức thưởng C₂ được xác định theo <b>% đạt của đơn vị</b> (cách tính tại Mục 5), lũy tiến từng phần theo bảng dưới, rồi nhân với target đơn vị.</li>
<li>C₂ <b>chỉ trả trên doanh số của đội</b>. Doanh số do quản lý tự bán đã được thưởng qua C₁ nên không được tính C₂ lần nữa.</li>
<li><b>Ngưỡng:</b> đơn vị đạt dưới ${cfg('nguongQLpct')} target thì không có C₂.</li></ul>
${block('bang_c2')}
<div class="formula">C₂ = [Σ tỷ lệ × phần % đạt] × target đơn vị × (doanh số đội ÷ doanh số dùng để tính % đơn vị)</div>
<h3>Ví dụ: Trưởng nhóm</h3>
${block('vi_du_truong_nhom')}` },
    { id: 's8', title: 'Chính sách Cộng tác viên (CTV)', html: `<p>CTV không có lương cơ bản và lương hiệu suất. CTV hưởng hoa hồng lũy tiến từng phần theo <b>doanh số tuyệt đối</b> trong tháng:</p>
${block('bang_ctv')}
<ul><li>CTV chỉ được ghi nhận doanh số với <b>khách hàng mới</b>, chưa có chủ sở hữu trên CRM tại thời điểm đăng ký khách hàng.</li>
<li>Hoa hồng của CTV được khấu trừ thuế thu nhập cá nhân theo quy định pháp luật hiện hành trước khi chi trả.</li>
<li>Điều kiện ghi nhận doanh số, thời điểm chi trả và thu hồi áp dụng như nhân sự chính thức (Mục 9, 10).</li></ul>` },
    { id: 's9', title: 'Điều kiện ghi nhận doanh số & nhận lương thưởng', html: `<h3>9.1. Doanh số được tính thưởng khi đủ cả 4 điều kiện</h3>
<ol><li>Có hợp đồng hoặc đơn hàng hợp lệ, đúng bảng giá và chính sách chiết khấu được duyệt.</li>
<li>Đã <b>thực thu</b>: tiền đã về tài khoản Công ty trong kỳ chốt số liệu. Hợp đồng thanh toán nhiều đợt được ghi nhận theo từng đợt tiền về.</li>
<li>Khách hàng được ghi nhận đúng chủ sở hữu trên CRM trước khi phát sinh giao dịch.</li>
<li>Doanh số tính theo giá trị trước thuế GTGT, sau chiết khấu và khuyến mại.</li></ol>
<h3>9.2. Điều kiện nhận từng khoản</h3>
<ul><li><b>Lương cơ bản S:</b> theo ngày công thực tế. Trong thời gian thử việc, mức lương theo hợp đồng thử việc (không thấp hơn 85% mức lương của công việc đó theo Bộ luật Lao động).</li>
<li><b>Lương hiệu suất B và thưởng C₁:</b> áp dụng cả trong thời gian thử việc, tính trên target đã điều chỉnh theo ngày công.</li>
<li><b>Thưởng quản lý C₂:</b> chỉ áp dụng khi đã có quyết định bổ nhiệm chức danh quản lý và đơn vị đạt từ ngưỡng ${cfg('nguongQLpct')} trở lên.</li></ul>
<h3>9.3. Thu hồi và không chi trả</h3>
<ul><li>Hợp đồng bị hủy, khách hàng được hoàn tiền hoặc giảm giá trong vòng ${cfg('ngayThuHoi')} ngày kể từ ngày ghi nhận doanh số: hoa hồng tương ứng bị <b>thu hồi</b>, khấu trừ vào kỳ lương kế tiếp.</li>
<li>Không chi trả và thu hồi toàn bộ hoa hồng liên quan nếu phát hiện <b>gian lận</b>: doanh số ảo, tách hoặc gộp hợp đồng để hưởng tỷ lệ cao hơn, chuyển khách hàng của người khác sang mình hoặc qua CTV, khai báo sai chủ sở hữu khách hàng. Người vi phạm bị xử lý kỷ luật theo Nội quy lao động.</li>
<li><b>Trần chồng tầng:</b> tổng hoa hồng (C₁ của người bán + C₂ của các cấp quản lý) bình quân trên một đồng doanh thu của đơn vị trong tháng không vượt ${cfg('tranChongTangPct')}. Phần vượt trần được trừ ở cấp quản lý cao nhất.</li></ul>
<h3>9.4. Khi nghỉ việc</h3>
<ul><li>Hoa hồng của doanh số đã thực thu đến ngày làm việc cuối cùng được chi trả trong kỳ quyết toán cuối cùng.</li>
<li>Tiền về sau ngày nghỉ việc không được tính hoa hồng cho người đã nghỉ.</li>
<li>Khoản thu hồi (Mục 9.3) phát sinh trước ngày quyết toán được khấu trừ vào kỳ quyết toán cuối cùng.</li></ul>` },
    { id: 's10', title: 'Chốt số liệu, chi trả & khiếu nại', html: `<div class="steps"><div class="step"><b>Bước 1 – Chốt doanh số</b><p>vào ${cfg('ngayChotDS')}.</p></div>
<div class="step"><b>Bước 2 – Đối soát</b><p>Kế toán gửi bảng doanh số và thu nhập dự kiến trước ngày ${cfg('ngayDoiSoat')} tháng sau.</p></div>
<div class="step"><b>Bước 3 – Phản hồi</b><p>Nhân sự kiểm tra và phản hồi trong ${cfg('ngayPhanHoi')} ngày làm việc.</p></div>
<div class="step"><b>Bước 4 – Chi trả</b><p>Cùng kỳ lương, ngày ${cfg('ngayChiTra')} tháng sau.</p></div></div>
<ul><li>Khiếu nại gửi bằng văn bản hoặc qua hệ thống cho ${cfg('dauMoi')}, kèm chứng từ (hợp đồng, chứng từ thanh toán, lịch sử CRM).</li>
<li>Khiếu nại được giải quyết trong kỳ lương kế tiếp. Khoản chênh lệch (nếu có) được truy lĩnh hoặc khấu trừ ở kỳ đó.</li>
<li>Thu nhập được trả sau khi khấu trừ BHXH, BHYT, BHTN phần người lao động đóng và thuế TNCN theo quy định.</li></ul>` },
    { id: 's11', title: 'Quản lý hiệu suất & nguyên tắc tổ chức', html: `<h3>11.1. Kế hoạch cải thiện hiệu suất (PIP)</h3>
<ul><li>Nhân sự đạt dưới ${cfg('kpiYeuPct')} KPI cá nhân trong ${cfg('thangYeu')} tháng liên tiếp sẽ được đưa vào <b>Kế hoạch cải thiện hiệu suất</b> trong 1 tháng, với mục tiêu và hỗ trợ cụ thể từ quản lý trực tiếp.</li>
<li>Kết thúc PIP, nếu không cải thiện, Công ty xem xét điều chỉnh vị trí, mức lương W trong khung, hoặc chấm dứt hợp đồng theo quy định pháp luật.</li>
<li>Fresher trong 3 tháng đầu được đánh giá theo target của lộ trình tập sự (Mục 3).</li></ul>
<h3>11.2. Nguyên tắc tổ chức đội ngũ</h3>
<ul><li>Mỗi Trưởng nhóm quản lý tối thiểu ${cfg('spanMin')} nhân sự kinh doanh. Đơn vị chưa đủ quy mô thì chưa bổ nhiệm thêm cấp quản lý.</li>
<li>Trưởng nhóm vừa trực tiếp bán hàng vừa quản lý, nên có target cá nhân như nhân viên.</li></ul>` },
    { id: 's12', title: 'Câu hỏi thường gặp', html: `<details><summary>Nếu tôi không bán được gì trong tháng thì nhận bao nhiêu?</summary><p>Bạn vẫn nhận lương cơ bản S theo ngày công. Lương hiệu suất B và thưởng C₁ bằng 0.</p></details>
<details><summary>Tôi đạt 99% thì có bị thiệt so với 100% không?</summary><p>Không đáng kể. Thưởng tính lũy tiến từng phần, nên 1% doanh số chênh lệch chỉ tạo ra chênh lệch thu nhập tương ứng với 1% đó, không có bước nhảy ở mốc 100%.</p></details>
<details><summary>Bán vượt target thì thưởng có giới hạn không?</summary><p>Không có trần cho thưởng C₁. Lương hiệu suất B tối đa bằng H, nhưng phần doanh số vượt tiếp tục được thưởng theo bảng Mục 6.</p></details>
<details><summary>Khách hàng ký hợp đồng tháng này nhưng tháng sau mới thanh toán thì sao?</summary><p>Doanh số được ghi nhận vào tháng tiền về tài khoản Công ty (thực thu), và tính vào KPI của tháng đó.</p></details>
<details><summary>Vì sao quản lý bán vượt target cá nhân không giúp tăng % đơn vị?</summary><p>Để thưởng quản lý phản ánh đúng kết quả của đội. Phần bán vượt của quản lý vẫn được thưởng đầy đủ qua C₁.</p></details>
<details><summary>Bảng tính thu nhập có phải là số tiền chính thức tôi nhận không?</summary><p>Không. Bảng tính dùng để ước tính và tự kiểm tra. Số chi trả chính thức là bảng lương đã được đối soát và phê duyệt theo Mục 10.</p></details>` }
  ]
};

export const SEED_PROPOSED = {
  title: 'Quy chế Lương, Thưởng & KPI – Khối Kinh doanh',
  intro: `<p class="lead">Tài liệu này trả lời 3 câu hỏi: <b>Mỗi tháng tôi nhận được bao nhiêu?</b> <b>Target của tôi được tính thế nào?</b> <b>Làm gì để nhận nhiều hơn?</b></p>
<p>Đọc mục 1 đến 3 là nắm được phần lớn nội dung. Muốn thử với lương và doanh số của chính mình, mở tab <b>Bảng tính thu nhập</b>. Mọi con số trong tài liệu được lấy trực tiếp từ công thức lương đang áp dụng, nên luôn khớp với Bảng tính.</p>`,
  sections: [
    { id: 'doc-nhanh', title: 'Đọc nhanh trong 1 phút', html: `<ul>
<li><b>Lương thỏa thuận của bạn (gọi tắt là W) chia làm 2 phần:</b> một phần <b>cố định</b> (lương cơ bản, nhận đủ khi đi làm đủ công) và một phần <b>theo kết quả</b> (lương hiệu suất).</li>
<li><b>Mỗi tháng bạn có một target doanh số.</b> Đạt 100% target là nhận đủ lương hiệu suất; đạt 60% thì nhận 60% phần này.</li>
<li><b>Mỗi đồng doanh số đều có thưởng.</b> Bán càng nhiều, tỷ lệ thưởng càng cao, không giới hạn mức thưởng.</li>
<li><b>Quản lý</b> có thêm thưởng theo kết quả của cả đội.</li>
<li><b>Doanh số chỉ được tính khi tiền của khách đã về tài khoản Công ty.</b></li></ul>
<div class="tip"><b>Ví dụ:</b> Nhân viên kinh doanh có W = 10 triệu. Bảng dưới cho thấy thu nhập tương ứng với các mức doanh số khác nhau trong tháng.</div>
${block('vi_du_nhan_vien')}` },
    { id: 'thu-nhap', title: 'Thu nhập của bạn gồm những gì', html: `<p>Thu nhập mỗi tháng gồm tối đa 4 khoản:</p>
<div class="boxes"><div class="box"><b>① Lương cơ bản</b><p>Phần cố định của W. Nhận theo số ngày công thực tế, không phụ thuộc doanh số.</p></div>
<div class="box blue"><b>② Lương hiệu suất</b><p>Phần còn lại của W. Nhận theo % hoàn thành target, <b>tối đa 100%</b> phần này.</p></div>
<div class="box green"><b>③ Thưởng doanh số</b><p>Tính trên toàn bộ doanh số bạn mang về. Áp dụng cho mọi chức danh, không có mức trần.</p></div>
<div class="box amber"><b>④ Thưởng quản lý</b><p>Chỉ dành cho Giám đốc kinh doanh, Trưởng phòng, Trưởng nhóm. Tính trên doanh số của đội.</p></div></div>
<p>Tỷ lệ giữa lương cơ bản và lương hiệu suất khác nhau theo chức danh (xem bảng ở mục 3). Mức W của bạn ghi trong hợp đồng hoặc quyết định lương và luôn nằm trong khung lương của chức danh.</p>
<p class="muted">Trong Bảng tính, 4 khoản trên lần lượt được viết tắt là S, B, C₁, C₂. Các thuật ngữ khác được giải thích ở mục cuối.</p>` },
    { id: 'target', title: 'Target của bạn được tính thế nào', html: `<div class="formula">Target tháng = Lương hiệu suất tối đa × Hệ số KPI của chức danh</div>
<p><b>Ví dụ:</b> W = 10 triệu, lương cơ bản chiếm 50% → lương hiệu suất tối đa là 5 triệu. Hệ số KPI là 10 → target tháng = 5 triệu × 10 = <b>50 triệu doanh số</b>.</p>
<p>Bảng dưới là khung lương, tỷ lệ lương cơ bản và hệ số KPI của từng chức danh:</p>
${block('khung_luong')}${block('lo_trinh_tap_su')}
<div class="note">Quản lý trực tiếp giao target cho bạn trên hệ thống mỗi tháng. Target có thể được điều chỉnh trong các trường hợp đặc biệt (mục 7), không tự ý thay đổi giữa tháng.</div>` },
    { id: 'thuong-doanh-so', title: 'Bán nhiều hơn được thêm bao nhiêu', html: `<p>Thưởng doanh số tính <b>theo từng phần, giống cách tính thuế bậc thang</b>: doanh số được chia thành các khoảng theo % target, mỗi khoảng có tỷ lệ thưởng riêng và tỷ lệ đó <b>chỉ áp dụng cho phần doanh số nằm trong khoảng</b>.</p>
<ul><li>Không bao giờ có chuyện bán thêm mà nhận ít đi.</li>
<li>Không có "bước nhảy" ở các mốc, nên <b>không cần giữ đơn sang tháng sau</b> hay dồn đơn vào một tháng.</li>
<li>Vượt target vẫn tiếp tục được thưởng, không có mức trần.</li></ul>
<p><b>Đạt bao nhiêu % target thì được thưởng bao nhiêu?</b> (ví dụ Nhân viên kinh doanh, W = 10 triệu)</p>
${block('c1_de_hieu')}
<details><summary>Xem bảng tỷ lệ chi tiết từng khoảng</summary>${block('bang_c1')}<p class="muted">"Tỷ lệ cho phần này" chỉ áp dụng cho phần doanh số trong khoảng đó, không phải cho toàn bộ doanh số. Cột cuối là tỷ lệ bạn thực nhận tính trên toàn bộ doanh số.</p></details>` },
    { id: 'lich-thang', title: 'Lịch hằng tháng', html: `<div class="steps"><div class="step"><b>Đầu tháng</b><p>Chậm nhất ngày ${cfg('ngayGiaoTarget')}, quản lý giao target cho bạn trên hệ thống. Bạn xác nhận trong ${cfg('ngayXacNhan')} ngày làm việc; không phản hồi được hiểu là đồng ý.</p></div>
<div class="step"><b>Trong tháng</b><p>Cập nhật khách hàng, hợp đồng, thanh toán trên CRM. Theo dõi % hoàn thành ở tab KPI của bạn.</p></div>
<div class="step"><b>Cuối tháng</b><p>Doanh số được chốt vào ${cfg('ngayChotDS')}.</p></div>
<div class="step"><b>Tháng sau</b><p>Trước ngày ${cfg('ngayDoiSoat')}: Kế toán gửi bảng đối soát. Bạn kiểm tra và phản hồi trong ${cfg('ngayPhanHoi')} ngày làm việc. Ngày ${cfg('ngayChiTra')}: nhận lương và thưởng.</p></div></div>` },
    { id: 'dieu-kien', title: 'Doanh số nào được tính', html: `<h3>✅ Được tính khi đủ cả 4 điều kiện</h3>
<ol><li>Có hợp đồng hoặc đơn hàng hợp lệ, đúng bảng giá và chính sách chiết khấu đã duyệt.</li>
<li>Tiền của khách <b>đã về tài khoản Công ty</b> trước thời điểm chốt. Hợp đồng trả nhiều đợt thì tính theo từng đợt tiền về.</li>
<li>Khách hàng đã được ghi đúng tên bạn là người phụ trách trên CRM <b>trước khi</b> giao dịch.</li>
<li>Tính theo giá trị trước VAT, sau chiết khấu và khuyến mại.</li></ol>
<h3>↩️ Bị trừ lại</h3>
<p>Nếu hợp đồng bị hủy, khách được hoàn tiền hoặc giảm giá trong vòng ${cfg('ngayThuHoi')} ngày kể từ ngày ghi nhận doanh số, phần thưởng tương ứng sẽ được trừ vào kỳ lương kế tiếp.</p>
<h3>⛔ Không được chấp nhận</h3>
<div class="warn">Các hành vi sau bị thu hồi toàn bộ thưởng liên quan và xử lý kỷ luật theo Nội quy lao động: tạo doanh số ảo; tách hoặc gộp hợp đồng để hưởng tỷ lệ cao hơn; nhận khách của người khác về mình hoặc qua cộng tác viên; khai sai người phụ trách khách hàng.</div>` },
    { id: 'dac-biet', title: 'Các trường hợp đặc biệt', html: `<ul><li><b>Vào làm hoặc nghỉ việc giữa tháng:</b> lương cơ bản, lương hiệu suất và target đều tính theo số ngày công thực tế.</li>
<li><b>Nghỉ phép năm, nghỉ lễ có lương:</b> target giữ nguyên.</li>
<li><b>Nghỉ không lương hoặc nghỉ dài được duyệt</b> từ ${cfg('ngayNghiGiamTarget')} ngày làm việc trở lên: target giảm theo số ngày nghỉ.</li>
<li><b>Thời gian thử việc:</b> lương cơ bản theo hợp đồng thử việc (không thấp hơn 85% mức lương chính thức). Lương hiệu suất và thưởng doanh số vẫn áp dụng như nhân viên chính thức.</li>
<li><b>Điều chỉnh target giữa tháng:</b> chỉ khi có thay đổi khách quan (sản phẩm, giá bán, địa bàn) và được Giám đốc kinh doanh duyệt bằng văn bản.</li>
<li><b>Khi nghỉ việc:</b> thưởng của doanh số đã thu tiền đến ngày làm việc cuối cùng được trả ở kỳ quyết toán. Tiền về sau ngày nghỉ không được tính cho người đã nghỉ.</li></ul>` },
    { id: 'quan-ly', title: 'Dành cho quản lý (Giám đốc KD, Trưởng phòng, Trưởng nhóm)', html: `<h3>Target của đội</h3>
<ul><li><b>Target đội</b> = tổng target của các thành viên trực thuộc (có thể nhân hệ số 1,0 – 1,1). Không gồm target của chính quản lý.</li>
<li><b>Target đơn vị</b> = target cá nhân của quản lý + target đội. <b>% đạt của đơn vị</b> dùng để tính lương hiệu suất và thưởng quản lý.</li></ul>
<h3>Lương hiệu suất của quản lý</h3>
<p>Gồm 2 phần: một phần theo % đạt <b>cá nhân</b>, một phần theo % đạt <b>đơn vị</b> (tỷ trọng theo chức danh). Mỗi phần tối đa 100%.</p>
<div class="note">Doanh số quản lý tự bán chỉ được tính vào kết quả đơn vị <b>tối đa bằng target cá nhân</b>. Phần bán vượt vẫn được thưởng doanh số đầy đủ, nhưng không dùng để bù cho kết quả của đội.</div>
<h3>Thưởng quản lý</h3>
<ul><li>Đơn vị đạt dưới ${cfg('nguongQLpct')} target: không có thưởng quản lý.</li>
<li>Thưởng chỉ tính trên <b>doanh số của đội</b> (doanh số quản lý tự bán đã có thưởng doanh số).</li>
<li>Tổng thưởng của người bán và các cấp quản lý trên một đồng doanh thu không vượt ${cfg('tranChongTangPct')}; phần vượt trừ ở cấp quản lý cao nhất.</li></ul>
<p><b>Thưởng quản lý tính theo % doanh số của đội:</b></p>
${block('c2_de_hieu')}
<h3>Ví dụ: Trưởng nhóm</h3>
${block('vi_du_truong_nhom')}
<details><summary>Xem bảng tỷ lệ chi tiết (cách tính lũy tiến)</summary>${block('bang_c2')}</details>
<p class="muted">Mỗi Trưởng nhóm quản lý tối thiểu ${cfg('spanMin')} nhân sự kinh doanh; đơn vị chưa đủ quy mô thì chưa bổ nhiệm thêm cấp quản lý.</p>` },
    { id: 'ctv', title: 'Dành cho Cộng tác viên', html: `<p>Cộng tác viên không có lương cố định, hưởng <b>hoa hồng theo bậc doanh số</b> trong tháng (tính theo từng phần như thưởng doanh số):</p>
${block('bang_ctv')}
<ul><li>Chỉ tính với <b>khách hàng mới</b>, chưa có người phụ trách trên CRM khi đăng ký.</li>
<li>Hoa hồng được khấu trừ thuế thu nhập cá nhân trước khi chi trả.</li>
<li>Điều kiện ghi nhận doanh số, lịch chi trả và trường hợp bị trừ lại áp dụng như nhân viên chính thức.</li></ul>` },
    { id: 'ho-tro', title: 'Khi kết quả chưa đạt', html: `<p>Nếu bạn đạt dưới ${cfg('kpiYeuPct')} target trong ${cfg('thangYeu')} tháng liên tiếp, quản lý sẽ cùng bạn lập <b>Kế hoạch cải thiện</b> trong 1 tháng, với mục tiêu rõ ràng và hỗ trợ cụ thể (kèm cặp, khách hàng, đào tạo).</p>
<p>Sau 1 tháng, nếu kết quả chưa cải thiện, Công ty sẽ trao đổi với bạn về việc điều chỉnh vị trí, mức lương trong khung hoặc chấm dứt hợp đồng theo quy định pháp luật.</p>
<p class="muted">Tập sự trong 3 tháng đầu được đánh giá theo target của lộ trình tập sự (mục 3).</p>` },
    { id: 'hoi-dap', title: 'Khiếu nại & hỏi đáp', html: `<p><b>Thấy số liệu chưa đúng?</b> Gửi phản hồi cho ${cfg('dauMoi')} trong thời hạn đối soát, kèm hợp đồng, chứng từ thanh toán hoặc lịch sử CRM. Khiếu nại được giải quyết trong kỳ lương kế tiếp; chênh lệch (nếu có) được trả bù hoặc trừ ở kỳ đó.</p>
<details><summary>Không bán được gì trong tháng thì tôi nhận bao nhiêu?</summary><p>Bạn vẫn nhận lương cơ bản theo ngày công. Lương hiệu suất và thưởng doanh số bằng 0.</p></details>
<details><summary>Đạt 99% target có bị thiệt nhiều so với 100% không?</summary><p>Không. Thưởng tính theo từng phần nên 1% doanh số chênh lệch chỉ làm thu nhập chênh tương ứng với 1% đó.</p></details>
<details><summary>Bán vượt target thì thưởng có giới hạn không?</summary><p>Không. Lương hiệu suất tối đa 100%, nhưng phần doanh số vượt tiếp tục được thưởng doanh số.</p></details>
<details><summary>Khách ký hợp đồng tháng này nhưng tháng sau mới trả tiền thì sao?</summary><p>Doanh số được tính vào tháng tiền về tài khoản Công ty.</p></details>
<details><summary>Tôi xem target và thu nhập dự kiến ở đâu?</summary><p>Tab <b>KPI của bạn</b> hiện target từng tháng. Tab <b>Bảng tính thu nhập</b> giúp bạn thử với các mức doanh số khác nhau.</p></details>
<details><summary>Số trên Bảng tính có phải số tiền chính thức tôi nhận không?</summary><p>Không. Bảng tính để ước tính và tự kiểm tra. Số chính thức là bảng lương đã đối soát và được duyệt.</p></details>
<p class="muted">Thu nhập được trả sau khi trừ bảo hiểm (phần người lao động đóng) và thuế thu nhập cá nhân theo quy định. Nội dung không có trong quy chế này thực hiện theo Hợp đồng lao động, Nội quy lao động và Quy chế tài chính của Công ty.</p>` },
    { id: 'thuat-ngu', title: 'Giải thích thuật ngữ', html: `<table><thead><tr><th>Thuật ngữ</th><th>Nghĩa là</th></tr></thead><tbody>
<tr><td><b>W</b> – Tổng lương thỏa thuận</td><td>Mức lương ghi trong hợp đồng / quyết định lương, gồm lương cơ bản + lương hiệu suất tối đa.</td></tr>
<tr><td><b>S</b> – Lương cơ bản</td><td>Phần cố định của W, trả theo ngày công.</td></tr>
<tr><td><b>H</b> – Lương hiệu suất tối đa</td><td>Phần còn lại của W, nhận theo % hoàn thành target.</td></tr>
<tr><td><b>X</b> – Hệ số KPI</td><td>Hệ số của chức danh dùng để tính target: target = H × X.</td></tr>
<tr><td><b>Target cá nhân</b> (K_cn)</td><td>Doanh số cần đạt trong tháng.</td></tr>
<tr><td><b>Target đội / đơn vị</b></td><td>Target của các thành viên trực thuộc quản lý / target đội + target cá nhân của quản lý.</td></tr>
<tr><td><b>Thực thu</b></td><td>Tiền khách hàng đã về tài khoản Công ty.</td></tr>
<tr><td><b>Lũy tiến từng phần</b></td><td>Chia doanh số thành nhiều khoảng, mỗi khoảng có tỷ lệ riêng chỉ áp dụng cho phần trong khoảng đó (như thuế bậc thang).</td></tr>
<tr><td><b>Người phụ trách khách hàng</b></td><td>Người được ghi là chủ sở hữu khách hàng trên CRM.</td></tr>
</tbody></table>` }
  ]
};
