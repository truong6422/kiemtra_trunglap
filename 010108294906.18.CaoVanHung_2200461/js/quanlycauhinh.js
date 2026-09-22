/**
 * ============================================================================
 * MÀN QUẢN LÝ CẤU HÌNH
 *
 * Chỉ quản trị viên vào được. Cho phép chỉnh:
 *   - Ngưỡng trùng lặp dùng khi so khớp từng câu
 *   - Bật / tắt và đặt trọng số cho ba thuật toán so khớp
 *   - Định dạng tệp và dung lượng tối đa người dùng được tải lên
 *
 * Những giá trị này được thuật toán đọc lại ở lần kiểm tra kế tiếp, không phải
 * số hiển thị cho đẹp.
 * ============================================================================
 */

(() => {

    const API = "http://localhost:5000/api";
    const $ = id => document.getElementById(id);

    const vaiTro = (localStorage.getItem("vai_tro") ||
        localStorage.getItem("userRole") || "").trim();

    const laQuanTri = vaiTro === "quan_tri" || vaiTro === "quan_tri_vien" ||
        vaiTro === "admin";

    // Bản cấu hình đang hiển thị trên màn hình
    let cauHinh = null;
    let dinhDangHoTro = [".docx", ".pdf", ".doc", ".txt"];

    const thoat = t => {
        const o = document.createElement("div");
        o.textContent = t === null || t === undefined ? "" : String(t);
        return o.innerHTML;
    };

    function baoTin(noiDung, laLoi) {
        const o = $("chThongBao");
        o.textContent = noiDung;
        o.className = "ch-thong-bao ch-thong-bao--hien " +
            (laLoi ? "ch-thong-bao--loi" : "ch-thong-bao--ok");

        if (!laLoi) {
            setTimeout(() => { o.className = "ch-thong-bao"; }, 4000);
        }
    }

    function dinhDangNgay(chuoi) {
        if (!chuoi) return "--";
        const d = new Date(chuoi);
        if (isNaN(d)) return "--";
        const hai = n => String(n).padStart(2, "0");
        return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`
            + ` ${hai(d.getHours())}:${hai(d.getMinutes())}`;
    }


    // ========================================================================
    // DỰNG GIAO DIỆN TỪ DỮ LIỆU
    // ========================================================================

    function veNguong() {
        // Cơ sở dữ liệu lưu ngưỡng dạng 0 đến 1, trên màn hình hiện theo phần trăm
        const phanTram = Math.round((Number(cauHinh.nguong_trung_lap) || 0.6) * 100);
        $("thanhNguong").value = phanTram;
        $("soNguong").textContent = phanTram;
    }

    function veThuatToan() {
        $("dsThuatToan").innerHTML = cauHinh.danh_sach_thuat_toan
            .map((t, i) => `
            <article class="ch-tt${t.trang_thai ? "" : " ch-tt--tat"}" data-vi-tri="${i}">
                <div class="ch-tt__dau">
                    <div>
                        <div class="ch-tt__ten">${thoat(t.ten_thuat_toan)}</div>
                        <span class="ch-tt__ma">${thoat(t.ma_thuat_toan)}</span>
                    </div>
                    <label class="ch-cong-tac">
                        <input type="checkbox" data-bat="${i}"
                               ${t.trang_thai ? "checked" : ""}>
                        <span class="ch-cong-tac__nut"></span>
                    </label>
                </div>
                <p class="ch-tt__mo-ta">${thoat(t.mo_ta || "")}</p>
                <div class="ch-tt__trong-so">
                    <label for="ts${i}">Trọng số (%)</label>
                    <input type="number" id="ts${i}" data-trong-so="${i}"
                           min="0" max="100" step="5"
                           value="${Math.round((Number(t.trong_so) || 0) * 100)}"
                           ${t.trang_thai ? "" : "disabled"}>
                </div>
            </article>`).join("");

        capNhatTong();
    }

    /** Tổng trọng số các thuật toán đang bật, tính theo phần trăm. */
    function tinhTong() {
        return cauHinh.danh_sach_thuat_toan
            .filter(t => t.trang_thai)
            .reduce((s, t) => s + Math.round((Number(t.trong_so) || 0) * 100), 0);
    }

    /**
     * Cho biết bộ trọng số đang đặt sẽ được quy về tỉ lệ nào khi đem đi tính.
     *
     * Tổng không bắt buộc bằng 100%. Máy chủ chia cả bộ cho tổng của chúng
     * trước khi chấm, nên 50/50/30 và 38.5/38.5/23 cho ra cùng một kết quả.
     * Hiện sẵn dãy số sau khi quy đổi để người dùng thấy rõ điều đó.
     */
    function capNhatTong() {
        const dangBat = cauHinh.danh_sach_thuat_toan.filter(t => t.trang_thai);
        const tong = tinhTong();
        const o = $("chTong");

        if (tong <= 0) {
            o.className = "ch-tong ch-tong--sai";
            o.innerHTML = `Tổng trọng số: <strong id="soTong">0%</strong> — `
                + `phải lớn hơn 0 thì mới còn thuật toán nào có tiếng nói.`;
            return;
        }

        if (tong === 100) {
            o.className = "ch-tong";
            o.innerHTML = `Tổng trọng số: <strong id="soTong">100%</strong> — `
                + `dùng thẳng, không phải quy đổi.`;
            return;
        }

        // Tổng khác 100%: vẫn lưu được, chỉ báo cho biết tỉ lệ thực tế
        const quyDoi = dangBat
            .map(t => {
                const phanTram = (Number(t.trong_so) || 0) * 100;
                return `${thoat(t.ma_thuat_toan)} `
                    + `${(phanTram / tong * 100).toFixed(1)}%`;
            })
            .join(" · ");

        o.className = "ch-tong ch-tong--quy-doi";
        o.innerHTML = `Tổng trọng số: <strong id="soTong">${tong}%</strong> — `
            + `hệ thống sẽ quy về tổng 100%: ${quyDoi}. `
            + `Tỉ lệ giữa các thuật toán giữ nguyên nên kết quả vẫn nằm trong `
            + `0–100%.`;
    }

    function veDinhDang() {
        $("dsDinhDang").innerHTML = dinhDangHoTro.map(d => `
            <label>
                <input type="checkbox" value="${thoat(d)}"
                       ${cauHinh.cho_phep_upload.includes(d) ? "checked" : ""}>
                ${thoat(d)}
            </label>`).join("");
    }

    function veThongTin() {
        $("ttCheDo").textContent =
            cauHinh.thuat_toan_mac_dinh === "KET_HOP_3_THUAT_TOAN"
                ? "Kết hợp nhiều thuật toán"
                : (cauHinh.thuat_toan_mac_dinh || "--");

        $("ttTuVung").textContent =
            (cauHinh.so_tu_vung_idf || 0).toLocaleString("vi-VN") + " từ";

        $("ttNguoiCapNhat").textContent = cauHinh.nguoi_cap_nhat || "--";
        $("ttNgayCapNhat").textContent = dinhDangNgay(cauHinh.ngay_cap_nhat);
    }

    function ve() {
        veNguong();
        veThuatToan();
        veDinhDang();
        veThongTin();
        $("oKichThuoc").value = parseInt(cauHinh.kich_thuoc_toi_da, 10) || 20;
    }


    // ========================================================================
    // ĐỌC / GHI MÁY CHỦ
    // ========================================================================

    async function tai() {
        try {
            const res = await fetch(`${API}/cau-hinh`);
            const json = await res.json();

            if (!json.success || !json.data) {
                baoTin("Chưa có bản ghi cấu hình nào trong cơ sở dữ liệu.", true);
                return;
            }

            cauHinh = json.data;
            if (Array.isArray(json.dinh_dang_ho_tro) && json.dinh_dang_ho_tro.length) {
                dinhDangHoTro = json.dinh_dang_ho_tro;
            }

            ve();
        } catch (e) {
            baoTin("Không kết nối được máy chủ: " + e.message, true);
        }
    }

    async function luu() {
        if (!cauHinh) return;

        if (tinhTong() <= 0) {
            baoTin("Tổng trọng số của các thuật toán đang bật phải lớn hơn 0.",
                true);
            return;
        }

        const dinhDangChon = [...$("dsDinhDang").querySelectorAll("input:checked")]
            .map(o => o.value);

        if (dinhDangChon.length === 0) {
            baoTin("Phải chọn ít nhất một định dạng tệp được phép tải lên.", true);
            return;
        }

        const soMB = parseInt($("oKichThuoc").value, 10);
        if (isNaN(soMB) || soMB < 1 || soMB > 100) {
            baoTin("Kích thước tối đa phải nằm trong khoảng 1 đến 100 MB.", true);
            return;
        }

        const nut = $("btnLuu");
        nut.disabled = true;

        try {
            const res = await fetch(`${API}/cau-hinh`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nguong_trung_lap: Number($("thanhNguong").value) / 100,
                    thuat_toan_mac_dinh: cauHinh.thuat_toan_mac_dinh,
                    danh_sach_thuat_toan: cauHinh.danh_sach_thuat_toan,
                    cho_phep_upload: dinhDangChon,
                    kich_thuoc_toi_da: soMB + "MB",
                    nguoi_cap_nhat: localStorage.getItem("ho_ten") ||
                        localStorage.getItem("id_nguoi_dung") || "admin"
                })
            });

            const json = await res.json();

            if (!json.success) {
                baoTin(json.message || "Lưu cấu hình không thành công.", true);
                return;
            }

            cauHinh = json.data;
            ve();
            baoTin("Đã lưu cấu hình. Các lần kiểm tra sau sẽ dùng thiết lập mới.", false);
        } catch (e) {
            baoTin("Không lưu được: " + e.message, true);
        } finally {
            nut.disabled = false;
        }
    }


    // ========================================================================
    // GẮN SỰ KIỆN
    // ========================================================================

    /**
     * Ghi lại trọng số vừa nhập. Chỉ nắn giá trị về khoảng 0–100 khi người dùng
     * đã nhập xong (sự kiện change), để không nhảy số ngay lúc đang gõ dở.
     */
    function capNhatTrongSo(o, daNhapXong) {
        const i = Number(o.dataset.trongSo);
        const phanTram = Math.min(100, Math.max(0, Number(o.value) || 0));

        if (daNhapXong) o.value = phanTram;

        cauHinh.danh_sach_thuat_toan[i].trong_so = phanTram / 100;
        capNhatTong();
    }

    function gan() {

        $("thanhNguong").addEventListener("input", e => {
            $("soNguong").textContent = e.target.value;
        });

        // Công tắc và ô trọng số được dựng lại mỗi lần vẽ nên nghe ở khung ngoài
        $("dsThuatToan").addEventListener("change", e => {
            const o = e.target;

            if (o.dataset.bat !== undefined) {
                const i = Number(o.dataset.bat);
                cauHinh.danh_sach_thuat_toan[i].trang_thai = o.checked;

                // Tắt thuật toán thì trọng số của nó về 0 để tổng vẫn tính đúng
                if (!o.checked) cauHinh.danh_sach_thuat_toan[i].trong_so = 0;

                veThuatToan();
                return;
            }

            if (o.dataset.trongSo !== undefined) capNhatTrongSo(o, true);
        });

        // Nghe thêm sự kiện gõ phím để tổng chạy theo ngay, không phải đợi
        // người dùng rời khỏi ô mới thấy con số mới.
        $("dsThuatToan").addEventListener("input", e => {
            if (e.target.dataset.trongSo !== undefined) {
                capNhatTrongSo(e.target, false);
            }
        });

        $("btnLuu").addEventListener("click", luu);
        $("btnTaiLai").addEventListener("click", tai);
    }


    document.addEventListener("DOMContentLoaded", () => {

        if (!laQuanTri) {
            $("chNoiDung").hidden = true;
            $("chChan").hidden = false;
            return;
        }

        gan();
        tai();
    });
})();
