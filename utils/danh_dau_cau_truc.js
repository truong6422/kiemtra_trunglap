/**
 * ============================================================================
 * NHÃN CẤU TRÚC TÀI LIỆU (utils/danh_dau_cau_truc.js)
 * ----------------------------------------------------------------------------
 * Khi đọc tệp Word, ta biết chắc dòng nào là tiêu đề, dòng nào là chú thích
 * hình, dòng nào nằm trong ô bảng — vì chính tệp Word khai báo như vậy. Thông
 * tin đó quý hơn mọi biểu thức đoán mò, nên phải mang được sang bước lọc nội
 * dung thay vì vứt đi rồi đoán lại.
 *
 * Nhãn được gắn vào đầu dòng bằng các ký tự điều khiển không bao giờ xuất hiện
 * trong văn bản của sinh viên, và bị gỡ sạch trước khi câu được lưu xuống cơ sở
 * dữ liệu.
 * ============================================================================
 */

//  và  là ký tự điều khiển, không có trên bàn phím và không nằm
// trong bất kỳ bảng mã tiếng Việt nào.
const MO_NHAN = '';
const DONG_NHAN = '';

const NHAN = {
    TIEU_DE: 'TD',       // Heading1..9, Title, Subtitle
    CHU_THICH: 'CT',     // Caption: chú thích của hình, bảng
    MUC_LUC: 'ML',       // TOC1..9, TOCHeading
    BANG: 'BG',          // Nội dung nằm trong ô của bảng
    HOP_VAN_BAN: 'HVB'   // Shape, textbox
};

function ganNhan(nhan, noiDung) {
    return `${MO_NHAN}${nhan}${DONG_NHAN}${noiDung}`;
}

function docNhan(dong) {
    if (!dong || dong[0] !== MO_NHAN) {
        return null;
    }

    const viTriDong = dong.indexOf(DONG_NHAN);

    if (viTriDong < 0) {
        return null;
    }

    return dong.slice(1, viTriDong);
}

function boNhan(dong) {
    if (!dong || typeof dong !== 'string') {
        return dong || '';
    }

    // Bỏ nhãn ở đầu dòng lẫn mọi nhãn sót lại giữa chuỗi (do các bước gộp dòng)
    return dong.replace(
        new RegExp(`${MO_NHAN}[A-Z]{2,3}${DONG_NHAN}`, 'g'),
        ''
    );
}

function coNhan(dong, ...danhSachNhan) {
    const nhan = docNhan(dong);
    return nhan !== null && danhSachNhan.includes(nhan);
}

module.exports = {
    NHAN,
    MO_NHAN,
    DONG_NHAN,
    ganNhan,
    docNhan,
    boNhan,
    coNhan
};
