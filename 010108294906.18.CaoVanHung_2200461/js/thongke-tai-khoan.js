/**
 * ============================================================================
 * MÀN THỐNG KÊ TÀI KHOẢN
 *
 * Bấm "Giảng viên" hoặc "Sinh viên" trên thẻ Thống kê tài khoản thì hiện danh
 * sách tài khoản của vai trò đó, kèm số bài đã nộp.
 * ============================================================================
 */

window.TkTaiKhoan = (() => {

    const API = "http://localhost:5000/api";
    const $ = id => document.getElementById(id);

    let dangHien = [];

    async function mo(vaiTro) {

        const ten = vaiTro === "giang_vien" ? "giảng viên" : "sinh viên";

        $("tkTieuDeTaiKhoan").textContent =
            `Danh sách tài khoản ${ten}`;

        // Cột thứ năm đổi nghĩa theo vai trò
        $("tkCotRieng").textContent =
            vaiTro === "giang_vien" ? "Bộ môn" : "Lớp";

        document.querySelectorAll("#khungTaiKhoan .tk-tab__nut").forEach(n => {
            n.classList.toggle("tk-tab__nut--chon", n.dataset.vaiTro === vaiTro);
        });

        $("tkBangTaiKhoan").innerHTML =
            '<tr><td colspan="8" class="no-data">Đang tải dữ liệu...</td></tr>';

        try {
            const res = await fetch(
                `${API}/thong-ke/tai-khoan?vai_tro=${encodeURIComponent(vaiTro)}`);
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

    return { mo };
})();
