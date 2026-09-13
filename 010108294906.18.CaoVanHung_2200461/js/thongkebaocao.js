/**
 * ============================================================================
 * MÀN THỐNG KÊ BÁO CÁO
 *
 * Dành cho giảng viên và quản trị viên: xem toàn bộ tài liệu đã nộp kèm độ
 * trùng lặp, tỉ lệ câu trùng, tỉ lệ từ trùng, phân bố theo mức, lọc và sắp xếp.
 *
 * Số liệu lấy từ bảng thong_ke qua API /api/thong-ke/danh-sach. Các hàm tính
 * toán nằm ở thongkebaocao-tien-ich.js.
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {

    const API = "http://localhost:5000/api";
    const T = window.TkTienIch;

    let toanBo = [];        // dữ liệu gốc lấy từ máy chủ
    let dangHien = [];      // sau khi lọc và sắp xếp
    let trangHienTai = 1;
    let soDongMoiTrang = 10;

    let cotSapXep = "ti_le_trung_lap";
    let giamDan = true;

    const $ = id => document.getElementById(id);

    // ========================================================================
    // TẢI DỮ LIỆU
    // ========================================================================

    async function taiDuLieu() {

        $("tkThanBang").innerHTML =
            '<tr><td colspan="9" class="no-data">Đang tải dữ liệu...</td></tr>';

        try {
            const res = await fetch(`${API}/thong-ke/danh-sach`);
            const kq = await res.json();

            if (!kq.success || !Array.isArray(kq.data)) {
                throw new Error(kq.message || "Máy chủ không trả về danh sách");
            }

            // Máy chủ đã loại tài liệu kho mẫu, ở đây nhận thẳng.
            toanBo = kq.data;

            veTheSo();
            veBieuDo();
            locVaVe();

        } catch (err) {
            console.error("Lỗi tải thống kê:", err);
            $("tkThanBang").innerHTML =
                `<tr><td colspan="9" class="no-data">
                    Không tải được dữ liệu: ${T.thoat(err.message)}
                 </td></tr>`;
        }
    }

    // ========================================================================
    // CÁC THẺ CHỈ SỐ
    // ========================================================================

    function veTheSo() {

        const daCham = toanBo.filter(b => T.layTiLe(b) !== null);
        const chuaCham = toanBo.length - daCham.length;

        const tbTiLe = T.trungBinh(daCham, T.layTiLe);
        const tbCau = T.trungBinh(daCham, T.tiLeCau);
        const tbTu = T.trungBinh(daCham, T.tiLeTu);

        const tongCau = daCham.reduce((s, b) => s + (b.tong_so_cau || 0), 0);
        const tongCauTrung = daCham.reduce((s, b) => s + (b.tong_so_cau_trung || 0), 0);
        const tongTu = daCham.reduce((s, b) => s + (b.tong_so_tu || 0), 0);
        const tongTuTrung = daCham.reduce((s, b) => s + (b.tong_so_tu_trung || 0), 0);

        const vuotNguong =
            daCham.filter(b => T.layTiLe(b) >= T.NGUONG_CAO).length;

        const phanTram = v => v === null ? "--" : v.toFixed(2) + "%";

        $("soTongBai").textContent = toanBo.length;
        $("phuTongBai").textContent = `${daCham.length} bài đã có kết quả`;

        $("soTiLeTB").textContent = phanTram(tbTiLe);
        $("phuTiLeTB").textContent =
            daCham.length ? `Tính trên ${daCham.length} bài` : "Chưa có bài nào được chấm";

        $("soCauTrung").textContent = phanTram(tbCau);
        $("phuCauTrung").textContent =
            tongCau ? `${tongCauTrung.toLocaleString("vi-VN")} / ${tongCau.toLocaleString("vi-VN")} câu` : "Chưa có số liệu";

        $("soTuTrung").textContent = phanTram(tbTu);
        $("phuTuTrung").textContent =
            tongTu ? `${tongTuTrung.toLocaleString("vi-VN")} / ${tongTu.toLocaleString("vi-VN")} từ` : "Chưa có số liệu";

        $("soVuotNguong").textContent = vuotNguong;
        $("soDangXuLy").textContent = chuaCham;
    }

    // ========================================================================
    // BIỂU ĐỒ PHÂN BỐ
    // ========================================================================

    // Các mốc của biểu đồ phân bố. Mốc nào nằm trọn trong một mức lọc thì gắn
    // kèm mức đó, để bấm vào cột là lọc được ngay xuống bảng bên dưới.
    const MOC_PHAN_BO = [
        { nhan: "Dưới 5%", tu: 0, den: 5, mau: "#16a34a", muc: "thap" },
        { nhan: "5 – 15%", tu: 5, den: 15, mau: "#65a30d", muc: "thap" },
        { nhan: "15 – 30%", tu: 15, den: 30, mau: "#f59e0b", muc: "vua" },
        { nhan: "30 – 50%", tu: 30, den: 50, mau: "#ea580c", muc: "cao" },
        { nhan: "Từ 50%", tu: 50, den: Infinity, mau: "#dc2626", muc: "cao" }
    ];

    function veBieuDo() {

        const daCham = toanBo.filter(b => T.layTiLe(b) !== null);

        const dem = MOC_PHAN_BO.map(m =>
            daCham.filter(b => {
                const t = T.layTiLe(b);
                return t >= m.tu && t < m.den;
            }).length
        );

        const lonNhat = Math.max(...dem, 1);

        $("bieuDo").innerHTML = MOC_PHAN_BO.map((m, i) => {

            const phanTram = daCham.length
                ? Math.round((dem[i] / daCham.length) * 100) : 0;

            return `
            <button type="button" class="tk-cot" data-muc="${m.muc}"
                    title="${dem[i]} bài ở mức ${T.thoat(m.nhan)} — bấm để lọc">
                <div class="tk-cot__so">${dem[i]}</div>
                <div class="tk-cot__than"
                     style="height:${Math.round((dem[i] / lonNhat) * 100)}%;background:${m.mau};"></div>
                <div class="tk-cot__nhan">${T.thoat(m.nhan)}</div>
                <div class="tk-cot__phan-tram">${phanTram}%</div>
            </button>`;
        }).join("");

        // Bấm cột để lọc nhanh xuống bảng bên dưới
        $("bieuDo").querySelectorAll(".tk-cot").forEach(cot => {
            cot.addEventListener("click", () => {
                $("locMuc").value = cot.dataset.muc;
                trangHienTai = 1;
                locVaVe();
                $("tkThanBang").scrollIntoView({ behavior: "smooth", block: "center" });
            });
        });
    }

    // ========================================================================
    // LỌC VÀ SẮP XẾP
    // ========================================================================

    function locVaVe() {

        const ma = $("locMa").value.trim().toLowerCase();
        const tieuDe = $("locTieuDe").value.trim().toLowerCase();
        const muc = $("locMuc").value;
        const trangThai = $("locTrangThai").value;

        dangHien = toanBo.filter(b => {

            if (ma && !String(b.id_bao_cao || "").toLowerCase().includes(ma)) {
                return false;
            }

            if (tieuDe && !String(b.tieu_de || "").toLowerCase().includes(tieuDe)) {
                return false;
            }

            if (muc && T.xepMuc(T.layTiLe(b)) !== muc) return false;

            if (trangThai && b.trang_thai !== trangThai) return false;

            return true;
        });

        sapXep();

        // Lọc xong thì quay về trang đầu cho khỏi rơi vào trang trống
        const soTrang = Math.max(1, Math.ceil(dangHien.length / soDongMoiTrang));
        if (trangHienTai > soTrang) trangHienTai = 1;

        veBang();
    }

    /** Lấy giá trị dùng để so sánh của một cột, kể cả cột tính ra từ số đếm. */
    function giaTriSapXep(bc) {
        if (cotSapXep === "ti_le_trung_lap") return T.layTiLe(bc);
        if (cotSapXep === "ti_le_cau") return T.tiLeCau(bc);
        if (cotSapXep === "ti_le_tu") return T.tiLeTu(bc);
        if (cotSapXep === "ngay_tai_len") {
            return new Date(bc.ngay_tai_len || 0).getTime();
        }
        return bc[cotSapXep];
    }

    function sapXep() {

        dangHien.sort((a, b) => {

            const x = giaTriSapXep(a);
            const y = giaTriSapXep(b);

            // Bài chưa chấm luôn xếp cuối, không lẫn vào nhóm tỉ lệ thấp
            const xTrong = x === null || x === undefined;
            const yTrong = y === null || y === undefined;
            if (xTrong && yTrong) return 0;
            if (xTrong) return 1;
            if (yTrong) return -1;

            if (typeof x === "string" || typeof y === "string") {
                const r = String(x).localeCompare(String(y), "vi");
                return giamDan ? -r : r;
            }

            return giamDan ? y - x : x - y;
        });
    }

    // ========================================================================
    // VẼ BẢNG
    // ========================================================================

    /** Một ô tỉ lệ: số phần trăm tô màu theo mức, kèm phân số nếu có. */
    function oTiLe(tiLe, phanSo) {

        if (tiLe === null) {
            return '<span class="tk-so--trong">Chưa chấm</span>';
        }

        const muc = T.xepMuc(tiLe);

        return `<span class="tk-ti-le__so tk-so--${muc}">${tiLe.toFixed(2)}%</span>
                ${phanSo ? `<span class="tk-phan-so">${phanSo}</span>` : ""}`;
    }

    function veBang() {

        const than = $("tkThanBang");

        if (dangHien.length === 0) {
            than.innerHTML =
                '<tr><td colspan="9" class="no-data">Không có tài liệu nào khớp bộ lọc</td></tr>';
            capNhatPhanTrang();
            return;
        }

        const batDau = (trangHienTai - 1) * soDongMoiTrang;
        const phanTrang = dangHien.slice(batDau, batDau + soDongMoiTrang);

        than.innerHTML = phanTrang.map(b => {

            const daXong = b.trang_thai === "Đã xử lý";

            const phanSoCau = b.tong_so_cau
                ? `${b.tong_so_cau_trung} / ${b.tong_so_cau} câu` : "";

            const phanSoTu = b.tong_so_tu
                ? `${b.tong_so_tu_trung} / ${b.tong_so_tu} từ` : "";

            const tenNguoiNop = b.ten_nguoi_nop
                ? `<span title="Mã: ${T.thoat(b.id_sinh_vien)}">${T.thoat(b.ten_nguoi_nop)}</span>`
                : '<span class="tk-so--trong">--</span>';

            return `
                <tr>
                    <td class="tk-ma">${T.thoat(b.id_bao_cao)}</td>
                    <td><span class="tk-ten-tep" title="${T.thoat(b.tieu_de)}">${T.thoat(b.tieu_de)}</span></td>
                    <td style="white-space: nowrap;">${tenNguoiNop}</td>
                    <td style="white-space: nowrap;">${T.dinhDangNgay(b.ngay_tai_len)}</td>
                    <td>${oTiLe(T.layTiLe(b), "")}</td>
                    <td>${oTiLe(T.tiLeCau(b), phanSoCau)}</td>
                    <td>${oTiLe(T.tiLeTu(b), phanSoTu)}</td>
                    <td>
                        <span class="tk-nhan ${daXong ? "tk-nhan--xong" : "tk-nhan--cho"}">
                            ${T.thoat(b.trang_thai)}
                        </span>
                    </td>
                    <td>
                        ${daXong
                    ? `<a class="tk-lien-ket" target="_blank"
                               href="chitiet.html?id=${encodeURIComponent(b.id_bao_cao)}">
                               <i class="fa-solid fa-arrow-right" style="font-size: 11px;"></i> Chi tiết</a>`
                    : '<span class="tk-so--trong">--</span>'}
                    </td>
                </tr>`;
        }).join("");

        capNhatPhanTrang();
    }

    function capNhatPhanTrang() {

        const soTrang = Math.max(1, Math.ceil(dangHien.length / soDongMoiTrang));

        $("tkTongDong").textContent = dangHien.length;
        $("tkSoTrang").textContent = `${trangHienTai} / ${soTrang}`;

        $("btnTrangTruoc").disabled = trangHienTai <= 1;
        $("btnTrangSau").disabled = trangHienTai >= soTrang;
    }

    // ========================================================================
    // GẮN SỰ KIỆN
    // ========================================================================

    ["locMa", "locTieuDe"].forEach(id => {
        $(id).addEventListener("input", () => {
            trangHienTai = 1;
            locVaVe();
        });
    });

    ["locMuc", "locTrangThai"].forEach(id => {
        $(id).addEventListener("change", () => {
            trangHienTai = 1;
            locVaVe();
        });
    });

    $("btnXoaLoc").addEventListener("click", () => {
        ["locMa", "locTieuDe", "locMuc", "locTrangThai"]
            .forEach(id => { $(id).value = ""; });
        trangHienTai = 1;
        locVaVe();
    });

    $("soDongMoiTrang").addEventListener("change", e => {
        soDongMoiTrang = Number(e.target.value) || 10;
        trangHienTai = 1;
        veBang();
    });

    $("btnLamMoi").addEventListener("click", taiDuLieu);
    $("btnXuatExcel").addEventListener("click", () => T.xuatExcel(dangHien));

    $("btnTrangTruoc").addEventListener("click", () => {
        if (trangHienTai > 1) { trangHienTai--; veBang(); }
    });

    $("btnTrangSau").addEventListener("click", () => {
        const soTrang = Math.max(1, Math.ceil(dangHien.length / soDongMoiTrang));
        if (trangHienTai < soTrang) { trangHienTai++; veBang(); }
    });

    // Bấm tiêu đề cột để đổi thứ tự sắp xếp
    document.querySelectorAll(".data-table th[data-sap]").forEach(th => {
        th.addEventListener("click", () => {

            const cot = th.dataset.sap;

            if (cotSapXep === cot) {
                giamDan = !giamDan;
            } else {
                cotSapXep = cot;
                giamDan = true;
            }

            document.querySelectorAll(".data-table th")
                .forEach(x => x.classList.remove("tk-dang-sap"));
            th.classList.add("tk-dang-sap");

            sapXep();
            veBang();
        });
    });

    taiDuLieu();
});
