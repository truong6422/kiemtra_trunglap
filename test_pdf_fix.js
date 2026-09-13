const fs = require('fs');

const {
    chuanHoaPdfText
} = require('./utils/tien_xu_ly');

const text = fs.readFileSync(
    './debug_output/BC239.txt',
    'utf8'
);

const fixed =
    chuanHoaPdfText(text);

fs.writeFileSync(
    'debug_pdf_before.txt',
    text,
    'utf8'
);

fs.writeFileSync(
    'debug_pdf_after.txt',
    fixed,
    'utf8'
);

console.log('DONE');