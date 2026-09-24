/**
 * ============================================================================
 * CHUẨN HOÁ VĂN BẢN LẤY TỪ PDF (utils/chuan_hoa_van_ban_pdf.js)
 * ----------------------------------------------------------------------------
 * Giáo viên phản ánh: cùng một nội dung, bản Word và bản PDF cho tỉ lệ chênh
 * nhau rất nhiều. Nguyên nhân nằm ở chỗ PDF không lưu đoạn văn mà lưu từng
 * dòng chữ theo đúng vị trí in ra giấy:
 *
 * - Một câu bị bẻ thành nhiều dòng theo bề rộng trang.
 * - Số trang, tiêu đề chạy ở đầu/cuối trang nằm lẫn vào giữa nội dung.
 * - Dấu đầu dòng của Word chuyển thành ký tự riêng của phông Wingdings ().
 * - Dòng mục lục bị cắt mất số trang, hoặc dính số trang của mục kế tiếp.
 *
 * Bước này đưa văn bản PDF về đúng dạng "mỗi đoạn một dòng" như khi đọc Word,
 * để hai định dạng đi tiếp trên cùng một đường.
 * ============================================================================
 */

const {
    laSoTrang,
    laDongMucLuc,
    laTieuDeLon
} = require('./nhan_dien_tieu_de');

const { laChuThichHinhBang } = require('./nhan_dien_phan_phu');

/**
 * Ký tự nằm trong vùng dành riêng của Unicode (U+E000–U+F8FF) là dấu đầu dòng
 * vẽ bằng phông Symbol hoặc Wingdings, không phải chữ.
 */
function boKyTuPhongDacBiet(text) {
    return text
        .replace(/[-]/g, ' ')
        .replace(/[�]/g, ' ');
}

/**
 * Gỡ tiêu đề chạy đầu/cuối trang.
 *
 * Dòng nào lặp lại từ ba lần trở lên, ngắn, và không kết thúc bằng dấu câu thì
 * gần như chắc chắn là phần chạy trên mỗi trang chứ không phải nội dung.
 */
function goTieuDeChayTrang(cacDong) {
    const demLap = new Map();

    for (const dong of cacDong) {
        const khoa = dong.trim();

        if (!khoa || khoa.length > 80 || /[.!?]$/.test(khoa)) {
            continue;
        }

        demLap.set(khoa, (demLap.get(khoa) || 0) + 1);
    }

    const dongChayTrang = new Set();

    for (const [dong, soLan] of demLap) {
        if (soLan >= 3) {
            dongChayTrang.add(dong);
        }
    }

    if (!dongChayTrang.size) {
        return cacDong;
    }

    return cacDong.filter(dong => !dongChayTrang.has(dong.trim()));
}

// Số ký tự tối thiểu để coi một dòng là bị bẻ vì chạm mép trang. Khổ A4 với cỡ
// chữ 13–14 chứa khoảng 85–95 ký tự mỗi dòng; lấy 60 để còn chỗ cho dòng cuối
// đoạn và các đoạn thụt lề.
const DO_DAI_DONG_BI_BE = 60;

/**
 * Nối lại câu bị PDF bẻ theo bề rộng trang.
 *
 * Dòng trước chưa kết thúc bằng dấu câu và dòng sau không mở ra một mục mới thì
 * hai dòng vốn là một câu.
 */
function noiDongTheoBeRongTrang(cacDong) {
    const ketQua = [];

    for (const dongGoc of cacDong) {
        const dong = dongGoc.trim();

        if (!dong) {
            continue;
        }

        if (!ketQua.length) {
            ketQua.push(dong);
            continue;
        }

        const truoc = ketQua[ketQua.length - 1];

        const truocDaKetThuc = /[.!?:;]\s*$/.test(truoc);

        // Dòng mở ra một mục mới thì không được dán vào dòng trước, kể cả khi
        // dòng trước chưa có dấu chấm — nếu dán, cả một đề mục như "Lời cảm ơn"
        // sẽ biến mất vào giữa câu và không còn nhận ra được nữa.
        const sauMoMucMoi =
            laTieuDeLon(dong) ||
            laChuThichHinhBang(dong) ||
            /^\d+(?:[.,]\d+)*\s*[.)]?\s/.test(dong) ||
            // Dấu đầu dòng mở ra một ý mới, dù ý trước chưa có dấu chấm
            /^[-–—+*•·▪●○◦>»]/.test(dong) ||
            /^(bước|câu|ví\s*dụ|lưu\s*ý|chú\s*ý)\s*\d*\s*[:.]/i.test(dong);

        const truocLaDongMucLuc = laDongMucLuc(truoc);

        // Tiêu đề không có dấu chấm ở cuối, nên nếu chỉ xét dấu câu thì câu mở
        // đầu của đoạn ngay dưới sẽ bị dán vào tiêu đề.
        const truocLaTieuDe = laTieuDeLon(truoc);

        // PDF chỉ xuống dòng khi chữ chạm mép phải của trang, nên dòng bị bẻ
        // giữa câu bao giờ cũng gần đầy bề ngang. Một dòng ngắn mà không có dấu
        // chấm là người viết chủ ý xuống dòng — nhãn, tiêu đề, một ý gạch đầu
        // dòng — và không được dán vào dòng sau.
        const truocBiBeTheoBeRong = truoc.length >= DO_DAI_DONG_BI_BE;

        if (
            !truocDaKetThuc &&
            !sauMoMucMoi &&
            !truocLaDongMucLuc &&
            !truocLaTieuDe &&
            truocBiBeTheoBeRong
        ) {
            ketQua[ketQua.length - 1] = truoc + ' ' + dong;
            continue;
        }

        ketQua.push(dong);
    }

    return ketQua;
}

/**
 * Đưa văn bản đọc từ PDF về dạng mỗi đoạn một dòng.
 */
function chuanHoaVanBanPdf(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    let text = boKyTuPhongDacBiet(vanBan)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // pdf2json đánh dấu ngắt trang bằng chuỗi này
        .replace(/-{5,}Page\s*\(\d+\)\s*Break-{5,}/gi, '\n')
        .replace(/\f/g, '\n');

    let cacDong = text
        .split('\n')
        .map(dong => dong.replace(/[\t ]+/g, ' ').trim())
        .filter(dong => dong && !laSoTrang(dong));

    cacDong = goTieuDeChayTrang(cacDong);
    cacDong = noiDongTheoBeRongTrang(cacDong);

    return cacDong.join('\n');
}

module.exports = {
    chuanHoaVanBanPdf,
    boKyTuPhongDacBiet,
    goTieuDeChayTrang
};
