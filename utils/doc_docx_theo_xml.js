/**
 * ============================================================================
 * ĐỌC TỆP WORD THEO CẤU TRÚC XML (utils/doc_docx_theo_xml.js)
 * ----------------------------------------------------------------------------
 * mammoth.extractRawText() trả về toàn bộ chữ trong tệp: chữ trong ô bảng, chữ
 * trong mục lục, chú thích hình — tất cả trộn lẫn với nội dung bài viết. Đó là
 * nguồn gốc của việc "lấy thừa" mà giáo viên phản ánh.
 *
 * Tệp .docx thực chất là một tệp nén chứa word/document.xml, trong đó Word đã
 * nói rõ đoạn nào là tiêu đề (w:pStyle = Heading), đoạn nào là mục lục (TOC),
 * đoạn nào nằm trong bảng (w:tbl), đoạn nào nằm trong hộp văn bản (w:txbxContent).
 * Đọc thẳng cấu trúc đó cho kết quả chắc chắn hơn mọi biểu thức đoán mò.
 * ============================================================================
 */

const fs = require('fs');
const AdmZip = require('adm-zip');
const { DOMParser } = require('xmldom');

const { NHAN, ganNhan } = require('./danh_dau_cau_truc');

// Các kiểu đoạn văn do Word định nghĩa sẵn, dùng để nhận ra vai trò của đoạn.
const KIEU_TIEU_DE = /^(Heading|Title|Subtitle|Tieu|ChuongHeading)/i;
const KIEU_MUC_LUC = /^(TOC|MucLuc|TableofContents)/i;
const KIEU_CHU_THICH = /^(Caption|ChuThich)/i;

/**
 * Lấy giá trị w:pStyle của một đoạn văn (thẻ w:p).
 */
function layKieuDoan(nodeDoan) {
    const danhSachPPr = nodeDoan.getElementsByTagName('w:pPr');

    if (!danhSachPPr.length) {
        return '';
    }

    const danhSachStyle = danhSachPPr[0].getElementsByTagName('w:pStyle');

    if (!danhSachStyle.length) {
        return '';
    }

    return danhSachStyle[0].getAttribute('w:val') || '';
}

/**
 * Kiểm tra một nút có nằm bên trong thẻ cha mang tên nào đó hay không.
 * Dùng để biết đoạn văn có nằm trong bảng hoặc trong hộp văn bản không.
 */
function namTrongThe(node, tenThe) {
    let cha = node.parentNode;

    while (cha) {
        if (cha.nodeName === tenThe) {
            return true;
        }
        cha = cha.parentNode;
    }

    return false;
}

/**
 * Gom chữ của một đoạn văn.
 *
 * Tab và ngắt dòng mềm trong Word được quy về một dấu cách: giáo viên phản ánh
 * nhiều tiêu đề được gõ bằng phím Tab hoặc nhiều dấu cách, nếu giữ nguyên thì
 * các bước nhận diện phía sau không khớp được mẫu nào.
 */
function layChuCuaDoan(nodeDoan) {
    const cacPhan = [];

    // Duyệt theo thứ tự xuất hiện để không đảo lộn câu chữ
    const nodes = nodeDoan.getElementsByTagName('*');

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.nodeName === 'w:t') {
            cacPhan.push(node.textContent || '');
        }
        else if (node.nodeName === 'w:tab') {
            cacPhan.push(' ');
        }
        else if (node.nodeName === 'w:br' || node.nodeName === 'w:cr') {
            cacPhan.push(' ');
        }
    }

    return cacPhan
        .join('')
        .replace(/[\t  - ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Đoạn văn có nằm trong một trường mục lục tự động hay không.
 *
 * Word đánh dấu mục lục tự động bằng cặp fldChar begin/end với instrText "TOC".
 * Các dòng nằm giữa cặp đó là mục lục dù chúng mang kiểu gì đi nữa.
 */
function danhDauVungMucLucTuDong(nodeGoc) {
    const vungMucLuc = new Set();

    const cacDoan = nodeGoc.getElementsByTagName('w:p');

    let dangTrongTruongTOC = false;

    for (let i = 0; i < cacDoan.length; i++) {
        const doan = cacDoan[i];

        const cacInstr = doan.getElementsByTagName('w:instrText');

        for (let j = 0; j < cacInstr.length; j++) {
            const lenh = (cacInstr[j].textContent || '').trim();

            if (/^TOC\b/i.test(lenh) || /\bTOC\s+\\/i.test(lenh)) {
                dangTrongTruongTOC = true;
            }
        }

        if (dangTrongTruongTOC) {
            vungMucLuc.add(doan);
        }

        // Trường kết thúc khi gặp fldChar "end"
        const cacFldChar = doan.getElementsByTagName('w:fldChar');

        for (let j = 0; j < cacFldChar.length; j++) {
            if (cacFldChar[j].getAttribute('w:fldCharType') === 'end') {
                dangTrongTruongTOC = false;
            }
        }
    }

    return vungMucLuc;
}

/**
 * Đọc một tệp .docx và trả về văn bản, mỗi đoạn một dòng, kèm nhãn cấu trúc.
 *
 * Bị loại ngay tại đây:
 * - Hộp văn bản và hình vẽ (w:txbxContent, mc:AlternateContent): giáo viên yêu
 *   cầu không lấy phần tạo từ Shapes/textbox.
 * - Phần header/footer, ghi chú, số trang: vốn không nằm trong document.xml.
 *
 * Được giữ lại nhưng có nhãn để bước lọc nội dung quyết định:
 * - Tiêu đề, mục lục, chú thích hình/bảng, nội dung trong ô bảng.
 */
function docDocxTheoXml(duongDanFile) {
    if (!fs.existsSync(duongDanFile)) {
        throw new Error(`Không tìm thấy tệp: ${duongDanFile}`);
    }

    const zip = new AdmZip(duongDanFile);
    const mucDocument = zip.getEntry('word/document.xml');

    if (!mucDocument) {
        throw new Error('Tệp .docx không có word/document.xml');
    }

    const xml = zip.readAsText(mucDocument);

    // xmldom kêu ca khá nhiều với XML do Word sinh ra; các cảnh báo này không
    // ảnh hưởng tới chữ đọc được nên chặn lại cho sạch màn hình.
    const boQuaCanhBao = () => { };

    const tai_lieu = new DOMParser({
        errorHandler: {
            warning: boQuaCanhBao,
            error: boQuaCanhBao,
            fatalError: (e) => { throw new Error(e); }
        }
    }).parseFromString(xml, 'text/xml');

    const than = tai_lieu.getElementsByTagName('w:body')[0];

    if (!than) {
        return '';
    }

    const vungMucLucTuDong = danhDauVungMucLucTuDong(than);

    const cacDoan = than.getElementsByTagName('w:p');
    const cacDong = [];

    for (let i = 0; i < cacDoan.length; i++) {
        const doan = cacDoan[i];

        // Hộp văn bản và hình vẽ: bỏ hẳn, không đưa vào so trùng
        if (
            namTrongThe(doan, 'w:txbxContent') ||
            namTrongThe(doan, 'mc:AlternateContent') ||
            namTrongThe(doan, 'w:pict') ||
            namTrongThe(doan, 'v:textbox')
        ) {
            continue;
        }

        const chu = layChuCuaDoan(doan);

        if (!chu) {
            continue;
        }

        const kieu = layKieuDoan(doan);

        if (vungMucLucTuDong.has(doan) || KIEU_MUC_LUC.test(kieu)) {
            cacDong.push(ganNhan(NHAN.MUC_LUC, chu));
            continue;
        }

        if (KIEU_CHU_THICH.test(kieu)) {
            cacDong.push(ganNhan(NHAN.CHU_THICH, chu));
            continue;
        }

        if (namTrongThe(doan, 'w:tbl')) {
            cacDong.push(ganNhan(NHAN.BANG, chu));
            continue;
        }

        if (KIEU_TIEU_DE.test(kieu)) {
            cacDong.push(ganNhan(NHAN.TIEU_DE, chu));
            continue;
        }

        cacDong.push(chu);
    }

    return cacDong.join('\n');
}

module.exports = { docDocxTheoXml };
