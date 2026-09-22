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
     */
    function apDungVaiTro(vaiTro) {
        const laGiangVien =
            String(vaiTro || '').trim() === 'giang_vien'
            || String(vaiTro || '').trim() === 'giaovien';

        datNhan('student-id', laGiangVien ? 'Mã giảng viên' : 'Mã sinh viên');

        O_RIENG_SINH_VIEN.forEach(id => hien(id, !laGiangVien));
        O_RIENG_GIANG_VIEN.forEach(id => hien(id, laGiangVien));

        return laGiangVien;
    }

    window.HoSoTheoVaiTro = { apDungVaiTro };
})();
