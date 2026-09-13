// test_paragraph_preview.js

const fs = require("fs");
const pdfParse = require("pdf-parse");

const {
    locNoiDungHocThuat,
    tachCau,
    taoParagraphTuCau
} = require("./utils/tien_xu_ly");

(async () => {

    const pdf = await pdfParse(
        fs.readFileSync(
            "./kiem_thu/original/1800103.pdf"
        )
    );

    const text =
        locNoiDungHocThuat(pdf.text);

    const sentences =
        tachCau(text);

    const paragraphs =
        taoParagraphTuCau(sentences);

    let output = "";

    paragraphs.forEach((p) => {

        output +=
            "\n" +
            "=".repeat(80) +
            "\n";

        output +=
            `PARAGRAPH ${p.paragraphIndex}\n\n`;

        output +=
            p.sentences.join(" ");

        output += "\n\n";
    });

    fs.writeFileSync(
        "paragraph_preview.txt",
        output,
        "utf8"
    );

})();