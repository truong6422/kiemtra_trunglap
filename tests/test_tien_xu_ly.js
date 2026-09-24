/**
 * ============================================================================
 * KIỂM THỬ TIỀN XỬ LÝ (tests/test_tien_xu_ly.js)
 * ----------------------------------------------------------------------------
 * Mỗi trường hợp dưới đây lấy đúng từ tệp ảnh giáo viên gửi kèm phản hồi. Chạy:
 *
 *      node tests/test_tien_xu_ly.js
 * ============================================================================
 */

const { tachCau, locNoiDungHocThuat } = require('../utils/tien_xu_ly');
const { laTieuDeLon, laTieuDeCon, laDongMucLuc } = require('../utils/nhan_dien_tieu_de');
const {
    laChuThichHinhBang,
    laDongNgayThangChuKy,
    laDongBoCucDeTai,
    laThongTinHoSo,
    laHangBangBiDinhLien
} = require('../utils/nhan_dien_phan_phu');
const { tachCauTrongDoan } = require('../utils/tach_cau_van_ban');
const { phatHienTrungToanBai } = require('../utils/trung_toan_bai');

let soDat = 0;
let soHong = 0;
const cacLoi = [];

function kiemTra(ten, thucTe, mongDoi) {
    const dat = JSON.stringify(thucTe) === JSON.stringify(mongDoi);

    if (dat) {
        soDat++;
        return;
    }

    soHong++;
    cacLoi.push(
        `  ✗ ${ten}\n      mong đợi: ${JSON.stringify(mongDoi)}\n`
        + `      thực tế : ${JSON.stringify(thucTe)}`
    );
}

function nhom(ten) {
    console.log(`\n── ${ten}`);
}

// ============================================================================
nhom('Ảnh 3, 6, 8, 12, 15, 21, 23, 24, 28: tiêu đề lớn không tính trùng lặp');

[
    'CHƯƠNG 1', 'CHƯƠNG I', 'CHƯƠNG 2', 'CHƯƠNG 4: MÔ PHỎNG CSDL QUẢN LÝ KHÁCH SẠN',
    'PHẦN 1: CƠ SỞ LÝ LUẬN', 'PHẦN III : Kết Luận', 'MỞ ĐẦU', 'KẾT LUẬN',
    'MỤC LỤC', 'TÀI LIỆU THAM KHẢO', 'DANH MỤC HÌNH ẢNH', 'LỜI CẢM ƠN',
    'NHẬT KÝ THỰC HIỆN ĐỀ TÀI', 'PHỤ LỤC', 'TỔNG QUAN VỀ ĐỀ TÀI',
    'TỔNG QUAN VỀ NGÔN NGỮ C#', 'CƠ SỞ LÝ THUYẾT', 'KHÁI QUÁT CHUNG',
    'GIỚI THIỆU VỀ ĐƠN VỊ THỰC TẬP', 'PHẦN NỘI DUNG'
].forEach(dong => kiemTra(`tiêu đề lớn: "${dong}"`, laTieuDeLon(dong), true));

// Tiêu đề gõ bằng phím Tab hoặc nhiều dấu cách vẫn phải nhận ra
kiemTra('tiêu đề có tab', laTieuDeLon('CHƯƠNG\t1'), true);
kiemTra('tiêu đề nhiều dấu cách', laTieuDeLon('CHƯƠNG     2'), true);
kiemTra('tiêu đề có dấu cách cứng', laTieuDeLon('MỤC LỤC'), true);

// ============================================================================
nhom('Ảnh 4, 7, 9, 13, 14, 20: tiêu đề con không tính trùng lặp');

[
    '1.1', '1.1.', '1.2. Các thông tin cần lưu trữ', '1.2.1. Quản lý tuyến bay',
    '1.5Cơ sở vật chất', '1.1 Mô hình dữ liệu', '2.2.4 Ý nghĩa của banner',
    'I.', 'I. BANNER LÀ GÌ? LỊCH SỬ HÌNH THÀNH', 'a. Chọn đúng phần mềm thiết kế lịch',
    'b. Sử dụng một kiểu thiết kế mang tính đồng nhất', 'c. Phối màu trực tiếp',
    '4. Thiết kế lịch để bàn cần chú ý', '1.', '2.', '1.1.1 Khái niệm'
].forEach(dong => kiemTra(`tiêu đề con: "${dong}"`, laTieuDeCon(dong), true));

// ============================================================================
nhom('Ảnh 25: "1." đầu dòng nhưng là nội dung thì phải giữ');

const noiDungCoSo =
    '1. Marketing và Quảng cáo: Trong lĩnh vực tiếp thị và quảng cáo, banner '
    + 'được sử dụng để quảng cáo sản phẩm, dịch vụ hoặc sự kiện.';

kiemTra('nội dung đánh số không bị coi là đề mục', laTieuDeCon(noiDungCoSo), false);
kiemTra(
    'nội dung đánh số được giữ, chỉ bỏ số thứ tự',
    tachCau(noiDungCoSo)[0].startsWith('Marketing và Quảng cáo'),
    true
);

// ============================================================================
nhom('Ảnh 1, 2: dòng mục lục phải bị bỏ');

[
    'LỜI CẢM ƠN.......................................................7',
    'CHƯƠNG 1.........................................................13',
    '1.1.2. Hướng phát triển của đề tài:..............................24',
    '2.2.4. Những ưu nhược điểm của phần mềm CorelDRAW................31',
    'TÀI LIỆU THAM KHẢO...............................................36',
    'Thông tin chung..................................................',
    'GIỚI THIỆU VỀ ĐƠN VỊ THỰC TẬP....................................7'
].forEach(dong => kiemTra(`mục lục: "${dong.slice(0, 40)}"`, laDongMucLuc(dong), true));

kiemTra(
    'câu văn kết thúc bằng dấu ba chấm không bị coi là mục lục',
    laDongMucLuc('Nó giúp người dùng tạo ra và cấu trúc những thành phần có trong website...'),
    false
);

// ============================================================================
nhom('Ảnh 29–34: chú thích hình, bảng không tính trùng lặp');

[
    'Hình 1.1. CSDL Chuyến bay', 'Hình 2.1 Quan hệ giữa Tuyến bay và Chuyến bay',
    'Bảng 2.1. Hanhkhach', 'Hình 2.3.1.a', 'Hình 1. Hình minh họa lịch để bàn',
    'Hình ảnh 1.2. Vai trò chức năng của bộ văn phòng', 'Hình 1.2.1',
    'Sơ đồ 3.1: Quy trình xử lý', 'Biểu đồ 2: Thống kê'
].forEach(dong => kiemTra(`chú thích: "${dong}"`, laChuThichHinhBang(dong), true));

// ============================================================================
nhom('Ảnh 18: địa danh, ngày tháng và chữ ký cuối bài');

[
    'Sơn Tây , Ngày 26 Tháng 06 Năm 2024',
    'Hà Nội, ngày 12 tháng 5 năm 2024',
    'Sinh viên thực hiện',
    'Ngày ... tháng ... năm ...'
].forEach(dong => kiemTra(`chữ ký: "${dong}"`, laDongNgayThangChuKy(dong), true));

// ============================================================================
nhom('Ảnh 22, 26: phần bố cục đề tài');

[
    'V. Bố cục của đề tài',
    'Đề tài gồm 2 chương như sau:',
    'Đề tài gồm …3…chương như sau:',
    'Chương 1 : TÌM HIỂU VỀ ĐIỀU PHỐI TIẾN TRÌNH',
    'Chương II : Phân tích yêu cầu'
].forEach(dong => kiemTra(`bố cục: "${dong}"`, laDongBoCucDeTai(dong), true));

// ============================================================================
nhom('Trang bìa và thông tin hồ sơ');

[
    'Trường Đại học Công Nghiệp Việt- Hung',
    'Khoa Công Nghệ Thông Tin',
    'Mã sinh viên: 2200606',
    'Lớp: 4628CNTT',
    'Giảng viên hướng dẫn: Chu Thị Thanh Xuân',
    'Email: sinhvien@example.com',
    '----------o0o----------'
].forEach(dong => kiemTra(`hồ sơ: "${dong}"`, laThongTinHoSo(dong), true));

// ============================================================================
nhom('Bảng biểu trong bản PDF bị dán liền các ô');

kiemTra(
    'hàng bảng bị dính liền',
    laHangBangBiDinhLien('Bộ phậnMàu đồng phụcGhi chú Cán bộ quản lýXanh lá'),
    true
);
kiemTra(
    'câu văn bình thường không bị nhận nhầm',
    laHangBangBiDinhLien('Hội đồng Quản trị (HĐQT): Đây là cơ quan cao nhất của công ty.'),
    false
);

// ============================================================================
nhom('Ảnh 35: bỏ ký hiệu đầu dòng nhưng giữ nội dung');

const dongGachDau =
    '- Loại thực thể(Entity Type): Là một loại đối tượng cần quản lý trong CSDL, '
    + 'chẳng hạn: khach_hang, phong, dich_vu, theo_doi_dv, thue_phong.';

kiemTra(
    'dấu gạch đầu dòng bị bỏ, nội dung giữ nguyên',
    tachCau(dongGachDau)[0].startsWith('Loại thực thể(Entity Type)'),
    true
);

kiemTra(
    'dấu cộng đầu dòng bị bỏ',
    tachCau('+ Quản lý tài chính: Theo dõi và quản lý toàn bộ nguồn vốn của công ty.')[0]
        .startsWith('Quản lý tài chính'),
    true
);

// ============================================================================
nhom('Tiêu đề bị xuống dòng giữa chừng (phím Enter)');

kiemTra(
    'CHƯƠNG 1 / CƠ SỞ LÝ THUYẾT bị bỏ cả hai dòng',
    tachCau('CHƯƠNG 1\nCƠ SỞ LÝ THUYẾT\nĐây là phần nội dung thật của bài viết cần được tính.'),
    ['Đây là phần nội dung thật của bài viết cần được tính.']
);

kiemTra(
    'Chương I / Nội dung bị bỏ cả hai dòng',
    tachCau('Chương I\nNội dung\nMột câu nội dung đủ dài để được giữ lại trong kết quả.'),
    ['Một câu nội dung đủ dài để được giữ lại trong kết quả.']
);

// ============================================================================
nhom('Tách câu: không được làm hỏng chữ của sinh viên');

kiemTra(
    'chữ "thực tập." không bị đổi thành "thực tậP."',
    tachCauTrongDoan('Em đã hoàn thành kỳ thực tập. Chị đã giúp em rất nhiều.'),
    ['Em đã hoàn thành kỳ thực tập.', 'Chị đã giúp em rất nhiều.']
);

kiemTra(
    'số thập phân không bị cắt câu',
    tachCauTrongDoan('Doanh thu đạt 1.5 tỷ đồng trong quý này.'),
    ['Doanh thu đạt 1.5 tỷ đồng trong quý này.']
);

kiemTra(
    'chữ viết tắt TP. không cắt câu',
    tachCauTrongDoan('Công ty đặt tại TP. Hồ Chí Minh từ năm 2010.'),
    ['Công ty đặt tại TP. Hồ Chí Minh từ năm 2010.']
);

// ============================================================================
nhom('Trùng cả bài (ngưỡng 80%)');

kiemTra(
    'một mẫu phủ 100% bài nộp',
    phatHienTrungToanBai(
        [{ id_bao_cao: 'BC001', ten_bao_cao: 'Mẫu A', so_cau_trung: 50, so_tu_trung: 1000 }],
        1000
    ).trung_toan_bai,
    true
);

kiemTra(
    'một mẫu phủ 85% bài nộp',
    phatHienTrungToanBai(
        [{ id_bao_cao: 'BC001', ten_bao_cao: 'Mẫu A', so_cau_trung: 40, so_tu_trung: 850 }],
        1000
    ).trung_toan_bai,
    true
);

kiemTra(
    'một mẫu phủ 60% thì chưa phải trùng cả bài',
    phatHienTrungToanBai(
        [{ id_bao_cao: 'BC001', ten_bao_cao: 'Mẫu A', so_cau_trung: 30, so_tu_trung: 600 }],
        1000
    ).trung_toan_bai,
    false
);

kiemTra(
    'hai mẫu mỗi mẫu 50% thì không phải trùng cả bài với mẫu nào',
    phatHienTrungToanBai(
        [
            { id_bao_cao: 'BC001', so_tu_trung: 500, so_cau_trung: 20 },
            { id_bao_cao: 'BC002', so_tu_trung: 500, so_cau_trung: 20 }
        ],
        1000
    ).trung_toan_bai,
    false
);

// ============================================================================
nhom('Lọc vùng: bìa, lời cảm ơn, mục lục bị bỏ trọn khối');

const baiMau = [
    'TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP VIỆT - HUNG',
    'KHOA CÔNG NGHỆ THÔNG TIN',
    'Mã sinh viên: 2100154',
    'LỜI CẢM ƠN',
    'Em xin gửi lời cảm ơn chân thành đến các thầy cô trong khoa đã tận tình giúp đỡ.',
    'MỤC LỤC',
    'CHƯƠNG 1.........................................................5',
    'CHƯƠNG 1',
    'Đây là nội dung thật sự của báo cáo và cần được đem đi so trùng với các bài khác.'
].join('\n');

const conLai = locNoiDungHocThuat(baiMau);

kiemTra('bỏ được trang bìa', conLai.includes('KHOA CÔNG NGHỆ THÔNG TIN'), false);
kiemTra('bỏ được lời cảm ơn', conLai.includes('lời cảm ơn chân thành'), false);
kiemTra('bỏ được dòng mục lục', conLai.includes('.....'), false);
kiemTra('giữ được nội dung', conLai.includes('nội dung thật sự của báo cáo'), true);

// ============================================================================
nhom('Mốc lấy nội dung: từ "Mở đầu", không có thì từ "Chương" hoặc "Phần"');

// Giáo viên chốt: lấy nội dung từ phần có tiêu đề Mở đầu; không có phần Mở đầu
// thì chuyển sang Chương hoặc Phần, lấy đến hết nội dung.
{
    const bai = [
        'TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP VIỆT – HUNG',
        'PHÂN TÍCH THIẾT KẾ HỆ THỐNG VÀ XÂY DỰNG CSDL CHO HỆ THỐNG QUẢN LÝ CÔNG TY HÀNG KHÔNG',
        'Giáo viên hướng dẫn : Ths. Đặng Thị Huệ',
        'Yêu cầu về kiến thức, kỹ năng:',
        'Phân tích hệ thống và chuyển đổi mô hình E-R sang lược đồ quan hệ.',
        'MỞ ĐẦU',
        'I. Đặt vấn đề',
        'Phân tích, thiết kế hệ thống và xây dựng cơ sở dữ liệu cho hệ thống quản lý công ty '
        + 'hàng không là một nhiệm vụ phức tạp và quan trọng.'
    ].join('\n');

    const cacCau = tachCau(locNoiDungHocThuat(bai));

    kiemTra(
        'bỏ hết phần trước "MỞ ĐẦU"',
        cacCau.some(c => c.includes('Yêu cầu về kiến thức') || c.includes('Đặng Thị Huệ')),
        false
    );
    kiemTra(
        'giữ nội dung ngay sau "MỞ ĐẦU"',
        cacCau.some(c => c.includes('nhiệm vụ phức tạp và quan trọng')),
        true
    );
}

{
    const bai = [
        'TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP VIỆT – HUNG',
        'Mã sinh viên: 2200606',
        'LỜI CẢM ƠN',
        'Em xin gửi lời cảm ơn chân thành đến các thầy cô trong khoa đã tận tình giúp đỡ.',
        'CHƯƠNG 1',
        'TỔNG QUAN VỀ ĐỀ TÀI',
        'Nội dung chương này trình bày toàn bộ cơ sở lý thuyết của đề tài đang thực hiện.'
    ].join('\n');

    const cacCau = tachCau(locNoiDungHocThuat(bai));

    kiemTra(
        'không có Mở đầu thì lấy từ "CHƯƠNG 1"',
        cacCau.some(c => c.includes('cơ sở lý thuyết của đề tài')),
        true
    );
    kiemTra(
        'bỏ phần trước "CHƯƠNG 1"',
        cacCau.some(c => c.includes('lời cảm ơn chân thành')),
        false
    );
}

{
    // "MỞ ĐẦU" nằm trong mục lục thì không được coi là mốc, nếu không cả khối
    // mục lục phía sau lại bị tính thành nội dung.
    const bai = [
        'MỤC LỤC',
        'MỞ ĐẦU.........................................................1',
        'CHƯƠNG 1.......................................................5',
        'MỞ ĐẦU',
        'Đây mới là phần nội dung thật sự của bài viết cần đem đi so trùng.'
    ].join('\n');

    const cacCau = tachCau(locNoiDungHocThuat(bai));

    kiemTra(
        'dòng "MỞ ĐẦU" trong mục lục không được tính làm mốc',
        cacCau.some(c => c.includes('.....')),
        false
    );
    kiemTra(
        'lấy đúng từ "MỞ ĐẦU" thật trong thân bài',
        cacCau.some(c => c.includes('phần nội dung thật sự')),
        true
    );
}

// ============================================================================
console.log('\n' + '='.repeat(70));

if (soHong) {
    console.log(cacLoi.join('\n'));
}

console.log(`Kết quả: ${soDat} đạt, ${soHong} hỏng (tổng ${soDat + soHong})`);
console.log('='.repeat(70));

process.exit(soHong ? 1 : 0);
