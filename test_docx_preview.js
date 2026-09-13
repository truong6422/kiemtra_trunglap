const mammoth = require("mammoth");

(async () => {

    const result =
        await mammoth.extractRawText({
            path: "./kiem_thu/original/1800103.docx"
        });

    const paragraphs =
        result.value
            .split(/\r?\n/);

    paragraphs
        .slice(0, 80)
        .forEach((p, i) => {

            console.log(
                `[${i}] =>`,
                JSON.stringify(p)
            );

        });

})();