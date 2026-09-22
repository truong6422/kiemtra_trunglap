# Bàn giao đợt sửa ngày 22/09/2026

Tài liệu này ghi lại toàn bộ những gì đã sửa theo `file_fix`, cách kiểm chứng,
và những việc cần làm khi đưa mã nguồn sang máy khác.

---

## 1. Chạy trên máy mới — làm gì trước

```bash
git pull
npm install
npm start          # cổng 5000
node workers/worker.js   # cửa sổ khác
```

**Không phải chạy lệnh chuyển đổi dữ liệu nào bằng tay.** Máy chủ tự kiểm tra và
chuyển đổi cơ sở dữ liệu ngay lúc khởi động, trước khi mở cổng nhận yêu cầu. Mỗi
bước chuyển đổi chỉ chạy một lần, mốc lưu trong collection `phien_ban_du_lieu`.

Nhật ký lúc khởi động cho biết đã làm gì:

```
✅ Kết nối MongoDB thành công — cơ sở dữ liệu: KiemTraTrungLap
🗃️  Có 6 bước chuyển đổi dữ liệu cần chạy.
   → Bỏ ma_sinh_vien / ma_giang_vien...
🚀 Server đang chạy tại cổng 5000
```

Lần khởi động sau sẽ thấy `Dữ liệu đã khớp với mã nguồn, không phải chuyển đổi.`

Muốn xem máy này còn thiếu bước nào mà chưa bật máy chủ:

```bash
node chuyen_doi_csdl.js --xem     # chỉ liệt kê
node chuyen_doi_csdl.js           # chạy những bước chưa chạy
```

Thêm bước chuyển đổi mới: viết thêm một phần tử vào mảng `CAC_BUOC` trong
`utils/chuyen_doi_du_lieu.js`, đặt `ma` chưa từng dùng. **Không sửa nội dung một
bước đã phát hành** — máy đã chạy bước đó sẽ không chạy lại.

---

## 2. Trọng số thuật toán — phần cô giáo hỏi

### Trả lời câu "tại sao chọn 0.4 / 0.4 / 0.2"

Ba trọng số này không còn bị đóng cứng. Vào **Quản lý cấu hình → Thuật toán so
khớp**, đặt bộ nào cũng được, lưu xong là lần chấm kế tiếp dùng luôn bộ mới.

### Trả lời câu "nếu tổng ≠ 1 thì sao"

Tổng **không bắt buộc** bằng 100%. Điểm giống nhau của một cặp câu là *trung bình
có trọng số*, nên trước khi chấm hệ thống chia cả bộ cho tổng của chúng:

```
Nhập 0.5 / 0.5 / 0.3  (tổng 1.3)
→ dùng 0.385 / 0.385 / 0.231
→ điểm mỗi câu vẫn nằm trong 0–1, tỉ lệ trùng vẫn 0–100%
```

Màn hình hiện thẳng dãy số sau quy đổi, nên người dùng thấy rõ bộ mình đặt sẽ
được hiểu thế nào. Chỉ chặn đúng một trường hợp: tổng bằng 0 (tắt hết thuật toán
thì không còn gì để so).

Nhật ký worker in ra bộ trọng số thực tế mỗi lần chấm:

```
[TRONG_SO] Sau khi quy về tổng 1: TFIDF_COSINE=0.3846 WINNOWING=0.3846
           JACCARD=0.2308 (tổng khai báo ban đầu: 1.30)
```

### Bảng so sánh các bộ trọng số (chạy thật trên báo cáo BC5)

| Bộ trọng số | Tổng | Tỉ lệ trùng | Số câu trùng | Mục vượt 100% |
|---|---|---|---|---|
| 0.4 / 0.4 / 0.2 (gốc) | 1.0 | 32.80% | 111 | 0 |
| 0.5 / 0.5 / 0.3 | 1.3 | 32.80% | 111 | 0 |
| 0.8 / 0.1 / 0.1 (nghiêng Cosine) | 1.0 | **34.20%** | 117 | 0 |
| 0.1 / 0.8 / 0.1 (nghiêng Winnowing) | 1.0 | **32.17%** | 108 | 0 |
| 0.2 / 0.2 / 0.2 | 0.6 | 32.80% | 111 | 0 |

Đọc bảng này ra hai ý dùng được trước hội đồng:

- Đổi **tỉ lệ giữa ba thuật toán** thì kết quả đổi thật (32.17% → 34.20%), chứng
  tỏ cả ba đều có đóng góp chứ không phải một cái làm hết việc.
- Đổi **tổng** mà giữ nguyên tỉ lệ thì kết quả không đổi — đúng như thiết kế,
  vì bộ trọng số được quy về tổng 1 trước khi chấm.

Bộ 0.4 / 0.4 / 0.2 nằm giữa hai thái cực: cân bằng giữa việc bắt câu diễn đạt
lại (Cosine) và câu chép nguyên văn (Winnowing), còn Jaccard nhẹ hơn vì nó chỉ
so vốn từ nên dễ báo nhầm với những câu cùng chủ đề.

### Muốn chạy lại bảng so sánh này

Đổi trọng số trong màn Quản lý cấu hình, rồi bấm chấm lại tài liệu. Hoặc dùng
lệnh chấm lại trực tiếp (xem mục 6).

---

## 3. Lỗi "web load liên tục" — nguyên nhân và cách sửa

Có **bốn** lỗi độc lập cùng gây ra hiện tượng này. Cả bốn đều đã sửa.

### 3.1 Bảng tài liệu không bao giờ thoát trạng thái "Đang xử lý"

`js/quanlytailieu.js` so dữ liệu hai lượt quét bằng một "vân tay" gồm mã báo
cáo, trạng thái và tỉ lệ trùng. Nhưng nó đọc tỉ lệ ở trường `ti_le_trung_lap`,
trong khi máy chủ trả về tên `do_trung_lap`. Trường không tồn tại nên phần tỉ lệ
trong vân tay luôn rỗng: chấm xong rồi mà vân tay vẫn y như lúc đang chạy, bảng
không được vẽ lại, vòng tròn chờ quay mãi, và lượt quét ba giây một lần không
bao giờ dừng.

*Sửa:* đọc đúng trường `do_trung_lap`, đồng thời đặt trần 200 lượt quét (mười
phút) — quá mốc đó coi như việc chấm đã hỏng chứ không phải chạy chậm.

### 3.2 Chấm lại báo cáo cũ luôn thất bại

Nội dung văn bản chỉ được lưu lúc tải tệp lên rồi bị dọn đi cho nhẹ cơ sở dữ
liệu. Vì vậy **mọi lần chấm lại** đều dừng ngay với lỗi *"Báo cáo không có nội
dung để xử lý"*, hàng chờ thử lại ba lần rồi bỏ cuộc, còn ngoài màn hình báo cáo
nằm mãi ở "Đang xử lý". Đây đúng là cảnh gặp phải khi đổi trọng số xong bấm chấm
lại.

*Sửa:* không còn nội dung thì đọc lại từ tệp gốc trong `uploads/`, rồi ghi lại
để lần sau khỏi đọc nữa.

### 3.3 Hai vòng lặp chạy ba lần mỗi giây

`js/thembaitap.js` có hai `setInterval(..., 300)`. Một cái chỉ in ra bảng điều
khiển dòng chữ "đang tự động làm mới" mà không gọi API nào — đã bỏ hẳn. Cái còn
lại rà hạn nộp của từng hàng trong bảng; hạn nộp tính bằng phút nên đã giãn ra
mười giây một lượt.

### 3.4 Ngưỡng trùng lặp bị đóng cứng trong worker

`workers/worker.js` gọi `checkPlagiarism(idBaoCao, 0.6)` — bỏ qua giá trị quản
trị viên đặt trong màn Quản lý cấu hình. Kéo thanh ngưỡng xong chấm lại thì kết
quả vẫn y nguyên, trông như màn cấu hình không có tác dụng gì.

*Sửa:* truyền `null` để module đối sánh tự đọc `nguong_trung_lap` từ cấu hình.

---

## 4. Lỗi kết quả chấm bị cộng dồn qua các lần chạy

Phát hiện trong lúc kiểm thử, **chưa có trong `file_fix` nhưng ảnh hưởng trực
tiếp tới độ tin cậy của mọi con số**.

### 4.1 Chỉ số câu cộng dồn

`utils/xu_ly_bao_cao_upload.js` chèn thêm câu mà không xoá bộ cũ. Một bài 402 câu
chấm bốn lần thành **1716 dòng** trong `chi_so_cau`. Thuật toán lấy tổng số câu
từ chính bảng này để tính tỉ lệ trùng của cả bài, nên mẫu số phình to và kết quả
sai hẳn — đo được 86.34% thay vì 99.77%.

### 4.2 Kết quả chấm chồng lấn

Mỗi lượt chấm sinh một mã kiểm tra mới, nhưng bản ghi cũ được để nguyên. Bảng
thống kê đọc theo mã kiểm tra mới nhất, còn chi tiết câu trùng đọc theo mã báo
cáo, nên hai bên trỏ vào hai lượt khác nhau: **danh sách bên trái hiện đủ 45
nguồn mà bấm vào nguồn nào bảng bên phải cũng trống trơn.**

*Sửa:* worker xoá sạch kết quả lượt trước ngay trước khi ghi lượt mới. Dữ liệu
cũ đã tích tụ được dọn bằng hai bước chuyển đổi tự chạy.

**Kết quả sau khi sửa:** BC5 chấm lại cho đúng **99.77%** — khớp con số trong ảnh
cô gửi.

---

## 5. Các mục trong `file_fix`

| # | Yêu cầu | Đã làm |
|---|---|---|
| 1 | Đổi được trọng số, xử lý tổng ≠ 1 | Mục 2 |
| 2 | `bai_tap` không cập nhật khi sinh viên nộp | Nộp bài giờ ghi cả `chi_tiet_nop_bai` lẫn `bai_tap.danh_sach_nop_bai` |
| 3 | `danh_sach_tep` → `ten_tep` | Đổi tên; giờ là một chuỗi tên tệp, thêm `id_bao_cao` để mở thẳng trang chi tiết |
| 4 | Ảnh đại diện không cập nhật | Mục 7 |
| 5 | Bỏ `ma_sinh_vien`, dùng `id_sinh_vien` làm mã | Mục 6 |
| 6 | `lop_hoc.danh_sach_thanh_vien` dùng `id_sinh_vien` | Đã đổi; API vẫn gắn kèm `id_nguoi_dung` cho giao diện |
| 7 | `danh_sach_nop_bai.id_sinh_vien` đang là `id_nguoi_dung` | Đã sửa, bỏ `ma_sinh_vien` |
| 8 | Thống kê theo mẫu: đổi tên trường, thêm đoạn chắp vá, sửa số > 100 | Mục 8 |
| 9 | Thiếu đoạn chắp vá, đoạn không bấm xem được | Mục 9 |
| 10 | Bấm chữ bôi màu phải mở đúng mục bên chi tiết | Mục 9 |
| 11 | Xoá file thừa | Mục 10 |

---

## 6. Mã sinh viên — chỉ còn một mã duy nhất

Trước đây mỗi người mang hai mã: `id_sinh_vien` ("SV005") do hệ thống đặt và
`ma_sinh_vien` ("2200461") do người dùng khai. Chỗ nào nối dữ liệu theo mã nào
thì phải đoán, và bảng điểm danh nộp bài hay lệch.

Giờ `ma_sinh_vien` và `ma_giang_vien` đã bị bỏ hẳn. Người dùng nhập mã trong
trang **Tài khoản** thì mã đó ghi thẳng vào `id_sinh_vien`, và mọi bản ghi trỏ
tới mã cũ được sửa theo cùng lúc:

- `chi_tiet_nop_bai.id_sinh_vien`
- `thong_ke.id_sinh_vien`
- `bai_tap.danh_sach_nop_bai[].id_sinh_vien`
- `lop_hoc.danh_sach_thanh_vien[].id_sinh_vien`

Mã đã thuộc về người khác thì máy chủ trả lỗi 409 và không đổi gì.

Mã liên quan: `utils/doi_ma_sinh_vien.js`, `utils/thanh_vien_lop.js`.

---

## 7. Ảnh đại diện

Khi đăng ký, đăng nhập, hoặc mở trang Tài khoản, tài khoản chưa có ảnh sẽ được
gán ngay:

1. Thử lấy ảnh **Gravatar** theo địa chỉ email (chờ tối đa 2 giây).
2. Email chưa có ảnh ở Gravatar → sinh **ảnh chữ cái**: chữ đầu của tên riêng
   trên nền màu suy ra từ email, nên mỗi người một màu cố định. Ảnh này là SVG
   nhúng thẳng vào trường `hinh_anh`, không gọi ra ngoài Internet nên máy không
   có mạng vẫn hiện đúng.

Người dùng bấm vào ảnh trong trang **Tài khoản** để chọn tấm khác (JPG, PNG,
WEBP, GIF, tối đa 5MB). Ảnh lưu trong `uploads/anh-dai-dien/<mã tài khoản>.<đuôi>`
— đặt tên theo mã tài khoản nên đổi ảnh mười lần vẫn chỉ chiếm một tệp. Nút
*"Dùng ảnh mặc định theo email"* quay về bước 1–2.

API: `POST /api/auth/anh-dai-dien/:id` · `DELETE /api/auth/anh-dai-dien/:id`

Mã liên quan: `utils/anh_dai_dien.js`, `js/anh-dai-dien.js`.

---

## 8. Thống kê theo mẫu

### Đổi tên trường

| Tên cũ | Tên mới |
|---|---|
| `cosine_trung_binh` | `cosine` |
| `jaccard_trung_binh` | `jaccard` |
| `winnowing_trung_binh` | `winnowing` |
| `tong_hop_trung_binh` | *(đã bỏ)* |
| — | `so_doan_chap_va` *(thêm mới)* |

### Vì sao trước đây ra 128%

Một câu của người nộp có thể khớp với **nhiều câu** trong cùng một báo cáo mẫu.
Mỗi lần khớp đều cộng thêm điểm cosine/jaccard/winnowing, trong khi số câu trùng
chỉ đếm một lần. Chia ra trung bình thì tử số lớn hơn mẫu số → 128%.

*Sửa:* chỉ giữ lần khớp đầu tiên của mỗi câu với mỗi báo cáo mẫu, nên tử số và
mẫu số đếm cùng một thứ. Thêm một lớp chặn trần 0–100 để bản ghi cũ lỡ lệch cũng
không hiện ra con số vô lý.

---

## 9. Trang chi tiết báo cáo

### Bảng bên phải giờ có ba mục

- **Câu trùng** — một câu bài nộp khớp một câu bài mẫu.
- **Đoạn trùng** — nhiều câu liền nhau ở cả hai bên cùng khớp.
- **Đoạn chắp vá** *(mới hiện ra)* — những câu nằm rời nhau trong bài mẫu bị ghép
  liền lại thành một đoạn trong bài nộp. Dữ liệu này vẫn được tính từ trước
  nhưng không bao giờ được vẽ ra màn hình.

Mỗi khối đều có nút **"Xem trong bài ›"** và bấm được — trước chỉ câu mới bấm
được, đoạn thì chỉ đọc chữ chứ không xem được nó nằm ở đâu.

Đoạn chắp vá còn ghi rõ nó lấy câu ở chỗ nào của bài mẫu
(*"Ghép từ câu 150–383 của bài mẫu"*) và có khớp với bao nhiêu bài mẫu khác.

### Bấm vào chữ được bôi màu

Vệt bôi màu trong tài liệu trước đây đặt `pointer-events: none` nên chuột đi
xuyên qua — bấm vào chỗ vàng chóe không có gì xảy ra. Giờ bấm vào chữ bôi màu
thì bảng bên phải **tự cuộn tới đúng mục** nói về chỗ đó và khoanh viền cam.

Câu đó thuộc một tài liệu nguồn khác với tài liệu đang chọn thì hiện lời nhắc
chọn tài liệu tương ứng, thay vì im lặng không phản hồi.

> **Lưu ý về cách đánh số:** lớp bôi màu đánh số câu theo vị trí trong danh sách
> câu trùng đã lọc, còn đoạn lại ghi chỉ số câu tính trên toàn bài. Hai cách đánh
> số này không trùng nhau, nên `js/chitiet-bang-trung.js` dựng một bảng bắc cầu
> giữa chúng. Sửa chỗ này phải giữ nguyên bảng đó.

Mã liên quan: `js/chitiet-bang-trung.js`, `js/pdf-highlight-viewer.js`.

---

## 10. Dọn file và tương thích đa nền tảng

### File đã xoá

19 tệp `test_*.js` ở thư mục gốc, 9 tệp `workers/debug_*.txt`, `rebuild_log.txt`,
`diff.txt`, `tach_cau_diff.txt`, `output.json`, `sentence_map.json`,
`sentence_mapping.json`, `*_sentences.txt`, `convert_all.js`, `ok.js`, `.js`,
`init_kho_mau.js`, `routes/test.js` (gọi một tệp Python không tồn tại, chưa bao
giờ được nạp), và các thư mục `debug_output/`, `debug_text/`, `debug_sentences/`,
`temp_ocr/`.

Module đối sánh cũng không còn ghi tệp `debug_plagiarism.txt` sau mỗi lượt chấm.

**Giữ lại:** `uploads/`, `upload2/`, `restructuring_data/`, `kiem_thu/`,
`tests/`, các script tiện ích (`precompute_cauhinh.js`, `sync*.js`,
`rebuild_file.js`, `export_doc.js`) và toàn bộ mã nguồn.

### Đường dẫn tệp Windows / Linux

Trường `tep_tin` trong `bao_cao` không có dạng thống nhất: bản ghi cũ lưu đường
dẫn tuyệt đối kiểu Windows (`D:/kiemtra_trunglap/uploads/a.pdf`), bản khác lưu
tương đối với dấu gạch ngược (`uploads\a.pdf`). Mỗi kiểu hỏng theo một cách khi
đổi máy, và màn hình chỉ báo *"File vật lý không tồn tại trên ổ cứng server"*.

`utils/duong_dan_tep.js` dò lần lượt: đúng đường dẫn đã lưu → ghép vào thư mục
dự án → tìm theo tên tệp trong `uploads/` và `upload2/`. Nhờ vậy tài liệu cũ mở
được trên cả Windows lẫn Linux.

### Ảnh mặc định bị thiếu

Tất cả 14 trang đều trỏ tới `images/default-avatar.png` nhưng tệp đó **chưa bao
giờ tồn tại** — mọi lần tải trang đều có một yêu cầu 404. Đã bổ sung, cùng với
`images/favicon.ico`.

---

## 11. Kết quả kiểm thử

Chạy thật trên trình duyệt với đủ MongoDB + Redis + máy chủ + worker.

### Toàn bộ trang giao diện: 13/14 sạch

Mở lần lượt 14 trang, ghi lỗi console. Trang duy nhất báo lỗi là `chitiet.html`
khi mở **không kèm** `?id=` — đó là hành vi đúng (báo thiếu mã báo cáo).

### Luồng nghiệp vụ: 24/25 đạt

| Mục kiểm | Kết quả |
|---|---|
| Ảnh đại diện đổ đúng trên thanh điều hướng | đạt |
| Khung đổi ảnh trong trang Tài khoản | đạt |
| Ô mã sinh viên hiện `id_sinh_vien` | đạt (SV001) |
| Tổng trọng số 130% hiện cảnh báo quy đổi | đạt |
| Lưu được bộ trọng số tổng 130% | đạt |
| Bảng chi tiết dựng khối trùng | đạt — 344 câu, 14 đoạn, 11 đoạn chắp vá |
| Đoạn chắp vá hiển thị | đạt |
| Mọi khối có nút "Xem trong bài" | đạt |
| Chữ bôi màu bấm được | đạt — 815 vệt, con trỏ pointer |
| Bấm chữ bôi màu → bảng bên phải làm nổi đúng mục | đạt |
| 6 API chính trả HTTP 200 | đạt |

Mục còn lại là cảnh báo `GSI_LOGGER: The given origin is not allowed` của nút
đăng nhập Google — do `localhost:5500` chưa được khai trong Google Console, không
phải lỗi mã nguồn.

### Cơ sở dữ liệu sau chuyển đổi

```
thong_ke / chi_tiet_* / ket_qua_kiem_tra chồng lấn : 0
chi_so_cau trùng vị trí                            : 0
sinh_vien còn ma_sinh_vien                         : 0
giang_vien còn ma_giang_vien                       : 0
bai_tap còn danh_sach_tep                          : 0
lop_hoc còn id_nguoi_dung trong thành viên         : 0
thong_ke còn *_trung_binh                          : 0
thong_ke có mục > 100                              : 0
```

### Luồng chấm end-to-end

```
⏳ Đang xử lý tính toán ngầm cho báo cáo: BC5
[UPLOAD] BC5 - Da xoa 363 cau cua lan xu ly truoc
[CHI_SO_CAU] BC5 | Tach duoc 402 cau | Luu 363 cau hop le | 6284 tu
🧹 Đã dọn 2083 bản ghi của lượt chấm trước cho BC5
[TRONG_SO] Sau khi quy về tổng 1: TFIDF_COSINE=0.4000 WINNOWING=0.4000 JACCARD=0.2000
[KET_QUA] BC5 | 360/363 câu trùng | 5749/5762 từ trùng | tỉ lệ 99.77%
✅ Hoàn tất báo cáo BC5 - Tỉ lệ trùng: 99.77% (Mã KQ: KT000049)
```

---

## 12. Việc còn lại

- **Những báo cáo chấm từ trước đợt sửa nên chấm lại.** Số liệu của chúng tính
  trên bộ chỉ số câu đã bị cộng dồn nên không chính xác. Sáu báo cáo thuộc diện
  này; BC5 đã chấm lại, còn lại chấm khi cần dùng tới.
- **Sao lưu trước khi chạy trên máy thật.** Bản sao lưu trước đợt chuyển đổi nằm
  ở `~/Documents/DOC/backup-truoc-chuyen-doi-260922.gz` (37MB):
  ```bash
  mongorestore --gzip --archive=backup-truoc-chuyen-doi-260922.gz --drop
  ```
- **Đăng nhập Google** cần khai origin thật trong Google Console thì nút mới chạy.
