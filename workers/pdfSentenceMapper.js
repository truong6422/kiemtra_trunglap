const fs = require("fs");
const stringSimilarity =
    require("string-similarity");
const path = require("path");

const PERF_FILE =
    path.join(
        __dirname,
        "highlight-performance.log"
    );

function logPerf(text)
{
    fs.appendFileSync(
        PERF_FILE,
        text + "\n"
    );
}
/*
function calculateSimilarity(a, b) {

    a = a.trim();
    b = b.trim();

    if (!a || !b) {
        return 0;
    }

    const longer =
        a.length > b.length
            ? a
            : b;

    const shorter =
        a.length > b.length
            ? b
            : a;

    let same = 0;

    for (
        let i = 0;
        i < shorter.length;
        i++
    ) {

        if (
            shorter[i] === longer[i]
        ) {
            same++;
        }
    }

    return same / longer.length;
}*/
async function loadPdfItems(pdfPath) {

    const pdfjsLib =
        await import(
            "pdfjs-dist/legacy/build/pdf.mjs"
        );

    const data =
        new Uint8Array(
            fs.readFileSync(pdfPath)
        );

    const pdf =
        await pdfjsLib
            .getDocument({ data })
            .promise;

    const pages = [];

    for (
        let pageNum = 1;
        pageNum <= pdf.numPages;
        pageNum++
    ) {

        const page =
            await pdf.getPage(pageNum);

        const textContent =
            await page.getTextContent();

        const items =
            textContent.items
                .filter(item => {

                    const text =
                        item.str
                            ? item.str.trim()
                            : "";

                    if (!text)
                        return false;

                    // Loại số trang
                    if (/^\d+$/.test(text))
                        return false;

                    return true;

                })
                .map(
                    item => ({

                        text:
                            item.str.trim(),

                        x:
                            item.transform[4],

                        y:
                            item.transform[5],

                        width:
                            item.width || 0,

                        height:
                            item.height || 0

                    })
                );

        pages.push({

            page: pageNum,

            items

        });
        /* if (pageNum === 3) {
             console.log(
                 items.map(i => i.text).join(" ")
             );
         }
 */
    }

    return pages;
}

/**
 * Cắt một cụm chữ cho vừa khoảng ký tự của câu.
 *
 * Mỗi cụm chữ pdf.js trả về thường là trọn một dòng, trong khi câu có thể bắt
 * đầu hoặc kết thúc ở giữa dòng. Ước lượng bề rộng theo số ký tự để vệt bôi
 * dừng đúng chỗ câu dừng, thay vì kéo hết dòng.
 */
function catCumTheoKhoang(p, tuKyTu, denKyTu) {

    const soKyTu =
        p.ketThuc - p.batDau;

    if (soKyTu <= 0) {
        return p;
    }

    const dau =
        Math.max(p.batDau, tuKyTu);

    const cuoi =
        Math.min(p.ketThuc, denKyTu);

    if (cuoi <= dau) {
        return null;
    }

    const tiLeDau =
        (dau - p.batDau) / soKyTu;

    const tiLeCuoi =
        (cuoi - p.batDau) / soKyTu;

    return {
        ...p,
        x: p.x + p.width * tiLeDau,
        width: p.width * (tiLeCuoi - tiLeDau)
    };
}

/**
 * Tìm 1 câu/đoạn trên PDF.
 *
 * Chạy hai lượt: lượt đầu chỉ nhận chỗ khớp nguyên văn. Chỉ khi không có chỗ
 * nào khớp nguyên văn mới hạ xuống so gần đúng — kiểu so gần đúng không biết
 * câu bắt đầu từ ký tự nào nên hay ôm luôn cả chữ đứng trước.
 */
function findTextInPdf(
    pages,
    targetText
) {

    const target =
        targetText
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    if (!target) {
        return [];
    }

    const nguyenVan =
        quetTrang(pages, target, false);

    if (nguyenVan.length) {
        return nguyenVan;
    }

    return quetTrang(pages, target, true);
}

function quetTrang(
    pages,
    target,
    choPhepGanDung
) {
const startTime = Date.now();
    const targetText = target;
    const matches = [];
    for (const page of pages) {

        for (
    let start = 0;
    start < page.items.length;
    start++
)
{
    if (
        page.items[start].text.length < 2
    ) {
        continue;
    }


            let buffer = "";
            const positions = [];

            for (
                let end = start;
                end < page.items.length;
                end++
            ) {

                const item =
                    page.items[end];

                const itemText =
                    item.text
                        .replace(/\s+/g, " ")
                        .trim();

                // Bỏ số trang đơn lẻ
                if (
                    /^\d+$/.test(itemText)
                ) {
                    continue;
                }

                // Ghi lại cụm chữ này nằm ở khoảng ký tự nào trong chuỗi đang
                // dựng. Nhờ vậy khi tìm ra câu, biết được cụm nào thực sự
                // thuộc câu và cụm nào chỉ là phần đứng trước.
                const batDau =
                    buffer.length
                        ? buffer.length + 1
                        : 0;

                buffer =
                    buffer
                        ? buffer + " " + itemText
                        : itemText;

                positions.push({
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    batDau,
                    ketThuc: buffer.length
                });

                // buffer đã chuẩn hoá khoảng trắng ngay lúc dựng nên không cần
                // chuẩn hoá lại — giữ nguyên độ dài thì các mốc batDau/ketThuc
                // ở trên mới trỏ đúng chỗ.
                const normalized =
                    buffer.toLowerCase();

                const exact =
                    normalized.includes(target);

                let fuzzy = false;

                // Chỉ fuzzy nếu chưa exact
                if (!exact && choPhepGanDung) {

                    const lenRatio =
                        normalized.length /
                        target.length;

                    if (
                        lenRatio >= 0.8 &&
                        lenRatio <= 1.2
                    ) {

                        const score =
                            stringSimilarity.compareTwoStrings(
                                normalized,
                                target
                            );

                        fuzzy =
                            score >= 0.85;
                    }
                }

                if (
                    exact ||
                    fuzzy
                ) {

                    // Vòng lặp bắt đầu từ `start` nên chuỗi đang dựng thường
                    // gồm cả mấy cụm chữ đứng trước câu — ví dụ tiêu đề
                    // "LỜI MỞ ĐẦU" nằm ngay trên đoạn văn. Giữ nguyên thì bản
                    // PDF bôi màu luôn cả tiêu đề, khác hẳn trang chi tiết.
                    // Chỉ lấy những cụm chữ nằm trong khoảng ký tự của câu.
                    let cacViTri = positions;

                    if (exact) {

                        const viTriCau =
                            normalized.indexOf(target);

                        const hetCau =
                            viTriCau + target.length;

                        cacViTri =
                            positions
                                .filter(
                                    p =>
                                        p.ketThuc > viTriCau &&
                                        p.batDau < hetCau
                                )
                                .map(
                                    p =>
                                        catCumTheoKhoang(
                                            p,
                                            viTriCau,
                                            hetCau
                                        )
                                )
                                .filter(
                                    p =>
                                        p && p.width > 0
                                );
                    }

                    const firstPos = cacViTri[0];

                    if (!firstPos) {
                        continue;
                    }

                    const existed = matches.some(
                        m =>
                            m.page === page.page &&
                            Math.abs(
                                m.positions[0].x - firstPos.x
                            ) < 2 &&
                            Math.abs(
                                m.positions[0].y - firstPos.y
                            ) < 2
                    );

                    if (!existed) {

                        matches.push({
                            page:
                                page.page,

                            text:
                                targetText,

                            positions: [...cacViTri]
                        });

                    }
                    break;


                }

                // chặn vòng lặp vô tận
                if (
                    normalized.length >
                    target.length * 1.5
                ) {
                    break;
                }

            }

        }

    }
    if (
    Date.now() - startTime > 50
) {
    logPerf(
    `SLOW_MATCH=${Date.now() - startTime}ms | ${targetText.substring(0, 50)}`
);
}

return matches;
}

module.exports = {

    loadPdfItems,

    findTextInPdf

};