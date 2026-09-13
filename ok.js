const fs = require("fs");
const pdfParse = require("pdf-parse");

const {
    locNoiDungHocThuat
} = require("./utils/tien_xu_ly");

(async () => {

    const pdf =
        await pdfParse(
            fs.readFileSync(
                "./kiem_thu/original/1800103.pdf"
            )
        );

    const text =
        locNoiDungHocThuat(pdf.text);

    console.log(
        text.substring(0, 5000)
    );

})();