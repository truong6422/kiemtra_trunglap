// test_sentence_mapping.js

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

    let sentenceIndex = 1;

    let bufferSentence = "";
    let startLine = null;

    const result = [];

    for (let i = 0; i < lines.length; i++) {

        const line = lines[i];

        if (startLine === null) {
            startLine = i;
        }

        bufferSentence += " " + line;

        const parts = bufferSentence.match(
            /[^.!?]+[.!?]+/g
        );

        if (parts) {

            let consumed = "";

            for (const sentence of parts) {

                consumed += sentence;

                result.push({
                    sentenceIndex,
                    startLine,
                    endLine: i,
                    content: sentence.trim()
                });

                sentenceIndex++;
            }

            bufferSentence =
                bufferSentence.substring(
                    consumed.length
                ).trim();

            if (!bufferSentence) {
                startLine = null;
            }
        }
    }

    fs.writeFileSync(
        "sentence_mapping.json",
        JSON.stringify(
            result,
            null,
            2
        ),
        "utf8"
    );

    console.log(
        "Sentences:",
        result.length
    );

})();
