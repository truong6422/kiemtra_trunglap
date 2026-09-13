const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function convertFolderDirectly() {
    const uploadsDir = path.join(__dirname, 'uploads');
    const upload2Dir = path.join(__dirname, 'upload2');

    // Đường dẫn chuẩn xác tới file chạy của LibreOffice trên Windows
    const sofficePath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';

    if (!fs.existsSync(upload2Dir)) {
        fs.mkdirSync(upload2Dir, { recursive: true });
    }

    if (!fs.existsSync(sofficePath)) {
        console.error("❌ Không tìm thấy phần mềm LibreOffice tại đường dẫn:", sofficePath);
        return;
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`📂 Tổng số mục trong uploads: ${files.length}`);

    for (const file of files) {
        // BỎ QUA các file tạm do Word tự sinh ra (bắt đầu bằng ~$)
        if (file.startsWith('~$')) {
            continue;
        }

        let ext = path.extname(file).toLowerCase();
        if (ext === '.docx' || ext === '.doc') {
            let originalPath = path.join(uploadsDir, file);
            let pdfFileName = file.replace(/\.docx?$/i, '.pdf');
            let targetPdfPath = path.join(upload2Dir, pdfFileName);

            // Nếu file PDF chưa có trong upload2 thì tiến hành convert
            if (!fs.existsSync(targetPdfPath)) {
                try {
                    console.log(`⏳ Đang convert: ${file} -> ${pdfFileName}`);
                    
                    // Gọi trực tiếp lệnh hệ thống trỏ thẳng tới soffice.exe để convert cực kỳ ổn định
                    const command = `"${sofficePath}" --headless --convert-to pdf "${originalPath}" --outdir "${upload2Dir}"`;
                    execSync(command, { stdio: 'ignore' });

                    console.log(`✅ Thành công: ${pdfFileName}`);
                } catch (error) {
                    console.error(`❌ Lỗi convert file ${file}`);
                }
            } else {
                console.log(`ℹ️ Đã có sẵn PDF: ${pdfFileName}`);
            }
        }
    }
    console.log("🎉 Hoàn tất toàn bộ tiến trình chuyển đổi!");
    process.exit();
}

convertFolderDirectly();