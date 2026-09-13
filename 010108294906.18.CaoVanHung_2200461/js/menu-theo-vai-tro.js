/**
 * ============================================================================
 * ĐỔI THANH ĐIỀU HƯỚNG THEO VAI TRÒ NGƯỜI DÙNG
 *
 * Ba vai trò có ba thanh điều hướng khác nhau:
 *
 *   Sinh viên     : Trang chủ | Quản lý tài liệu | Quản lý lớp học | Hướng dẫn chi tiết
 *   Giảng viên    : Trang chủ | Quản lý tài liệu | Quản lý lớp học | Thống kê báo cáo
 *   Quản trị viên : Trang chủ | Quản lý tài liệu | Quản lý cấu hình | Thống kê báo cáo
 *
 * `trangchu_saudn.js` cũng làm việc này nhưng chỉ chạy được ở trang chủ, nơi
 * thẻ liên kết có sẵn id. Tách riêng ra đây để mọi trang dùng chung, dò theo
 * cả id lẫn đường dẫn vì mỗi trang viết thanh điều hướng một kiểu.
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {

    const vaiTro = (
        localStorage.getItem("vai_tro") ||
        localStorage.getItem("userRole") ||
        ""
    ).trim();

    const laGiangVien = vaiTro === "giang_vien" || vaiTro === "giaovien";
    const laQuanTri = vaiTro === "quan_tri_vien";

    if (!laGiangVien && !laQuanTri) return;

    const danhSach = document.querySelector(".menu-container ul");
    if (!danhSach) return;

    /** Dò một mục trên thanh điều hướng theo id, không có thì theo đường dẫn. */
    function timMuc(id, phanDuongDan) {
        return danhSach.querySelector(`#${id}`) ||
            danhSach.querySelector(`a[href*="${phanDuongDan}"]`);
    }

    // Mục "Hướng dẫn chi tiết" nhường chỗ cho "Thống kê báo cáo"
    const mucThongKe = timMuc("navHuongDan", "huongdanchitiet");

    if (mucThongKe) {
        mucThongKe.textContent = "Thống kê báo cáo";
        mucThongKe.href = "../pages/thongkebaocao.html";
    }

    // Quản trị viên không quản lớp mà quản cấu hình hệ thống
    if (laQuanTri) {
        const mucCauHinh = timMuc("navLopHoc", "quanlylophoc");

        if (mucCauHinh) {
            mucCauHinh.textContent = "Quản lý cấu hình";
            mucCauHinh.href = "../pages/quanlycauhinh.html";
        }
    }

    // Làm nổi mục đang mở
    if (location.pathname.endsWith("thongkebaocao.html") && mucThongKe) {
        mucThongKe.classList.add("dang-o-day");
    }
});
