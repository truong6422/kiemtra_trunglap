/**
 * ============================================================================
 * TÌM BẢN PDF ĐÃ BÔI MÀU CỦA MỘT BÁO CÁO (utils/tep_boi_mau.js)
 *
 * Worker chấm xong thì ghi bản bôi màu ra upload2/<mã báo cáo>.pdf. Không thể
 * tin tệp đó chỉ vì đúng tên:
 *
 *   - Mã báo cáo từng bị cấp lại sau khi xoá (bộ đếm thấp hơn mã đang có).
 *   - Mỗi máy chạy backend có thư mục upload2 riêng dù dùng chung CSDL. Báo
 *     cáo bị xoá ở máy này thì tệp bôi màu ở máy kia vẫn còn.
 *
 * Gộp hai điều trên: báo cáo mới mang lại mã BC75 sẽ nhận nhầm tệp BC75.pdf
 * của một báo cáo khác đã xoá từ trước. Vì vậy chỉ nhận tệp được ghi ra SAU
 * lúc báo cáo hiện tại tải lên. Báo cáo "Lỗi" (không đọc được chữ) không bao
 * giờ được chấm nên cũng không có bản bôi màu.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const UPLOAD2 = path.resolve(__dirname, '../upload2');

/**
 * @param {Object} baoCao Bản ghi bao_cao (cần id_bao_cao, ngay_tai_len, trang_thai)
 * @returns {string|null} Đường dẫn tệp bôi màu, hoặc null nếu chưa có / tệp sót lại
 */
function timPdfBoiMau(baoCao) {
    if (!baoCao || !baoCao.id_bao_cao || baoCao.trang_thai === 'Lỗi') return null;

    const tep = path.join(UPLOAD2, `${baoCao.id_bao_cao}.pdf`);

    let thongTin;
    try {
        thongTin = fs.statSync(tep);
    } catch (e) {
        return null;
    }

    const lucTaiLen = baoCao.ngay_tai_len
        ? new Date(baoCao.ngay_tai_len).getTime() : 0;

    return thongTin.mtimeMs >= lucTaiLen ? tep : null;
}

module.exports = { timPdfBoiMau, UPLOAD2 };
