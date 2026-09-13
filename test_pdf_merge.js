const fs = require('fs');
const mongoose = require('mongoose');

const BaoCao =
    require('./models/bao_cao');

async function run() {

    await mongoose.connect(
        'mongodb://localhost:27017/KiemTraTrungLap'
    );

    const pdf =
        await BaoCao.findOne({
            id_bao_cao: 'BC228'
        }).lean();

    if (!pdf) {

        console.log(
            'Khong tim thay PDF'
        );

        process.exit(1);

    }

    const text =
        pdf.noi_dung_tien_xu_ly || '';

    const lines =
        text
            .replace(/\r/g, '')
            .split('\n');

    const merged = [];

    for (const rawLine of lines) {

        const current =
            rawLine.trim();

        if (!current) {
            continue;
        }

        if (
            merged.length === 0
        ) {

            merged.push(current);
            continue;

        }

        const previous =
            merged[
                merged.length - 1
            ];

        const prevEnd =
            /[.!?:;]$/.test(
                previous
            );

        const nextStartUpper =
            /^[A-ZÀ-Ỹ]/.test(
                current
            );

        if (

            !prevEnd

            &&

            !nextStartUpper

        ) {

            merged[
                merged.length - 1
            ] +=
                ' ' + current;

        } else {

            merged.push(current);

        }

    }

    fs.writeFileSync(
        'pdf_lines_original.txt',
        lines.join('\n'),
        'utf8'
    );

    fs.writeFileSync(
        'pdf_lines_merged.txt',
        merged.join('\n'),
        'utf8'
    );

    console.log(
        'ORIGINAL:',
        lines.length
    );

    console.log(
        'MERGED:',
        merged.length
    );

    console.log(
        'DONE'
    );

    process.exit(0);

}

run();