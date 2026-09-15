/**
 * ============================================================================
 * DỌN BÁO CÁO QUÁ HẠN LƯU TRỮ (utils/don_bao_cao_qua_han.js)
 *
 * Báo cáo người dùng nộp lên chỉ được giữ trong một khoảng thời gian nhất
 * định. Quá hạn thì xoá cả ba nơi: bản ghi trong cơ sở dữ liệu, tệp gốc trong
 * thư mục uploads và tệp đã bôi màu trong upload2 — kèm mọi dữ liệu chấm bám
 * theo báo cáo đó.
 *
 * Số ngày lưu đọc từ cau_hinh_he_thong.so_ngay_luu_bao_cao (mặc định 180 ngày,
 * khoảng 6 tháng). Đặt 0 để tắt hẳn.
 *
 * AN TOÀN:
 *  - Không bao giờ đụng tới kho tài liệu mẫu (mau_kiem_tra = true). Đó là dữ
 *    liệu đối sánh của cả hệ thống, mất là không chấm được nữa.
 *  - Gọi với { chayThu: true } để chỉ liệt kê những gì sẽ xoá mà không xoá.
 *    Nên chạy thử trước mỗi lần đổi số ngày lưu.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const BaoCao = require('../models/bao_cao');
const CauHinhHeThong = require('../models/cau_hinh_he_thong');
const KetQuaKiemTra = require('../models/ket_qua_kiem_tra');
const ThongKe = require('../models/thong_ke');
const ChiSoCau = require('../models/chi_so_cau');
const ChiTietCauTrung = require('../models/chi_tiet_cau_trung');
const ChiTietCauTrungHighlight = require('../models/chi_tiet_cau_trung_highlight');
const ChiTietDoanTrung = require('../models/chi_tiet_doan_trung');
const ChiTietDoanChapVa = require('../models/chi_tiet_doan_chap_va');
const LichSuKiemTra = require('../models/lich_su_kiem_tra');

const { capNhatSoBaoCao } = require('./cap_nhat_so_bao_cao');

const THU_MUC_GOC = path.resolve(__dirname, '..');
const UPLOAD2 = path.join(THU_MUC_GOC, 'upload2');

/** Xoá một tệp, nuốt lỗi vì thiếu tệp không phải lý do để dừng cả lượt dọn. */
function xoaTep(duongDan) {
    try {
        if (duongDan && fs.existsSync(duongDan)) {
            fs.unlinkSync(duongDan);
            return true;
        }
    } catch (e) {
        console.error('   không xoá được tệp', duongDan, '-', e.message);
    }
    return false;
}

/**
 * Đường dẫn tệp gốc. Trong cơ sở dữ liệu đường dẫn được ghi theo kiểu Windows
 * ("uploads\\abc.docx") nên phải đổi dấu gạch mới dùng được trên máy chủ Linux.
 */
function duongDanGoc(tepTin) {
    if (!tepTin) return null;
    const chuan = String(tepTin).replace(/\\/g, '/');
    return path.isAbsolute(chuan) ? chuan : path.join(THU_MUC_GOC, chuan);
}

/**
 * Dọn báo cáo quá hạn.
 *
 * @param {Object} tuyChon
 * @param {boolean} tuyChon.chayThu  chỉ liệt kê, không xoá gì
 * @param {number}  tuyChon.soNgay   ghi đè số ngày lưu trong cấu hình
 * @returns {Promise<Object>} thống kê lượt dọn
 */
async function donBaoCaoQuaHan(tuyChon = {}) {

    const chayThu = tuyChon.chayThu === true;

    const cauHinh = await CauHinhHeThong.findOne({}).lean();

    const soNgay = Number.isFinite(tuyChon.soNgay)
        ? tuyChon.soNgay
        : (cauHinh && Number.isFinite(cauHinh.so_ngay_luu_bao_cao)
            ? cauHinh.so_ngay_luu_bao_cao : 180);

    if (!soNgay || soNgay <= 0) {
        return { batDau: false, ly_do: 'Đang tắt tự động dọn (số ngày lưu = 0)' };
    }

    const moc = new Date(Date.now() - soNgay * 24 * 60 * 60 * 1000);

    // Chỉ báo cáo người dùng nộp, tuyệt đối không đụng kho tài liệu mẫu
    const quaHan = await BaoCao.find({
        mau_kiem_tra: { $ne: true },
        ngay_tai_len: { $lt: moc }
    }).select('id_bao_cao tieu_de tep_tin ngay_tai_len id_sinh_vien _id').lean();

    const ketQua = {
        batDau: true,
        chay_thu: chayThu,
        so_ngay_luu: soNgay,
        moc_thoi_gian: moc,
        so_bao_cao: quaHan.length,
        danh_sach: quaHan.map(b => ({
            id_bao_cao: b.id_bao_cao,
            tieu_de: b.tieu_de,
            ngay_tai_len: b.ngay_tai_len
        })),
        so_tep_goc_da_xoa: 0,
        so_tep_boi_mau_da_xoa: 0,
        so_ban_ghi_lien_quan: 0
    };

    if (!quaHan.length || chayThu) return ketQua;

    const maBaoCao = quaHan.map(b => b.id_bao_cao).filter(Boolean);
    const idMongo = quaHan.map(b => b._id);
    const chuSoHuu = [...new Set(quaHan.map(b => b.id_sinh_vien).filter(Boolean))];

    // 1. Xoá tệp trên đĩa
    for (const b of quaHan) {
        if (xoaTep(duongDanGoc(b.tep_tin))) ketQua.so_tep_goc_da_xoa++;
        if (xoaTep(path.join(UPLOAD2, `${b.id_bao_cao}.pdf`))) {
            ketQua.so_tep_boi_mau_da_xoa++;
        }
    }

    // 2. Xoá dữ liệu chấm bám theo báo cáo
    const cacBang = [
        KetQuaKiemTra, ThongKe, ChiSoCau, ChiTietCauTrung,
        ChiTietCauTrungHighlight, ChiTietDoanTrung, ChiTietDoanChapVa,
        LichSuKiemTra
    ];

    for (const Bang of cacBang) {
        try {
            const r = await Bang.deleteMany({ id_bao_cao: { $in: maBaoCao } });
            ketQua.so_ban_ghi_lien_quan += r.deletedCount || 0;
        } catch (e) {
            console.error('   lỗi khi dọn bảng', Bang.modelName, '-', e.message);
        }
    }

    // 3. Xoá chính bản ghi báo cáo
    const r = await BaoCao.deleteMany({ _id: { $in: idMongo } });
    ketQua.so_bao_cao_da_xoa = r.deletedCount || 0;

    // 4. Đếm lại số báo cáo của những người bị ảnh hưởng
    for (const ma of chuSoHuu) {
        try {
            await capNhatSoBaoCao(ma);
        } catch (e) { /* con số thống kê, không chặn lượt dọn */ }
    }

    // 5. Ghi lại mốc dọn gần nhất
    try {
        await CauHinhHeThong.updateOne({}, { lan_don_gan_nhat: new Date() });
    } catch (e) { /* không quan trọng */ }

    return ketQua;
}

/**
 * Hẹn giờ dọn: chạy một lần khi khởi động rồi lặp lại mỗi 24 giờ.
 * Trả về đối tượng timer để dừng khi cần.
 */
function batLichDon() {
    const MOT_NGAY = 24 * 60 * 60 * 1000;

    const chay = async () => {
        try {
            const kq = await donBaoCaoQuaHan();
            if (kq.batDau && kq.so_bao_cao > 0) {
                console.log(`🧹 Đã dọn ${kq.so_bao_cao_da_xoa} báo cáo quá ${kq.so_ngay_luu} ngày ` +
                    `(${kq.so_tep_goc_da_xoa} tệp gốc, ${kq.so_tep_boi_mau_da_xoa} tệp bôi màu, ` +
                    `${kq.so_ban_ghi_lien_quan} bản ghi liên quan)`);
            }
        } catch (e) {
            console.error('Lỗi khi dọn báo cáo quá hạn:', e.message);
        }
    };

    // Chờ một phút sau khi khởi động rồi mới dọn, để máy chủ lên hẳn đã
    setTimeout(chay, 60 * 1000);

    return setInterval(chay, MOT_NGAY);
}

module.exports = { donBaoCaoQuaHan, batLichDon };
