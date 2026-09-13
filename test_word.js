const fs = require('fs');

const {
    locNoiDungHocThuat,
    tachCau
} = require('./utils/tien_xu_ly');

const rawText = fs.readFileSync(
    './debug_output/BC234.txt',
    'utf8'
);

const noiDung =
    locNoiDungHocThuat(rawText);

const sentences =
    tachCau(noiDung);

fs.writeFileSync(
    'BC234_sentences.txt',

    'TIME=' + Date.now() + '\n\n' +

    sentences
        .map(
            (s, i) =>
                `[${i + 1}] ${s}`
        )
        .join('\n\n'),

    'utf8'
);

console.log(
    'WORD SENTENCES:',
    sentences.length
);