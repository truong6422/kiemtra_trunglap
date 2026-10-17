/**
 * ============================================================================
 * DỰNG LẠI ĐOẠN VĂN CỦA PDF THEO BỐ CỤC TRANG (utils/dung_doan_van_pdf.js)
 * ----------------------------------------------------------------------------
 * PDF chỉ lưu từng dòng in ra giấy. Trước đây đoạn văn được đoán lại chỉ bằng
 * chữ (dòng dài, chưa có dấu chấm thì nối), nên:
 *   - Câu kết thúc đúng ở mép phải bị coi là hết đoạn → một đoạn Word thành
 *     hai, ba đoạn PDF; dòng chạm mép kết thúc bằng ":" thì câu bị cắt đôi.
 *   - Dấu đầu dòng vẽ bằng phông Wingdings bị xoá mất, ý gạch đầu dòng
 *     ("❖ Mục tiêu") dính vào cuối đoạn phía trên.
 * Kết quả: cùng một bài, bản PDF cho ra bộ câu khác bản Word, tỉ lệ trùng giữa
 * hai bản chỉ còn ~80%.
 *
 * Ở đây dùng chính vị trí chữ trên trang, giống cách mắt người nhận ra đoạn:
 *   - Dòng trước chạy tới mép phải và dòng sau không thụt vào sâu hơn, không
 *     mở bằng dấu đầu dòng, không cách xa bất thường → cùng một đoạn.
 *   - Còn lại là đoạn mới.
 * Dấu đầu dòng được giữ lại dưới dạng "- " để các bước sau nhận ra ý liệt kê,
 * giống hệt bản Word (doc_docx_theo_xml.js cũng gắn "- " cho đoạn có số/dấu
 * đầu dòng).
 * ============================================================================
 */

const { laDongMoMucMoi } = require('./chuan_hoa_dong_van_ban');
const { laSoTrang } = require('./nhan_dien_tieu_de');
const { namTrongBang } = require('./nhan_dien_bang_pdf');
const { NHAN, ganNhan } = require('./danh_dau_cau_truc');

// Ký tự đứng một mình ở đầu dòng được coi là dấu đầu dòng. Vùng U+E000–U+F8FF
// là ký tự riêng của phông Symbol/Wingdings mà Word dùng để vẽ dấu đầu dòng.
const DAU_DAU_DONG = /^(?:[-]|[-–—•●○◦▪■□❖➢➣➤✓✔·*+>»])$/u;

// Lề trên/dưới (theo chiều cao trang) là chỗ của header, footer, số trang.
// Chỉ lấy dải sát mép (4.5% ≈ 38pt trên A4): lề dưới chuẩn 2cm ≈ 57pt nên dòng
// cuối thân bài không bị coi nhầm là footer.
const TI_LE_LE_TRANG = 0.045;

/** Gom các cụm chữ pdf.js trả về thành từng dòng theo toạ độ y. */
function gomDong(items) {
    const cacDong = [];
    let dong = null;

    for (const it of items) {
        const str = it.str || '';
        if (!str) continue;

        const x = it.transform[4];
        const y = it.transform[5];

        if (!dong || Math.abs(dong.y - y) > 5) {
            dong = { y, x0: x, x1: x + (it.width || 0), cacCum: [] };
            cacDong.push(dong);
        }

        dong.cacCum.push({ str, x, w: it.width || 0 });
        dong.x0 = Math.min(dong.x0, x);
        dong.x1 = Math.max(dong.x1, x + (it.width || 0));
    }

    return cacDong.map(d => {
        // Cụm đầu tiên chỉ là một ký hiệu → dấu đầu dòng; mép chữ thật của
        // dòng là cụm kế tiếp (dòng thứ hai của ý liệt kê thẳng hàng với nó).
        const cumChu = d.cacCum.filter(c => c.str.trim());
        const dau = cumChu[0];
        const coDauDauDong = !!dau && cumChu.length > 1
            && DAU_DAU_DONG.test(dau.str.trim());

        let text = d.cacCum.map(c => c.str).join('');
        if (coDauDauDong) {
            text = '- ' + text.trim().slice(dau.str.trim().length).trim();
        } else if (/^[-]/u.test(text.trim())) {
            text = '- ' + text.trim().replace(/^[-]+/u, '').trim();
        }

        return {
            y: d.y,
            x0: d.x0,
            x1: d.x1,
            xChu: coDauDauDong ? cumChu[1].x : d.x0,
            // Ý liệt kê gõ tay: "- ", "+ ", "* ", "1. ", "a) " …
            laLietKe: coDauDauDong
                || /^(?:[-–—•●○◦▪■□❖➢➣➤✓✔+*>»·]|\d+[.)]|[a-zđ][.)])\s/u.test(text.trim()),
            text: text.replace(/\s+/g, ' ').trim()
        };
    }).filter(d => d.text);
}

/** Phần tử ở vị trí phân vị p (0..1) của mảng số. */
function phanVi(mang, p) {
    if (!mang.length) return 0;
    const s = [...mang].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
}

/**
 * Dựng đoạn văn cho toàn tài liệu.
 *
 * @param {Array<{items:Array, chieuCao:number}>} cacTrang textContent.items
 *        của từng trang kèm chiều cao trang
 * @returns {string} mỗi đoạn một dòng
 */
function dungDoanVanPdf(cacTrang) {
    // Khoảng cách giữa hai dòng liền nhau phổ biến nhất trong cả tài liệu
    const cacKhoang = [];
    const trangDaGom = cacTrang.map(t => {
        const cacDong = gomDong(t.items || []);
        for (let i = 1; i < cacDong.length; i++) {
            const k = cacDong[i - 1].y - cacDong[i].y;
            if (k > 0) cacKhoang.push(k);
        }
        return { cacDong, chieuCao: t.chieuCao || 0, vungBang: t.vungBang || [] };
    });
    const khoangDong = phanVi(cacKhoang, 0.5) || 20;

    const cacDoan = [];
    let doan = null;      // { text, dongCuoi, mepPhai }

    // Header, footer, số trang gặp giữa chừng: để riêng, in ra sau khi đoạn
    // đang dựng kết thúc. Không cắt đoạn ở đó, nếu không câu vắt sang trang
    // bị chẻ đôi; cũng không dán vào đoạn, nếu không header lọt vào giữa câu.
    let dongLeChoIn = [];

    const ketThucDoan = () => {
        if (doan) cacDoan.push(doan.text);
        cacDoan.push(...dongLeChoIn);
        dongLeChoIn = [];
        doan = null;
    };

    for (const [soTrang, { cacDong, chieuCao, vungBang }] of trangDaGom.entries()) {
        // Mép trái/phải của thân bài trên trang này, tính trên các dòng dài
        const dongDai = cacDong.filter(d => d.text.length >= 40);
        const mepTrai = phanVi((dongDai.length ? dongDai : cacDong).map(d => d.x0), 0.1);
        const mepPhai = phanVi((dongDai.length ? dongDai : cacDong).map(d => d.x1), 0.9);
        const beRong = Math.max(mepPhai - mepTrai, 1);

        for (let i = 0; i < cacDong.length; i++) {
            const d = cacDong[i];

            // Dòng ngắn ở lề trên/dưới: header, footer, số trang — đứng riêng,
            // không nối vào đoạn nào để không chèn vào giữa câu vắt trang.
            const oLe = chieuCao > 0 && (d.y > chieuCao * (1 - TI_LE_LE_TRANG)
                || d.y < chieuCao * TI_LE_LE_TRANG);
            if ((oLe && d.x1 - d.x0 < beRong * 0.6) || laSoTrang(d.text)) {
                if (doan) dongLeChoIn.push(d.text);
                else cacDoan.push(d.text);
                continue;
            }

            // Dòng nằm trong khung bảng: gắn nhãn BẢNG như ô bảng của Word để
            // bước lọc loại khỏi so trùng, không nối với đoạn văn nào.
            if (namTrongBang((d.x0 + d.x1) / 2, d.y, vungBang)) {
                ketThucDoan();
                cacDoan.push(ganNhan(NHAN.BANG, d.text));
                continue;
            }

            if (doan) {
                const truoc = doan.dongCuoi;
                const cungTrang = doan.trang === soTrang;
                // Dòng trước hết vì chạm mép phải: hoặc đã sát mép, hoặc chữ
                // đầu dòng sau không còn đủ chỗ trên dòng trước (căn trái,
                // gặp chữ dài thì xuống dòng sớm).
                const tuDau = d.text.split(' ')[0];
                const rongKyTu = (d.x1 - d.x0) / Math.max(d.text.length, 1);
                const truocChamMepPhai = truoc.x1 >= doan.mepPhai - beRong * 0.04
                    || truoc.x1 + rongKyTu * (tuDau.length + 1) > doan.mepPhai;
                // Chú thích hình/bảng là một dòng riêng, không ôm câu sau vào
                const truocLaChuThich = laDongMoMucMoi(doan.text);
                // Trang mới cùng khổ, cùng lề nên so thẳng toạ độ với dòng trước
                const khongThutVao = d.x0 <= truoc.xChu + 4;
                const khongCachXa = !cungTrang
                    || truoc.y - d.y <= khoangDong * 1.45;

                // Không dùng laTieuDeLon ở đây: dòng tiếp nối toàn chữ hoa / tên riêng
                // ("PHP, PERL, C, C++, Java") bị nó coi là tiêu đề. Tiêu đề thật
                // đã bị chặn bởi điều kiện mép phải, thụt lề và khoảng cách dòng.
                const moMucMoi = laDongMoMucMoi(d.text);

                if (truocChamMepPhai && !d.laLietKe && !moMucMoi && !truocLaChuThich
                    && khongThutVao && khongCachXa) {
                    doan.text += ' ' + d.text;
                    doan.dongCuoi = { ...d, xChu: Math.min(truoc.xChu, d.x0) };
                    doan.mepPhai = mepPhai;
                    doan.trang = soTrang;
                    continue;
                }
            }

            ketThucDoan();
            doan = { text: d.text, dongCuoi: d, mepPhai, trang: soTrang };
        }
    }

    ketThucDoan();
    return cacDoan.join('\n');
}

module.exports = { dungDoanVanPdf };
