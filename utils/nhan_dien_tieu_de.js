/**
 * ============================================================================
 * NHẬN DIỆN TIÊU ĐỀ VÀ MỤC LỤC (utils/nhan_dien_tieu_de.js)
 * ----------------------------------------------------------------------------
 * Giáo viên yêu cầu: tiêu đề lớn, tiêu đề con và mục lục đều không được tính
 * vào nội dung so trùng. Thực tế sinh viên gõ tiêu đề rất tuỳ tiện — xuống dòng
 * giữa chừng, đệm bằng phím Tab, gõ thừa dấu cách — nên mọi so khớp ở đây đều
 * làm trên chuỗi đã chuẩn hoá khoảng trắng.
 * ============================================================================
 */

const { NHAN, coNhan, boNhan } = require('./danh_dau_cau_truc');

/**
 * Đưa một dòng về dạng so khớp được: tab và mọi loại khoảng trắng lạ (kể cả
 * dấu cách cứng của Word) gom thành một dấu cách đơn.
 */
function chuanHoaKhoangTrang(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/[\t  -   　]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Các đề mục lớn cố định của một báo cáo, không phụ thuộc đánh số.
// Phần đuôi cho phép có thêm chữ ("DANH MỤC HÌNH ẢNH", "NHẬT KÝ THỰC TẬP").
const DE_MUC_CO_DINH = new RegExp(
    '^(' +
    'LỜI CẢM ƠN|LỜI CAM ĐOAN|CAM ĐOAN|LỜI MỞ ĐẦU|LỜI NÓI ĐẦU|MỞ ĐẦU|' +
    'PHẦN MỞ ĐẦU|ĐẶT VẤN ĐỀ|MỤC LỤC|DANH MỤC|NHẬT KÝ|NHẬN XÉT|' +
    'KẾT LUẬN|TỔNG KẾT|TÀI LIỆU THAM KHẢO|PHỤ LỤC|PHẦN NỘI DUNG|' +
    'NỘI DUNG BÁO CÁO|LỜI KẾT' +
    ')(?![\\p{L}\\p{N}])',
    'iu'
);

const CHUONG_HOAC_PHAN = /^(CHƯƠNG|CHUONG|PHẦN|PHAN|CHAPTER|PART)\s*[:\-]?\s*(\d+|[IVXLCDM]+)\b/iu;

/**
 * Tiêu đề nhận ra qua cách trình bày chứ không qua tên gọi.
 *
 * Bản PDF không còn giữ khai báo kiểu đoạn của Word, nên những tiêu đề tự đặt
 * như "GIỚI THIỆU VỀ ĐƠN VỊ THỰC TẬP" hay "TỔNG QUAN VỀ ĐỀ TÀI" chỉ còn nhận ra
 * được bằng hình thức: viết hoa gần hết, ngắn, không có dấu kết câu ở cuối.
 */
function laTieuDeTheoHinhThuc(dong) {
    const t = chuanHoaKhoangTrang(boNhan(dong));

    if (!t || t.length < 4 || t.length > 80) {
        return false;
    }

    if (/[.!?,;:]$/.test(t)) {
        return false;
    }

    // Phải là chữ, không phải một dãy số hay ký hiệu
    const chuCai = t.replace(/[^\p{L}]/gu, '');

    if (chuCai.length < 4) {
        return false;
    }

    if (t.split(/\s+/).length < 2) {
        return false;
    }

    const soChuHoa = [...chuCai].filter(c => c === c.toUpperCase()).length;

    return soChuHoa / chuCai.length >= 0.7;
}

/**
 * Tiêu đề cấp lớn: CHƯƠNG 1, PHẦN II, MỞ ĐẦU, KẾT LUẬN, TÀI LIỆU THAM KHẢO...
 *
 * Tệp Word còn tự khai báo kiểu đoạn là Heading; khai báo đó chắc chắn hơn mọi
 * biểu thức nên được tin trước.
 */
function laTieuDeLon(dong) {
    if (coNhan(dong, NHAN.TIEU_DE)) {
        return true;
    }

    const t = chuanHoaKhoangTrang(boNhan(dong));

    if (!t) {
        return false;
    }

    return (
        DE_MUC_CO_DINH.test(t) ||
        CHUONG_HOAC_PHAN.test(t) ||
        laTieuDeTheoHinhThuc(t)
    );
}

// Các kiểu đánh số đề mục con. Mỗi mẫu bắt phần ký hiệu ở đầu dòng; phần chữ
// phía sau được xét riêng để không xoá nhầm nội dung.
// Mỗi mẫu tách dòng thành ba phần: ký hiệu đánh số, khoảng trắng ngăn cách,
// phần chữ còn lại.
const KY_HIEU_DE_MUC = [
    // 1.2.3 / 1.2.3. / 1.2 / 1.
    /^(\d+(?:[.,]\d+)*[.):]?)([ \t]*)(.*)$/,
    // I. / II) / IV:
    /^([IVXLCDM]+[.):])([ \t]*)(.*)$/i,
    // a. / b) / A:
    /^([A-Za-zÀ-Ỹà-ỹ][.):])([ \t]*)(.*)$/
];

// Ngưỡng để phân biệt "1. Banner là gì" (đề mục) với "1. Marketing và Quảng
// cáo: Trong lĩnh vực tiếp thị..." (nội dung có đánh số). Giáo viên đã chỉ rõ
// trường hợp thứ hai là nội dung, phải giữ lại.
const DO_DAI_COI_LA_NOI_DUNG = 80;

/**
 * Tách ký hiệu đề mục ở đầu dòng.
 *
 * @returns {{ kyHieu: string, phanChu: string } | null}
 */
function tachKyHieuDeMuc(dong) {
    const t = chuanHoaKhoangTrang(dong);

    for (const mau of KY_HIEU_DE_MUC) {
        const khop = t.match(mau);

        if (khop && khop[1]) {
            const kyHieu = khop[1].trim();
            const phanChu = (khop[3] || '').trim();

            // "1.1Logo" — Word không có dấu cách sau số. Chỉ chấp nhận khi phần
            // ký hiệu thật sự là đánh số, tránh cắt nhầm chữ trong câu.
            if (!khop[2] && phanChu && !/[.):]$/.test(kyHieu)) {
                continue;
            }

            return { kyHieu, phanChu };
        }
    }

    // 1.1Logo / 1.5Cơ sở vật chất — số dính liền chữ hoa
    const dinhLien = t.match(/^(\d+(?:[.,]\d+)+)([A-ZÀ-Ỹ].*)$/);

    if (dinhLien) {
        return {
            kyHieu: dinhLien[1],
            phanChu: dinhLien[2].trim()
        };
    }

    return null;
}

/**
 * Tiêu đề cấp con: 1.1, 1.2.1, I., a), "2.2.4 Ý nghĩa của banner"...
 *
 * Không tính là tiêu đề khi phần chữ phía sau đã dài như một câu hoặc kết thúc
 * bằng dấu chấm câu — đó là nội dung được sinh viên đánh số, phải giữ.
 */
function laTieuDeCon(dong) {
    const tach = tachKyHieuDeMuc(dong);

    if (!tach) {
        return false;
    }

    const { kyHieu, phanChu } = tach;

    // Ký hiệu đứng một mình: "1.", "I.", "a)"
    if (!phanChu) {
        return true;
    }

    if (phanChu.length >= DO_DAI_COI_LA_NOI_DUNG) {
        return false;
    }

    // "1. Marketing và Quảng cáo: Trong lĩnh vực tiếp thị..." đã bị chặn ở trên
    // bằng độ dài. Ở đây chặn nốt các câu ngắn nhưng có kết thúc rõ ràng.
    if (/[.!?]$/.test(phanChu) && phanChu.split(/\s+/).length > 8) {
        return false;
    }

    // Đánh số nhiều cấp (1.2.3) gần như luôn là đề mục
    if (/^\d+(?:[.,]\d+)+/.test(kyHieu)) {
        return true;
    }

    return true;
}

/**
 * Dòng mục lục: có dấu chấm nối tới số trang, hoặc tên mục rồi số trang ở cuối.
 *
 * Bản PDF thường làm đứt dòng mục lục ở chỗ dấu chấm nối, đẩy số trang sang đầu
 * dòng sau; những trường hợp đó được nối lại từ trước khi gọi vào đây.
 */
function laDongMucLuc(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t) {
        return false;
    }

    // ........ 12   hoặc   …… 12
    if (/[.·…]{3,}\s*\d{1,4}\s*$/.test(t)) {
        return true;
    }

    // Dấu chấm nối dài nhưng bản PDF cắt mất số trang ở cuối. Đòi từ năm dấu
    // chấm trở lên để không nhầm với câu văn kết thúc bằng dấu ba chấm.
    if (/[.·…]{5,}\s*\d{0,4}\s*$/.test(t)) {
        return true;
    }

    // Dòng chỉ gồm dấu chấm nối (phần đuôi mục lục bị PDF cắt rời)
    if (/^[.·…]{3,}\s*\d*\s*$/.test(t)) {
        return true;
    }

    // Mục lục in bằng bảng thì không còn dấu chấm nối, chỉ còn tên mục và số
    // trang: "CHƯƠNG 1: TÌM HIỂU ... 8", "1.2.1 Quản lý tuyến bay 12".
    const khongCoSoTrang = t.replace(/\s+\d{1,3}\s*$/, '');

    if (khongCoSoTrang === t || t.length >= 120) {
        return false;
    }

    const laDeMuc =
        CHUONG_HOAC_PHAN.test(khongCoSoTrang) ||
        /^\d+(?:[.,]\d+)*\s+\S/.test(khongCoSoTrang) ||
        /^[IVXLCDM]+\.\s+\S/i.test(khongCoSoTrang) ||
        DE_MUC_CO_DINH.test(khongCoSoTrang);

    if (!laDeMuc) {
        return false;
    }

    // Phải còn tên mục sau khi gỡ phần đánh số, nếu không thì "CHƯƠNG 1" đứng
    // làm tiêu đề cũng bị nhận nhầm thành một dòng mục lục trỏ tới trang 1.
    const tenMuc = khongCoSoTrang
        .replace(CHUONG_HOAC_PHAN, '')
        .replace(/^\d+(?:[.,]\d+)*\s*[.):]?/, '')
        .replace(/^[IVXLCDM]+\s*[.):]/i, '')
        .replace(/[^\p{L}]/gu, '');

    return tenMuc.length >= 3;
}

/**
 * Dòng chỉ chứa số trang.
 */
function laSoTrang(dong) {
    return /^\s*\d{1,4}\s*$/.test(dong || '');
}

module.exports = {
    chuanHoaKhoangTrang,
    laTieuDeLon,
    laTieuDeTheoHinhThuc,
    laTieuDeCon,
    laDongMucLuc,
    laSoTrang,
    tachKyHieuDeMuc,
    CHUONG_HOAC_PHAN,
    DE_MUC_CO_DINH
};
