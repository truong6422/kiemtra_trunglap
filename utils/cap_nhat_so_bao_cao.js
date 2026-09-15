/**
 * ============================================================================
 * CẬP NHẬT SỐ BÁO CÁO CỦA SINH VIÊN (utils/cap_nhat_so_bao_cao.js)
 *
 * Trường so_bao_cao trong collection sinh_vien trước đây không bao giờ được
 * ghi, nộp bao nhiêu tài liệu nó vẫn nằm ở 0.
 *
 * Ở đây đếm lại từ collection bao_cao rồi ghi đè, thay vì cộng thêm một đơn
 * vị mỗi lần nộp. Đếm lại thì xoá báo cáo xong con số vẫn đúng, và chạy lại
 * nhiều lần cũng không sai lệch.
 *
 * Trường id_sinh_vien trong bao_cao không thống nhất: có bản ghi lưu mã sinh
 * viên (SV003), có bản ghi lưu mã người dùng (ND005). Vì vậy phải đếm theo cả
 * hai mã của cùng một người.
 * ============================================================================
 */

const BaoCao = require('../models/bao_cao');
const SinhVien = require('../models/sinh_vien');

/**
 * Đếm lại và ghi số báo cáo cho một sinh viên.
 * @param {string} ma - mã người dùng (ND005) hoặc mã sinh viên (SV003)
 * @returns {Promise<number|null>} số báo cáo sau khi cập nhật, null nếu không
 *          tìm thấy sinh viên tương ứng
 */
async function capNhatSoBaoCao(ma) {
    if (!ma) return null;

    const sinhVien = await SinhVien.findOne({
        $or: [{ id_nguoi_dung: String(ma) }, { id_sinh_vien: String(ma) }]
    });
    if (!sinhVien) return null;

    const cacMa = [sinhVien.id_nguoi_dung, sinhVien.id_sinh_vien]
        .filter(Boolean)
        .map(String);

    // Báo cáo mẫu của hệ thống không phải bài sinh viên nộp nên không tính.
    const so = await BaoCao.countDocuments({
        id_sinh_vien: { $in: cacMa },
        mau_kiem_tra: { $ne: true }
    });

    sinhVien.so_bao_cao = so;
    await sinhVien.save();

    return so;
}

/** Đếm lại cho toàn bộ sinh viên. Dùng khi cần dựng lại số liệu cũ. */
async function capNhatSoBaoCaoTatCa() {
    const ds = await SinhVien.find({}).select('id_nguoi_dung').lean();
    const ketQua = {};

    for (const sv of ds) {
        ketQua[sv.id_nguoi_dung] = await capNhatSoBaoCao(sv.id_nguoi_dung);
    }

    return ketQua;
}

module.exports = { capNhatSoBaoCao, capNhatSoBaoCaoTatCa };
