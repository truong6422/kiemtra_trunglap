const fs = require('fs');
const path = require('path');
const util = require('util');
const { timTepBaoCao } = require('../utils/duong_dan_tep');
const VetBoiMau = require('../models/vet_boi_mau');

const libre =
    require('libreoffice-convert');

const {
    PDFDocument,
    rgb
} = require('pdf-lib');

// Bọc libre.convert thành Promise bằng tay. Dùng util.promisify ở đây làm Node
// in ra cảnh báo "Calling promisify on a function that returns a Promise",
// vì bản libreoffice-convert này đã trả Promise sẵn khi không truyền callback.
function convertAsync(duLieu, dinhDang, boLoc) {
    return new Promise((ok, loi) => {
        libre.convert(duLieu, dinhDang, boLoc, (e, ketQua) => {
            if (e) loi(e); else ok(ketQua);
        });
    });
}
const {
    loadPdfItems,
    findTextInPdf
} = require('./pdfSentenceMapper');


// Cùng màu với lớp bôi màu của trang chi tiết: rgba(255, 213, 79, 0.30).
// Trước đây dùng vàng nguyên rgb(255,255,0) mờ 0.15 nên hai bên nhìn khác hẳn
// nhau, dù vùng bôi giống nhau.
const DO_MO = 0.30;

// Lỗi 7: 3 màu riêng biệt theo loại trùng
const MAU_CAU    = rgb(1,          213 / 255, 79  / 255); // Vàng
const MAU_DOAN   = rgb(1,          150 / 255, 50  / 255); // Cam
const MAU_CHAP_VA = rgb(1,         100 / 255, 100 / 255); // Đỏ nhạt

function getSentenceColor() {
    return MAU_CAU;
}

// Lỗi 7: tra màu theo loại vệt
function getColorByLoai(loai) {
    if (loai === 'doan')   return MAU_DOAN;
    if (loai === 'chap_va') return MAU_CHAP_VA;
    return MAU_CAU;
}

/**
 * Gom các cụm chữ nằm cùng một dòng và sát nhau thành từng vệt.
 *
 * Cách cũ lấy mép trái nhỏ nhất và mép phải lớn nhất của cả dòng, nên khoảng
 * trống giữa hai phần rời của câu cũng bị tô. Ở đây chỉ nối tiếp khi hai cụm
 * đứng sát nhau — giống cách trang chi tiết đang làm.
 *
 * Nhận vệt của mọi câu trên cùng một trang, nhờ vậy hai câu đè lên nhau chỉ
 * cho ra một vệt duy nhất, không bị tô hai lớp thành màu đậm loang lổ.
 *
 * @param {Array<{x:number,y:number,width:number,height:number}>} cacO
 * @returns {Array<{y:number,x:number,width:number,height:number}>}
 */
/**
 * Xếp các cụm chữ về từng dòng theo toạ độ y.
 *
 * @param {Array<{x:number,y:number,width:number,height:number}>} cacO
 * @returns {Array<{y:number,height:number,cacO:Array}>}
 */
function gomTheoDong(cacO) {

    const cacDong = [];

    for (const o of cacO || []) {

        if (!o.width || o.width <= 0) {
            continue;
        }

    const nguong = Math.max(o.height, 1) * 0.6;

        const dongCu =
            cacDong.find(
                d =>
                    Math.abs(d.y - o.y) <= nguong
            );

        if (dongCu) {
            dongCu.cacO.push(o);
            dongCu.height =
                Math.max(dongCu.height, o.height);
        } else {
            cacDong.push({
                y: o.y,
                height: o.height,
                cacO: [o]
            });
        }
    }

    return cacDong;
}

/**
 * Bôi liền một mạch phần câu nằm trên mỗi dòng: từ chữ đầu tới chữ cuối của
 * chính câu đó trên dòng đó.
 *
 * Trước đây mỗi cụm chữ khớp được tô riêng, nên chữ nào trong câu lệch đi một
 * chút là ở giữa hở ra một khoảng trắng, dù thống kê vẫn tính cả câu là trùng.
 * Lấy trọn khoảng của câu trên dòng thì hết hở, và cũng là cách trang chi tiết
 * phải vẽ theo cho hai bên khớp nhau.
 *
 * @param {Array} cacO Các cụm chữ của MỘT câu trên MỘT trang
 * @param {number} chiSoCau Thứ tự câu trùng, gắn kèm để trang chi tiết biết
 *        vệt này thuộc câu nào khi người dùng bấm vào
 */
function noiLienCauTheoDong(cacO, chiSoCau) {

    return gomTheoDong(cacO).map(dong => {

        const trai =
            Math.min(...dong.cacO.map(o => o.x));

        const phai =
            Math.max(...dong.cacO.map(o => o.x + o.width));

        return {
            x: trai,
            y: dong.y,
            width: phai - trai,
            height: dong.height,
            cacCau: [chiSoCau]
        };
    });
}

/**
 * Ghi lại các vệt vừa vẽ để trang chi tiết dùng chung.
 *
 * Mỗi báo cáo chỉ giữ một bản mới nhất: chấm lại thì vệt cũ được thay hẳn.
 * Lưu hỏng cũng không được làm hỏng việc sinh PDF, nên chỉ ghi nhật ký.
 */
async function luuVetBoiMau(reportId, pdfDoc, cacVet) {

    if (!reportId) return;

    try {
        const kichThuocTrang =
            pdfDoc.getPages().map((p, i) => ({
                trang: i + 1,
                rong: p.getWidth(),
                cao: p.getHeight()
            }));

        await VetBoiMau.findOneAndUpdate(
            { id_bao_cao: reportId },
            {
                $set: {
                    id_bao_cao: reportId,
                    kich_thuoc_trang: kichThuocTrang,
                    cac_vet: cacVet,
                    ngay_tao: new Date()
                }
            },
            { upsert: true }
        );

        console.log(
            `🖍️  Đã lưu ${cacVet.length} vệt bôi màu cho ${reportId}`
        );

    } catch (loi) {
        console.error(
            `Không lưu được vệt bôi màu của ${reportId}:`,
            loi.message
        );
    }
}

function gomViTriTheoDong(cacO) {

    if (
        !Array.isArray(cacO) ||
        cacO.length === 0
    ) {
        return [];
    }

    const cacDong = gomTheoDong(cacO);

    // Trong từng dòng, nối các cụm chồng nhau hoặc sát nhau
    const cacVet = [];

    for (const dong of cacDong) {

        const nguongNoi =
            Math.max(dong.height, 1) * 0.55;

        const sapXep =
            [...dong.cacO].sort((a, b) => a.x - b.x);

        let dangGom = null;

        for (const o of sapXep) {

            if (
                dangGom &&
                o.x <= dangGom.x + dangGom.width + nguongNoi
            ) {

                const phai =
                    Math.max(
                        dangGom.x + dangGom.width,
                        o.x + o.width
                    );

                dangGom.width = phai - dangGom.x;

                dangGom.height =
                    Math.max(dangGom.height, o.height);

                for (const c of (o.cacCau || [])) {
                    dangGom.cacCau.add(c);
                }

            } else {

                if (dangGom) cacVet.push(dangGom);

                dangGom = {
                    y: dong.y,
                    x: o.x,
                    width: o.width,
                    height: o.height,
                    cacCau: new Set(o.cacCau || [])
                };
            }
        }

        if (dangGom) cacVet.push(dangGom);
    }

    return catPhanTranDong(cacVet);
}

/**
 * Cắt phần tràn dọc giữa vệt của hai dòng liền nhau.
 *
 * Chiều cao chữ mà pdf.js báo về thường lớn hơn khoảng cách giữa hai dòng. Ở
 * hệ toạ độ PDF, vệt được vẽ từ đường chân chữ hướng lên, nên vệt dòng dưới
 * thò lên đè vào vệt dòng trên và chỗ giao bị tô hai lớp.
 */
function catPhanTranDong(cacVet) {

    // Xếp từ dòng dưới lên dòng trên
    const sapXep =
        [...cacVet].sort((a, b) => a.y - b.y);

    for (let i = 0; i < sapXep.length; i++) {

        const duoi = sapXep[i];

        for (let j = i + 1; j < sapXep.length; j++) {

            const tren = sapXep[j];

            if (tren.y >= duoi.y + duoi.height) {
                continue;
            }

            const giaoNgang =
                duoi.x < tren.x + tren.width &&
                tren.x < duoi.x + duoi.width;

            if (!giaoNgang) {
                continue;
            }

            const chieuCaoMoi = tren.y - duoi.y;

            if (chieuCaoMoi > 2) {
                duoi.height = chieuCaoMoi;
            }
        }
    }

    return sapXep;
}

async function convertDocxToPdf(
    docxPath
) {

    const docxBuffer =
        fs.readFileSync(
            docxPath
        );

    const pdfBuffer =
        await convertAsync(
            docxBuffer,
            '.pdf',
            undefined
        );

    const tempPdfPath =
        docxPath.replace(
            /\.docx$/i,
            '_temp.pdf'
        );

    fs.writeFileSync(
        tempPdfPath,
        pdfBuffer
    );

    return tempPdfPath;
}

async function processAndHighlightReport(
    reportId,
    originalFilePath,
    fileExt,

    chiTietCauTrung = [],
    chiTietCauTrungHighlight = [],
    chiTietDoanTrung = [],
    chiTietDoanChapVa = []
) {

    // Lỗi 7: gắn loai_vet vào từng item trước khi xử lý highlight
    // - câu nằm trong đoạn trùng → 'doan'
    // - câu nằm trong chắp vá → 'chap_va'
    // - câu đơn lẻ → 'cau'
    const chisoDoan = new Set();
    for (const d of (chiTietDoanTrung || [])) {
        for (let i = d.tu_cau_kiem_tra; i <= d.den_cau_kiem_tra; i++) chisoDoan.add(i);
    }
    const chisoChapVa = new Set();
    for (const d of (chiTietDoanChapVa || [])) {
        for (let i = d.tu_cau_kiem_tra; i <= d.den_cau_kiem_tra; i++) chisoChapVa.add(i);
    }
    for (const item of chiTietCauTrung) {
        const idx = item.chi_so_cau_kiem_tra;
        if (chisoDoan.has(idx)) item.loai_vet = 'doan';
        else if (chisoChapVa.has(idx)) item.loai_vet = 'chap_va';
        else item.loai_vet = 'cau';
    }

    try {

        // Bản ghi cũ giữ đường dẫn của máy khác (ổ D:, dấu gạch ngược), đọc
        // thẳng là hỏng ngay ở bước mở tệp. Dò lại để tìm tệp thật trong dự án.
        let pdfPath = timTepBaoCao(originalFilePath);

        if (!pdfPath) {
            throw new Error(
                `Không tìm thấy tệp gốc của báo cáo ${reportId} `
                + `(đường dẫn đã lưu: ${originalFilePath}).`
            );
        }

        // ========================================
        // CHUẨN HÓA PDF
        // ========================================

        if (
            fileExt &&
            fileExt.toLowerCase() === '.docx'
        ) {

            pdfPath =
                await convertDocxToPdf(
                    pdfPath
                );
        }
        const pdfPages =
            await loadPdfItems(
                pdfPath
            );
        const searchCache =
            new Map();

        const getMatches = (text) => {

            if (!text) {
                return [];
            }

            if (
                searchCache.has(text)
            ) {
                return searchCache.get(text);
            }

            const matches =
                findTextInPdf(
                    pdfPages,
                    text
                );

            searchCache.set(
                text,
                matches
            );

            return matches;
        };

        const positionIndex =
            new Map();


        for (const item of chiTietCauTrung) {

            if (!item.cau_kiem_tra) {
                continue;
            }

            if (
                !positionIndex.has(
                    item.cau_kiem_tra
                )
            ) {

                positionIndex.set(
                    item.cau_kiem_tra,
                    getMatches(
                        item.cau_kiem_tra
                    )
                );

            }

        }

        // ========================================
        // LOAD PDF GỐC
        // ========================================

        const pdfBytes =
            fs.readFileSync(
                pdfPath
            );


        const pdfDoc =
            await PDFDocument.load(
                pdfBytes
            );

        // ========================================
        // HIGHLIGHT 
        // ========================================

        // Gom ô chữ của mọi câu theo từng trang trước, vẽ sau.
        //
        // Vẽ ngay từng câu một thì hai câu nằm đè lên nhau cho ra hai lớp màu
        // chồng lên, chỗ giao đậm hơn hẳn phần còn lại. Gom trước rồi hợp nhất
        // thì mỗi chỗ chỉ được tô đúng một lần, màu đều như trang chi tiết.
        // Lỗi 7: nhận thêm danh sách đoạn và chắp vá để xác định loại vật khi vẽ
        // --- gần được hết bằng cách gặn loai_vet ngầm định vào từng item ---
        // Câu kiểm tra thuần thì loai_vet = 'cau',
        // item thuộc đoạn trùng thì 'doan', chắp vá thì 'chap_va'.
        //
        // Chiến lược: gây chi_so_cau_kiem_tra -> loai nhờ Map truyền vào
        const loaiTheoChiSo = new Map();
        for (const item of chiTietCauTrung) {
            loaiTheoChiSo.set(item.chi_so_cau_kiem_tra, item.loai_vet || 'cau');
        }

        // Lỗi 6: lấy chiều cao ước tính của mỗi trang từ pdfPages
        const pageHeightMap = new Map();
        for (const pageData of pdfPages) {
            if (!pageData.items || pageData.items.length === 0) continue;
            const ys = pageData.items.map(it => it.y);
            const h = Math.max(...ys) - Math.min(...ys) + 20;
            const yMin = Math.min(...ys);
            pageHeightMap.set(pageData.page, { h, yMin });
        }

        const oTheoTrang = new Map();

        for (
            let chiSoCau = 0;
            chiSoCau < chiTietCauTrung.length;
            chiSoCau++
        ) {
            const item = chiTietCauTrung[chiSoCau];

            if (
                !item || !item.cau_kiem_tra
            ) {
                continue;
            }

            const matches =
                positionIndex.get(
                    item.cau_kiem_tra
                ) || [];

            if (
                !matches ||
                matches.length === 0
            ) {
                continue;
            }

            for (const found of matches) {

                if (!oTheoTrang.has(found.page)) {
                    oTheoTrang.set(found.page, []);
                }

                const khoaCau =
                    item.chi_so_cau_kiem_tra !== undefined
                        ? Number(item.chi_so_cau_kiem_tra)
                        : chiSoCau;

                // Lỗi 6: lọc vị trí nằm ở header/footer
                const phInf = pageHeightMap.get(found.page);
                const cacViTriLoc = phInf
                    ? found.positions.filter(p => {
                        const rel = p.y - phInf.yMin;
                        return phInf.h <= 0 || (rel >= phInf.h * 0.03 && rel <= phInf.h * 0.97);
                    })
                    : found.positions;

                if (cacViTriLoc.length === 0) continue;

                const noiLien = noiLienCauTheoDong(cacViTriLoc, khoaCau);
                // Gắn loại vật vào từng ô chữ để lúc vẽ biết màu
                for (const o of noiLien) o.loai_vet = item.loai_vet || 'cau';

                oTheoTrang
                    .get(found.page)
                    .push(...noiLien);
            }
        }

        // ====================================
        // VẼ HIGHLIGHT
        // ====================================

        // Danh sách vật cuối cùng, vừa dùng để vẽ vào PDF vừa lưu lại cho trang
        // chi tiết vẽ y hệt. Đây là nơi duy nhất tính vùng bôi màu.
        const vetDeLuu = [];

        for (const [soTrang, cacO] of oTheoTrang) {

            const page =
                pdfDoc.getPage(soTrang - 1);

            for (const vet of gomViTriTheoDong(cacO)) {

                if (
                    vet.width <= 0 ||
                    vet.height <= 0
                ) {
                    continue;
                }

                // Lỗi 7: xác định màu theo loại vật
                const loaiVet = vet.loai_vet || 'cau';
                const mau = getColorByLoai(loaiVet);

                page.drawRectangle({
                    x: vet.x,
                    y: vet.y,
                    width: vet.width,
                    height: vet.height,
                    color: mau,
                    opacity: DO_MO
                });

                vetDeLuu.push({
                    trang: soTrang,
                    x: vet.x,
                    y: vet.y,
                    rong: vet.width,
                    cao: vet.height,
                    loai_vet: loaiVet,
                    cac_cau: [...(vet.cacCau || [])]
                });
            }
        }

        await luuVetBoiMau(reportId, pdfDoc, vetDeLuu);

        // ========================================
        // OUTPUT
        // ========================================

        const upload2Dir =
            path.resolve(
                __dirname,
                '../upload2'
            );

        if (
            !fs.existsSync(
                upload2Dir
            )
        ) {

            fs.mkdirSync(
                upload2Dir,
                {
                    recursive: true
                }
            );
        }

        const outputPdfPath =
            path.join(
                upload2Dir,
                `${reportId}.pdf`
            );

        const outBytes =
            await pdfDoc.save();

        fs.writeFileSync(
            outputPdfPath,
            outBytes
        );

        return outputPdfPath;

    } catch (error) {

        console.error(
            '❌ processAndHighlightReport:',
            error
        );

        throw error;
    }
}

module.exports = {
    processAndHighlightReport,

    // Xuất thêm để đối chiếu vùng bôi màu với trang chi tiết khi cần kiểm tra
    __gomViTriTheoDong: gomViTriTheoDong
};