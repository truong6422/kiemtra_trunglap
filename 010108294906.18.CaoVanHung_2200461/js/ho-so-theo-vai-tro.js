/**
 * ============================================================================
 * HỒ SƠ CÁ NHÂN HIỆN THEO ĐÚNG VAI TRÒ
 *
 * Cơ sở dữ liệu tách hai bảng hồ sơ:
 *
 *   sinh_vien : id_sinh_vien, ho_ten, lop, khoa_hoc, email, so_bao_cao
 *   giang_vien: id_giang_vien, ho_ten, bo_mon, email
 *
 * Trang Tài khoản trước đây chỉ có một bộ ô dành cho sinh viên, nên giảng viên
 * mở ra thấy "Mã sinh viên", "Lớp", "Khóa học", "Số báo cáo" — toàn những thứ
 * hồ sơ giảng viên không có.
 *
 * Mô-đun này đổi nhãn và ẩn/hiện ô cho khớp với bảng tương ứng. Hai trang Tài
 * khoản và Mật khẩu dùng chung một bộ ô giống hệt nhau nên dùng chung luôn.
 * ============================================================================
 */

(function () {
    'use strict';

    /** Ô nào thuộc về vai trò nào. Ô không nêu ở đây thì vai trò nào cũng hiện. */
    const O_RIENG_SINH_VIEN = ['class-name', 'course', 'report-count'];
    const O_RIENG_GIANG_VIEN = ['bo-mon'];

    /**
     * Quản trị viên không nằm trong bảng sinh_vien lẫn giang_vien — họ chỉ quản
     * lý hệ thống. Hồ sơ vì vậy chỉ còn họ tên và email; mã định danh, lớp,
     * khoá học, số báo cáo và bộ môn đều không có dữ liệu để hiện.
     */
    const O_AN_VOI_QUAN_TRI = [
        'student-id', 'class-name', 'course', 'report-count', 'bo-mon'
    ];

    /** Tìm khung .form-group bọc quanh một ô nhập. */
    function khungCua(idO) {
        const o = document.getElementById(idO);
        return o ? o.closest('.form-group') : null;
    }

    /**
     * Ẩn hoặc hiện khung của một ô.
     *
     * Phải đặt kèm cờ important: bảng kiểu của trang khai
     * `main .form-group { display: block !important }`, gán display thường sẽ
     * bị nó đè, ô vẫn hiện nguyên.
     */
    function hien(idO, coHien) {
        const khung = khungCua(idO);
        if (!khung) return;

        if (coHien) {
            khung.style.removeProperty('display');
        } else {
            khung.style.setProperty('display', 'none', 'important');
        }
    }

    function datNhan(idO, chu) {
        const nhan = document.querySelector(`label[for="${idO}"]`);
        if (nhan) nhan.textContent = chu;
    }

    /**
     * Sắp xếp lại biểu mẫu hồ sơ cho đúng vai trò người đang đăng nhập.
     *
     * @param {string} vaiTro Giá trị vai_tro lấy từ máy chủ hoặc localStorage
     * @returns {boolean} true khi hồ sơ này không có ô "Số báo cáo" — bên gọi
     *                    dựa vào đó để bỏ qua lượt đếm báo cáo
     */
    function apDungVaiTro(vaiTro) {
        const ten = String(vaiTro || '').trim();

        const laGiangVien = ten === 'giang_vien' || ten === 'giaovien';
        const laQuanTri = ten === 'quan_tri_vien' || ten === 'admin';

        if (laQuanTri) {
            O_AN_VOI_QUAN_TRI.forEach(id => hien(id, false));
            return true;
        }

        datNhan('student-id', laGiangVien ? 'Mã giảng viên' : 'Mã sinh viên');

        hien('student-id', true);
        O_RIENG_SINH_VIEN.forEach(id => hien(id, !laGiangVien));
        O_RIENG_GIANG_VIEN.forEach(id => hien(id, laGiangVien));

        return laGiangVien;
    }

    window.HoSoTheoVaiTro = { apDungVaiTro };
})();
