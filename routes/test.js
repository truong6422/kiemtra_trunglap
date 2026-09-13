const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Hàm gọi Python xử lý file PDF trả về mảng các câu sạch sẽ
function getCleanSentencesFromPDF(pdfFilePath) {
    return new Promise((resolve, reject) => {
        // Lùi lại 1 cấp thư mục từ routes/ để ra thư mục gốc tìm pdf_extractor.py
        const pythonScript = path.join(__dirname, '../pdf_extractor.py');
        const pyProcess = spawn('python', [pythonScript, pdfFilePath]);

        let resultData = '';
        let errorData = '';

        pyProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pyProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python error: ${errorData}`));
            } else {
                try {
                    const sentences = JSON.parse(resultData);
                    if (sentences.error) {
                        reject(new Error(sentences.error));
                    } else {
                        resolve(sentences);
                    }
                } catch (e) {
                    reject(new Error(`JSON Parse Error: ${e.message} - Raw: ${resultData}`));
                }
            }
        });
    });
}

// Tạo route kiểm tra bóc tách file PDF cụ thể của bạn
router.get('/convert-pdf-text', async (req, res) => {
    try {
        // Trỏ thẳng đến file 1800294.pdf trong thư mục restructuring_data/DATN/
        const pdfPath = path.join(__dirname, '../restructuring_data/DATN/1800294.pdf');

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ success: false, message: "Không tìm thấy file PDF tại đường dẫn này!" });
        }

        console.log("Đang tiến hành bóc tách file:", pdfPath);
        const sentences = await getCleanSentencesFromPDF(pdfPath);

        // (Tùy chọn) Lưu ra một file .txt xem thử kết quả giống như file word chưa
        const outputTxtPath = path.join(__dirname, '../sentence_line_output.txt');
        fs.writeFileSync(outputTxtPath, sentences.join('\n'), 'utf8');

        res.json({ 
            success: true, 
            totalSentences: sentences.length, 
            sampleSentences: sentences.slice(0, 5), // Xem trước 5 câu đầu
            message: "Đã trích xuất và chuẩn hóa câu thành công không bị lỗi ngắt dòng!"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;