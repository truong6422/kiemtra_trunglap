/**
 * ============================================================================
 * THÀNH VIÊN LỚP HỌC
 *
 * Danh sách thành viên trong bản ghi lop_hoc nhận diện người học bằng
 * id_sinh_vien — mã sinh viên thật, giống mã in trên thẻ. Trước đây chỗ này lưu
 * id_nguoi_dung, tức mã tài khoản, nên mở cơ sở dữ liệu ra thấy "ND003" và
 * không nối thẳng được với bài đã nộp (bài nộp ghi theo mã sinh viên).
 *
 * Giao diện và các API cũ vẫn gửi lên id_nguoi_dung, nên mọi chỗ đọc hay ghi
 * danh sách thành viên đều đi qua các hàm ở đây để quy về một mối.
 * ============================================================================
 */

const SinhVien = require('../models/sinh_vien');

/**
 * Tra mã sinh viên của một loạt tài khoản.
 *
 * @param {string[]} dsIdNguoiDung
 * @returns {Promise<Map<string,string>>} id_nguoi_dung -> id_sinh_vien
 */
async function bangTraMaSinhVien(dsIdNguoiDung) {
    const ds = (dsIdNguoiDung || []).filter(Boolean);
    if (!ds.length) return new Map();

    const hoSo = await SinhVien
        .find({ id_nguoi_dung: { $in: ds } })
        .select('id_nguoi_dung id_sinh_vien')
        .lean();

    return new Map(hoSo.map(sv => [sv.id_nguoi_dung, sv.id_sinh_vien]));
}

/**
 * Tra ngược: mã sinh viên -> mã tài khoản. Giao diện lớp học vẫn gọi API xoá
 * thành viên theo mã tài khoản nên vẫn cần chiều này.
 *
 * @param {string[]} dsIdSinhVien
 * @returns {Promise<Map<string,string>>} id_sinh_vien -> id_nguoi_dung
 */
async function bangTraMaTaiKhoan(dsIdSinhVien) {
    const ds = (dsIdSinhVien || []).filter(Boolean);
    if (!ds.length) return new Map();

    const hoSo = await SinhVien
        .find({ id_sinh_vien: { $in: ds } })
        .select('id_nguoi_dung id_sinh_vien')
        .lean();

    return new Map(hoSo.map(sv => [sv.id_sinh_vien, sv.id_nguoi_dung]));
}

/**
 * Lấy mã sinh viên của một tài khoản. Trả về chuỗi rỗng nếu tài khoản đó chưa
 * có hồ sơ sinh viên — ví dụ tài khoản giảng viên đứng ra mở lớp.
 */
async function maSinhVienCua(idNguoiDung) {
    if (!idNguoiDung) return '';

    const sv = await SinhVien
        .findOne({ id_nguoi_dung: idNguoiDung })
        .select('id_sinh_vien')
        .lean();

    return sv ? sv.id_sinh_vien : '';
}

/**
 * Dựng một phần tử của danh_sach_thanh_vien từ bản ghi người dùng.
 *
 * @param {Object} nguoiDung Bản ghi trong nguoi_dung
 * @param {string} idSinhVien Mã sinh viên đã tra sẵn
 */
function dungThanhVien(nguoiDung, idSinhVien) {
    return {
        id_sinh_vien: idSinhVien || '',
        ho_ten: nguoiDung.ho_ten || 'Thành viên',
        email: nguoiDung.email || ''
    };
}

/**
 * Hai thành viên có phải cùng một người không.
 *
 * Dữ liệu cũ còn lẫn bản ghi mang id_nguoi_dung ở vị trí mã sinh viên, nên vẫn
 * so cả theo mã tài khoản để không nhân đôi người trong danh sách.
 */
function laCungNguoi(thanhVien, { idSinhVien, idNguoiDung }) {
    if (!thanhVien) return false;

    const ma = String(thanhVien.id_sinh_vien || thanhVien.id_nguoi_dung || '');

    return (idSinhVien && ma === String(idSinhVien))
        || (idNguoiDung && ma === String(idNguoiDung));
}

/**
 * Gắn thêm id_nguoi_dung cho từng thành viên đọc ra từ bản ghi lớp.
 *
 * Bản ghi lớp chỉ lưu mã sinh viên, trong khi các màn thống kê còn nối dữ liệu
 * theo mã tài khoản (vai trò, lịch sử kiểm tra đều ghi theo mã tài khoản). Gắn
 * sẵn một lượt ngay khi đọc lớp ra thì phần tính toán phía sau không phải đụng
 * tới cơ sở dữ liệu nữa.
 *
 * Trả về mảng mới, không sửa mảng gốc.
 *
 * @param {Array} thanhVien Danh sách thành viên lấy từ bản ghi lop_hoc
 */
async function boSungMaTaiKhoan(thanhVien) {
    const ds = thanhVien || [];
    if (!ds.length) return ds;

    const bang = await bangTraMaTaiKhoan(ds.map(t => t.id_sinh_vien));

    return ds.map(t => ({
        ...t,
        // Dữ liệu cũ còn giữ sẵn id_nguoi_dung thì dùng luôn cái có sẵn
        id_nguoi_dung: t.id_nguoi_dung || bang.get(t.id_sinh_vien) || ''
    }));
}

module.exports = {
    bangTraMaSinhVien,
    bangTraMaTaiKhoan,
    maSinhVienCua,
    dungThanhVien,
    laCungNguoi,
    boSungMaTaiKhoan
};
