/**
 * ============================================================================
 * CÁC NÚT HÀNH ĐỘNG TRONG BẢNG QUẢN LÝ TÀI LIỆU
 *
 * Ba nút Lưu, Chỉnh sửa và Tải xuống trước đây chỉ có hình, không gắn sự kiện
 * nên bấm vào không xảy ra gì. File này bổ sung phần xử lý cho cả ba:
 *   - Lưu       : tải ngay tệp gốc người dùng đã nộp
 *   - Chỉnh sửa : mở biểu mẫu sửa tiêu đề và loại báo cáo
 *   - Tải xuống : mở hộp chọn giữa bản gốc và bản đã bôi màu
 * ============================================================================
 */

window.TaiLieuHanhDong = (() => {

    const API = "http://localhost:5000/api/bao-cao";

    const thoat = t => {
        const o = document.createElement("div");
        o.textContent = t === null || t === undefined ? "" : String(t);
        return o.innerHTML;
    };

    const baoTin = noiDung =>
        (typeof showAlert === "function") ? showAlert(noiDung) : alert(noiDung);

    /**
     * Tải một tệp về máy mà không rời khỏi trang đang xem.
     *
     * Máy chủ nằm ở cổng khác với trang web nên thuộc tính download của thẻ a
     * bị trình duyệt bỏ qua, bấm vào là nhảy hẳn sang địa chỉ API. Vì vậy phải
     * tải nội dung về bộ nhớ trước rồi mới dựng liên kết tải.
     */
    async function taiVe(duongDan, tenGoiY) {
        try {
            const res = await fetch(duongDan);

            if (!res.ok) {
                baoTin("Không tải được tệp: máy chủ trả về mã " + res.status);
                return false;
            }

            // Ưu tiên tên tệp do máy chủ đặt trong Content-Disposition
            let ten = tenGoiY || "tai-lieu";
            const cd = res.headers.get("Content-Disposition") || "";
            const khop = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
            if (khop) ten = decodeURIComponent(khop[1]);

            const blob = await res.blob();
            const dia = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = dia;
            a.download = ten;
            document.body.appendChild(a);
            a.click();
            a.remove();

            // Nhả bộ nhớ sau khi trình duyệt kịp bắt đầu tải
            setTimeout(() => URL.revokeObjectURL(dia), 20000);
            return true;

        } catch (err) {
            baoTin("Không kết nối được máy chủ: " + err.message);
            return false;
        }
    }


    // ========================================================================
    // HỘP THOẠI DÙNG CHUNG
    // ========================================================================

    function moHop({ tieuDe, than, nhanXacNhan, khiXacNhan }) {

        const nen = document.createElement("div");
        nen.className = "tl-hop-nen";
        nen.innerHTML = `
            <div class="tl-hop">
                <div class="tl-hop__dau">
                    <h3>${thoat(tieuDe)}</h3>
                    <button type="button" class="tl-hop__dong" title="Đóng">&times;</button>
                </div>
                <div class="tl-hop__than">${than}</div>
                <div class="tl-hop__chan">
                    <button type="button" class="tl-nut tl-nut--phu" data-huy>Hủy bỏ</button>
                    ${nhanXacNhan
                ? `<button type="button" class="tl-nut" data-xac-nhan>${thoat(nhanXacNhan)}</button>`
                : ""}
                </div>
            </div>`;

        const dong = () => nen.remove();

        nen.querySelector(".tl-hop__dong").addEventListener("click", dong);
        nen.querySelector("[data-huy]").addEventListener("click", dong);
        nen.addEventListener("click", e => { if (e.target === nen) dong(); });

        const nutXacNhan = nen.querySelector("[data-xac-nhan]");
        if (nutXacNhan && khiXacNhan) {
            nutXacNhan.addEventListener("click", () => khiXacNhan(nen, dong));
        }

        document.body.appendChild(nen);
        return nen;
    }


    // ========================================================================
    // NÚT LƯU — TẢI NGAY TỆP GỐC
    // ========================================================================

    function luuTaiLieu(maBaoCao) {
        if (!maBaoCao) return;
        return taiVe(`${API}/tai-xuong/${encodeURIComponent(maBaoCao)}`);
    }


    // ========================================================================
    // NÚT CHỈNH SỬA — SỬA THÔNG TIN TÀI LIỆU
    // ========================================================================

    function moFormSua(maBaoCao, tieuDeHienTai, loaiHienTai) {

        moHop({
            tieuDe: `Sửa thông tin tài liệu ${maBaoCao}`,
            than: `
                <label class="tl-nhan" for="tlTieuDe">Tiêu đề tài liệu</label>
                <input type="text" id="tlTieuDe" class="tl-o"
                       value="${thoat(tieuDeHienTai || "")}" maxlength="255">

                <label class="tl-nhan" for="tlLoai">Loại báo cáo</label>
                <input type="text" id="tlLoai" class="tl-o"
                       value="${thoat(loaiHienTai || "")}"
                       placeholder="Ví dụ: Báo cáo thực tập, Khoá luận…">

                <p class="tl-luu-y">Tệp tin và kết quả kiểm tra trùng lặp giữ nguyên,
                    chỉ đổi phần thông tin mô tả.</p>`,
            nhanXacNhan: "Lưu thay đổi",
            khiXacNhan: async (nen, dong) => {

                const tieuDe = nen.querySelector("#tlTieuDe").value.trim();
                if (!tieuDe) { baoTin("Tiêu đề tài liệu không được để trống!"); return; }

                try {
                    const res = await fetch(`${API}/${encodeURIComponent(maBaoCao)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            tieu_de: tieuDe,
                            loai_bao_cao: nen.querySelector("#tlLoai").value.trim()
                        })
                    });
                    const kq = await res.json();

                    if (!kq.success) { baoTin(kq.message || "Không lưu được thay đổi."); return; }

                    dong();
                    baoTin("Đã cập nhật thông tin tài liệu.");

                    if (typeof loadBaoCaoTable === "function") loadBaoCaoTable();

                } catch (err) {
                    baoTin("Không kết nối được máy chủ: " + err.message);
                }
            }
        });
    }


    // ========================================================================
    // NÚT TẢI XUỐNG — CHỌN BẢN GỐC HAY BẢN ĐÃ BÔI MÀU
    // ========================================================================

    function moFormTaiXuong(maBaoCao, tieuDe) {

        moHop({
            tieuDe: "Tải báo cáo",
            than: `
                <p class="tl-gioi-thieu">Chọn bản muốn tải về cho tài liệu
                    <strong>${thoat(tieuDe || maBaoCao)}</strong>:</p>

                <label class="tl-chon">
                    <input type="radio" name="tlBanTai" value="goc" checked>
                    <span>
                        <strong>Báo cáo gốc</strong>
                        <em>Đúng tệp bạn đã tải lên, chưa có đánh dấu gì.</em>
                    </span>
                </label>

                <label class="tl-chon">
                    <input type="radio" name="tlBanTai" value="boi_mau">
                    <span>
                        <strong>Báo cáo đã bôi màu</strong>
                        <em>Bản PDF có tô vàng những câu bị trùng.</em>
                    </span>
                </label>`,
            nhanXacNhan: "Tải xuống",
            khiXacNhan: async (nen, dong) => {

                const chon = nen.querySelector("input[name='tlBanTai']:checked").value;

                if (chon === "goc") {
                    if (await taiVe(`${API}/tai-xuong/${encodeURIComponent(maBaoCao)}`)) dong();
                    return;
                }

                // Bản bôi màu chỉ có sau khi chấm xong, nên kiểm tra trước khi tải
                const duongDan = `${API}/chi-tiet/${encodeURIComponent(maBaoCao)}/document`;
                try {
                    const res = await fetch(duongDan, { method: "HEAD" });
                    if (!res.ok) {
                        baoTin("Bản bôi màu của tài liệu này chưa có. "
                            + "Tài liệu cần được chấm xong trước đã.");
                        return;
                    }
                    if (await taiVe(duongDan, `${maBaoCao}-boi-mau.pdf`)) dong();
                } catch (err) {
                    baoTin("Không kết nối được máy chủ: " + err.message);
                }
            }
        });
    }

    // ========================================================================
    // GẮN SỰ KIỆN
    // ========================================================================

    /** Tra thông tin tài liệu theo mã, lấy từ dữ liệu bảng đang hiển thị. */
    function timTaiLieu(ma) {
        const ds = (typeof allBaoCaoData !== "undefined" && Array.isArray(allBaoCaoData))
            ? allBaoCaoData : [];

        return ds.find(x => String(x.id_bao_cao) === String(ma)) || {};
    }

    // Các dòng của bảng được dựng lại mỗi lần tải nên nghe ở cấp tài liệu,
    // không gắn trực tiếp vào từng nút.
    document.addEventListener("click", e => {

        const nut = e.target.closest("[data-hanh-dong]");
        if (!nut) return;

        const ma = nut.dataset.ma;
        if (!ma) return;

        const tl = timTaiLieu(ma);

        if (nut.dataset.hanhDong === "luu") luuTaiLieu(ma);
        else if (nut.dataset.hanhDong === "sua") moFormSua(ma, tl.tieu_de, tl.loai_bao_cao);
        else if (nut.dataset.hanhDong === "tai") moFormTaiXuong(ma, tl.tieu_de);
    });

    return { luuTaiLieu, moFormSua, moFormTaiXuong };
})();
