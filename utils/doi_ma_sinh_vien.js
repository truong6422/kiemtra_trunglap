/**
 * ============================================================================
 * ĐỔI MÃ SINH VIÊN / MÃ GIẢNG VIÊN
 *
 * Hệ thống chỉ còn một mã cho mỗi người: id_sinh_vien trong bảng sinh_vien và
 * id_giang_vien trong bảng giang_vien. Không còn ma_sinh_vien hay ma_giang_vien
 * đi kèm nữa, nên khi người dùng khai mã thật trong trang Tài khoản thì mã đó
 * phải ghi thẳng vào id_sinh_vien.
 *
 * Mã đó lại đang được các bản ghi khác trỏ tới. Đổi mỗi hồ sơ gốc mà bỏ quên
 * những chỗ kia thì bài đã nộp lập tức mồ côi: bảng nộp bài vẫn giữ "SV003"
 * trong khi hồ sơ đã mang mã "2200461", và màn hình lớp học báo sinh viên chưa
 * nộp gì. Vì vậy mọi thao tác đổi mã đều đi kèm cập nhật các bản ghi liên quan.
 * ============================================================================
 */

const SinhVien = require('../models/sinh_vien');
const GiangVien = require('../models/giang_vien');
const ChiTietNopBai = require('../models/chi_tiet_nop_bai');
const BaiTap = require('../models/bai_tap');
const LopHoc = require('../models/lop_hoc');
const ThongKe = require('../models/thong_ke');

/**
 * Chuẩn hoá mã do người dùng gõ vào: bỏ khoảng trắng thừa.
 * Trả về chuỗi rỗng nếu người dùng để trống.
 */
function chuanHoaMa(ma) {
    return String(ma === null || ma === undefined ? '' : ma).trim();
}

/**
 * Đổi mã sinh viên và cập nhật mọi bản ghi đang trỏ tới mã cũ.
 *
 * @param {string} maCu Mã hiện tại trong hồ sơ, ví dụ "SV003"
 * @param {string} maMoi Mã người dùng vừa khai, ví dụ "2200461"
 * @returns {Promise<Object>} Kết quả: đã đổi hay chưa, lý do, số bản ghi đã sửa
 */
async function doiMaSinhVien(maCu, maMoi) {
    const cu = chuanHoaMa(maCu);
    const moi = chuanHoaMa(maMoi);

    if (!moi || cu === moi) {
        return { daDoi: false, ly_do: 'Mã không thay đổi.' };
    }

    // Mã sinh viên là khoá duy nhất, không thể có hai người cùng mang một mã
    const daCoNguoiKhac = await SinhVien.findOne({ id_sinh_vien: moi }).lean();

    if (daCoNguoiKhac) {
        return {
            daDoi: false,
            trung_ma: true,
            ly_do: `Mã sinh viên "${moi}" đã thuộc về ${daCoNguoiKhac.ho_ten}.`
        };
    }

    await SinhVien.updateOne(
        { id_sinh_vien: cu },
        { $set: { id_sinh_vien: moi } }
    );

    // Các bản ghi trỏ tới mã sinh viên
    const [nopBai, thongKe] = await Promise.all([
        ChiTietNopBai.updateMany(
            { id_sinh_vien: cu },
            { $set: { id_sinh_vien: moi } }
        ),
        ThongKe.updateMany(
            { id_sinh_vien: cu },
            { $set: { id_sinh_vien: moi } }
        )
    ]);

    // Mã sinh viên nằm bên trong mảng nên phải dùng toán tử vị trí
    const danhSachNopBai = await BaiTap.updateMany(
        { 'danh_sach_nop_bai.id_sinh_vien': cu },
        { $set: { 'danh_sach_nop_bai.$[phanTu].id_sinh_vien': moi } },
        { arrayFilters: [{ 'phanTu.id_sinh_vien': cu }] }
    );

    const thanhVienLop = await LopHoc.updateMany(
        { 'danh_sach_thanh_vien.id_sinh_vien': cu },
        { $set: { 'danh_sach_thanh_vien.$[phanTu].id_sinh_vien': moi } },
        { arrayFilters: [{ 'phanTu.id_sinh_vien': cu }] }
    );

    return {
        daDoi: true,
        ma_cu: cu,
        ma_moi: moi,
        da_cap_nhat: {
            chi_tiet_nop_bai: nopBai.modifiedCount,
            thong_ke: thongKe.modifiedCount,
            bai_tap: danhSachNopBai.modifiedCount,
            lop_hoc: thanhVienLop.modifiedCount
        }
    };
}

/**
 * Đổi mã giảng viên. Mã giảng viên không nằm trong mảng nào nên chỉ cần sửa
 * hồ sơ gốc và các bản ghi kiểm tra do giảng viên đó thực hiện.
 */
async function doiMaGiangVien(maCu, maMoi) {
    const cu = chuanHoaMa(maCu);
    const moi = chuanHoaMa(maMoi);

    if (!moi || cu === moi) {
        return { daDoi: false, ly_do: 'Mã không thay đổi.' };
    }

    const daCoNguoiKhac = await GiangVien.findOne({ id_giang_vien: moi }).lean();

    if (daCoNguoiKhac) {
        return {
            daDoi: false,
            trung_ma: true,
            ly_do: `Mã giảng viên "${moi}" đã thuộc về ${daCoNguoiKhac.ho_ten}.`
        };
    }

    await GiangVien.updateOne(
        { id_giang_vien: cu },
        { $set: { id_giang_vien: moi } }
    );

    // Bảng kết quả kiểm tra ghi lại người đã bấm chạy kiểm tra
    const KetQuaKiemTra = require('../models/ket_qua_kiem_tra');

    const ketQua = await KetQuaKiemTra.updateMany(
        { id_giang_vien: cu },
        { $set: { id_giang_vien: moi } }
    );

    return {
        daDoi: true,
        ma_cu: cu,
        ma_moi: moi,
        da_cap_nhat: { ket_qua_kiem_tra: ketQua.modifiedCount }
    };
}

module.exports = { doiMaSinhVien, doiMaGiangVien, chuanHoaMa };
