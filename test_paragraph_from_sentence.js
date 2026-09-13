// test_paragraph_from_sentence.js

const fs = require("fs");
const pdfParse = require("pdf-parse");

(async () => {

    const buffer = fs.readFileSync(
        "./kiem_thu/original/1800103.pdf"
    );

    const data = await pdfParse(buffer);

    const lines = data.text
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);

    const paragraphs = [];

    let currentParagraph = "";

    for (const line of lines) {

        if (!currentParagraph) {
            currentParagraph = line;
            continue;
        }

        currentParagraph += " " + line;

        // kết thúc đoạn
        if (/[.!?;:]$/.test(line)) {

            paragraphs.push(
                currentParagraph.trim()
            );

            currentParagraph = "";
        }
    }

    if (currentParagraph) {
        paragraphs.push(
            currentParagraph.trim()
        );
    }

    console.log(
        "Paragraph count:",
        paragraphs.length
    );

    fs.writeFileSync(
        "paragraph_test.txt",
        paragraphs.map(
            (p, i) =>
                `\n[PARAGRAPH ${i}]\n${p}\n`
        ).join("\n"),
        "utf8"
    );

})();