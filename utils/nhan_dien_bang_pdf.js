/**
 * ============================================================================
 * NHẬN RA BẢNG BIỂU TRONG PDF THEO ĐƯỜNG KẺ Ô (utils/nhan_dien_bang_pdf.js)
 * ----------------------------------------------------------------------------
 * Bản Word biết chắc đoạn nào nằm trong ô bảng (w:tbl) và loại chữ trong bảng
 * khỏi so trùng. Bản PDF không có khái niệm bảng, chỉ có chữ và nét vẽ, nên
 * trước đây mỗi ô bảng thành một "câu" vụn ("CREATE TABLE Tạo bảng", "DROP VIEW
 * Xóa khung nhìn"…). Bài nhiều bảng như 2000762 vì thế ra 747 câu so với 408
 * câu của bản Word, hơn nửa số câu không khớp nguồn nào và tỉ lệ tụt còn ~54%.
 *
 * Bảng in ra PDF luôn có nét kẻ ô. Ở đây gom các nét ngang/dọc trên trang,
 * nét nào chạm nhau thì cùng một khung; khung có ít nhất hai ô thì là bảng.
 * Chữ nằm trong khung được gắn nhãn BẢNG giống hệt bản Word, nên hai định
 * dạng của cùng một bài cho ra cùng bộ câu.
 * ============================================================================
 */

const { napPdfJs } = require('./mo_pdf');

// Nét mỏng hơn mức này (pt) coi là đường kẻ chứ không phải khối tô màu
const DAY_NET_TOI_DA = 3;
// Hai nét cách nhau dưới mức này (pt) coi là chạm nhau / trùng một đường
const DUNG_SAI = 2.5;
// Quá số nét này trên một trang thì không dò bảng
const NET_TOI_DA = 4000;

/** Nhân hai ma trận biến đổi [a b c d e f] của PDF. */
function nhanMaTran(m, n) {
    return [
        m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
        m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
        m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]
    ];
}

/** Đưa khung chữ nhật [x0,y0,x1,y1] qua ma trận biến đổi. */
function bienDoiKhung([x0, y0, x1, y1], m) {
    const diem = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]
        .map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    const xs = diem.map(p => p[0]);
    const ys = diem.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/**
 * Lấy các nét kẻ ngang/dọc trên một trang.
 * @returns {Array<{x0:number,y0:number,x1:number,y1:number,ngang:boolean}>}
 */
async function layNetKe(page) {
    const { OPS } = await napPdfJs();
    const ol = await page.getOperatorList();

    const VE = new Set([OPS.stroke, OPS.closeStroke, OPS.fill, OPS.eoFill,
        OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
    const NET_VIEN = new Set([OPS.stroke, OPS.closeStroke]);

    const cacNet = [];
    const ngan = [];
    let ctm = [1, 0, 0, 1, 0, 0];

    for (let i = 0; i < ol.fnArray.length; i++) {
        const fn = ol.fnArray[i];
        const args = ol.argsArray[i];

        if (fn === OPS.save) ngan.push(ctm);
        else if (fn === OPS.restore) ctm = ngan.pop() || [1, 0, 0, 1, 0, 0];
        else if (fn === OPS.transform) ctm = nhanMaTran(args, ctm);
        else if (fn === OPS.constructPath) {
            const [lenhVe, , minMax] = args;
            if (!VE.has(lenhVe) || !minMax || !Array.from(minMax).every(Number.isFinite)) continue;

            const [x0, y0, x1, y1] = bienDoiKhung(Array.from(minMax), ctm);
            const rong = x1 - x0;
            const cao = y1 - y0;

            if (cao <= DAY_NET_TOI_DA && rong > DAY_NET_TOI_DA * 3) {
                cacNet.push({ x0, y0, x1, y1, ngang: true });
            } else if (rong <= DAY_NET_TOI_DA && cao > DAY_NET_TOI_DA * 3) {
                cacNet.push({ x0, y0, x1, y1, ngang: false });
            } else if (NET_VIEN.has(lenhVe) && rong > DAY_NET_TOI_DA && cao > DAY_NET_TOI_DA) {
                // Khung chữ nhật chỉ vẽ viền: tách thành bốn cạnh
                cacNet.push({ x0, y0, x1, y1: y0, ngang: true });
                cacNet.push({ x0, y0: y1, x1, y1, ngang: true });
                cacNet.push({ x0, y0, x1: x0, y1, ngang: false });
                cacNet.push({ x0: x1, y0, x1, y1, ngang: false });
            }
        }
    }

    return cacNet;
}

function chamNhau(a, b) {
    return a.x0 <= b.x1 + DUNG_SAI && b.x0 <= a.x1 + DUNG_SAI
        && a.y0 <= b.y1 + DUNG_SAI && b.y0 <= a.y1 + DUNG_SAI;
}

/** Đếm số đường phân biệt trong danh sách toạ độ (gộp các đường sát nhau). */
function demDuong(toaDo) {
    const s = [...toaDo].sort((a, b) => a - b);
    let dem = 0;
    let truoc = -Infinity;
    for (const v of s) {
        if (v - truoc > DUNG_SAI) dem++;
        truoc = v;
    }
    return dem;
}

/**
 * Tìm các vùng bảng trên trang.
 *
 * @param {Object} page Trang pdf.js
 * @returns {Promise<Array<{x0:number,y0:number,x1:number,y1:number}>>}
 */
async function timVungBang(page) {
    const cacNet = await layNetKe(page);
    // Trang vẽ sơ đồ vector hàng chục nghìn nét không phải trang bảng; bỏ qua
    // để không tốn O(n²) khi gom nhóm
    if (cacNet.length < 4 || cacNet.length > NET_TOI_DA) return [];

    const [, , rongTrang, caoTrang] = page.view || [0, 0, 0, 0];

    // Gom nét thành từng khung: nét nào chạm nét khác thì về chung một nhóm
    const nhom = cacNet.map((_, i) => i);
    const goc = i => {
        while (nhom[i] !== i) i = nhom[i] = nhom[nhom[i]];
        return i;
    };
    for (let i = 0; i < cacNet.length; i++) {
        for (let j = i + 1; j < cacNet.length; j++) {
            if (cacNet[i].ngang !== cacNet[j].ngang && chamNhau(cacNet[i], cacNet[j])) {
                nhom[goc(i)] = goc(j);
            }
        }
    }

    const theoNhom = new Map();
    cacNet.forEach((n, i) => {
        const k = goc(i);
        if (!theoNhom.has(k)) theoNhom.set(k, []);
        theoNhom.get(k).push(n);
    });

    const cacVung = [];
    for (const ds of theoNhom.values()) {
        const soNgang = demDuong(ds.filter(n => n.ngang).map(n => (n.y0 + n.y1) / 2));
        const soDoc = demDuong(ds.filter(n => !n.ngang).map(n => (n.x0 + n.x1) / 2));

        // Một khung chữ nhật đơn (khung trang bìa, hộp chữ) chỉ có 2 ngang +
        // 2 dọc. Bảng phải có ít nhất hai ô.
        if (soNgang < 2 || soDoc < 2 || (soNgang < 3 && soDoc < 3)) continue;

        const vung = {
            x0: Math.min(...ds.map(n => n.x0)), y0: Math.min(...ds.map(n => n.y0)),
            x1: Math.max(...ds.map(n => n.x1)), y1: Math.max(...ds.map(n => n.y1))
        };

        // Khung viền bao gần trọn trang (trang bìa) không phải bảng
        if (rongTrang && caoTrang && vung.x1 - vung.x0 > rongTrang * 0.8
            && vung.y1 - vung.y0 > caoTrang * 0.8) continue;

        cacVung.push(vung);
    }

    return cacVung;
}

/** Điểm (x, y) có nằm trong vùng bảng nào không. */
function namTrongBang(x, y, cacVung) {
    return (cacVung || []).some(v =>
        x >= v.x0 - DUNG_SAI && x <= v.x1 + DUNG_SAI
        && y >= v.y0 - DUNG_SAI && y <= v.y1 + DUNG_SAI);
}

module.exports = { timVungBang, namTrongBang };
