const fs = require("fs");
const pdfParse = require("pdf-parse");

(async () => {

    const buffer =
        fs.readFileSync(
            "./kiem_thu/original/1800103.pdf"
        );

    const data =
        await pdfParse(buffer);

    const lines =
        data.text.split(/\r?\n/);

    let nonEmpty = 0;

    for (const line of lines) {

        if (line.trim()) {
            nonEmpty++;
        }
    }

    console.log(
        "Total lines:",
        lines.length
    );

    console.log(
        "Non empty lines:",
        nonEmpty
    );

})();