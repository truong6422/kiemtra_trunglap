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
 * Tìm 1 câu/đoạn trên PDF
 */
function findTextInPdf(
    pages,
    targetText
) {
const startTime = Date.now();
    const target =
        targetText
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    if (!target) {
        return [];
    }
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
                    item.text.trim();

                // Bỏ số trang đơn lẻ
                if (
                    /^\d+$/.test(itemText)
                ) {
                    continue;
                }

                positions.push({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height
});

buffer +=
    " " +
    itemText;

                const normalized =
                    buffer
                        .replace(/\s+/g, " ")
                        .trim()
                        .toLowerCase();
                if (
                    target.includes("cảm ơn")
                ) {
                    console.log("TARGET:", target);
                    console.log("CURRENT:", normalized);
                }
                const exact =
                    normalized.includes(target);

                let fuzzy = false;

                // Chỉ fuzzy nếu chưa exact
                if (!exact) {

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

                    console.log(
                        "[MATCH]",
                        page.page,
                        targetText
                    );

                    const firstPos = positions[0];

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

                            positions: [...positions]
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

console.log(
    `[MATCHES] "${targetText}" => ${matches.length}`
);

return matches;
}

module.exports = {

    loadPdfItems,

    findTextInPdf

};