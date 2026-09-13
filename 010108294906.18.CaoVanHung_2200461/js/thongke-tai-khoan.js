/**
 * ============================================================================
 * MÀN THỐNG KÊ TÀI KHOẢN
 *
 * Bấm "Giảng viên" hoặc "Sinh viên" trên thẻ Thống kê tài khoản thì hiện danh
 * sách tài khoản của vai trò đó, kèm số bài đã nộp.
 *
 * Giảng viên chỉ được xem sinh viên trong lớp mình phụ trách, và không được
 * xem danh sách giảng viên — nút đó bị khoá.
 * ============================================================================
 */

window.TkTaiKhoan = (() => {

    const API = "http://localhost:5000/api";
    const $ = id => document.getElementById(id);

    const vaiTroNguoiXem = (localStorage.getItem("vai_tro") ||
        localStorage.getItem("userRole") || "").trim();
    const idNguoiXem = localStorage.getItem("id_nguoi_dung") || "";

    const laGiangVien = vaiTroNguoiXem === "giang_vien" ||
        vaiTroNguoiXem === "giaovien";

    let dangHien = [];
    let vaiTroDangXem = "";

    /** Giảng viên không được xem danh sách giảng viên nên khoá nút đó lại. */
    function apDungQuyen() {

        if (!laGiangVien) return;

        document.querySelectorAll('[data-vai-tro="giang_vien"]').forEach(n => {
            n.disabled = true;
            n.classList.add("tk-bi-khoa");
            n.title = "Giảng viên chỉ xem được danh sách sinh viên trong lớp mình";
        });
    }

    async function mo(vaiTro) {

        // Chặn cả khi bị gọi bằng đường khác ngoài nút bấm
        if (laGiangVien && vaiTro === "giang_vien") return;

        vaiTroDangXem = vaiTro;

        const ten = vaiTro === "giang_vien" ? "giảng viên" : "sinh viên";

        $("tkTieuDeTaiKhoan").textContent = laGiangVien
            ? `Danh sách ${ten} trong lớp của tôi`
            : `Danh sách tài khoản ${ten}`;

        // Cột thứ năm đổi nghĩa theo vai trò
        $("tkCotRieng").textContent =
            vaiTro === "giang_vien" ? "Bộ môn" : "Lớp";

        document.querySelectorAll("#khungTaiKhoan .tk-tab__nut").forEach(n => {
            n.classList.toggle("tk-tab__nut--chon", n.dataset.vaiTro === vaiTro);
        });

        $("tkBangTaiKhoan").innerHTML =
            '<tr><td colspan="8" class="no-data">Đang tải dữ liệu...</td></tr>';

        try {
            // Giảng viên chỉ lấy thành viên các lớp mình phụ trách
            const gioiHan = (laGiangVien && idNguoiXem)
                ? `&giang_vien=${encodeURIComponent(idNguoiXem)}` : "";

            const res = await fetch(
                `${API}/thong-ke/tai-khoan?vai_tro=${encodeURIComponent(vaiTro)}${gioiHan}`);
            const kq = await res.json();

            if (!kq.success) throw new Error(kq.message || "Máy chủ báo lỗi");

            dangHien = kq.data;
            ve(vaiTro);

        } catch (err) {
            $("tkBangTaiKhoan").innerHTML =
                `<tr><td colspan="8" class="no-data">Không tải được: ${err.message}</td></tr>`;
        }
    }

    function ve(vaiTro) {

        const T = window.TkTienIch;

        if (dangHien.length === 0) {
            $("tkBangTaiKhoan").innerHTML =
                '<tr><td colspan="8" class="no-data">Chưa có tài khoản nào</td></tr>';
            return;
        }

        $("tkBangTaiKhoan").innerHTML = dangHien.map(u => `
            <tr>
                <td class="tk-ma">${T.thoat(u.id_nguoi_dung)}</td>
                <td style="text-align:left">${T.thoat(u.ho_ten)}</td>
                <td style="text-align:left">${T.thoat(u.email)}</td>
                <td>${T.thoat(u.ma_ho_so) || '<span class="tk-so--trong">--</span>'}</td>
                <td>${T.thoat(vaiTro === "giang_vien" ? u.bo_mon : u.lop)
                || '<span class="tk-so--trong">--</span>'}</td>
                <td><strong>${u.so_bai_da_nop}</strong></td>
                <td>
                    <span class="tk-nhan ${u.trang_thai ? "tk-nhan--xong" : "tk-nhan--cho"}">
                        ${u.trang_thai ? "Đang hoạt động" : "Đã khoá"}
                    </span>
                </td>
                <td style="white-space:nowrap">${T.dinhDangNgay(u.ngay_tao)}</td>
            </tr>`).join("");
    }

    /** Tải danh sách đang xem về máy dưới dạng bảng tính. */
    function xuat() {
        window.TkTienIch.xuatTaiKhoanExcel(dangHien, vaiTroDangXem);
    }

    return { mo, xuat, apDungQuyen, laGiangVien };
})();
