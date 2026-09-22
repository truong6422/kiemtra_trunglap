/**
 * ============================================================================
 * MỞ TỆP PDF BẰNG PDF.JS
 *
 * Gom về một chỗ để mọi nơi mở PDF đều dùng cùng một bộ tham số.
 *
 * Quan trọng nhất là hai đường dẫn tài nguyên đi kèm thư viện:
 *
 *   - standardFontDataUrl: dữ liệu 14 phông chuẩn của PDF (Times, Helvetica...).
 *     Thiếu nó, mỗi tệp dùng phông chuẩn lại sinh ra một dòng
 *     "UnknownErrorException: Ensure that the standardFontDataUrl API parameter
 *     is provided" trong nhật ký. Việc đọc chữ vẫn chạy, nhưng nhật ký bị lấp
 *     đầy cảnh báo nên lỗi thật khó nhìn thấy.
 *
 *   - cMapUrl: bảng ánh xạ mã ký tự cho phông nhiều byte. Cần cho tài liệu
 *     tiếng Việt dùng phông nhúng kiểu CID.
 * ============================================================================
 */

const path = require('path');

const GOC_PDFJS = path.dirname(
    require.resolve('pdfjs-dist/package.json')
);

const DUONG_DAN_PHONG_CHUAN =
    path.join(GOC_PDFJS, 'standard_fonts') + path.sep;

const DUONG_DAN_CMAP =
    path.join(GOC_PDFJS, 'cmaps') + path.sep;

/** Nạp pdf.js bản legacy — bản chạy được trên Node. */
async function napPdfJs() {
    return import('pdfjs-dist/legacy/build/pdf.mjs');
}

/**
 * Mở một tệp PDF từ dữ liệu nhị phân.
 *
 * @param {Uint8Array} duLieu Nội dung tệp PDF
 * @returns {Promise<Object>} Đối tượng tài liệu của pdf.js
 */
async function moPdf(duLieu) {
    const pdfjsLib = await napPdfJs();

    return pdfjsLib.getDocument({
        data: duLieu,
        standardFontDataUrl: DUONG_DAN_PHONG_CHUAN,
        cMapUrl: DUONG_DAN_CMAP,
        cMapPacked: true
    }).promise;
}

module.exports = { moPdf, napPdfJs };
