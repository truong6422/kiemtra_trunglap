/**
 * ============================================================================
 * BẢNG CHI TIẾT PHẦN TRÙNG (cột bên phải trang Chi tiết báo cáo)
 *
 * Chọn một tài liệu nguồn ở danh sách trùng lặp thì bảng này liệt kê đúng
 * những chỗ bài nộp giống tài liệu đó, chia làm ba mục:
 *
 *   - Câu trùng:     một câu của bài nộp khớp với một câu trong bài mẫu.
 *   - Đoạn trùng:    nhiều câu liền nhau ở cả hai bên cùng khớp.
 *   - Đoạn chắp vá:  những câu nằm rời nhau trong bài mẫu bị ghép liền lại
 *                    thành một đoạn trong bài nộp. Mục này trước đây có dữ
 *                    liệu nhưng không được vẽ ra nên người dùng không thấy.
 *
 * Mỗi mục đều bấm được để nhảy tới đúng vị trí trong tài liệu, kể cả đoạn —
 * trước chỉ câu mới bấm được, đoạn thì chỉ đọc chữ chứ không xem được nó nằm
 * ở đâu trong bài.
 * ============================================================================
 */

(() => {

    /** Chống chèn thẻ HTML từ nội dung tài liệu vào trang. */
    function thoat(chuoi) {
        const o = document.createElement("div");
        o.textContent = chuoi === null || chuoi === undefined ? "" : String(chuoi);
        return o.innerHTML;
    }

    /**
     * Dựng một khối trong bảng.
     *
     * @param {Object} tt
     * @param {string} tt.lop        Lớp CSS để bắt sự kiện bấm
     * @param {number} tt.chiSoCau   Câu cần cuộn tới khi bấm
     * @param {string} tt.tieuDe     Chữ trên đầu khối
     * @param {string} tt.mauDauKhoi Màu nền phần đầu khối
     * @param {string} tt.mauChu     Màu chữ tiêu đề
     * @param {string} tt.benNop     Nội dung phía bài nộp
     * @param {string} tt.benNguon   Nội dung phía tài liệu nguồn
     * @param {string} tt.ghiChu     Dòng chú thích thêm, có thể bỏ trống
     */
    function khoi({ lop, chiSoCau, tieuDe, mauDauKhoi, mauChu,
        benNop, benNguon, ghiChu }) {

        return `
        <div class="${lop}" data-chi-so-cau="${chiSoCau}" style="
            border:1px solid #ddd;
            border-radius:8px;
            margin-bottom:12px;
            overflow:hidden;
            cursor:pointer;
        " title="Bấm để xem vị trí phần này trong tài liệu">

            <div style="
                background:${mauDauKhoi};
                padding:8px;
                font-weight:bold;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:8px;
            ">
                <span style="color:${mauChu};">${thoat(tieuDe)}</span>
                <span style="color:#2563eb;font-weight:normal;white-space:nowrap;">
                    Xem trong bài &rsaquo;
                </span>
            </div>

            ${ghiChu ? `
            <div style="
                padding:6px 10px;
                background:#f8fafc;
                font-size:12px;
                color:#64748b;
                border-bottom:1px solid #e2e8f0;
            ">${thoat(ghiChu)}</div>` : ""}

            <div style="padding:10px;background:#fff7cc;">
                <b>Bài nộp</b><br>
                ${thoat(benNop)}
            </div>

            <div style="padding:10px;background:#dbeafe;">
                <b>Nguồn</b><br>
                ${thoat(benNguon)}
            </div>

        </div>`;
    }

    function tieuDeMuc(chu, mau) {
        return `<h3 style="margin-top:18px;margin-bottom:10px;color:${mau};">`
            + `${thoat(chu)}</h3>`;
    }

    /**
     * Mô tả đoạn chắp vá này lấy câu ở chỗ nào trong bài mẫu đang xem.
     *
     * Một đoạn chắp vá thường dính tới hàng chục bài mẫu cùng lúc — cùng một
     * câu sáo mòn có thể xuất hiện ở rất nhiều báo cáo. Chỉ lấy phần nói về
     * bài mẫu đang chọn, chứ kể ra cả danh sách thì không đọc nổi.
     */
    function moTaNguonChapVa(doan, idBaoCaoNguon) {
        const chiTiet = (Array.isArray(doan.chi_tiet_nguon)
            ? doan.chi_tiet_nguon : [])
            .filter(n => n.id_bao_cao_nguon === idBaoCaoNguon);

        if (!chiTiet.length) return "";

        const cacCho = chiTiet.map(n =>
            n.tu_cau_nguon === n.den_cau_nguon
                ? `câu ${n.tu_cau_nguon + 1}`
                : `câu ${n.tu_cau_nguon + 1}–${n.den_cau_nguon + 1}`);

        return `Ghép từ ${cacCho.join(", ")} của bài mẫu.`;
    }

    /**
     * Vẽ toàn bộ bảng chi tiết cho một tài liệu nguồn.
     *
     * @param {HTMLElement} panel Khung chứa bảng
     * @param {Object} duLieu
     */
    function veBangChiTietTrung(panel, {
        tenTaiLieuMau, idBaoCaoNguon, dsCauTrung, dsDoanTrung, dsDoanChapVa
    }) {

        if (!panel) return;

        const cau = dsCauTrung || [];
        const doan = dsDoanTrung || [];
        const chapVa = dsDoanChapVa || [];

        // Lớp bôi màu đánh số các câu theo vị trí trong chính danh sách câu
        // trùng đã lọc, còn đoạn lại ghi chỉ số câu tính trên toàn bài. Hai
        // cách đánh số này không trùng nhau, nên phải bắc cầu: không có bảng
        // tra này thì bấm "Xem trong bài" ở một đoạn sẽ nhảy sang câu khác
        // hoặc không tìm thấy gì.
        const viTriTheoChiSoCau = new Map();

        cau.forEach((c, i) => {
            if (c.chi_so_cau_kiem_tra !== undefined) {
                viTriTheoChiSoCau.set(Number(c.chi_so_cau_kiem_tra), i);
            }
        });

        /**
         * Đổi chỉ số câu trong bài sang vị trí mà lớp bôi màu hiểu được.
         * Câu đầu đoạn không nằm trong danh sách trùng thì dò dần các câu sau.
         */
        const viTriBoiMau = (tu, den) => {
            for (let i = tu; i <= den; i++) {
                if (viTriTheoChiSoCau.has(i)) return viTriTheoChiSoCau.get(i);
            }
            return -1;
        };

        let noiDung = `<h3 style="margin-bottom:4px;color:#0f172a;">`
            + `${thoat(tenTaiLieuMau)}</h3>`
            + `<p style="margin:0 0 12px;font-size:12px;color:#64748b;">`
            + `${cau.length} câu trùng · ${doan.length} đoạn trùng · `
            + `${chapVa.length} đoạn chắp vá</p>`;

        // ------------------------------------------------------------------
        // CÂU TRÙNG
        // ------------------------------------------------------------------
        if (cau.length) {
            noiDung += tieuDeMuc("Câu trùng", "#0f172a");
        }

        cau.forEach((c, i) => {
            const nguon = (c.danh_sach_nguon || []).find(
                n => n.id_bao_cao === idBaoCaoNguon);

            if (!nguon) return;

            noiDung += khoi({
                lop: "khoi-cau-trung",
                // Vị trí trong mảng cũng chính là chỉ số câu mà lớp bôi màu
                // đang đánh dấu, nên truyền thẳng i
                chiSoCau: i,
                tieuDe: `Câu trùng ${i + 1}`,
                mauDauKhoi: "#f1f5f9",
                mauChu: "#0f172a",
                benNop: c.cau_kiem_tra,
                benNguon: nguon.cau_nguon
            });
        });

        // ------------------------------------------------------------------
        // ĐOẠN TRÙNG
        // ------------------------------------------------------------------
        if (doan.length) {
            noiDung += tieuDeMuc("Đoạn trùng", "#dc2626");

            doan.forEach((d, i) => {
                const tu = Number(d.tu_cau_kiem_tra) || 0;
                const den = Number(d.den_cau_kiem_tra) || tu;

                noiDung += khoi({
                    lop: "khoi-doan-trung",
                    // Cuộn tới câu trùng đầu tiên nằm trong đoạn
                    chiSoCau: viTriBoiMau(tu, den),
                    tieuDe: `Đoạn ${i + 1}`,
                    mauDauKhoi: "#fef2f2",
                    mauChu: "#dc2626",
                    ghiChu: `Câu ${tu + 1} đến ${den + 1} trong bài nộp.`,
                    benNop: d.doan_kiem_tra,
                    benNguon: d.doan_nguon
                });
            });
        }

        // ------------------------------------------------------------------
        // ĐOẠN CHẮP VÁ
        // ------------------------------------------------------------------
        if (chapVa.length) {
            noiDung += tieuDeMuc("Đoạn chắp vá", "#b45309")
                + `<p style="margin:-4px 0 10px;font-size:12px;color:#64748b;">`
                + `Những câu nằm rời nhau trong bài mẫu nhưng được ghép liền `
                + `lại thành một đoạn trong bài nộp.</p>`;

            chapVa.forEach((d, i) => {
                const tu = Number(d.tu_cau_kiem_tra) || 0;
                const den = Number(d.den_cau_kiem_tra) || tu;

                // Chỗ trong bài mẫu mà đoạn này lấy câu về. Bảng đoạn chắp vá
                // không lưu sẵn nguyên văn câu nguồn như đoạn trùng, nên ghi
                // vị trí câu để người xem mở bài mẫu ra đối chiếu được.
                const viTriNguon = moTaNguonChapVa(d, idBaoCaoNguon)
                    || `Không ghi rõ vị trí trong ${tenTaiLieuMau}.`;

                const soNguonKhac =
                    (d.danh_sach_id_bao_cao_nguon || []).length - 1;

                noiDung += khoi({
                    lop: "khoi-doan-chap-va",
                    chiSoCau: viTriBoiMau(tu, den),
                    tieuDe: `Đoạn chắp vá ${i + 1}`,
                    mauDauKhoi: "#fffbeb",
                    mauChu: "#b45309",
                    ghiChu: `Câu ${tu + 1} đến ${den + 1} trong bài nộp`
                        + (soNguonKhac > 0
                            ? ` · còn khớp với ${soNguonKhac} bài mẫu khác`
                            : ""),
                    benNop: d.doan_chap_va || d.doan_kiem_tra,
                    benNguon: viTriNguon
                });
            });
        }

        if (!cau.length && !doan.length && !chapVa.length) {
            noiDung += `<p style="text-align:center;color:#64748b;padding:16px;`
                + `font-size:13px;">Không có chỗ nào trùng với tài liệu này.</p>`;
        }

        panel.innerHTML = noiDung;

        ganSuKienBam(panel);
    }

    /** Bỏ viền nổi ở mọi khối trong bảng. */
    function xoaVienNoi(panel) {
        panel.querySelectorAll("[data-chi-so-cau]").forEach(k => {
            k.style.borderColor = "#ddd";
            k.style.boxShadow = "none";
        });
    }

    /**
     * Bấm vào một khối thì cuộn tài liệu tới đúng chỗ và làm nổi khối đó.
     * Áp dụng cho cả ba mục, không riêng câu trùng như trước.
     */
    function ganSuKienBam(panel) {

        panel.querySelectorAll("[data-chi-so-cau]").forEach(khoiEl => {

            khoiEl.addEventListener("click", () => {

                const chiSo = Number(khoiEl.dataset.chiSoCau);

                // -1 nghĩa là không dò ra câu nào của đoạn này nằm trong danh
                // sách câu được bôi màu, nên chẳng có gì để cuộn tới.
                const timThay = chiSo >= 0
                    && !!(window.PdfHighlightViewer
                        && PdfHighlightViewer.cuonToiCau(chiSo));

                xoaVienNoi(panel);

                khoiEl.style.borderColor = timThay ? "#f57c00" : "#cbd5e1";
                khoiEl.style.boxShadow = timThay
                    ? "0 0 0 2px rgba(245,124,0,.25)"
                    : "none";

                const oThongBao = document.getElementById("pdfMatchInfo");

                if (oThongBao && !timThay) {
                    oThongBao.style.display = "flex";
                    oThongBao.textContent =
                        "Không xác định được vị trí phần này trong tài liệu"
                        + " (chữ trong PDF khác với chữ đã trích xuất).";
                }
            });
        });
    }

    /**
     * Chiều ngược lại: bấm vào chữ được bôi màu trong tài liệu thì cuộn bảng
     * bên phải tới đúng mục nói về chỗ đó.
     *
     * Đăng ký một lần duy nhất khi trang mở, vì lớp bôi màu được vẽ lại mỗi lần
     * đổi tài liệu nguồn còn danh sách hàm nghe thì giữ nguyên.
     */
    function ganBamVaoChuBoiMau() {
        if (!window.PdfHighlightViewer
            || !PdfHighlightViewer.khiBamVetBoiMau) return;

        PdfHighlightViewer.khiBamVetBoiMau(chiSoCau => {

            const panel = document.getElementById("matchedSentencePanel");
            if (!panel) return;

            // Ưu tiên khối câu trùng vì nó trỏ đúng một câu; không có thì tìm
            // đoạn nào chứa câu này.
            let khoiEl = panel.querySelector(
                `.khoi-cau-trung[data-chi-so-cau="${chiSoCau}"]`);

            if (!khoiEl) {
                khoiEl = panel.querySelector(
                    `[data-chi-so-cau="${chiSoCau}"]`);
            }

            if (!khoiEl) {
                // Câu này thuộc một tài liệu nguồn khác với tài liệu đang mở
                // trong bảng. Nói rõ ra thay vì im lặng không phản hồi gì.
                const oThongBao = document.getElementById("pdfMatchInfo");

                if (oThongBao) {
                    oThongBao.style.display = "flex";
                    oThongBao.textContent =
                        "Câu này trùng với một tài liệu nguồn khác — chọn tài"
                        + " liệu đó ở danh sách bên trái để xem chi tiết.";
                }
                return;
            }

            xoaVienNoi(panel);

            khoiEl.style.borderColor = "#f57c00";
            khoiEl.style.boxShadow = "0 0 0 2px rgba(245,124,0,.25)";
            khoiEl.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }

    window.veBangChiTietTrung = veBangChiTietTrung;

    // Lớp xem PDF được nạp trước tệp này nên gắn được ngay
    document.addEventListener("DOMContentLoaded", ganBamVaoChuBoiMau);
})();
