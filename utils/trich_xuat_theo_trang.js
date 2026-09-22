/**
 * ============================================================================
 * TRÍCH XUẤT VĂN BẢN THEO TRANG VẬT LÝ
 *
 * Dùng cho chức năng "Kiểm tra một phần": người dùng khai số trang, hệ thống
 * chỉ lấy chữ nằm trong đúng những trang đó rồi đem đi chấm.
 *
 * Trang vật lý chỉ tồn tại trên PDF. Tệp Word không có ranh giới trang cho tới
 * khi dàn trang, nên ở đây chuyển tạm sang PDF bằng LibreOffice — đúng cách mà
 * bước bôi màu vẫn làm — rồi mới cắt theo trang.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const libre = require('libreoffice-convert');

const { phanTichPhamViTrang, moTaPhamVi } = require('./pham_vi_trang');

const chuyenDoiAsync = util.promisify(libre.convert);

/** Nạp pdf.js bản legacy — cùng bản mà bước bôi màu đang dùng. */
async function napPdfJs() {
    return import('pdfjs-dist/legacy/build/pdf.mjs');
}

/**
 * Đọc chữ của từng trang trong một tệp PDF.
 *
 * @param {string} duongDanPdf
 * @returns {Promise<string[]>} Mảng chữ, phần tử thứ i là trang i + 1
 */
async function docChuTungTrang(duongDanPdf) {
    const pdfjsLib = await napPdfJs();

    const duLieu = new Uint8Array(fs.readFileSync(duongDanPdf));
    const pdf = await pdfjsLib.getDocument({ data: duLieu }).promise;

    const cacTrang = [];

    for (let soTrang = 1; soTrang <= pdf.numPages; soTrang++) {
        const trang = await pdf.getPage(soTrang);
        const noiDung = await trang.getTextContent();

        cacTrang.push(
            noiDung.items
                .map(m => (m.str || ''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim()
        );
    }

    return cacTrang;
}

/**
 * Chuyển tệp Word sang PDF tạm để lấy được ranh giới trang.
 * Trả về đường dẫn PDF tạm; người gọi có trách nhiệm xoá đi.
 */
async function chuyenWordSangPdfTam(duongDanFile) {
    const buffer = fs.readFileSync(duongDanFile);
    const pdfBuffer = await chuyenDoiAsync(buffer, '.pdf', undefined);

    const duongDanTam = duongDanFile.replace(
        /\.(docx?|DOCX?)$/,
        '_pham_vi_trang.pdf'
    );

    fs.writeFileSync(duongDanTam, pdfBuffer);
    return duongDanTam;
}

/**
 * Lấy văn bản của riêng những trang người dùng chọn.
 *
 * @param {string} duongDanFile Tệp gốc người dùng tải lên (.pdf/.doc/.docx)
 * @param {string} chuoiPhamVi Chuỗi phạm vi người dùng nhập, ví dụ "10-25"
 * @returns {Promise<{van_ban: string, cac_trang: number[], mo_ta: string,
 *          tong_so_trang: number}>}
 *          van_ban rỗng nghĩa là không cắt được theo trang; nơi gọi nên quay về
 *          cách đọc toàn bộ tài liệu thay vì để người dùng mất bài.
 */
async function trichXuatTheoTrang(duongDanFile, chuoiPhamVi) {
    const ketQuaRong = {
        van_ban: '',
        cac_trang: [],
        mo_ta: '',
        tong_so_trang: 0
    };

    if (!duongDanFile || !fs.existsSync(duongDanFile)) return ketQuaRong;
    if (!String(chuoiPhamVi || '').trim()) return ketQuaRong;

    const duoi = path.extname(duongDanFile).toLowerCase();
    let duongDanPdf = duongDanFile;
    let pdfTam = '';

    try {
        if (duoi === '.doc' || duoi === '.docx') {
            pdfTam = await chuyenWordSangPdfTam(duongDanFile);
            duongDanPdf = pdfTam;
        } else if (duoi !== '.pdf') {
            // Tệp văn bản thuần không có khái niệm trang
            return ketQuaRong;
        }

        const chuTungTrang = await docChuTungTrang(duongDanPdf);
        const tongSoTrang = chuTungTrang.length;

        const cacTrang = phanTichPhamViTrang(chuoiPhamVi, tongSoTrang);

        if (!cacTrang.length) {
            return { ...ketQuaRong, tong_so_trang: tongSoTrang };
        }

        const vanBan = cacTrang
            .map(so => chuTungTrang[so - 1] || '')
            .filter(Boolean)
            .join('\n')
            .normalize('NFC')
            .trim();

        return {
            van_ban: vanBan,
            cac_trang: cacTrang,
            mo_ta: moTaPhamVi(cacTrang),
            tong_so_trang: tongSoTrang
        };

    } catch (loi) {
        console.error(
            `❌ Không cắt được theo trang (${path.basename(duongDanFile)}):`,
            loi.message
        );
        return ketQuaRong;

    } finally {
        if (pdfTam && fs.existsSync(pdfTam)) {
            try {
                fs.unlinkSync(pdfTam);
            } catch (e) {
                console.warn('Không xoá được PDF tạm:', e.message);
            }
        }
    }
}

module.exports = { trichXuatTheoTrang, docChuTungTrang };
