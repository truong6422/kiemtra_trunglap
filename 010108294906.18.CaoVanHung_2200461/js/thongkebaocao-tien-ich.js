/**
 * ============================================================================
 * MÀN THỐNG KÊ BÁO CÁO — CÁC HÀM TÍNH TOÁN
 *
 * Phần không đụng tới giao diện: đọc số liệu từ một bản ghi báo cáo, xếp mức,
 * định dạng và xuất bảng tính. Tách riêng để file dựng giao diện khỏi phình to.
 * ============================================================================
 */

window.TkTienIch = (() => {

    // Ngưỡng phân mức tỉ lệ trùng, tính theo phần trăm
    const NGUONG_CAO = 30;
    const NGUONG_VUA = 15;

    /** Đưa tỉ lệ trùng về số, coi giá trị rỗng là chưa có kết quả. */
    function layTiLe(bc) {
        const v = bc.ti_le_trung_lap;
        return (v === null || v === undefined) ? null : Number(v);
    }

    /**
     * Tỉ lệ phần trăm của một cặp số đếm, ví dụ số câu trùng trên tổng số câu.
     * Trả về null khi máy chủ chưa có số liệu, để chỗ hiển thị biết là chưa
     * chấm chứ không phải bằng 0.
     */
    function tiLeTheoDem(phanTrung, tong) {
        if (phanTrung === null || phanTrung === undefined) return null;
        if (!tong) return null;
        return (Number(phanTrung) / Number(tong)) * 100;
    }

    function tiLeCau(bc) {
        return tiLeTheoDem(bc.tong_so_cau_trung, bc.tong_so_cau);
    }

    function tiLeTu(bc) {
        return tiLeTheoDem(bc.tong_so_tu_trung, bc.tong_so_tu);
    }

    /** Xếp một tỉ lệ vào mức cao / vừa / thấp. */
    function xepMuc(tiLe) {
        if (tiLe === null || tiLe === undefined) return null;
        if (tiLe >= NGUONG_CAO) return "cao";
        if (tiLe >= NGUONG_VUA) return "vua";
        return "thap";
    }

    function dinhDangNgay(chuoi) {
        if (!chuoi) return "--";
        const d = new Date(chuoi);
        if (isNaN(d)) return "--";
        const hai = n => String(n).padStart(2, "0");
        return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`
            + ` ${hai(d.getHours())}:${hai(d.getMinutes())}`;
    }

    /** Chặn HTML lạ lọt vào bảng khi đổ dữ liệu từ máy chủ. */
    function thoat(text) {
        const o = document.createElement("div");
        o.textContent = text === null || text === undefined ? "" : String(text);
        return o.innerHTML;
    }

    /** Trung bình cộng các giá trị khác null trong danh sách. */
    function trungBinh(danhSach, layGiaTri) {
        const soLieu = danhSach
            .map(layGiaTri)
            .filter(v => v !== null && v !== undefined && !isNaN(v));

        if (soLieu.length === 0) return null;

        return soLieu.reduce((s, v) => s + v, 0) / soLieu.length;
    }


    // ========================================================================
    // XUẤT BẢNG TÍNH
    // ========================================================================

    /**
     * Xuất một bảng bất kỳ ra tệp Excel.
     *
     * Dùng định dạng SpreadsheetML 2003 (.xls dạng XML) thay vì gọi thư viện
     * ngoài: Excel, LibreOffice và Google Sheets đều mở được, giữ nguyên kiểu
     * số nên cột tỉ lệ vẫn sắp xếp và tính toán được, tiếng Việt không lỗi font.
     *
     * @param {object} thamSo
     *   tenTep   tên tệp tải về, không cần đuôi
     *   tenTrang tên trang tính bên trong tệp
     *   cot      [{ten, rong}] — tiêu đề và bề rộng từng cột
     *   dong     [[giaTri | {v, so, kieu}]] — mỗi phần tử là một dòng.
     *            Ô ghi thẳng giá trị thì để nguyên; cần đánh dấu kiểu số hoặc
     *            tô màu thì truyền {v, so: true, kieu: "muc_cao"}.
     */
    function xuatBangExcel({ tenTep, tenTrang, cot, dong, trang }) {

        // Nhiều trang tính trong cùng một tệp: truyền trang = [{tenTrang, cot,
        // dong}]. Cách gọi cũ (một bảng) vẫn dùng được như trước.
        const cacTrang = (trang || [{ tenTrang, cot, dong }])
            .filter(t => t.dong && t.dong.length > 0);

        if (cacTrang.length === 0) return false;

        const xmlThoat = v => String(v ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

        function veO(oDuLieu, kieuMacDinh) {

            const { v, so, kieu } =
                (oDuLieu && typeof oDuLieu === "object" && "v" in oDuLieu)
                    ? oDuLieu : { v: oDuLieu, so: false, kieu: null };

            const thuocTinh = (kieu || kieuMacDinh)
                ? ` ss:StyleID="${kieu || kieuMacDinh}"` : "";

            if (v === null || v === undefined || v === "") {
                return `<Cell${thuocTinh}/>`;
            }

            return `<Cell${thuocTinh}><Data ss:Type="${so ? "Number" : "String"}">`
                + (so ? Number(v) : xmlThoat(v)) + `</Data></Cell>`;
        }

        const veTrang = ({ tenTrang: ten, cot: dsCot, dong: dsDong }) => {
            const dongTieuDe = `<Row ss:StyleID="dau">` +
                dsCot.map(c => veO(c.ten, "dau")).join("") + `</Row>`;
            const cacDong = dsDong
                .map(d => `<Row>` + d.map(o => veO(o, null)).join("") + `</Row>`)
                .join("");
            const khaiBaoCot = dsCot
                .map(c => `<Column ss:Width="${c.rong || 120}"/>`).join("");
            return ` <Worksheet ss:Name="${xmlThoat(String(ten).slice(0, 31))}">
  <Table>${khaiBaoCot}${dongTieuDe}${cacDong}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/><FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>`;
        };

        const noiDung =
            `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="dau">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0655FF" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="muc_cao"><Font ss:Bold="1" ss:Color="#DC2626"/></Style>
  <Style ss:ID="muc_vua"><Font ss:Bold="1" ss:Color="#D97706"/></Style>
  <Style ss:ID="muc_thap"><Font ss:Bold="1" ss:Color="#16A34A"/></Style>
  <Style ss:ID="muc_trong"><Font ss:Color="#94A3B8"/></Style>
 </Styles>
${cacTrang.map(veTrang).join("\n")}
</Workbook>`;

        const blob = new Blob([noiDung], {
            type: "application/vnd.ms-excel;charset=utf-8;"
        });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${tenTep}-${Date.now()}.xls`;
        a.click();
        URL.revokeObjectURL(a.href);

        return true;
    }

    const lamTron = v =>
        (v === null || v === undefined) ? null : Math.round(v * 100) / 100;

    /** Bảng kết quả kiểm tra trùng lặp của các báo cáo. */
    function xuatExcel(danhSach) {

        return xuatBangExcel({
            tenTep: "thong-ke-bao-cao",
            tenTrang: "Thong ke bao cao",
            cot: [
                { ten: "Mã báo cáo", rong: 90 },
                { ten: "Tiêu đề", rong: 320 },
                { ten: "Người nộp", rong: 150 },
                { ten: "Mã người nộp", rong: 100 },
                { ten: "Ngày tải lên", rong: 130 },
                { ten: "Độ trùng lặp (%)", rong: 120 },
                { ten: "Số câu trùng", rong: 95 },
                { ten: "Tổng số câu", rong: 95 },
                { ten: "Tỉ lệ câu trùng (%)", rong: 130 },
                { ten: "Số từ trùng", rong: 95 },
                { ten: "Tổng số từ", rong: 95 },
                { ten: "Tỉ lệ từ trùng (%)", rong: 130 },
                { ten: "Số nguồn phát hiện", rong: 120 },
                { ten: "Trạng thái", rong: 100 }
            ],
            dong: danhSach.map(b => {

                const tiLe = layTiLe(b);

                return [
                    b.id_bao_cao,
                    b.tieu_de,
                    b.ten_nguoi_nop,
                    b.id_sinh_vien,
                    dinhDangNgay(b.ngay_tai_len),
                    { v: lamTron(tiLe), so: true, kieu: "muc_" + (xepMuc(tiLe) || "trong") },
                    { v: b.tong_so_cau_trung, so: true },
                    { v: b.tong_so_cau, so: true },
                    { v: lamTron(tiLeCau(b)), so: true },
                    { v: b.tong_so_tu_trung, so: true },
                    { v: b.tong_so_tu, so: true },
                    { v: lamTron(tiLeTu(b)), so: true },
                    { v: b.so_nguon_phat_hien, so: true },
                    b.trang_thai
                ];
            })
        });
    }

    /** Danh sách tài khoản — dùng cho cả giảng viên lẫn sinh viên. */
    /**
     * Xuất danh sách tài khoản đang xem.
     *
     * Trang đầu là đúng bảng trên màn hình (cùng bộ cột). Với sinh viên có
     * thêm ba trang thống kê theo yêu cầu của khách: theo khóa, theo lớp chính
     * thức (collection sinh_vien) và theo lớp học phần (lớp giảng viên tạo).
     *
     * @param {Array} danhSach  dữ liệu đang hiển thị
     * @param {string} vaiTro   "sinh_vien" | "giang_vien"
     * @param {Array} dsCot     [{ten, rong, lay(u), so}] — bộ cột của bảng
     */
    function xuatTaiKhoanExcel(danhSach, vaiTro, dsCot) {

        const laSinhVien = vaiTro !== "giang_vien";
        const trang = [{
            tenTrang: laSinhVien ? "Danh sach sinh vien" : "Danh sach giang vien",
            cot: dsCot.map(c => ({ ten: c.ten, rong: c.rong })),
            dong: danhSach.map(u => dsCot.map(c =>
                c.so ? { v: c.lay(u), so: true } : c.lay(u)))
        }];

        if (laSinhVien) {
            const CHUA = "(Chưa cập nhật)";
            const tenSv = u => [u.ma_sinh_vien, u.ho_ten].filter(Boolean).join(" - ");

            /** Gom sinh viên theo khoá trả về từ hàm layKhoa (có thể nhiều khoá). */
            const thongKe = (layKhoa) => {
                const nhom = new Map();
                for (const u of danhSach) {
                    const cacKhoa = layKhoa(u);
                    for (const k of (cacKhoa.length ? cacKhoa : [CHUA])) {
                        const g = nhom.get(k) || { sv: [], bai: 0, mau: u };
                        g.sv.push(tenSv(u));
                        g.bai += Number(u.so_bai_da_nop) || 0;
                        nhom.set(k, g);
                    }
                }
                return [...nhom.entries()]
                    .sort((a, b) => a[0] === CHUA ? 1 : b[0] === CHUA ? -1
                        : a[0].localeCompare(b[0], "vi"));
            };
            const tach = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
            const cotChung = [
                { ten: "Số sinh viên", rong: 90 },
                { ten: "Tổng số bài đã nộp", rong: 120 },
                { ten: "Danh sách sinh viên", rong: 420 }
            ];
            const dongChung = g => [
                { v: g.sv.length, so: true }, { v: g.bai, so: true }, g.sv.join("; ")];

            trang.push({
                tenTrang: "Theo khoa",
                cot: [{ ten: "Khóa", rong: 110 }, ...cotChung],
                dong: thongKe(u => tach(u.khoa_hoc)).map(([k, g]) => [k, ...dongChung(g)])
            });
            trang.push({
                tenTrang: "Theo lop",
                cot: [{ ten: "Lớp", rong: 130 }, { ten: "Khóa", rong: 110 }, ...cotChung],
                dong: thongKe(u => tach(u.lop)).map(([k, g]) =>
                    [k, k === CHUA ? "" : (g.mau.khoa_hoc || ""), ...dongChung(g)])
            });
            trang.push({
                tenTrang: "Theo lop hoc phan",
                cot: [{ ten: "Lớp học phần", rong: 220 }, ...cotChung],
                dong: thongKe(u => tach(u.lop_hoc_phan)).map(([k, g]) => [k, ...dongChung(g)])
            });
        }

        return xuatBangExcel({
            tenTep: laSinhVien ? "danh-sach-sinh-vien" : "danh-sach-giang-vien",
            trang
        });
    }

    return {
        NGUONG_CAO, NGUONG_VUA,
        layTiLe, tiLeCau, tiLeTu, xepMuc,
        dinhDangNgay, thoat, trungBinh, lamTron,
        xuatBangExcel, xuatExcel, xuatTaiKhoanExcel
    };
})();
