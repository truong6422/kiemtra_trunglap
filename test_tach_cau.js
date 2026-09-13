const fs = require('fs');
const mongoose = require('mongoose');

const BaoCao =
    require('./models/bao_cao');

const {
    tachCau
} = require('./utils/tien_xu_ly');

async function run() {

    await mongoose.connect(
        'mongodb://localhost:27017/KiemTraTrungLap'
    );

    const idDocx = 'BC227';
    const idPdf = 'BC228';

    const docx =
        await BaoCao.findOne({
            id_bao_cao: idDocx
        }).lean();

    const pdf =
        await BaoCao.findOne({
            id_bao_cao: idPdf
        }).lean();

    if (!docx || !pdf) {
        console.log('Không tìm thấy báo cáo');
        process.exit(1);
    }

    const cauDocx =
        tachCau(
            docx.noi_dung_tien_xu_ly || ''
        );

    const cauPdf =
        tachCau(
            pdf.noi_dung_tien_xu_ly || ''
        );

    console.log(
        'DOCX:',
        cauDocx.length
    );

    console.log(
        'PDF:',
        cauPdf.length
    );

    fs.writeFileSync(
        'docx_sentences.txt',
        cauDocx.map(
            (cau, index) =>
                `${index + 1}|${cau}`
        ).join('\n'),
        'utf8'
    );

    fs.writeFileSync(
        'pdf_sentences.txt',
        cauPdf.map(
            (cau, index) =>
                `${index + 1}|${cau}`
        ).join('\n'),
        'utf8'
    );

    const diff = [];

    const max =
        Math.max(
            cauDocx.length,
            cauPdf.length
        );

    for (
        let i = 0;
        i < max;
        i++
    ) {

        const docxLine =
            cauDocx[i] || '';

        const pdfLine =
            cauPdf[i] || '';

        if (
            docxLine !== pdfLine
        ) {

            diff.push(
                [
                    `INDEX: ${i + 1}`,
                    `DOCX: ${docxLine}`,
                    `PDF : ${pdfLine}`,
                    '---------------------'
                ].join('\n')
            );

        }

    }

    fs.writeFileSync(
        'tach_cau_diff.txt',
        diff.join('\n'),
        'utf8'
    );

    console.log(
        'DONE'
    );

    process.exit(0);

}

run();