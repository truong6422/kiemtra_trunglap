/**
 * ============================================================================
 * PHÁT HIỆN TRÙNG TOÀN BÀI (utils/trung_toan_bai.js)
 * ----------------------------------------------------------------------------
 * Hệ thống vốn chỉ xếp loại tới ba mức: câu trùng, đoạn trùng và đoạn chắp vá.
 * Giáo viên phản ánh rằng khi nộp lại đúng một báo cáo mẫu, tỉ lệ hiện ra 100%
 * nhưng kết quả vẫn chỉ liệt kê từng đoạn rời — không nói thẳng rằng cả bài là
 * bản sao của một tài liệu có sẵn.
 *
 * Mức thứ tư này trả lời đúng câu hỏi đó: bài nộp có phải bản sao gần như
 * nguyên vẹn của một báo cáo mẫu duy nhất hay không.
 * ============================================================================
 */

// Tỉ lệ số từ của bài nộp bị một báo cáo mẫu phủ, tính từ đây trở lên thì coi
// là chép cả bài. Quản trị viên đổi được trong Quản lý cấu hình.
const NGUONG_TRUNG_TOAN_BAI_MAC_DINH = 0.8;

/**
 * Xét từng báo cáo mẫu xem có phủ gần hết bài nộp không.
 *
 * @param {Array}  thongKeTheoMau - thống kê từng báo cáo mẫu, cần so_tu_trung
 * @param {number} tongSoTu       - tổng số từ của bài nộp
 * @param {number} nguong         - tỉ lệ 0..1, mặc định 0.8
 * @returns {{
 *   trung_toan_bai: boolean,
 *   nguong_trung_toan_bai: number,
 *   danh_sach_nguon_trung_toan_bai: Array
 * }}
 */
function phatHienTrungToanBai(
    thongKeTheoMau,
    tongSoTu,
    nguong = NGUONG_TRUNG_TOAN_BAI_MAC_DINH
) {
    const nguongHopLe =
        Number.isFinite(nguong) && nguong > 0 && nguong <= 1
            ? nguong
            : NGUONG_TRUNG_TOAN_BAI_MAC_DINH;

    const ketQuaRong = {
        trung_toan_bai: false,
        nguong_trung_toan_bai: nguongHopLe,
        danh_sach_nguon_trung_toan_bai: []
    };

    if (
        !Array.isArray(thongKeTheoMau) ||
        !thongKeTheoMau.length ||
        !tongSoTu ||
        tongSoTu <= 0
    ) {
        return ketQuaRong;
    }

    const nguonPhuKhapBai = thongKeTheoMau
        .map(tk => ({
            id_bao_cao: tk.id_bao_cao,
            ten_bao_cao: tk.ten_bao_cao || '',
            so_cau_trung: tk.so_cau_trung || 0,
            so_tu_trung: tk.so_tu_trung || 0,
            ti_le_phu:
                Math.round((tk.so_tu_trung / tongSoTu) * 10000) / 100
        }))
        .filter(nguon => nguon.ti_le_phu >= nguongHopLe * 100)
        .sort((a, b) => b.ti_le_phu - a.ti_le_phu);

    return {
        trung_toan_bai: nguonPhuKhapBai.length > 0,
        nguong_trung_toan_bai: nguongHopLe,
        danh_sach_nguon_trung_toan_bai: nguonPhuKhapBai
    };
}

module.exports = {
    phatHienTrungToanBai,
    NGUONG_TRUNG_TOAN_BAI_MAC_DINH
};
