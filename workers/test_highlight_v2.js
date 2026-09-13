const fs = require("fs");
const path = require("path");

const {
    PDFDocument,
    rgb
} = require("pdf-lib");

const {
    findTextInPdf
} = require(
    "./pdfSentenceMapper"
);

(async () => {

    try {

        const pdfPath =
            path.resolve(
                "./23_2200461_CaoVanHung.pdf"
            );

        const outputPath =
            path.resolve(
                "./test_highlight_v2.pdf"
            );

        const targetSentence =
            await findTextInPdf(

                pdfPath,

                "JM chưa tối ưu hóa kênh bán hàng trực tuyến , khiến việc mở rộng thị trường gặp nhiều hạn chế."

            );

        if (!targetSentence) {

            throw new Error(
                "KHONG TIM THAY CAU TREN PDF"
            );

        }

        console.log(
            "TIM THAY CAU:"
        );

        console.log(
            targetSentence.text
        );

        console.log(
            "PAGE:",
            targetSentence.page
        );

        console.log(
            "SO POSITIONS:",
            targetSentence.positions.length
        );

        const pdfBytes =
            fs.readFileSync(
                pdfPath
            );

        const pdfDoc =
            await PDFDocument.load(
                pdfBytes
            );

        const page =
            pdfDoc.getPage(
                targetSentence.page - 1
            );

        for (
    let i = 0;
    i < targetSentence.positions.length;
    i++
) {

    const pos =
        targetSentence.positions[i];

    let width =
        pos.width;

    // item cuối
    if (
        i ===
        targetSentence.positions.length - 1
    ) {

        const fullText =
            pos.text;

        const endText =
            "nhiều hạn chế.";

        if (
            fullText.includes(endText)
        ) {

            const ratio =
                endText.length /
                fullText.length;

            width =
                pos.width *
                ratio;

        }

    }

    page.drawRectangle({

        x: pos.x,

        y: pos.y,

        width,

        height:
            pos.height + 4,

        color:
            rgb(
                1,
                1,
                0
            ),

        opacity: 0.5

    });

}

        const outBytes =
            await pdfDoc.save();

        fs.writeFileSync(
            outputPath,
            outBytes
        );

        console.log(
            "✅ HIGHLIGHT THANH CONG"
        );

        console.log(
            outputPath
        );

    }
    catch (err) {

        console.error(
            "❌ LOI:",
            err
        );

    }

})();