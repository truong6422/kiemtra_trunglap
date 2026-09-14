/**
 * ============================================================================
 * UTILS: TIỀN XỬ LÝ VĂN BẢN VÀ CẮT CHUNK (utils/tien_xu_ly.js) 
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// NẠP TỪ VỰNG VÀ TỪ DỪNG
// ============================================================================
function napTaiNguyen() {
    const tapHopTuDung = new Set();
    const tapHopTuVung = new Set();

    // 1. Đọc File Từ dừng (Stopwords)
    const duongDanStopwords = path.join(__dirname, 'stopwords-vi.txt');
    if (fs.existsSync(duongDanStopwords)) {
        const noiDung = fs.readFileSync(duongDanStopwords, 'utf-8');
        noiDung.split(/\r?\n/).forEach(dong => {
            const tu = dong.trim().toLowerCase();
            if (tu) tapHopTuDung.add(tu);
        });
    } else {
        // Thiếu tệp thì kết quả chấm vẫn ra, chỉ là sai lệch. Im lặng ở đây
        // đồng nghĩa với để người dùng tin vào một con số không đúng.
        console.warn(`⚠️ Không có tệp từ dừng tại ${duongDanStopwords} — kết quả chấm sẽ lệch.`);
    }

    // 2. Đọc File Từ vựng tiếng Việt (vi-vocab.txt) dùng cho tách từ ghép
    const duongDanVocab = path.join(__dirname, 'vi-vocab.txt');
    if (!fs.existsSync(duongDanVocab)) {
        console.warn(`⚠️ Không có tệp từ vựng tại ${duongDanVocab} — không tách được từ ghép, kết quả chấm sẽ lệch.`);
    } else {
        const noiDung = fs.readFileSync(duongDanVocab, 'utf-8');
        noiDung.split(/\r?\n/).forEach(dong => {
            const tu = dong.trim().toLowerCase();
            if (tu) {
                tapHopTuVung.add(tu);
                // Thêm cả dạng thay thế dấu cách bằng gạch dưới nếu từ vựng lưu dạng rời
                tapHopTuVung.add(tu.replace(/\s+/g, '_'));
            }
        });
    }

    return { tapHopTuDung, tapHopTuVung };
}

const { tapHopTuVung: VOCAB_SET }
    = napTaiNguyen();

// ============================================================================
// HÀM TÁCH TỪ CHUYÊN SÂU: MAXIMUM MATCHING (KHỚP DÀI NHẤT CHO TIẾNG VIỆT)
// ============================================================================
function tachTuTiengViet(vanBan) {
    if (!vanBan) return [];

    // Chuẩn hóa văn bản thô
    let text = vanBan.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    const cacTuDon = text.split(/\s+/).filter(Boolean);
    const ketQua = [];

    let i = 0;
    const maxLen = 4; // Giới hạn số từ tối đa trong một từ ghép tiếng Việt (thường tối đa 4 từ)

    while (i < cacTuDon.length) {
        let matched = false;

        // Thử ghép từ dài nhất trước (từ maxLen giảm về 1)
        for (let len = Math.min(maxLen, cacTuDon.length - i); len > 1; len--) {
            const cumTu = cacTuDon.slice(i, i + len).join(' ');
            const cumTuGachDoi = cacTuDon.slice(i, i + len).join('_');

            if (VOCAB_SET.has(cumTu) || VOCAB_SET.has(cumTuGachDoi)) {
                ketQua.push(cumTuGachDoi); // Thống nhất chuẩn gạch dưới cho từ ghép
                i += len;
                matched = true;
                break;
            }
        }

        // Nếu không khớp từ ghép nào, lấy 1 từ đơn
        if (!matched) {
            ketQua.push(cacTuDon[i]);
            i++;
        }
    }

    return ketQua;
}

// ============================================================================
// HÀM 1: LÀM SẠCH VĂN BẢN & LỌC TỪ DỪNG (SỬ DỤNG MAXIMUM MATCHING)
// ============================================================================
function lamSachVanBan(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    const dsTuDaTach = tachTuTiengViet(vanBan);

    return dsTuDaTach.join(' ');
}
// ============================================================================
// HÀM 2: HÀM BĂM CHUỖI ĐƠN GIẢN (HASHING CHO N-GRAM)
// ============================================================================
function bamChuoi(chuoi) {
    let hash = 0;
    if (chuoi.length === 0) return hash;
    for (let i = 0; i < chuoi.length; i++) {
        const char = chuoi.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

function laTieuDeCon(text) {

    const t = text.trim();

    return (

        // 1.
        /^\d+\.$/.test(t)

        ||

        // 1)
        /^\d+\)/.test(t)

        ||

        // 1:
        /^\d+:/.test(t)

        ||

        // 1 -
        /^\d+\s*-\s*/.test(t)

        ||

        // 1. Banner là gì
        /^\d+\.\s+\S+/.test(t)

        ||

        // 1.1
        /^\d+\.\d+$/.test(t)

        ||

        // 1.1.
        /^\d+\.\d+\.$/.test(t)

        ||

        // 1.1 Logo
        /^\d+\.\d+\s+\S+/.test(t)

        ||

        // 1.1Logo
        /^\d+\.\d+[A-ZÀ-Ỹa-zà-ỹ]/.test(t)

        ||

        // 1.1. Logo
        /^\d+\.\d+\.\s+\S+/.test(t)

        ||

        // 1.1.1
        /^\d+\.\d+\.\d+$/.test(t)

        ||

        // 1.1.1.
        /^\d+\.\d+\.\d+\.$/.test(t)

        ||

        // 1.1.1 Tiêu đề
        /^\d+\.\d+\.\d+\s+\S+/.test(t)

        ||

        // 1.1.1. Tiêu đề
        /^\d+\.\d+\.\d+\.\s+\S+/.test(t)

        ||

        // 3.2.8 Thoát
        /^\d+\.\d+\.\d+\s+\S+/.test(t)

        ||

        // 1.1.1.1
        /^\d+\.\d+\.\d+\.\d+/.test(t)

        ||

        // I.
        /^[IVXLCDM]+\.$/i.test(t)

        ||

        // I)
        /^[IVXLCDM]+\)/i.test(t)

        ||

        // I:
        /^[IVXLCDM]+:/i.test(t)

        ||

        // I. BANNER ...
        /^[IVXLCDM]+\.\s+\S+/i.test(t)

        ||

        // A.
        /^[A-Z]\.$/.test(t)

        ||

        // A)
        /^[A-Z]\)/.test(t)

        ||

        // A:
        /^[A-Z]:/.test(t)

        ||

        // A. Nội dung
        /^[A-Z]\.\s+\S+/.test(t)

        ||

        // a.
        /^[a-z]\.$/.test(t)

        ||

        // a)
        /^[a-z]\)/.test(t)

        ||

        // a:
        /^[a-z]:/.test(t)

        ||

        // a. Nội dung
        /^[a-z]\.\s+\S+/.test(t)

        ||

        /^\d+\.\d+\.\d+[A-ZÀ-Ỹa-zà-ỹ]/.test(t)

    );

}
function laDongMucLuc(line) {

    const t = line.trim();

    return (

        /\.{3,}\s*\d+\s*$/.test(t)

        ||

        /…+\s*\d+\s*$/.test(t)

        ||

        /^(LỜI MỞ ĐẦU|MỞ ĐẦU|ĐẶT VẤN ĐỀ|LỜI NÓI ĐẦU|PHẦN MỞ ĐẦU)\s+\d+\s*$/i.test(t)

        ||

        /^(CHƯƠNG|CHUONG).*(\.{3,}|…+).*\d+\s*$/i.test(t)

        ||

        /^(PHẦN|PHAN).*(\.{3,}|…+).*\d+\s*$/i.test(t)

        ||

        /^(CHƯƠNG|CHUONG)\s+(?:\d+|[IVXLCDM]+).+\s+\d+\s*$/i.test(t)

        ||

        /^(PHẦN|PHAN)\s+(?:\d+|[IVXLCDM]+).+\s+\d+\s*$/i.test(t)

        ||

        // CHƯƠNG I: TÌM HIỂU ... 8
        /^(CHƯƠNG|CHUONG)\s+(?:\d+|[IVXLCDM]+)\s*:\s*.+\s+\d+\s*$/i.test(t)

        ||

        // I. BANNER LÀ GÌ ... 11
        /^[IVXLCDM]+\.\s+.+\s+\d+\s*$/i.test(t)
        ||

        /^\d+(?:\.\d+)+\s+.+\s+\d+\s*$/i.test(t)


    );
}
/*function chuanHoaPdfText(text) {

    if (!text) {
        return '';
    }

    const lines = text.split(/\r?\n/);

    const merged = [];

    for (const rawLine of lines) {

        const current = rawLine.trim();

        if (!current) {
            continue;
        }

        if (merged.length === 0) {
            merged.push(current);
            continue;
        }

        const prev =
            merged[merged.length - 1];

        const laTieuDe =

            /^CHƯƠNG\b/i.test(current) ||

            /^CHAPTER\b/i.test(current) ||

            /^PHẦN\b/i.test(current) ||

            /^LỜI\b/i.test(current) ||

            /^KẾT LUẬN\b/i.test(current) ||

            /^TÀI LIỆU THAM KHẢO\b/i.test(current) ||

            /^DANH MỤC\b/i.test(current) ||

            /^\d+\.\d+/.test(current) ||

            /^Hình\s+\d+/i.test(current) ||

            /^Bảng\s+\d+/i.test(current) ||

            /^__CAPTION__/.test(current) ||

            /^Dành cho\b/i.test(current) ||

            /^Tổng quan\b/i.test(current) ||

            /^Mục tiêu\b/i.test(current) ||

            /^Hướng giải quyết\b/i.test(current) ||

            /^Yêu cầu\b/i.test(current) ||

            /^Quy trình\b/i.test(current) ||

            /^Khảo sát\b/i.test(current);

        const prevKetThucCau =
            /[.!?:]$/.test(prev);

        if (
            !laTieuDe &&
            !prevKetThucCau &&
            prev.length > 50
        ) {

            merged[
                merged.length - 1
            ] += ' ' + current;

        } else {

            merged.push(current);
        }
    }

    let result =
        merged.join('\n');

    result = result.replace(
        /(CHƯƠNG|CHUONG)\s*\n\s*(\d+|[IVXLCDM]+)/gi,
        '$1 $2'
    );

    result = result.replace(
        /(PHẦN|PHAN)\s*\n\s*(\d+|[IVXLCDM]+)/gi,
        '$1 $2'
    );

    // 1.
    // Tính cấp thiết
    // =>
    // 1. Tính cấp thiết

    result = result.replace(
        /(\d+)\.\s*\n\s*([A-ZÀ-Ỹ])/g,
        '$1. $2'
    );

    // 4 .
    // Kết quả đạt được
    // =>
    // 4. Kết quả đạt được

    result = result.replace(
        /(\d+)\s+\.\s*\n\s*([A-ZÀ-Ỹ])/g,
        '$1. $2'
    );

    // giảm dòng trắng

    result = result.replace(
        /\n{3,}/g,
        '\n\n'
    );

    // 4.
    // 0 => 4.0

    result = result.replace(
        /(\d+)\.\s*\n\s*(\d+)/g,
        '$1.$2'
    );

    // 700.
    // 000 => 700.000

    result = result.replace(
        /(\d{1,3})\.\s*\n\s*(\d{3}\b)/g,
        '$1.$2'
    );

    // .NET

    result = result.replace(
        /\.\s*\n\s*NET\b/g,
        '.NET'
    );

    // ASP.
    // NET

    result = result.replace(
        /ASP\.\s*\n\s*NET/gi,
        'ASP.NET'
    );

    // System.
    // Web

    result = result.replace(
        /System\.\s*\n\s*Web/gi,
        'System.Web'
    );

    // WebBanHang.
    // BL

    result = result.replace(
        /([A-Za-z0-9_]+)\.\s*\n\s*([A-Z]{2,})/g,
        '$1.$2'
    );
    return result;
}*/
function locNoiDungHocThuat(text) {

    if (!text) return '';

    const lines = text.split(/\r?\n/);

    const result = [];

    let keepContent = false;

    for (let i = 0; i < lines.length; i++) {

        const rawLine = lines[i];

        const line = rawLine.trim();

        const nextLine =
            (lines[i + 1] || '').trim();

        if (!line) {
            continue;
        }

        if (/^\d+$/.test(line)) {
            continue;
        }

        const upper = line.toUpperCase();

        const laDiemBatDau = (

            /^\s*LỜI MỞ ĐẦU\s*:?\s*$/i.test(upper) ||

            /^\s*MỞ ĐẦU\s*:?\s*$/i.test(upper) ||

            /^\s*ĐẶT VẤN ĐỀ\s*:?\s*$/i.test(upper) ||

            /^\s*PHẦN MỞ ĐẦU\s*:?\s*$/i.test(upper) ||

            /^(?:CHƯƠNG|CHUONG)\s+(?:1|I)\b/i.test(upper) ||

            /^(?:PHẦN|PHAN)\s+(?:1|I)\b/i.test(upper) ||

            /^CHAPTER\s+1\b/i.test(upper)

        );

        const laMucLucTheoDongSau =

            /\.{3,}\s*\d+\s*$/.test(nextLine)

            ||

            /…+\s*\d+\s*$/.test(nextLine);

        if (

            laDiemBatDau

            &&

            !laDongMucLuc(line)

            &&

            !laMucLucTheoDongSau

        ) {

            keepContent = true;
        }

        if (!keepContent) {
            continue;
        }

        result.push(rawLine);

    }

    return result.join('\n');
}
function laKeywordSQLDonLe(text) {

    const t =
        text.trim()
            .toUpperCase();

    return (
        t === 'GO' ||
        t === 'AS' ||
        t === 'SET' ||
        t === 'FROM' ||
        t === 'WHERE' ||
        t === 'VALUES'
    );
}
function laDongBangCanBo(text) {

    const t = text.trim().toLowerCase();

    return (

        t === 'stt' ||

        t === 'tt' ||
        t === 'tên cột' ||

        t === 'kiểu dữ liệu' ||

        t === 'mô tả' || t === 'sinh viên' || t === 'ký tên' ||

        t === 'ghi chú' || t === 'sinh viên thực hiện' || t === 'ký, ghi rõ họ tên' || t === 'ký, ghi họ tên' ||

        t === 'thời gian' || t === 'ký và ghi họ tên' || t === 'ký và ghi rõ họ tên' ||

        t === 'công việc' || t === 'kết quả đạt được' || t === 'hạn chế' || t === 'hướng phát triển' ||

        t === 'tên viết tắt' || t === 'từ viết tắt' || t === 'tên đầy đủ' || t === 'viết đầy đủ' || t === 'giải thích nghĩa' || t === 'dịch ra tiếng việt'
    );
}
function laNgoaiLeDaoVan(text) {

    const upper = text.toUpperCase().trim();

    const result = (

        upper.startsWith('LỜI CẢM ƠN') ||

        upper.startsWith('NHẬT KÝ') ||

        upper.startsWith('MỤC LỤC') ||

        upper.startsWith('DANH MỤC') ||

        upper === 'MỞ ĐẦU' ||
        upper === 'KẾT LUẬN' ||
        upper === 'TÀI LIỆU THAM KHẢO' ||

        upper === 'PHỤ LỤC' ||

        upper.startsWith('TRÂN TRỌNG') ||

        upper.startsWith('SINH VIÊN THỰC HIỆN') ||

        /^CHƯƠNG\s+(?:\d+|[IVXLCDM]+)/i.test(upper) ||

        /^PHẦN\s+(?:\d+|[IVXLCDM]+)/i.test(upper) ||

        /^[IVXLCDM]+\.$/i.test(upper)

    );

    if (result) {
    }

    return result;
}

function laThongTinHanhChinh(text) {

    const t = text.trim();

    return (

        /^HÀ NỘI.*\d{4}$/i.test(t) ||

        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(t) ||

        /^\d{1,2}[\/\-]\d{4}$/.test(t) ||

        /^ngày\s+\d+/i.test(t) ||

        /^,?\s*ngày/i.test(t) ||

        /^tháng/i.test(t) || /^năm\s+\d{4}$/i.test(t)

    );
}
function xuLyCauDacBiet(line) {

    let text = line.trim();

    if (!text) {
        return null;
    }
    text = text.replace(
        /^Hình\s+\d+(?:[.,]\d+)*(?:[.:,\/\-\)])*\s*/i,
        ''
    );

    text = text.replace(
        /^Bảng\s+\d+(?:[.,]\d+)*(?:[.:,\/\-\)])*\s*/i,
        ''
    );
    text = text.replace(
        /^__CAPTION__/,
        ''
    );

    text = text.replace(
        /^[IVXLCDM]+\.\s*/i,
        ''
    ).trim();

    // ------------------------------------------------
    // DANH MỤC HÌNH
    // ------------------------------------------------

    text = text.replace(
        /^HÌNH\s+\d+(?:[.,]\d+)*(?:[.:,\/\-\)])*\s*/i,
        ''
    );

    // ------------------------------------------------
    // DANH MỤC BẢNG
    // ------------------------------------------------

    text = text.replace(
        /^BẢNG\s+\d+(?:[.,]\d+)*(?:[.:,\/\-\)])*\s*/i,
        ''
    );

    // ------------------------------------------------
    // MỤC CON
    // 1.1.
    // 1.2
    // 1.2.3
    // ------------------------------------------------

    // Mục con
    text = text.replace(
        /^\d+(?:[.,]\d+)*(?:\s*[.:,\/\-\)])*\s*/i,
        ''
    );

    // ------------------------------------------------
    // BỎ HẬU TỐ TRANG
    // .......... 11
    // hoặc 11
    // ------------------------------------------------

    text = text.replace(
        /\.{3,}\s*\d+\s*$/i,
        ''
    );

    text = text.replace(
        /\s+\d+\s*$/i,
        ''
    );

    return text.trim();
}
function laBatDauTaiLieuThamKhao(line) {

    const text = line.trim();

    return (

        // [1]
        /^\[\d+\]/.test(text) ||

        // [1]. [1): [1]/ ...
        /^\[\d+\][.:,\/\-\)]\s*/.test(text) ||

        // 1. 1: 1/ 1) 1-
        /^\d+[.)]\s+/.test(text) ||

        // A. A: A/ A)
        //  /^[A-ZÀÁẠẢÃĂÂĐÊÔƠƯ][.:,\/\-\)]\s*/.test(text) ||

        // a. a: a/ a)
        //   /^[a-zàáạảãăâđêôơư][.:,\/\-\)]\s*/.test(text) ||

        // I. II. III.
        /^[IVXLCDM]+[.:,\/\-\)]\s*/i.test(text) ||

        // APA thường gặp
        //  /^[A-ZÀÁẢÃẠĂÂĐÊÔƠƯ][A-Za-zÀ-ỹ\s\-]+,\s*[A-Z]/.test(text) ||

        // Có năm (2019)
        /\(\d{4}\)/.test(text) ||

        // TS., PGS., GS., ThS.
        /^(TS|PGS|GS|THS)\./i.test(text) ||

        // URL
        /^https?:\/\//i.test(text) ||

        /^www\./i.test(text) ||

        // Giáo trình
        /^(GIÁO TRÌNH|GIAO TRINH)/i.test(text) ||

        // Tài liệu
        //    /^(TÀI LIỆU|TAI LIEU)/i.test(text) ||

        // Nhà xuất bản
        /^(NHÀ XUẤT BẢN|NHA XUAT BAN)/i.test(text)

    );
}
function tachCauThuong(text) {

    return text

        .replace(/\r/g, '')

        .replace(/\s+/g, ' ')

        // bỏ số mục La Mã đầu dòng
        .replace(
            /^(I|II|III|IV|V)\.\s+/i,
            ''
        )

        .match(
            /[^.!?]+[.!?]+|[^.!?]+$/g
        )

        ?.map(x => x.trim())

        .filter(Boolean)

        || [];
}
function noiDongBiNgatDong(text) {

    const lines =
        text
            .replace(/\r/g, '')
            .split('\n');

    const merged = [];

    for (const rawLine of lines) {

        const current =
            rawLine.trim();

        if (!current) {
            continue;
        }

        if (merged.length === 0) {

            merged.push(current);
            continue;

        }

        const previous =
            merged[
                merged.length - 1
            ];

        const prevEnd =
            /[.!?:;]$/.test(previous);

        const nextStartHeading =
            /^(CHƯƠNG|CHUONG|PHẦN|PHAN|MỞ ĐẦU|KẾT LUẬN)/i
                .test(current);

        if (
            !prevEnd &&
            !nextStartHeading
        ) {

            merged[
                merged.length - 1
            ] +=
                ' ' + current;

        } else {

            merged.push(current);

        }

    }

    return merged.join('\n');

}

// ============================================================================
// HÀM TÁCH CÂU THÔNG MINH CHO TIẾNG VIỆT
// ============================================================================
function tachCau(text) {

    if (!text || typeof text !== 'string') {
        return [];
    }
    text =
noiDongBiNgatDong(text);

    // ------------------------------------------------------------------------
    // Bảo vệ các trường hợp đặc biệt
    // ------------------------------------------------------------------------

    let safeText = text
        .replace(/\r/g, '')

        // Đánh dấu đề mục
        .replace(
            /(^|\n)\s*(LỜI CẢM ƠN|LỜI MỞ ĐẦU|MỞ ĐẦU|ĐẶT VẤN ĐỀ|KẾT LUẬN|PHỤ LỤC)\s*($|\n)/gim,
            '\n__HEADING__$2__ENDHEADING__\n'
        )
        .replace(
            /(^|\n)\s*((?:CHƯƠNG|CHUONG)\s+(?:\d+|[IVXLCDM]+)[^\n]*)/gim,
            '\n__HEADING__$2__ENDHEADING__\n'
        )

        .replace(
            /(^|\n)\s*((?:PHẦN|PHAN)\s+(?:\d+|[IVXLCDM]+)[^\n]*)/gim,
            '\n__HEADING__$2__ENDHEADING__\n'
        )

        .replace(
            /((?:chương|chuong)\s+(?:\d+|[ivxlcdm]+))\s*(?:\r?\n)+\s*([^\n]{3,100})/gi,
            '$1 $2'
        )
        /* .replace(
             /(\d+(?:[.,]\d+)*[.:]?)\s*(?:\r?\n)+\s*([^\n]{3,100})/g,
             '$1 $2'
         )*/
        /* .replace(
             /(^|\n)\s*(?:mục\s+)?\d+(?:\.\d+)*\s*[:.-]?\s+([^\n]+)/gim,
             '\n__HEADING__$0__ENDHEADING__\n'
         )*/
        .replace(
            /(?:^|\n)\s*hình[\s-]*\d+(?:\.\d+)*\s*:\s*(.+)/gim,
            '\n__CAPTION__$1\n'
        )
        .replace(
            /(?:^|\n)\s*hình[\s-]*\d+(?:\.\d+)*\s+(.+)/gim,
            '\n__CAPTION__$1\n'
        )
        .replace(
            /(?:^|\n)\s*bảng[\s-]*\d+(?:\.\d+)*\s*:\s*(.+)/gim,
            '\n__CAPTION__$1\n'
        )
        .replace(
            /(?:^|\n)\s*bảng[\s-]*\d+(?:\.\d+)*\s+(.+)/gim,
            '\n__CAPTION__$1\n'
        )


        .replace(
            /^source\s*:.*$/gim,
            ''
        )

        .replace(/TP\.?\s*Hồ\s*Chí\s*Minh/gi, '__TPHCM__')
        .replace(
            /https?:\/\/\S+/gi,
            match => match.replace(/\./g, '__URLDOT__')
        )
        // Học hàm học vị
        .replace(/PGS\.TS\./gi, '__PGSTS__')
        .replace(/GS\.TS\./gi, '__GSTS__')
        .replace(/PGS\./gi, '__PGS__')
        .replace(/GS\./gi, '__GS__')
        .replace(/TS\./gi, '__TS__')
        .replace(/ThS\./gi, '__THS__')

        // Địa danh
        .replace(/TP\.HCM/gi, '__TPHCM__')
        .replace(/TP\./gi, '__TP__')
        .replace(/Q\./gi, '__Q__')
        .replace(/P\./gi, '__P__')

        // Email
        .replace(
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
            ''
        )

        // Website
        .replace(/www\./gi, '__WWW__')

        // File
        .replace(/\.docx\b/gi, '__DOCX__')
        .replace(/\.doc\b/gi, '__DOC__')
        .replace(/\.pdf\b/gi, '__PDF__')
        .replace(/\.xlsx\b/gi, '__XLSX__')
        .replace(/\be\.g\./gi, '__EG__')
        .replace(/\bi\.e\./gi, '__IE__')
        .replace(/\betc\./gi, '__ETC__')
        .replace(/\bvs\./gi, '__VS__')
        .replace(/\bdr\./gi, '__DR__')
        .replace(/\bmr\./gi, '__MR__')
        .replace(/\bmrs\./gi, '__MRS__')
        .replace(/\bprof\./gi, '__PROF__');
    // ------------------------------------------------------------------------
    // Tách câu
    // ------------------------------------------------------------------------

    // ------------------------------------------------------------------------
    // Tách câu
    // ------------------------------------------------------------------------

    const mergedParts = [];

    for (
        const line of safeText
            .replace(
                /__ENDHEADING__/g,
                '__ENDHEADING__\n'
            )
            .split(/\r?\n/)
    ) {

        const current = line.trim();

        if (!current) {
            continue;
        }

        if (mergedParts.length === 0) {
            mergedParts.push(current);
            continue;
        }

        const lastIndex =
            mergedParts.length - 1;

        const previous =
            mergedParts[lastIndex];

        const laBullet =
            /^[\-•]/.test(current);

        const laHeading =

            current.length < 100 &&

            !/[.!?:]$/.test(current) &&

            (
                /^[A-ZÀÁẢÃẠĂÂĐÊÔƠƯỪỨỬỮỰ]/.test(current)
            );

        const laCauDacBiet =

            // Hình
            /^(HÌNH|Hình)\s+\d+/i.test(current) ||
            /^(BẢNG|Bảng)\s+\d+/i.test(current) ||

            laBatDauTaiLieuThamKhao(current) ||

            /^TT$/i.test(current) ||

            /^STT$/i.test(current);

        const laOTrongBang =

            current.length <= 50 &&

            !/[.!?]$/.test(current);
      
        mergedParts.push(current);
    }


    const normalizedParts = [...mergedParts];
    let sentences = [];

    let inReferences = false;

    let currentReference = '';
    for (const part of normalizedParts) {


        const current = part.trim();

        if (
            laTieuDeCon(current)
        ) {
            continue;
        }
        if (
            /(MỞ ĐẦU|KẾT LUẬN|TÀI LIỆU THAM KHẢO)\s+\d+\s*$/
                .test(current.toUpperCase())
        ) {
            continue;
        }

        if (current.startsWith('__HEADING__')) {

            const heading = current
                .replace(/__HEADING__/g, '')
                .replace(/__ENDHEADING__/g, '')
                .trim();

            if (
                !laNgoaiLeDaoVan(heading)
            ) {
                sentences.push(heading);
            }

            continue;
        }
        const special = xuLyCauDacBiet(current);


        if (!current) {
            continue;
        }

        const upper = current.toUpperCase();

        // ======================================
        // THOÁT KHỎI TÀI LIỆU THAM KHẢO
        // ======================================

        if (
            inReferences &&
            upper.startsWith('PHỤ LỤC')
        ) {

            if (currentReference) {

                sentences.push(
                    currentReference.trim()
                );

                currentReference = '';
            }

            inReferences = false;

            continue;
        }

        if (
            laNgoaiLeDaoVan(current) ||
            upper.startsWith('DANH MỤC HÌNH') ||
            upper.startsWith('DANH MỤC BẢNG') ||
            upper.startsWith('DANH MỤC CHỮ')
        ) {

            if (
                upper.startsWith(
                    'TÀI LIỆU THAM KHẢO'
                )
            ) {
                inReferences = true;
            }

            currentReference = '';

            continue;
        }
        if (
            laThongTinHanhChinh(current)
        ) {
            continue;
        }

        if (
            laDongBangCanBo(current)
        ) {
            continue;
        }
        if (
            laKeywordSQLDonLe(current)
        ) {
            continue;
        }

        // =====================================================
        // TÀI LIỆU THAM KHẢO
        // =====================================================

        if (inReferences) {

            const laCitationMoi =
                laBatDauTaiLieuThamKhao(
                    current
                );

            if (laCitationMoi) {

                if (
                    currentReference
                ) {

                    sentences.push(
                        currentReference.trim()
                    );
                }

                currentReference =
                    current;
            }

            else {

                currentReference +=
                    '\n' + current;
            }

            continue;
        }

        // Bỏ I. II. III. IV. V. đứng riêng
        if (
            /^[IVXLCDM]+\.$/i.test(current)
        ) {
            continue;
        }

        // =====================================================
        // MỤC LỤC
        // DANH MỤC HÌNH
        // DANH MỤC BẢNG
        // TIÊU ĐỀ CON
        // =====================================================

        if (

            /^(HÌNH|Hình)\s+\d+/i.test(current) ||
            /^(BẢNG|Bảng)\s+\d+/i.test(current)

        ) {

            const special =
                xuLyCauDacBiet(current);

            if (special) {

                sentences.push(special);
            }

            continue;
        }

        // =====================================================
        // HEADING ĐÃ ĐÁNH DẤU
        // =====================================================

        /* if (
             current.startsWith('__HEADING__')
         ) {
 
             continue;
         }
 */
        // =====================================================
        // CÂU THƯỜNG
        // =====================================================
        // =====================================================
        // CÂU THƯỜNG
        // =====================================================

        // CÂU THƯỜNG
        if (
            /^\d+\.$/.test(current)
        ) {
            continue;
        }
        const subSentences = tachCauThuong(current);

        if (subSentences.length === 0) {
            continue;
        }
        if (current.length > 200) {

        }
        sentences.push(...subSentences);





        /*const normalized = current
            .replace(/\s+/g, ' ')
            .replace(
                /\b(I|II|III|IV|V)\.\s+/g,
                '\n$&'
            )
            .replace(
                /\b(Đặt vấn đề|Mục tiêu nghiên cứu của đề tài|Nhiệm vụ của đề tài|Kết quả đạt được của đề tài|Bố cục của đề tài)\b/g,
                '\n$&'
            );

        const subSentences = normalized
        
            .split(/\n|(?<=[.!?:])\s+/)
            .map(s => s.trim())
            .filter(Boolean);*/
    }
    // =========================================================
    // ĐÓNG CITATION CUỐI CÙNG
    // =========================================================

    if (currentReference) {

        sentences.push(
            currentReference.trim()
        );
    }
    // ------------------------------------------------------------------------
    // Khôi phục
    // ------------------------------------------------------------------------

    sentences = sentences.map(s =>
        s
            .replace(
                /__HEADING__/g,
                ''
            )
            .replace(
                /__ENDHEADING__/g,
                ''
            )
            .replace(/__PGSTS__/g, 'PGS.TS.')
            .replace(/__GSTS__/g, 'GS.TS.')
            .replace(/__PGS__/g, 'PGS.')
            .replace(/__GS__/g, 'GS.')
            .replace(/__TS__/g, 'TS.')
            .replace(/__THS__/g, 'ThS.')

            .replace(/__TPHCM__/g, 'TP.HCM')
            .replace(/__TP__/g, 'TP.')
            .replace(/__Q__/g, 'Q.')
            .replace(/__P__/g, 'P.')


            .replace(/__WWW__/g, 'www.')
            .replace(/__DOT__/g, '.')

            .replace(/__DOCX__/g, '.docx')
            .replace(/__DOC__/g, '.doc')
            .replace(/__PDF__/g, '.pdf')
            .replace(/__XLSX__/g, '.xlsx')


            .replace(/__URLDOT__/g, '.')
            .replace(/__EG__/g, 'e.g.')
            .replace(/__IE__/g, 'i.e.')
            .replace(/__ETC__/g, 'etc.')
            .replace(/__VS__/g, 'vs.')
            .replace(/__DR__/g, 'Dr.')
            .replace(/__MR__/g, 'Mr.')
            .replace(/__MRS__/g, 'Mrs.')
            .replace(/__PROF__/g, 'Prof.')


    );

    sentences = sentences.map(s =>
        s.replace(/\s+/g, ' ').trim()
    );

    return sentences;
}

// ============================================================================
// XUẤT CÁC HÀM RA NGOÀI
// ============================================================================
module.exports = {
    lamSachVanBan,
    tachTuTiengViet,
    tachCau,
    bamChuoi,
    locNoiDungHocThuat,
    laTieuDeCon,
    laNgoaiLeDaoVan,
    laThongTinHanhChinh,
    xuLyCauDacBiet,
    laBatDauTaiLieuThamKhao
};