const fs = require('fs');
const mongoose = require('mongoose');

const ChiSoCau =
    require('./models/chi_so_cau');

async function run() {

    await mongoose.connect(
        'mongodb://localhost:27017/KiemTraTrungLap'
    );

    const idMau =
        'BC227';

    const idTest =
        'BC228';

    const sample =
        await ChiSoCau.find({
            id_bao_cao: idMau
        })
            .sort({
                sentenceIndex: 1
            })
            .lean();

    const test =
        await ChiSoCau.find({
            id_bao_cao: idTest
        })
            .sort({
                sentenceIndex: 1
            })
            .lean();

    fs.writeFileSync(
        'sample.txt',
        sample.map(
            x =>
                `${x.sentenceIndex}|${x.sentence_hash}|${x.clean_content}`
        ).join('\n'),
        'utf8'
    );

    fs.writeFileSync(
        'test.txt',
        test.map(
            x =>
                `${x.sentenceIndex}|${x.sentence_hash}|${x.clean_content}`
        ).join('\n'),
        'utf8'
    );

    const diff = [];

    const len =
        Math.max(
            sample.length,
            test.length
        );

    for (
        let i = 0;
        i < len;
        i++
    ) {

        const a =
            sample[i];

        const b =
            test[i];

        if (!a || !b) {

            diff.push(
                `MISSING: ${i}`
            );

            continue;

        }

        if (
            a.sentence_hash !==
            b.sentence_hash
        ) {

            diff.push(
                [
                    'INDEX: ' + i,
                    'MAU : ' + a.clean_content,
                    'TEST: ' + b.clean_content,
                    '----------------------'
                ].join('\n')
            );

        }

    }

    fs.writeFileSync(
        'diff.txt',
        diff.join('\n'),
        'utf8'
    );

    console.log(
        'DONE'
    );

    process.exit(0);

}

run();
