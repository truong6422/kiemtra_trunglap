const fs = require('fs');

function detectParagraphs(text) {
    if (!text) return [];

    const lines = text
        .replace(/\r/g, '')
        .split('\n')
        .map(x => x.trim());

    const paragraphs = [];

    let currentParagraph = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line) {
            continue;
        }

        // Đoạn đầu tiên
        if (!currentParagraph) {
            currentParagraph = line;
            continue;
        }

        const prevEndsSentence =
            /[.!?]$/.test(currentParagraph);

        const currentLooksLikeParagraphStart =
            /^[A-ZÀÁẠẢÃĂẮẰẶẲẴÂẤẦẬẨẪĐÈÉẸẺẼÊẾỀỆỂỄÌÍỊỈĨÒÓỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠÙÚỤỦŨƯỨỪỰỬỮỲÝỴỶỸ]/.test(line)
            &&
            line.split(/\s+/).length >= 5;

        const isHeading =
            /^chương\s+\d+/i.test(line) ||
            /^mở đầu$/i.test(line) ||
            /^kết luận$/i.test(line);

        if (
            prevEndsSentence &&
            currentLooksLikeParagraphStart &&
            !isHeading
        ) {
            paragraphs.push(currentParagraph);

            currentParagraph = line;
        } else {
            currentParagraph += ' ' + line;
        }
    }

    if (currentParagraph) {
        paragraphs.push(currentParagraph);
    }

    return paragraphs;
}

// ================== TEST ==================

const path = require('path');

const filePath = path.join(
    __dirname,
    'kiem_thu',
    'raw_1',
    '1800103_pdf_raw.txt'
);

console.log('PATH:', filePath);
console.log('EXISTS:', fs.existsSync(filePath));

const rawText = fs.readFileSync(
    filePath,
    'utf8'
);

const paragraphs = detectParagraphs(rawText);

console.log(
    '\n===== DANH SACH DOAN =====\n'
);

paragraphs.forEach((p, index) => {

    console.log(
        '\n------------------------'
    );

    console.log(
        `DOAN ${index + 1}`
    );

    console.log(
        '------------------------'
    );

    console.log(p);

});