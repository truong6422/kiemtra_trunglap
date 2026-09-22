/**
 * ============================================================================
 * ẢNH ĐẠI DIỆN TRÊN THANH ĐIỀU HƯỚNG
 *
 * Mọi trang sau khi đăng nhập đều có ô ảnh đại diện #userAvatarImg. Tệp này lo
 * hai việc cho tất cả các trang đó:
 *
 *   - Đổ đúng ảnh của người đang đăng nhập vào ô đó, thay cho tấm ảnh xám mặc
 *     định. Ảnh lấy từ máy chủ, đã được chọn sẵn theo email lúc đăng nhập.
 *
 *   - Trang Tài khoản còn cho bấm vào ảnh để chọn tấm khác trong máy.
 *
 * Nhúng sau các tệp js khác của trang:
 *     <script src="../js/anh-dai-dien.js"></script>
 * ============================================================================
 */

(() => {

    const GOC_API = "http://localhost:5000";
    const ANH_MAC_DINH = "../images/default-avatar.png";

    const maNguoiDung = () =>
        localStorage.getItem("id_nguoi_dung")
        || localStorage.getItem("userId")
        || "";

    /**
     * Đổi đường dẫn máy chủ trả về thành địa chỉ hiển thị được.
     * Ảnh chữ cái là chuỗi data URI nên dùng thẳng; ảnh đã tải lên là đường dẫn
     * bắt đầu bằng /uploads nên phải ghép thêm địa chỉ máy chủ.
     */
    function diaChiAnh(hinhAnh) {
        if (!hinhAnh) return ANH_MAC_DINH;
        if (/^(data:|https?:)/.test(hinhAnh)) return hinhAnh;
        return GOC_API + hinhAnh;
    }

    function veAnh(hinhAnh) {
        const o = document.getElementById("userAvatarImg");
        if (!o) return;

        o.src = diaChiAnh(hinhAnh);

        // Gravatar hỏng hoặc tệp bị xoá tay thì quay về ảnh mặc định, không để
        // ô ảnh thành khung vỡ
        o.onerror = () => { o.onerror = null; o.src = ANH_MAC_DINH; };

        if (hinhAnh) localStorage.setItem("hinh_anh", hinhAnh);
    }

    /** Hỏi máy chủ ảnh mới nhất của người đang đăng nhập. */
    async function taiAnh() {
        const id = maNguoiDung();
        if (!id) return;

        // Hiện ngay ảnh đã nhớ từ lần trước để đỡ nháy, rồi mới hỏi máy chủ
        const daNho = localStorage.getItem("hinh_anh");
        if (daNho) veAnh(daNho);

        try {
            const res = await fetch(`${GOC_API}/api/auth/profile/${id}`);
            const kq = await res.json();

            if (kq.success && kq.data && kq.data.hinh_anh) {
                veAnh(kq.data.hinh_anh);
            }
        } catch (e) {
            console.warn("Không lấy được ảnh đại diện:", e.message);
        }
    }

    /**
     * Gắn chức năng đổi ảnh. Chỉ bật ở trang Tài khoản: ở các trang khác ô ảnh
     * là nút mở menu người dùng, bấm vào mà hiện hộp chọn tệp thì vướng.
     */
    function ganDoiAnh() {
        const khung = document.getElementById("khungDoiAnhDaiDien");
        if (!khung) return;

        const anh = document.getElementById("anhDaiDienLon");
        const oChonTep = document.getElementById("oChonAnhDaiDien");
        const nutDatLai = document.getElementById("nutDatLaiAnhDaiDien");
        const oThongBao = document.getElementById("thongBaoAnhDaiDien");

        const baoTin = (noiDung, laLoi) => {
            if (!oThongBao) return;
            oThongBao.textContent = noiDung;
            oThongBao.style.color = laLoi ? "#b91c1c" : "#047857";
        };

        const veCaHai = hinhAnh => {
            veAnh(hinhAnh);
            if (anh) anh.src = diaChiAnh(hinhAnh);
        };

        // Đổ ảnh hiện tại vào ô lớn
        const daNho = localStorage.getItem("hinh_anh");
        if (anh && daNho) anh.src = diaChiAnh(daNho);

        // Bấm vào ảnh lớn là mở hộp chọn tệp
        if (anh && oChonTep) {
            anh.style.cursor = "pointer";
            anh.title = "Bấm để đổi ảnh đại diện";
            anh.addEventListener("click", () => oChonTep.click());
        }

        if (oChonTep) {
            oChonTep.addEventListener("change", async () => {
                const tep = oChonTep.files && oChonTep.files[0];
                if (!tep) return;

                if (tep.size > 5 * 1024 * 1024) {
                    baoTin("Ảnh vượt quá 5MB, chọn tấm nhẹ hơn.", true);
                    oChonTep.value = "";
                    return;
                }

                baoTin("Đang tải ảnh lên...", false);

                const duLieu = new FormData();
                duLieu.append("anh", tep);

                try {
                    const res = await fetch(
                        `${GOC_API}/api/auth/anh-dai-dien/${maNguoiDung()}`,
                        { method: "POST", body: duLieu });

                    const kq = await res.json();

                    if (!kq.success) {
                        baoTin(kq.message || "Không đổi được ảnh.", true);
                        return;
                    }

                    // Thêm dấu thời gian để trình duyệt tải lại ảnh mới: tên tệp
                    // giữ nguyên theo mã tài khoản nên nếu không có dấu này thì
                    // ảnh cũ trong bộ nhớ đệm vẫn hiện.
                    veCaHai(kq.hinh_anh + "?t=" + Date.now());
                    baoTin("Đã đổi ảnh đại diện.", false);

                } catch (e) {
                    baoTin("Không kết nối được máy chủ: " + e.message, true);
                } finally {
                    oChonTep.value = "";
                }
            });
        }

        if (nutDatLai) {
            nutDatLai.addEventListener("click", async () => {
                baoTin("Đang đặt lại...", false);

                try {
                    const res = await fetch(
                        `${GOC_API}/api/auth/anh-dai-dien/${maNguoiDung()}`,
                        { method: "DELETE" });

                    const kq = await res.json();

                    if (!kq.success) {
                        baoTin(kq.message || "Không đặt lại được.", true);
                        return;
                    }

                    veCaHai(kq.hinh_anh);
                    baoTin("Đã quay về ảnh mặc định theo email.", false);

                } catch (e) {
                    baoTin("Không kết nối được máy chủ: " + e.message, true);
                }
            });
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        taiAnh();
        ganDoiAnh();
    });
})();
