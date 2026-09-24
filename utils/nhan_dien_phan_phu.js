/**
 * ============================================================================
 * NHẬN DIỆN PHẦN PHỤ CỦA BÁO CÁO (utils/nhan_dien_phan_phu.js)
 * ----------------------------------------------------------------------------
 * Những phần dưới đây có mặt trong mọi báo cáo và giống nhau giữa các sinh
 * viên, nên nếu đem đi so trùng thì bài nào cũng "trùng" với bài nào. Giáo viên
 * đã liệt kê cụ thể: chú thích hình/bảng, nội dung trong bảng biểu, dòng địa
 * danh — ngày tháng — chữ ký, và phần liệt kê bố cục đề tài.
 * ============================================================================
 */

const { chuanHoaKhoangTrang } = require('./nhan_dien_tieu_de');

/**
 * Chú thích của hình, bảng, biểu đồ, sơ đồ.
 * Bắt cả "Hình 1.1", "Hình ảnh 1.2", "Bảng 2.1", "Hình 1.2.1", "Figure 3".
 */
function laChuThichHinhBang(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t) {
        return false;
    }

    return /^(hình(\s*ảnh)?|bảng|biểu\s*đồ|sơ\s*đồ|đồ\s*thị|figure|fig|table|image|picture)\s*[\-.]?\s*\d+(\s*[.,]\s*\d+)*\s*[.:)\-]?/i
        .test(t);
}

/**
 * Dòng thuộc trang bìa hoặc trang thông tin: tên trường, khoa, chuyên ngành,
 * mã sinh viên, lớp, giảng viên hướng dẫn, điện thoại, email...
 */
function laThongTinHoSo(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t) {
        return false;
    }

    // Dòng khai theo mẫu "<nhãn>: <giá trị>" thì nhãn đã đủ để kết luận, không
    // cần xét độ dài — phần giá trị có khi kéo dài cả tên công ty lẫn địa chỉ.
    const laDongKhaiTheoNhan = (
        /^(bộ\s*môn|ngành|chuyên\s*ngành|khoá|khóa|niên\s*khoá|niên\s*khóa)\s*[:：]/i.test(t) ||
        /^(họ\s*(và\s*)?tên|họ\s*tên\s*sinh\s*viên|mã\s*(số\s*)?sinh\s*viên|msv|mssv|lớp|sđt|số\s*điện\s*thoại|điện\s*thoại|email|e-mail)\s*[:：]/i.test(t) ||
        /^(tên\s*)?(đơn\s*vị|cơ\s*quan|nơi|địa\s*điểm)\s*thực\s*tập\s*[:：]/i.test(t) ||
        /^(vị\s*trí|thời\s*gian)\s*thực\s*tập\s*[:：]/i.test(t) ||
        /^người\s*hướng\s*dẫn\s*(tại\s*nơi\s*thực\s*tập)?\s*[:：]/i.test(t) ||
        /^(giảng\s*viên|giáo\s*viên|gvhd|cán\s*bộ\s*hướng\s*dẫn)\s*[:：]/i.test(t)
    );

    if (laDongKhaiTheoNhan) {
        return true;
    }

    if (t.length > 160) {
        return false;
    }

    return (
        /^(trường\s+)?(đại\s*học|cao\s*đẳng|học\s*viện)\b/i.test(t) ||
        /^khoa\s+/i.test(t) ||
        /^(giảng\s*viên|giáo\s*viên|người\s*hướng\s*dẫn|gvhd|cán\s*bộ\s*hướng\s*dẫn|sinh\s*viên\s*thực\s*hiện|người\s*thực\s*hiện)/i.test(t) ||
        /^(đồ\s*án|khoá\s*luận|khóa\s*luận|báo\s*cáo)\s+(học\s*phần|tốt\s*nghiệp|thực\s*tập|môn\s*học)/i.test(t) ||
        /^-{3,}o0o-{3,}$/i.test(t) ||
        /^[-=*_~.•]{3,}$/.test(t)
    );
}

/**
 * Địa danh — ngày tháng — chữ ký ở cuối bài.
 * Ví dụ giáo viên chỉ ra: "Sơn Tây, ngày 26 tháng 06 năm 2024" rồi tên sinh viên.
 */
function laDongNgayThangChuKy(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t) {
        return false;
    }

    return (
        // Sơn Tây, ngày 26 tháng 06 năm 2024
        /^[\p{Lu}][\p{L}\s]{1,30},?\s*ngày\s+.*(tháng|năm)/iu.test(t) ||
        /^ngày\s+\d{0,2}\s*tháng\s+\d{0,2}\s*năm\s*\d{0,4}/i.test(t) ||
        /^,?\s*ngày\s*\.{2,}/i.test(t) ||
        // Hà Nội, năm 2024
        /^[\p{L}\s]{2,30},?\s*(năm\s*)?\d{4}\s*$/iu.test(t) && /^(hà nội|tp|thành phố|sơn tây|hải phòng|đà nẵng|huế|cần thơ)/i.test(t) ||
        /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\s*$/.test(t) ||
        /^(sinh\s*viên\s*(thực\s*hiện|ký\s*tên)?|người\s*viết|người\s*thực\s*hiện|ký\s*(và\s*)?ghi\s*(rõ\s*)?họ\s*tên|xác\s*nhận\s*của)\s*[:：]?\s*$/i.test(t) ||
        /^(trân\s*trọng|em\s*xin\s*chân\s*thành\s*cảm\s*ơn\s*!?|xin\s*chân\s*thành\s*cảm\s*ơn\s*!?)\s*$/i.test(t)
    );
}

/**
 * Tên người đứng một mình — phần ký tên ở cuối báo cáo.
 *
 * Giáo viên chỉ rõ: "chỗ Sơn Tây, ngày tháng năm rồi chữ ký sinh viên không
 * được tính trùng lặp". Dòng ngày tháng đã có hàm riêng; còn lại là dòng tên,
 * gồm vài từ viết hoa chữ đầu, không dấu câu, không chữ số.
 */
function laTenNguoiDungRieng(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t || t.length > 40) {
        return false;
    }

    if (/[\d.,;:!?()\-–—/]/.test(t)) {
        return false;
    }

    const cacTu = t.split(/\s+/);

    if (cacTu.length < 1 || cacTu.length > 5) {
        return false;
    }

    return cacTu.every(tu => /^[\p{Lu}]/u.test(tu));
}

/**
 * Phần liệt kê bố cục đề tài.
 *
 * Giáo viên nêu ví dụ:
 *   V. Bố cục của đề tài
 *   Đề tài gồm 2 chương như sau:
 *   Chương I  : Cơ sở lý thuyết
 *   Chương II : Xây dựng cơ sở dữ liệu
 * Cả cụm này là khung mẫu, bài nào cũng viết như nhau nên không tính trùng.
 */
function laDongBoCucDeTai(dong) {
    // Mục này gần như luôn được đánh số ("V. Bố cục của đề tài"), nên phải gỡ
    // ký hiệu đề mục ra trước khi so khớp.
    const t = chuanHoaKhoangTrang(dong)
        .replace(/^(\d+(?:[.,]\d+)*|[IVXLCDM]+|[A-Za-z])[.):]\s*/i, '');

    if (!t) {
        return false;
    }

    return (
        /^(bố\s*cục\s*(của\s*)?(đề\s*tài|báo\s*cáo|đồ\s*án)|kết\s*cấu\s*(của\s*)?(đề\s*tài|báo\s*cáo|đồ\s*án))/i.test(t) ||
        /^(đề\s*tài|báo\s*cáo|đồ\s*án|khoá\s*luận|khóa\s*luận)\s+(này\s+)?(gồm|bao\s*gồm|được\s*chia\s*(thành|làm))\s+[.…\d]*\s*(chương|phần)/i.test(t) ||
        // Chương I : Cơ sở lý thuyết
        /^(chương|phần|chapter)\s+(\d+|[IVXLCDM]+)\s*[:\-–]\s*\S/i.test(t)
    );
}

/**
 * Câu lệnh SQL và từ khoá kỹ thuật đứng một mình trong bảng mã nguồn.
 */
function laTuKhoaKyThuatDonLe(dong) {
    const t = chuanHoaKhoangTrang(dong).toUpperCase();

    return [
        'GO', 'AS', 'SET', 'FROM', 'WHERE', 'VALUES', 'BEGIN', 'END',
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'STT', 'TT', 'NULL'
    ].includes(t);
}

/**
 * Tiêu đề cột hay nhãn ô thường gặp trong bảng biểu của báo cáo.
 */
function laNhanTrongBang(dong) {
    const t = chuanHoaKhoangTrang(dong).toLowerCase();

    return [
        'stt', 'tt', 'tên cột', 'kiểu dữ liệu', 'mô tả', 'ghi chú', 'thời gian',
        'công việc', 'kết quả đạt được', 'hạn chế', 'hướng phát triển',
        'tên viết tắt', 'từ viết tắt', 'tên đầy đủ', 'viết đầy đủ',
        'giải thích nghĩa', 'dịch ra tiếng việt', 'chữ viết tắt', 'giải thích',
        'sinh viên', 'ký tên', 'sinh viên thực hiện', 'ký, ghi rõ họ tên',
        'ký, ghi họ tên', 'ký và ghi họ tên', 'ký và ghi rõ họ tên',
        'nội dung', 'tuần', 'ngày', 'ràng buộc', 'khoá chính', 'khóa chính'
    ].includes(t);
}

/**
 * Một hàng của bảng biểu bị PDF dán liền thành một dòng.
 *
 * Bản PDF không giữ lại cấu trúc bảng, các ô trên cùng một hàng bị nối sát nhau
 * không có dấu cách: "Bộ phậnMàu đồng phụcGhi chú", "Chữ viết tắtGiải thích".
 * Chỗ nối để lại dấu vết là một chữ thường đứng ngay trước một chữ hoa. Hai chỗ
 * nối trở lên trên cùng một dòng thì gần như chắc chắn là một hàng của bảng,
 * mà nội dung bảng thì giáo viên yêu cầu không tính.
 */
function laHangBangBiDinhLien(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t || t.length < 12) {
        return false;
    }

    const cacCho = t.match(/[\p{Ll}][\p{Lu}]/gu) || [];

    return cacCho.length >= 2;
}

module.exports = {
    laChuThichHinhBang,
    laHangBangBiDinhLien,
    laTenNguoiDungRieng,
    laThongTinHoSo,
    laDongNgayThangChuKy,
    laDongBoCucDeTai,
    laTuKhoaKyThuatDonLe,
    laNhanTrongBang
};
