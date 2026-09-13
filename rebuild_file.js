const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BaoCao = require('./models/bao_cao');
const { trichXuatVanBan } = require('./utils/trich_xuat_text');

const {
    locNoiDungHocThuat
} = require('./utils/tien_xu_ly');

async function rebuildFile() {

    try {

        await mongoose.connect(
            'mongodb://localhost:27017/KiemTraTrungLap'
        );

        console.log('✅ Đã kết nối MongoDB');

        const reports = await BaoCao.find({
            mau_kiem_tra: true
        });

        console.log(
            `📚 Tìm thấy ${reports.length} báo cáo mẫu`
        );

        const debugDir = path.join(
            __dirname,
            'debug_output'
        );

        if (!fs.existsSync(debugDir)) {

            fs.mkdirSync(
                debugDir,
                { recursive: true }
            );
        }

        for (const report of reports) {

            try {

                let text =
                    await trichXuatVanBan(
                        report.tep_tin
                    );

                text =
                    (text || '')
                        .replace(/\r/g, '')
                        .replace(/\t/g, ' ')
                        .replace(/\u00A0/g, ' ')
                        .replace(/[ ]{2,}/g, ' ')
                        .trim();

                // -------------------------------------------------
                // PDF -> chuẩn hóa
                // WORD -> giữ nguyên
                // -------------------------------------------------

                const ext =
                    path.extname(
                        report.tep_tin
                    ).toLowerCase();

                console.log(
                    `📄 ${report.id_bao_cao} | ${ext}`
                );

                if (ext === '.pdf') {

                    fs.writeFileSync(
                        path.join(
                            debugDir,
                            `${report.id_bao_cao}_pdf.txt`
                        ),
                        text,
                        'utf8'
                    );
                }

                // -------------------------------------------------
                // Lọc phần học thuật
                // -------------------------------------------------

                const hocThuat =
                    locNoiDungHocThuat(text);

                if (hocThuat.trim()) {
                    text = hocThuat;
                }

                fs.writeFileSync(
                    path.join(
                        debugDir,
                        `${report.id_bao_cao}.txt`
                    ),
                    text,
                    'utf8'
                );

                await BaoCao.updateOne(
                    {
                        _id: report._id
                    },
                    {
                        $set: {
                            noi_dung_tien_xu_ly: text
                        }
                    }
                );

                console.log(
                    `✅ ${report.id_bao_cao} -> ${text.length} ký tự`
                );

            }
            catch (error) {

                console.error(
                    `❌ Lỗi xử lý ${report.id_bao_cao}`,
                    error
                );
            }
        }

        console.log(
            '🎉 Rebuild hoàn tất'
        );

        process.exit(0);

    }
    catch (err) {

        console.error(err);

        process.exit(1);
    }
}

rebuildFile();