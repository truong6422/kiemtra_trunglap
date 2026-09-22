/**
 * ============================================================================
 * MÀN THỐNG KÊ LỚP HỌC
 *
 * Ba mức đi dần vào trong:
 *   1. Danh sách lớp
 *   2. Bài tập của một lớp
 *   3. Chi tiết một bài tập: ai đã nộp, ai chưa nộp
 * ============================================================================
 */

window.TkLopHoc = (() => {

    const API = "http://localhost:5000/api";
    const $ = id => document.getElementById(id);
    const T = () => window.TkTienIch;

    // Dữ liệu bài tập đang mở, giữ lại để xuất ra tệp bảng tính
    let duLieuBaiTapDangXem = null;

    function veDuongDan(cacMuc) {
        $("tkDuongDanLop").innerHTML = cacMuc
            .map((m, i) => m.hanh_dong
                ? `<button type="button" class="tk-duong-dan__muc" data-buoc="${m.hanh_dong}">${T().thoat(m.ten)}</button>`
                : `<span>${T().thoat(m.ten)}</span>`)
            .join('<i class="fa-solid fa-angle-right tk-duong-dan__mui"></i>');

        $("tkDuongDanLop").querySelectorAll("[data-buoc]").forEach(nut => {
            nut.addEventListener("click", () => {
                if (nut.dataset.buoc === "danh-sach-lop") moDanhSachLop();
            });
        });
    }

    function baoLoi(err) {
        $("tkNoiDungLopHoc").innerHTML =
            `<div class="tk-khoi"><p class="no-data">Không tải được: ${T().thoat(err.message)}</p></div>`;
    }

    // ========================================================================
    // MỨC 1 — DANH SÁCH LỚP
    // ========================================================================

    async function moDanhSachLop() {

        veDuongDan([{ ten: "Tất cả lớp học" }]);
        $("tkNoiDungLopHoc").innerHTML = '<div class="tk-khoi"><p class="no-data">Đang tải...</p></div>';

        // Ra khỏi màn chi tiết bài tập thì không còn gì để xuất
        duLieuBaiTapDangXem = null;
        const nutXuat = $("btnXuatNopBai");
        if (nutXuat) nutXuat.hidden = true;

        try {
            // Giảng viên chỉ thấy lớp mình phụ trách, quản trị viên thấy tất cả
            const vaiTro = localStorage.getItem("vai_tro") || "";
            const idNguoiDung = localStorage.getItem("id_nguoi_dung") || "";

            const thamSo = (vaiTro === "giang_vien" && idNguoiDung)
                ? `?id_nguoi_dung=${encodeURIComponent(idNguoiDung)}` : "";

            const kq = await (await fetch(`${API}/thong-ke/lop-hoc${thamSo}`)).json();
            if (!kq.success) throw new Error(kq.message);

            if (kq.data.length === 0) {
                $("tkNoiDungLopHoc").innerHTML =
                    '<div class="tk-khoi"><p class="no-data">Chưa có lớp học nào</p></div>';
                return;
            }

            $("tkNoiDungLopHoc").innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Mã lớp</th><th>Tên lớp</th><th>Giảng viên</th>
                            <th>Số thành viên</th><th>Số bài tập</th>
                            <th>Bài đã nộp</th><th>Ngày tạo</th><th>Xem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${kq.data.map(l => `
                            <tr>
                                <td class="tk-ma">${T().thoat(l.ma_lop)}</td>
                                <td style="text-align:left">${T().thoat(l.tieu_de)}</td>
                                <td>${T().thoat(l.giang_vien)}</td>
                                <td><strong>${l.so_thanh_vien}</strong></td>
                                <td><strong>${l.so_bai_tap}</strong></td>
                                <td><strong>${l.so_bai_nop ?? 0}</strong></td>
                                <td style="white-space:nowrap">${T().dinhDangNgay(l.ngay_tao)}</td>
                                <td>
                                    <button type="button" class="tk-lien-ket" data-lop="${l.id_lop_hoc}"
                                            data-ten="${T().thoat(l.tieu_de)}">
                                        <i class="fa-solid fa-arrow-right" style="font-size:11px"></i> Bài tập
                                    </button>
                                </td>
                            </tr>`).join("")}
                    </tbody>
                </table>`;

            $("tkNoiDungLopHoc").querySelectorAll("[data-lop]").forEach(nut => {
                nut.addEventListener("click", () =>
                    moBaiTapCuaLop(nut.dataset.lop, nut.dataset.ten));
            });

        } catch (err) { baoLoi(err); }
    }

    // ========================================================================
    // MỨC 2 — BÀI TẬP CỦA MỘT LỚP
    // ========================================================================

    async function moBaiTapCuaLop(idLop, tenLop) {

        veDuongDan([
            { ten: "Tất cả lớp học", hanh_dong: "danh-sach-lop" },
            { ten: tenLop }
        ]);
        $("tkNoiDungLopHoc").innerHTML = '<div class="tk-khoi"><p class="no-data">Đang tải...</p></div>';

        try {
            const kq = await (await fetch(
                `${API}/thong-ke/lop-hoc/${encodeURIComponent(idLop)}/bai-tap`)).json();
            if (!kq.success) throw new Error(kq.message);

            if (kq.data.length === 0) {
                $("tkNoiDungLopHoc").innerHTML =
                    `<div class="tk-khoi"><p class="no-data">
                        Lớp ${T().thoat(kq.lop_hoc.ma_lop)} chưa tạo bài tập nào
                     </p></div>`;
                return;
            }

            $("tkNoiDungLopHoc").innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên bài tập</th><th>Trạng thái</th><th>Hạn nộp</th>
                            <th>Thành viên</th><th>Đã nộp</th><th>Chưa nộp</th><th>Xem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${kq.data.map(b => `
                            <tr>
                                <td style="text-align:left">${T().thoat(b.tieu_de)}</td>
                                <td><span class="tk-nhan tk-nhan--xong">${T().thoat(b.trang_thai)}</span></td>
                                <td>${b.thoi_gian_ket_thuc === "Không giới hạn"
                    ? "Không giới hạn" : T().dinhDangNgay(b.thoi_gian_ket_thuc)}</td>
                                <td><strong>${b.so_thanh_vien}</strong></td>
                                <td class="tk-so--thap"><strong>${b.so_da_nop}</strong></td>
                                <td class="tk-so--cao"><strong>${b.so_chua_nop}</strong></td>
                                <td>
                                    <button type="button" class="tk-lien-ket" data-bai="${b.id_bai_tap}"
                                            data-ten="${T().thoat(b.tieu_de)}">
                                        <i class="fa-solid fa-arrow-right" style="font-size:11px"></i> Chi tiết
                                    </button>
                                </td>
                            </tr>`).join("")}
                    </tbody>
                </table>`;

            $("tkNoiDungLopHoc").querySelectorAll("[data-bai]").forEach(nut => {
                nut.addEventListener("click", () =>
                    moChiTietBaiTap(nut.dataset.bai, tenLop, idLop, nut.dataset.ten));
            });

        } catch (err) { baoLoi(err); }
    }

    // ========================================================================
    // MỨC 3 — CHI TIẾT MỘT BÀI TẬP
    // ========================================================================

    /** Một bảng người: dùng chung cho danh sách đã nộp và chưa nộp. */
    function bangNguoi(danhSach, coTiLe) {

        if (danhSach.length === 0) {
            return '<p class="no-data">Không có ai</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Mã</th><th>Họ tên</th><th>Email</th>
                        ${coTiLe ? "<th>Tài liệu</th><th>Ngày nộp</th><th>Tỉ lệ trùng</th>" : ""}
                    </tr>
                </thead>
                <tbody>
                    ${danhSach.map(n => {

            const tiLe = n.ti_le_trung_lap;
            const muc = T().xepMuc(tiLe);

            return `<tr>
                        <td class="tk-ma">${T().thoat(n.id_sinh_vien || n.id_nguoi_dung)}</td>
                        <td style="text-align:left">${T().thoat(n.ho_ten)}</td>
                        <td style="text-align:left">${T().thoat(n.email) || '<span class="tk-so--trong">--</span>'}</td>
                        ${coTiLe ? `
                            <td style="text-align:left">${T().thoat(n.tieu_de_tep) || T().thoat(n.id_bao_cao)}</td>
                            <td style="white-space:nowrap">${T().dinhDangNgay(n.ngay_nop)}</td>
                            <td>${tiLe === null || tiLe === undefined
                    ? '<span class="tk-so--trong">Chưa chấm</span>'
                    : `<span class="tk-ti-le__so tk-so--${muc}">${Number(tiLe).toFixed(2)}%</span>`}</td>`
                    : ""}
                    </tr>`;
        }).join("")}
                </tbody>
            </table>`;
    }

    async function moChiTietBaiTap(idBaiTap, tenLop, idLop, tenBai) {

        veDuongDan([
            { ten: "Tất cả lớp học", hanh_dong: "danh-sach-lop" },
            { ten: tenLop },
            { ten: tenBai }
        ]);
        $("tkNoiDungLopHoc").innerHTML = '<div class="tk-khoi"><p class="no-data">Đang tải...</p></div>';

        try {
            const d = await (await fetch(
                `${API}/thong-ke/bai-tap/${encodeURIComponent(idBaiTap)}`)).json();
            if (!d.success) throw new Error(d.message);

            $("tkNoiDungLopHoc").innerHTML = `
                <section class="tk-the-so">
                    <article class="tk-the">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-users"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Tổng số thành viên</div>
                            <div class="tk-the__so">${d.tong_so_thanh_vien}</div>
                            <div class="tk-the__phu">Trong lớp ${T().thoat(d.lop_hoc ? d.lop_hoc.ma_lop : "")}</div>
                        </div>
                    </article>
                    <article class="tk-the tk-the--luc">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Đã nộp bài</div>
                            <div class="tk-the__so">${d.da_nop.length}</div>
                            <div class="tk-the__phu">${d.tong_so_thanh_vien
                    ? Math.round(d.da_nop.length / d.tong_so_thanh_vien * 100) : 0}% thành viên</div>
                        </div>
                    </article>
                    <article class="tk-the tk-the--do">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-circle-xmark"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Chưa nộp bài</div>
                            <div class="tk-the__so">${d.chua_nop.length}</div>
                            <div class="tk-the__phu">${d.tong_so_thanh_vien
                    ? Math.round(d.chua_nop.length / d.tong_so_thanh_vien * 100) : 0}% thành viên</div>
                        </div>
                    </article>
                </section>

                <section class="tk-khoi">
                    <div class="tk-khoi__dau"><h3>Đã nộp bài (${d.da_nop.length})</h3></div>
                    ${bangNguoi(d.da_nop, true)}
                </section>

                <section class="tk-khoi">
                    <div class="tk-khoi__dau"><h3>Chưa nộp bài (${d.chua_nop.length})</h3></div>
                    ${bangNguoi(d.chua_nop, false)}
                </section>

                <section class="tk-khoi">
                    <div class="tk-khoi__dau"><h3>Toàn bộ thành viên (${d.tong_so_thanh_vien})</h3></div>
                    ${bangNguoi(d.danh_sach_thanh_vien, false)}
                </section>`;

            // Giữ lại dữ liệu để xuất ra tệp mà không phải gọi lại máy chủ
            duLieuBaiTapDangXem = { ...d, ten_lop: tenLop };

            const nut = $("btnXuatNopBai");
            if (nut) {
                nut.hidden = false;
                nut.disabled = false;
            }

        } catch (err) { baoLoi(err); }
    }

    /**
     * Xuất bảng tính danh sách nộp bài của một bài tập.
     * Sinh viên chưa nộp vẫn có một dòng riêng, các cột tài liệu, ngày nộp và
     * tỉ lệ trùng lặp để trống — nhìn vào là thấy ngay ai còn thiếu bài.
     */
    function xuatDanhSachNopBai() {

        const d = duLieuBaiTapDangXem;
        if (!d) return false;

        const T_ = T();

        const dongDaNop = (d.da_nop || []).map(n => [
            n.id_sinh_vien || "",
            n.ho_ten || "",
            n.email || "",
            "Đã nộp",
            n.tieu_de_tep || "",
            n.ngay_nop ? T_.dinhDangNgay(n.ngay_nop) : "",
            n.ti_le_trung_lap === null || n.ti_le_trung_lap === undefined
                ? ""
                : { v: T_.lamTron(n.ti_le_trung_lap), so: true,
                    kieu: "muc_" + (T_.xepMuc(n.ti_le_trung_lap) || "trong") }
        ]);

        const dongChuaNop = (d.chua_nop || []).map(n => [
            n.id_sinh_vien || "",
            n.ho_ten || "",
            n.email || "",
            "Chưa nộp",
            "", "", ""
        ]);

        return T_.xuatBangExcel({
            tenTep: `nop-bai-${d.bai_tap ? d.bai_tap.id_bai_tap : "bai-tap"}`,
            tenTrang: "Danh sach nop bai",
            cot: [
                { ten: "Mã sinh viên", rong: 120 },
                { ten: "Họ tên", rong: 200 },
                { ten: "Email", rong: 220 },
                { ten: "Trạng thái", rong: 100 },
                { ten: "Tài liệu đã nộp", rong: 260 },
                { ten: "Ngày nộp", rong: 150 },
                { ten: "Tỉ lệ trùng lặp (%)", rong: 150 }
            ],
            dong: [...dongDaNop, ...dongChuaNop]
        });
    }

    return { mo: moDanhSachLop, xuatNopBai: xuatDanhSachNopBai };
})();
