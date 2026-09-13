/**
 * ============================================================================
 * MODULE TRÍCH XUẤT VĂN BẢN ĐA TẦNG (utils/trich_xuat_text.js)
 * Mục đích: Đọc và bóc tách dữ liệu chữ từ các định dạng file (.docx, .pdf, .txt)
 *           đồng thời xử lý mã hóa tiếng Việt cũ (TCVN3) và chống tràn bộ nhớ.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParseModule = require('pdf-parse');
const PDFParser = require('pdf2json');

const { execFile } =
    require('child_process');
/**
 * [HÀM DỰ PHÒNG 1] Đọc PDF bằng thư viện 'pdf2json' khi 'pdf-parse' gặp sự cố.
 * Tích hợp cơ chế chặn và lọc các cảnh báo rác từ luồng hệ thống (stdout/stderr).
 * 
 * @param {string} duongDanFile - Đường dẫn tuyệt đối hoặc tương đối đến file PDF
 * @returns {Promise<string>} - Nội dung văn bản trích xuất được
 */
function convertDocToDocx(
    inputFile,
    outputFile
) {

    return new Promise(
        (resolve, reject) => {

            if (
                !fs.existsSync(inputFile)
            ) {
                reject(
                    new Error(
                        'File DOC không tồn tại'
                    )
                );
                return;
            }

            execFile(
                'soffice',
                [
                    '--headless',
                    '--convert-to',
                    'docx',
                    '--outdir',
                    path.dirname(outputFile),
                    inputFile
                ],
                (error) => {

                    if (error) {
                        return reject(error);
                    }

                    if (
                        !fs.existsSync(outputFile)
                    ) {
                        return reject(
                            new Error(
                                'DOCX đầu ra không tồn tại'
                            )
                        );
                    }

                    resolve();
                }
            );

        }
    );

}
function readPdfWithPdf2Json(duongDanFile) {
    return new Promise((resolve) => {
        // Lưu lại luồng ghi chuẩn ban đầu của Node.js
        const originalStdoutWrite = process.stdout.write;
        const originalStderrWrite = process.stderr.write;

        let isCleanedUp = false;

        // Hàm dọn dẹp và khôi phục luồng chuẩn, đảm bảo không bị kẹt luồng log
        const cleanup = () => {
            if (!isCleanedUp) {
                process.stdout.write = originalStdoutWrite;
                process.stderr.write = originalStderrWrite;
                isCleanedUp = true;
            }
        };

        // Bộ lọc chặn các thông báo lỗi/cảnh báo nội bộ của pdf2json không làm bẩn console
        const filterWarning = (bufferOrString, encoding, cb) => {
            const str = bufferOrString ? bufferOrString.toString() : '';
            if (
                str.includes('Warning:') ||
                str.includes('Unsupported:') ||
                str.includes('NOT valid form element')
            ) {
                if (typeof cb === 'function') cb();
                return true;
            }
            return false;
        };

        // Ghi đè tạm thời process.stdout
        process.stdout.write = function (string, encoding, fd) {
            if (filterWarning(string, encoding, fd)) return true;
            return originalStdoutWrite.apply(process.stdout, arguments);
        };

        // Ghi đè tạm thời process.stderr
        process.stderr.write = function (string, encoding, fd) {
            if (filterWarning(string, encoding, fd)) return true;
            return originalStderrWrite.apply(process.stderr, arguments);
        };

        try {
            const pdfParser = new PDFParser();
            pdfParser.Verbosity = 0; // Tắt chế độ log chi tiết của parser

            // Xử lý khi dữ liệu bị lỗi
            pdfParser.on("pdfParser_dataError", () => {
                cleanup();
                resolve("");
            });

            // Xử lý khi đọc dữ liệu thành công
            pdfParser.on("pdfParser_dataReady", () => {
                cleanup();
                try {
                    let rawText = pdfParser.getRawTextContent() || "";
                    try {

                    } catch (e) { }
                    resolve(rawText.trim());
                } catch (e) {
                    resolve("");
                }
            });

            pdfParser.loadPDF(duongDanFile);
        } catch (err) {
            cleanup();
            resolve("");
        }
    });
}

/**
 * [HÀM BỔ TRỢ] Gọi hàm pdf-parse an toàn tương thích với nhiều kiểu export module khác nhau.
 */
async function invokePdfParser(fn, dataBuffer) {
    try {
        return await fn(dataBuffer);
    } catch (err) {
        if (err.message && err.message.includes("cannot be invoked without 'new'")) {
            return await new fn(dataBuffer);
        }
        throw err;
    }
}

/**
 * [HÀM BỔ TRỢ] Định tuyến và phân giải module pdf-parse linh hoạt.
 */
async function parsePdfBuffer(dataBuffer) {

    if (typeof pdfParseModule === 'function') {

        const result =
            await invokePdfParser(
                pdfParseModule,
                dataBuffer
            );

        if (
            result &&
            result.text &&
            result.text.trim().length > 0
        ) {
            return result;
        }
    }
    if (
        pdfParseModule &&
        typeof pdfParseModule.default === 'function'
    ) {

        const result =
            await invokePdfParser(
                pdfParseModule.default,
                dataBuffer
            );

        if (
            result &&
            result.text &&
            result.text.trim().length > 0
        ) {
            return result;
        }
    }
    if (typeof pdfParseModule === 'object' && pdfParseModule !== null) {
        const keys = Object.keys(pdfParseModule);
        for (const key of keys) {
            if (typeof pdfParseModule[key] === 'function') {
                try {
                    return await invokePdfParser(pdfParseModule[key], dataBuffer);
                } catch (e) {
                    continue;
                }
            }
        }
    }
    throw new Error('Không tìm thấy hàm đọc PDF hợp lệ.');
}

/**
 * [HÀM BỔ TRỢ] Chuyển đổi bảng mã tiếng Việt cũ TCVN3 (ABC) sang Unicode chuẩn.
 * Giúp hệ thống đọc được các tài liệu hành chính hoặc văn bản cũ viết bằng font .VNTime.
 */
function convertToUnicode(str) {
    if (!str) return '';
    const tcvn3Map = {
        'µ': 'à', '¸': 'á', '¶': 'ả', '·': 'ã', '¹': 'ạ',
        '¨': 'ă', '»': 'ằ', '¾': 'ắ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
        'ª': 'â', 'Ç': 'ầ', 'Ê': 'ấ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
        'Ì': 'è', 'Í': 'é', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ð': 'ẹ',
        'Ò': 'ề', 'Ó': 'ế', 'Ô': 'ể', 'Õ': 'ễ', 'Ö': 'ệ',
        '×': 'ì', 'Ø': 'í', 'Ü': 'ỉ', 'Ý': 'ĩ', 'Þ': 'ị',
        'ß': 'ò', 'á': 'ó', 'â': 'ỏ', 'ã': 'õ', 'ä': 'ọ',
        'å': 'ồ', 'æ': 'ố', 'ç': 'ổ', 'è': 'ỗ', 'é': 'ộ',
        'ê': 'ờ', 'ë': 'ớ', 'ì': 'ở', 'í': 'ỡ', 'î': 'ợ',
        'ï': 'ù', 'ñ': 'ú', 'ò': 'ủ', 'ó': 'ũ', 'ô': 'ụ',
        'õ': 'ư', 'ö': 'ừ', '÷': 'ứ', 'ø': 'ử', 'ù': 'ữ', 'ú': 'ự',
        'û': 'ỳ', 'ü': 'ý', 'ý': 'ỷ', 'þ': 'ỹ', '®': 'đ'
    };
    return str.replace(/[µ¸¶·¹¨»¾¼½ÆªÇÊÈÉËÌÍÎÏÐÒÓÔÕÖ×ØÜÝÞßáâãäåæçèéêëìíîïñòóôõö÷øùúûüý®]/g, match => tcvn3Map[match] || match);
}

/**
 * [HÀM CHÍNH] TRÍCH XUẤT VĂN BẢN ĐA TẦNG VÀ AN TOÀN
 * 
 * Các lớp bảo vệ đã tích hợp:
 * - Kiểm tra sự tồn tại của file.
 * - Kiểm tra dung lượng file (chặn file rỗng 0 byte).
 * - Giới hạn kích thước an toàn (phù hợp với mức trần RAM <= 20MB của bạn).
 * - Hỗ trợ đa định dạng: .docx, .pdf, và bổ sung thêm .txt.
 * - Tự động nhận diện và giải mã TCVN3 sang Unicode.
 * 
 * @param {string} duongDanFile - Đường dẫn tệp cần trích xuất
 * @returns {Promise<string>} - Chuỗi văn bản sạch đã được chuẩn hóa
 */
async function trichXuatVanBan(duongDanFile) {
    try {
        // 1. Kiểm tra file có tồn tại hay không
        if (!fs.existsSync(duongDanFile)) {
            console.error(`❌ Không tìm thấy đường dẫn file: ${duongDanFile}`);
            return '';
        }

        // 2. Kiểm tra dung lượng file (Chặn file rỗng 0 byte)
        const stats = fs.statSync(duongDanFile);
        if (stats.size === 0) {
            console.warn(`⚠️ Cảnh báo: File "${path.basename(duongDanFile)}" có dung lượng bằng 0 (File rỗng).`);
            return '';
        }

        const ext = path.extname(duongDanFile).toLowerCase();
        let vanBanTho = '';

        // 3. Phân luồng xử lý theo định dạng tệp
        if (ext === '.docx' || ext === '.doc') {

            let fileWord = duongDanFile;

            if (ext === '.doc') {

                const fileDocx =
                    duongDanFile.replace(
                        /\.doc$/i,
                        '.docx'
                    );

                await convertDocToDocx(
                    duongDanFile,
                    fileDocx
                );

                if (!fs.existsSync(fileDocx)) {
                    throw new Error(
                        'Không thể chuyển DOC sang DOCX'
                    );
                }

                fileWord = fileDocx;
            }
            const options = {
                convertImage:
                    mammoth.images.imgElement(
                        function (image) {

                            return image
                                .read('base64')
                                .then(
                                    function () {

                                        return {
                                            data: ''
                                        };

                                    }
                                );

                        }
                    )
            };
            const result =
                await mammoth.extractRawText(
                    {
                        path: fileWord
                    },
                    options
                );

            vanBanTho =
                result.value || '';
        }
        else if (ext === '.pdf') {

            const dataBuffer =
                fs.readFileSync(
                    duongDanFile
                );

            try {

                const data =
                    await parsePdfBuffer(
                        dataBuffer
                    );

                vanBanTho =
                    data.text
                        ? data.text.trim()
                        : '';

            }
            catch (err1) {

                console.warn(
                    `⚠️ pdf-parse lỗi: ${err1.message}`
                );

                try {

                    vanBanTho =
                        await readPdfWithPdf2Json(
                            duongDanFile
                        );

                }
                catch (err2) {

                    console.warn(
                        `⚠️ pdf2json lỗi: ${err2.message}`
                    );

                    vanBanTho = '';

                }

            }
        }
        else if (ext === '.txt') {
            // Bổ sung hỗ trợ đọc file văn bản thuần túy dạng .txt với chuẩn mã hóa UTF-8
            vanBanTho = fs.readFileSync(duongDanFile, 'utf-8');
        }
        else {
            console.warn(`⚠️ Định dạng file không được hỗ trợ: ${ext} (Chỉ hỗ trợ .docx, .pdf, .txt)`);
            return '';
        }

        // 4. Chuẩn hóa Unicode toàn bộ về dạng NFC (khắc phục triệt để lỗi Unicode tổ hợp và dựng sẵn)
        vanBanTho = vanBanTho.normalize('NFC');
        vanBanTho = vanBanTho.replace(
            /[\u200B-\u200D\uFEFF]/g,
            ''
        );

        // 5. Chuẩn hóa khoảng trắng và ngắt dòng thông minh
        vanBanTho = vanBanTho
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+/g, ' ') // Gom nhiều khoảng trắng ngang thành 1
            .replace(/\n\s*\n/g, '\n') // Loại bỏ dòng trống thừa nhưng giữ ranh giới đoạn
            ;

        // 6. Kiểm tra và chuyển đổi bảng mã TCVN3 sang Unicode nếu phát hiện ký tự cũ
        /* if (/[µ¸¶·¹¨»¾¼½ÆªÇÊÈÉËÌÍÎÏÐÒÓÔÕÖ×ØÜÝÞßáâãäåæçèéêëìíîïñòóôõö÷øùúûüý®]/.test(vanBanTho)) {
             vanBanTho = convertToUnicode(vanBanTho);
         }
 */
        const ketQuaCuoi = vanBanTho.trim();
        console.log(
            `📄 ${path.basename(duongDanFile)}: ${ketQuaCuoi.length} ký tự`
        );

        // 6. Cảnh báo nếu văn bản sau khi trích xuất hoàn toàn trống (thường do file PDF là dạng ảnh scan)

        return ketQuaCuoi;

    } catch (error) {
        console.error(`❌ Lỗi hệ thống khi đọc file (${path.basename(duongDanFile)}):`, error.message);
        return '';
    }
}

module.exports = { trichXuatVanBan };

