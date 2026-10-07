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
    let dsCot = [];

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

        // Dựng tiêu đề cột từ đúng bộ cột dùng để vẽ dòng, hai bên luôn khớp
        dsCot = cotTheoVaiTro(vaiTro);
        $("tkDauBangTaiKhoan").innerHTML =
            dsCot.map(c => `<th>${window.TkTienIch.thoat(c.ten)}</th>`).join("");

        document.querySelectorAll("#khungTaiKhoan .tk-tab__nut").forEach(n => {
            n.classList.toggle("tk-tab__nut--chon", n.dataset.vaiTro === vaiTro);
        });

        $("tkBangTaiKhoan").innerHTML =
            `<tr><td colspan="${dsCot.length}" class="no-data">Đang tải dữ liệu...</td></tr>`;

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
                `<tr><td colspan="${dsCot.length}" class="no-data">Không tải được: ${err.message}</td></tr>`;
        }
    }

    function ve(vaiTro) {

        const T = window.TkTienIch;

        if (dangHien.length === 0) {
            $("tkBangTaiKhoan").innerHTML =
                `<tr><td colspan="${dsCot.length}" class="no-data">Chưa có tài khoản nào</td></tr>`;
            return;
        }

        $("tkBangTaiKhoan").innerHTML = dangHien.map(u => `
            <tr>${dsCot.map(c => c.veO
                ? `<td>${c.veO(u)}</td>`
                : `<td${c.trai ? ' style="text-align:left"' : ""}${c.ma ? ' class="tk-ma"' : ""}>`
                    + (T.thoat(c.lay(u)) || '<span class="tk-so--trong">--</span>')
                    + `</td>`).join("")}
            </tr>`).join("");
    }

    /**
     * Bộ cột theo vai trò, dùng chung cho tiêu đề, dòng dữ liệu và bản Excel.
     *
     * Theo yêu cầu của khách: bỏ cột Mã người dùng; mã hồ sơ lên đầu với tên
     * Mã sinh viên / Mã giảng viên. Quản trị viên xem sinh viên có thêm cột
     * Khóa học ngay sau Lớp. Giảng viên xem sinh viên thì cột lớp trên hệ thống
     * đổi tên thành Lớp học phần, thêm Lớp (lớp chính thức ở collection
     * sinh_vien) và Khóa để biết sinh viên thuộc khóa nào, lớp nào.
     */
    function cotTheoVaiTro(vaiTro) {
        const laSinhVien = vaiTro !== "giang_vien";
        const T = window.TkTienIch;

        const cot = [
            laSinhVien
                ? { ten: "Mã sinh viên", lay: u => u.ma_sinh_vien, ma: true, rong: 100 }
                : { ten: "Mã giảng viên", lay: u => u.ma_giang_vien, ma: true, rong: 100 },
            { ten: "Họ tên", lay: u => u.ho_ten, trai: true, rong: 180 },
            { ten: "Email", lay: u => u.email, trai: true, rong: 210 }
        ];

        if (!laSinhVien) {
            cot.push({ ten: "Bộ môn", lay: u => u.bo_mon, rong: 130 });
        } else if (laGiangVien) {
            cot.push(
                { ten: "Lớp học phần", lay: u => u.lop_hoc_phan, rong: 200 },
                { ten: "Lớp", lay: u => u.lop, rong: 120 },
                { ten: "Khóa", lay: u => u.khoa_hoc, rong: 100 });
        } else {
            cot.push(
                { ten: "Lớp", lay: u => u.lop, rong: 120 },
                { ten: "Khóa học", lay: u => u.khoa_hoc, rong: 100 });
        }

        cot.push(
            { ten: "Số bài đã nộp", lay: u => u.so_bai_da_nop, so: true, rong: 100,
                veO: u => `<strong>${Number(u.so_bai_da_nop) || 0}</strong>` },
            { ten: "Trạng thái", lay: u => u.trang_thai ? "Đang hoạt động" : "Đã khoá", rong: 120,
                veO: u => `<span class="tk-nhan ${u.trang_thai ? "tk-nhan--xong" : "tk-nhan--cho"}">`
                    + `${u.trang_thai ? "Đang hoạt động" : "Đã khoá"}</span>` },
            { ten: "Ngày tạo", lay: u => T.dinhDangNgay(u.ngay_tao), rong: 130,
                veO: u => `<span style="white-space:nowrap">${T.dinhDangNgay(u.ngay_tao)}</span>` });

        return cot;
    }

    /** Tải danh sách đang xem về máy, kèm các trang thống kê. */
    function xuat() {
        window.TkTienIch.xuatTaiKhoanExcel(dangHien, vaiTroDangXem, dsCot);
    }

    return { mo, xuat, apDungQuyen, laGiangVien };
})();
