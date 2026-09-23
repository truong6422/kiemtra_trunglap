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

    const vaiTro = (localStorage.getItem("vai_tro") ||
        localStorage.getItem("userRole") || "").trim();
    const idNguoiDung = localStorage.getItem("id_nguoi_dung") || "";

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
            // Giảng viên chỉ xem bài của lớp mình, quản trị viên xem tất cả
            const thamSo = (vaiTro === "giang_vien" && idNguoiDung)
                ? `?giang_vien=${encodeURIComponent(idNguoiDung)}` : "";

            const res = await fetch(`${API}/thong-ke/danh-sach${thamSo}`);
            const kq = await res.json();

            if (!kq.success || !Array.isArray(kq.data)) {
                throw new Error(kq.message || "Máy chủ không trả về danh sách");
            }

            // Máy chủ đã loại tài liệu kho mẫu, ở đây nhận thẳng.
            toanBo = kq.data;

            if (window.TkKetQua) window.TkKetQua.nhanDuLieu(toanBo);

            veTheSo();
            suaSoBaiChoGiangVien();
            veBoLocMuc();
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

    async function veTheSo() {

        const daCham = toanBo.filter(b => T.layTiLe(b) !== null);
        const chuaCham = toanBo.length - daCham.length;

        const vuotNguong =
            daCham.filter(b => T.layTiLe(b) >= T.NGUONG_CAO).length;

        $("soTongBai").textContent = toanBo.length;
        $("phuTongBai").textContent = `${daCham.length} bài đã có kết quả`;

        $("soKetQua").textContent = daCham.length;
        $("phuKetQua").textContent = "Bấm để xem chi tiết từng bài";

        $("soVuotNguong").textContent = vuotNguong;
        $("soDangXuLy").textContent = chuaCham;

        demLopHoc();
        demTaiKhoan();
    }

    /** Giảng viên chỉ đếm bài của thành viên lớp mình phụ trách. */
    async function suaSoBaiChoGiangVien() {

        if (vaiTro !== "giang_vien" || !idNguoiDung) return;

        try {
            const kq = await (await fetch(
                `${API}/thong-ke/bai-nop-cua-lop?id_nguoi_dung=${encodeURIComponent(idNguoiDung)}`)).json();

            if (!kq.success) return;

            $("soTongBai").textContent = kq.so_bai_da_nop;
            $("phuTongBai").textContent =
                `${kq.so_thanh_vien} thành viên trong ${kq.so_lop} lớp`;

        } catch (err) {
            console.error("Không lấy được số bài của lớp:", err);
        }
    }

    async function demLopHoc() {
        try {
            const thamSo = (vaiTro === "giang_vien" && idNguoiDung)
                ? `?id_nguoi_dung=${encodeURIComponent(idNguoiDung)}` : "";

            const kq = await (await fetch(`${API}/thong-ke/lop-hoc${thamSo}`)).json();
            if (!kq.success) return;

            const tongBaiTap = kq.data.reduce((s, l) => s + l.so_bai_tap, 0);

            $("soLopHoc").textContent = kq.data.length;
            $("phuLopHoc").textContent = `${tongBaiTap} bài tập — bấm để xem`;

        } catch (err) {
            console.error("Không đếm được lớp học:", err);
        }
    }

    async function demTaiKhoan() {
        try {
            // Giảng viên chỉ xem được sinh viên trong lớp mình, nên con số trên
            // thẻ phải đếm đúng phạm vi đó. Trước đây đếm cả 8 tài khoản toàn
            // hệ thống nên bấm vào lại ra ít hơn số ghi trên thẻ.
            const thamSo = (vaiTro === "giang_vien" && idNguoiDung)
                ? `?vai_tro=sinh_vien&giang_vien=${encodeURIComponent(idNguoiDung)}`
                : "";

            const kq = await (await fetch(`${API}/thong-ke/tai-khoan${thamSo}`)).json();
            if (!kq.success) return;
            $("soTaiKhoan").textContent = kq.data.length;
        } catch (err) {
            console.error("Không đếm được tài khoản:", err);
        }
    }

    // ========================================================================
    // CHUYỂN GIỮA CÁC KHUNG MÀN
    // ========================================================================

    const CAC_KHUNG = {
        "tong-quan": "khungTongQuan",
        "tai-khoan": "khungTaiKhoan",
        "lop-hoc": "khungLopHoc",
        "ket-qua": "khungKetQua"
    };

    function moKhung(ten) {

        for (const [k, id] of Object.entries(CAC_KHUNG)) {
            $(id).hidden = k !== ten;
        }

        // Chỉ khung tổng quan mới có gì để xuất ra tệp
        $("btnXuatExcel").style.display = ten === "tong-quan" ? "" : "none";

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ========================================================================
    // BIỂU ĐỒ PHÂN BỐ
    // ========================================================================

    // Năm mốc của biểu đồ phân bố, mỗi mốc là một khoảng tỉ lệ riêng.
    //
    // Trước đây mỗi mốc chỉ mang theo tên một mức gộp (thấp / vừa / cao) và bấm
    // vào cột thì lọc theo mức gộp đó. Hai cột "Dưới 5%" và "5 – 15%" cùng thuộc
    // mức "thấp", hai cột "30 – 50%" và "Từ 50%" cùng thuộc mức "cao", nên bấm
    // vào cột nào trong cặp cũng ra y hệt nhau: bấm "30 – 50%" lại hiện đủ cả 16
    // bài từ 30% trở lên. Giờ mỗi mốc có mã riêng và lọc đúng khoảng của nó.
    const MOC_PHAN_BO = [
        { ma: "0-5", nhan: "Dưới 5%", tu: 0, den: 5, mau: "#16a34a" },
        { ma: "5-15", nhan: "5 – 15%", tu: 5, den: 15, mau: "#65a30d" },
        { ma: "15-30", nhan: "15 – 30%", tu: 15, den: 30, mau: "#f59e0b" },
        { ma: "30-50", nhan: "30 – 50%", tu: 30, den: 50, mau: "#ea580c" },
        { ma: "50+", nhan: "Từ 50%", tu: 50, den: Infinity, mau: "#dc2626" }
    ];

    // Ba mức gộp vẫn giữ lại, vì các thẻ tóm tắt phía trên dùng tới — thẻ "Vượt
    // ngưỡng cảnh báo" lọc theo "cao", tức là từ 30% trở lên, trải qua hai mốc.
    const MUC_GOP = {
        cao: { nhan: "Từ 30% trở lên", tu: T.NGUONG_CAO, den: Infinity },
        vua: { nhan: "Từ 15% đến dưới 30%", tu: T.NGUONG_VUA, den: T.NGUONG_CAO },
        thap: { nhan: "Dưới 15%", tu: 0, den: T.NGUONG_VUA }
    };

    /** Đổi giá trị đang chọn ở ô "Mức tỉ lệ" thành khoảng tỉ lệ tương ứng. */
    function khoangCuaMuc(ma) {
        if (!ma) return null;
        if (MUC_GOP[ma]) return MUC_GOP[ma];

        return MOC_PHAN_BO.find(m => m.ma === ma) || null;
    }

    /**
     * Dựng danh sách lựa chọn cho ô "Mức tỉ lệ" từ chính hai bảng khai ở trên.
     *
     * Sinh ra từ một nguồn duy nhất để danh sách lọc và biểu đồ không bao giờ
     * lệch nhau nữa — đây chính là gốc của lỗi cũ.
     */
    function veBoLocMuc() {
        const o = $("locMuc");
        if (!o) return;

        const nhomGop = Object.entries(MUC_GOP)
            .map(([ma, m]) => `<option value="${ma}">${T.thoat(m.nhan)}</option>`)
            .join("");

        const nhomChiTiet = MOC_PHAN_BO
            .map(m => `<option value="${m.ma}">${T.thoat(m.nhan)}</option>`)
            .join("");

        o.innerHTML = `
            <option value="">Tất cả</option>
            <optgroup label="Theo ngưỡng cảnh báo">${nhomGop}</optgroup>
            <optgroup label="Theo từng mức của biểu đồ">${nhomChiTiet}</optgroup>`;
    }

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
            <button type="button" class="tk-cot" data-muc="${m.ma}"
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

            // Lọc theo đúng khoảng tỉ lệ của mức đang chọn, không quy về ba mức
            // gộp nữa. Bài chưa chấm xong (chưa có tỉ lệ) thì không thuộc mức
            // nào, nên bị loại khi người dùng có chọn mức.
            if (muc) {
                const khoang = khoangCuaMuc(muc);
                const t = T.layTiLe(b);

                if (!khoang || t === null || t === undefined) return false;
                if (t < khoang.tu || t >= khoang.den) return false;
            }

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

    // --- Bấm thẻ để mở màn thống kê tương ứng ---

    /**
     * Đặt bộ lọc của bảng tổng quan rồi vẽ lại.
     * Trước đây bấm vào thẻ nào bảng cũng hiện nguyên danh sách, không lọc gì,
     * nên con số trên thẻ và số dòng dưới bảng không khớp nhau.
     */
    function locTheoThe({ muc = "", trangThai = "", nhan = "" }) {
        $("locMa").value = "";
        $("locTieuDe").value = "";
        $("locMuc").value = muc;
        $("locTrangThai").value = trangThai;

        trangHienTai = 1;
        moKhung("tong-quan");
        locVaVe();

        const o = $("nhanDanhSach");
        if (o) o.textContent = nhan || "Toàn bộ báo cáo";

        $("tkThanBang").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Tổng số bài đã nộp: bỏ hết bộ lọc để thấy đủ mọi trạng thái, gồm cả
    // Đang xử lý và Lỗi chứ không riêng bài đã chấm xong.
    //
    // Thẻ này chỉ dành cho quản trị viên. Với giảng viên, nội dung của nó trùng
    // với thẻ Thống kê lớp học nên được ẩn đi (xem ẩn ở phần dưới).
    $("theTongBai").addEventListener("click", () => {
        locTheoThe({ nhan: "Toàn bộ báo cáo — mọi trạng thái" });
    });

    // Giảng viên theo dõi bài nộp theo lớp và theo bài tập ở thẻ Thống kê lớp
    // học, nên thẻ Tổng số bài đã nộp không cần nữa.
    if (vaiTro === "giang_vien") {
        const theTongBai = $("theTongBai");
        // Đặt thẳng display chứ không dùng hidden: thẻ này có display:flex
        // trong tệp CSS nên thuộc tính hidden bị ghi đè, ẩn không ăn.
        if (theTongBai) theTongBai.style.display = "none";
    }

    // Vượt ngưỡng cảnh báo: chỉ những bài có kết quả từ 30% trở lên
    $("theVuotNguong").addEventListener("click", () => {
        locTheoThe({ muc: "cao", nhan: "Báo cáo vượt ngưỡng cảnh báo (từ 30%)" });
    });

    // Đang xử lý: chỉ những bài chưa có kết quả
    $("theDangXuLy").addEventListener("click", () => {
        locTheoThe({ trangThai: "Đang xử lý", nhan: "Báo cáo đang xử lý" });
    });

    $("theLopHoc").addEventListener("click", () => {
        moKhung("lop-hoc");
        window.TkLopHoc.mo();
    });

    $("theKetQua").addEventListener("click", () => {
        moKhung("ket-qua");
        window.TkKetQua.mo();
    });

    // Thẻ tài khoản có hai nút riêng cho hai vai trò
    document.querySelectorAll("#theTaiKhoan .tk-lien-ket-nho").forEach(nut => {
        nut.addEventListener("click", () => {
            if (nut.disabled) return;
            moKhung("tai-khoan");
            window.TkTaiKhoan.mo(nut.dataset.vaiTro);
        });
    });

    document.querySelectorAll("#khungTaiKhoan .tk-tab__nut").forEach(nut => {
        nut.addEventListener("click", () => {
            if (nut.disabled) return;
            window.TkTaiKhoan.mo(nut.dataset.vaiTro);
        });
    });

    // Giảng viên không được xem danh sách giảng viên — khoá nút lại
    window.TkTaiKhoan.apDungQuyen();

    $("btnXuatTaiKhoan").addEventListener("click", () => window.TkTaiKhoan.xuat());
    $("btnXuatKetQua").addEventListener("click", () => window.TkKetQua.xuat());

    // Xuất danh sách sinh viên đã nộp và chưa nộp của một bài tập
    $("btnXuatNopBai").addEventListener("click", () => {
        if (!window.TkLopHoc.xuatNopBai()) {
            thongBao("Chưa có dữ liệu để xuất. Hãy mở một bài tập trước.");
        }
    });

    document.querySelectorAll(".tk-nut-quay-lai").forEach(nut => {
        nut.addEventListener("click", () => moKhung(nut.dataset.ve));
    });

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
