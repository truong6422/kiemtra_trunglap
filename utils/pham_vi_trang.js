/**
 * ============================================================================
 * PHẠM VI TRANG KHI "KIỂM TRA MỘT PHẦN"
 *
 * Người dùng gõ số trang theo đúng số trang vật lý của tài liệu — trang 5 là
 * trang thứ 5 khi mở tệp ra, không phải số in ở chân trang.
 *
 * Quy ước đọc chuỗi người dùng nhập:
 *
 *   "5"            -> từ trang 5 cho tới hết tài liệu
 *   "10-25"        -> chỉ trang 10 đến trang 25
 *   "1-5, 8, 11-13" -> đúng các trang 1..5, 8, 11..13
 *
 * Một số đứng một mình nghĩa là "từ đó tới hết" chỉ khi nó là toàn bộ nội dung
 * người dùng nhập. Khi nằm trong một danh sách thì nó chỉ là chính trang đó,
 * nếu không cả danh sách sẽ luôn bị kéo tới trang cuối và các đoạn khác mất
 * hết ý nghĩa.
 * ============================================================================
 */

/**
 * Đọc chuỗi phạm vi thành danh sách số trang.
 *
 * @param {string} chuoi Chuỗi người dùng nhập
 * @param {number} tongSoTrang Tổng số trang thật của tài liệu
 * @returns {number[]} Danh sách số trang tăng dần, không trùng nhau. Mảng rỗng
 *          nghĩa là không đọc được phạm vi nào hợp lệ.
 */
function phanTichPhamViTrang(chuoi, tongSoTrang) {
    const noiDung = String(chuoi || '').trim();
    const tong = Number(tongSoTrang) || 0;

    if (!noiDung || tong <= 0) return [];

    const cacDoan = noiDung
        .split(/[,;]/)
        .map(p => p.trim())
        .filter(Boolean);

    if (!cacDoan.length) return [];

    const chiMotSo = cacDoan.length === 1 && /^\d+$/.test(cacDoan[0]);
    const cacTrang = new Set();

    for (const doan of cacDoan) {

        const khop = doan.match(/^(\d+)\s*[-–]\s*(\d+)$/);

        if (khop) {
            let dau = Number(khop[1]);
            let cuoi = Number(khop[2]);

            // Gõ ngược "25-10" vẫn hiểu là đoạn từ 10 đến 25
            if (dau > cuoi) [dau, cuoi] = [cuoi, dau];

            themKhoang(cacTrang, dau, cuoi, tong);
            continue;
        }

        if (/^\d+$/.test(doan)) {
            const so = Number(doan);

            // Chỉ một số duy nhất: quét từ trang đó tới hết tài liệu
            themKhoang(cacTrang, so, chiMotSo ? tong : so, tong);
            continue;
        }

        // Đoạn không đọc được thì bỏ qua, không làm hỏng cả phạm vi
    }

    return [...cacTrang].sort((a, b) => a - b);
}

/** Thêm các trang trong khoảng [dau, cuoi] nằm trong giới hạn tài liệu. */
function themKhoang(tap, dau, cuoi, tong) {
    const batDau = Math.max(1, dau);
    const ketThuc = Math.min(tong, cuoi);

    for (let t = batDau; t <= ketThuc; t++) {
        tap.add(t);
    }
}

/**
 * Mô tả phạm vi thành chuỗi gọn để ghi vào bản ghi báo cáo và hiện lại cho
 * người dùng: [1,2,3,5,9,10] -> "1-3, 5, 9-10".
 */
function moTaPhamVi(cacTrang) {
    const ds = [...(cacTrang || [])].sort((a, b) => a - b);
    if (!ds.length) return '';

    const doan = [];
    let dau = ds[0];
    let truoc = ds[0];

    for (let i = 1; i <= ds.length; i++) {
        const hienTai = ds[i];

        if (hienTai !== truoc + 1) {
            doan.push(dau === truoc ? String(dau) : `${dau}-${truoc}`);
            dau = hienTai;
        }

        truoc = hienTai;
    }

    return doan.join(', ');
}

module.exports = { phanTichPhamViTrang, moTaPhamVi };
