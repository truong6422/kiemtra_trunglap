const fs = require('fs');
const path = require('path');
const util = require('util');

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


function getSentenceColor() {
    return rgb(1, 1, 0); // vàng nhạt
}

/**
 * Gom các cụm chữ của một câu thành từng dòng theo toạ độ y.
 * Hai cụm được coi là cùng dòng khi chênh lệch y nhỏ hơn 60% chiều cao chữ.
 *
 * @param {Array<{x:number,y:number,width:number,height:number}>} positions
 * @returns {Array<{y:number,xMin:number,xMax:number,height:number}>}
 */
function gomViTriTheoDong(positions) {

    if (
        !Array.isArray(positions) ||
        positions.length === 0
    ) {
        return [];
    }

    const cacDong = [];

    for (const p of positions) {

        const nguong =
            Math.max(p.height, 1) * 0.6;

        const dongCu =
            cacDong.find(
                d =>
                    Math.abs(d.y - p.y) <= nguong
            );

        if (dongCu) {

            dongCu.xMin =
                Math.min(dongCu.xMin, p.x);

            dongCu.xMax =
                Math.max(
                    dongCu.xMax,
                    p.x + p.width
                );

            dongCu.height =
                Math.max(dongCu.height, p.height);

        } else {

            cacDong.push({
                y: p.y,
                xMin: p.x,
                xMax: p.x + p.width,
                height: p.height
            });

        }

    }

    return cacDong;
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
) {

    try {


        let pdfPath =
            originalFilePath;

        // ========================================
        // CHUẨN HÓA PDF
        // ========================================

        if (
            fileExt &&
            fileExt.toLowerCase() === '.docx'
        ) {

            pdfPath =
                await convertDocxToPdf(
                    originalFilePath
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

        for (
            const item
            of chiTietCauTrung
        ) {
            if (
                !item.cau_kiem_tra
            ) {
                continue;
            }

            const matches =
                positionIndex.get(
                    item.cau_kiem_tra
                ) || [];

            const color =
                getSentenceColor();

            // label hiển thị
            const label =
                '[' +
                item.danh_sach_nguon
                    .map(
                        s =>
                            s.id_bao_cao
                                .replace(
                                    'BC',
                                    ''
                                )
                    )
                    .join(',') +
                ']';

            // ====================================
            // VẼ HIGHLIGHT
            // ====================================

            if (
                !matches ||
                matches.length === 0
            ) {
                continue;
            }

            // Một câu có thể xuất hiện ở nhiều chỗ trong tài liệu. Trang chi
            // tiết bôi màu mọi chỗ, nên bản PDF cũng phải bôi hết thì hai bên
            // mới giống nhau — trước đây chỉ lấy matches[0] nên các lần xuất
            // hiện sau không được bôi.
            for (const found of matches) {

                const page =
                    pdfDoc.getPage(
                        found.page - 1
                    );

                // Một câu thường trải trên nhiều dòng. Gom các cụm chữ theo
                // toạ độ y rồi vẽ riêng từng dòng, thay vì một hình chữ nhật
                // duy nhất chạy từ cụm đầu tới cụm cuối (cách cũ cho ra bề
                // rộng cụt hoặc âm khi cụm cuối nằm ở dòng dưới).
                const cacDong =
                    gomViTriTheoDong(
                        found.positions
                    );

                for (const dong of cacDong) {

                    const width =
                        dong.xMax - dong.xMin;

                    if (width <= 0) {
                        continue;
                    }

                    page.drawRectangle({
                        x: dong.xMin,
                        y: dong.y,
                        width,
                        height:
                            dong.height + 4,
                        color,
                        opacity: 0.15
                    });

                }

            }

            const firstPos =
                matches[0].positions?.[0];

            if (firstPos) {

                /*page.drawText(
                    label,
                    {
                        x: firstPos.x,
                        y:
                            firstPos.y +
                            firstPos.height +
                            2,
                        size: 8,
                        color:
                            rgb(0, 0, 0)
                    }
                );*/

            }

        }



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
    processAndHighlightReport
};