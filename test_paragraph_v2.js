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

    console.log(
        "Sentences:",
        sentences.length
    );

    console.log(
        "Paragraphs:",
        paragraphs.length
    );

    let output = "";

    for (const p of paragraphs) {

        output += "\n";
        output += "=".repeat(80);
        output += "\n";

        output += `PARAGRAPH ${p.paragraphIndex}\n\n`;

        p.sentences.forEach(
            (s, idx) => {

                output +=
                    `[${idx + 1}] ${s}\n`;

            }
        );

        output += "\n";
    }

    fs.writeFileSync(
        "paragraph_mapping_v2.txt",
        output,
        "utf8"
    );

})();