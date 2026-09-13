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

    const COT_XUAT = [
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
        { ten: "Trạng thái", rong: 100 }
    ];

    /**
     * Tải danh sách đang hiển thị về máy dưới dạng bảng tính Excel.
     *
     * Dùng định dạng SpreadsheetML 2003 (.xls dạng XML) thay vì gọi thư viện
     * ngoài: Excel, LibreOffice và Google Sheets đều mở được, giữ nguyên kiểu
     * số nên cột tỉ lệ vẫn sắp xếp và tính toán được, tiếng Việt không lỗi font.
     */
    function xuatExcel(danhSach) {

        if (!danhSach || danhSach.length === 0) return;

        const xmlThoat = v => String(v ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

        /** Một ô: để trống nếu chưa có số liệu, còn lại giữ đúng kiểu dữ liệu. */
        const o = (giaTri, kieuSo, kieuO) => {

            const thuocTinh = kieuO ? ` ss:StyleID="${kieuO}"` : "";

            if (giaTri === null || giaTri === undefined || giaTri === "") {
                return `<Cell${thuocTinh}/>`;
            }

            const kieu = kieuSo ? "Number" : "String";
            const noiDung = kieuSo ? Number(giaTri) : xmlThoat(giaTri);

            return `<Cell${thuocTinh}><Data ss:Type="${kieu}">${noiDung}</Data></Cell>`;
        };

        const lamTron = v =>
            (v === null || v === undefined) ? null : Math.round(v * 100) / 100;

        const dongTieuDe =
            `<Row ss:StyleID="dau">` +
            COT_XUAT.map(c => o(c.ten, false, "dau")).join("") +
            `</Row>`;

        const cacDong = danhSach.map(b => {

            const tiLe = layTiLe(b);
            const kieuMuc = "muc_" + (xepMuc(tiLe) || "trong");

            return `<Row>` +
                o(b.id_bao_cao, false) +
                o(b.tieu_de, false) +
                o(b.ten_nguoi_nop, false) +
                o(b.id_sinh_vien, false) +
                o(dinhDangNgay(b.ngay_tai_len), false) +
                o(lamTron(tiLe), true, kieuMuc) +
                o(b.tong_so_cau_trung, true) +
                o(b.tong_so_cau, true) +
                o(lamTron(tiLeCau(b)), true) +
                o(b.tong_so_tu_trung, true) +
                o(b.tong_so_tu, true) +
                o(lamTron(tiLeTu(b)), true) +
                o(b.trang_thai, false) +
                `</Row>`;
        }).join("");

        const cot = COT_XUAT
            .map(c => `<Column ss:Width="${c.rong}"/>`).join("");

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
 <Worksheet ss:Name="Thong ke bao cao">
  <Table>${cot}${dongTieuDe}${cacDong}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/><FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

        const blob = new Blob([noiDung], {
            type: "application/vnd.ms-excel;charset=utf-8;"
        });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `thong-ke-bao-cao-${Date.now()}.xls`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return {
        NGUONG_CAO, NGUONG_VUA,
        layTiLe, tiLeCau, tiLeTu, xepMuc,
        dinhDangNgay, thoat, trungBinh, xuatExcel
    };
})();
