const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const libre = require('libreoffice-convert');
const PizZip = require('pizzip');
const { capNhatSoBaoCao } = require('../utils/cap_nhat_so_bao_cao');
const ThongKe =
    require('../models/thong_ke');
const ChiTietCauTrung =
    require('../models/chi_tiet_cau_trung');

const ChiTietDoanTrung =
    require('../models/chi_tiet_doan_trung');

const ChiTietDoanChapVa =
    require('../models/chi_tiet_doan_chap_va');

// Import hàm đẩy task vào hàng đợi Redis (đường dẫn trỏ đến file queue.js trong thư mục workers)
const { addPlagiarismTask } = require('../workers/queue');

const uploadsDir = path.resolve(__dirname, '../uploads');
const upload2Dir = path.resolve(__dirname, '../upload2');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(upload2Dir)) fs.mkdirSync(upload2Dir, { recursive: true });

if (process.platform === 'win32') {
    const libreOfficePaths = [
        'C:\\Program Files\\LibreOffice\\program',
        'C:\\Program Files (x86)\\LibreOffice\\program'
    ];
    for (const libreOfficePath of libreOfficePaths) {
        if (fs.existsSync(libreOfficePath)) {
            const currentPath = process.env.PATH || '';
            if (!currentPath.includes(libreOfficePath)) {
                process.env.PATH = libreOfficePath + ';' + currentPath;
            }
            break;
        }
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + extension);
    }
});
const upload = multer({ storage: storage });

const BaoCao = require('../models/bao_cao');
const KetQuaKiemTra = require('../models/ket_qua_kiem_tra');
const CauHinhHeThong = require('../models/cau_hinh_he_thong');

const { trichXuatVanBan } = require('../utils/trich_xuat_text');

async function timBaoCao(idBaoCao) {
    const dieuKien = { $or: [{ id_bao_cao: idBaoCao }] };
    if (/^[0-9a-fA-F]{24}$/.test(idBaoCao)) dieuKien.$or.push({ _id: idBaoCao });
    return await BaoCao.findOne(dieuKien);
}

// ============================================================================
// API POST: UPLOAD VÀ ĐẨY TASK VÀO REDIS QUEUE
// ============================================================================
router.post('/upload-and-check', upload.single('fileBaoCao'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng tải lên file!' });
        }

        const duongDanFile = path.resolve(req.file.path).replace(/\\/g, '/');
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx') {
            if (fs.existsSync(duongDanFile)) fs.unlinkSync(duongDanFile);
            return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .doc, .docx hoặc .pdf!' });
        }

        const tieuDeBaoCao = req.body.tieuDe || path.basename(req.file.originalname, ext);
        const loaiBaoCao = req.body.loaiBaoCao || 'Đồ án';
        const idSinhVien = req.body.idSinhVien || req.user?.id_sinh_vien || '';

        const latestBaoCao =
            await BaoCao
                .findOne({
                    id_bao_cao: /^BC/
                })
                .sort({
                    _id: -1
                })
                .lean();

        let nextNumber = 1;

        if (
            latestBaoCao &&
            latestBaoCao.id_bao_cao
        ) {
            const currentNumber =
                parseInt(
                    latestBaoCao.id_bao_cao.replace(
                        'BC',
                        ''
                    ),
                    10
                );

            if (!isNaN(currentNumber)) {
                nextNumber =
                    currentNumber + 1;
            }
        }

        let idBaoCaoMoi;

        while (true) {

            idBaoCaoMoi =
                'BC' +
                String(nextNumber)
                    .padStart(3, '0');

            const existed =
                await BaoCao.exists({
                    id_bao_cao:
                        idBaoCaoMoi
                });

            if (!existed) {
                break;
            }

            nextNumber++;
        }

        const vanBanTho = await trichXuatVanBan(duongDanFile);
        console.log("ĐỘ DÀI VĂN BẢN:", vanBanTho.length);
        if (
            !vanBanTho ||
            vanBanTho.trim().length === 0
        ) {
            if (fs.existsSync(duongDanFile)) {
                fs.unlinkSync(duongDanFile);
            }

            return res.status(400).json({
                success: false,
                message: 'File rỗng hoặc không đọc được văn bản!'
            });
        }

        // 1. Lưu bản ghi vào MongoDB với trạng thái 'Đang xử lý'
        await BaoCao.create({
            id_bao_cao: idBaoCaoMoi,
            tieu_de: tieuDeBaoCao,
            loai_bao_cao: loaiBaoCao,
            tep_tin: duongDanFile,
            noi_dung_tien_xu_ly: vanBanTho,
            ngay_tai_len: new Date(),
            trang_thai: 'Đang xử lý',
            id_sinh_vien: idSinhVien,
            mau_kiem_tra: false
        });

        // 1b. Đếm lại số báo cáo cho sinh viên. Không để lỗi ở đây làm hỏng
        // việc nộp bài: tài liệu đã lưu rồi, con số thống kê có thể đếm lại sau.
        try {
            await capNhatSoBaoCao(idSinhVien);
        } catch (e) {
            console.error('Không cập nhật được số báo cáo của sinh viên:', e.message);
        }

        // 2. Đẩy task vào hàng đợi Redis để file worker.js ngầm tự bốc đi xử lý
        await addPlagiarismTask({
            idBaoCaoMoi: idBaoCaoMoi,

            noiDungVanBan: vanBanTho,

            idSinhVien: idSinhVien || null
        });

        // 3. Phản hồi ngay lập tức cho client
        return res.status(202).json({
            success: true,
            message: 'Đã tiếp nhận file! Hệ thống đang xử lý kiểm tra ngầm qua Redis.',
            data: {
                id_bao_cao: idBaoCaoMoi,
                tieu_de_bao_cao: tieuDeBaoCao,
                trang_thai: 'Đang xử lý'
            }
        });

    } catch (loi) {
        console.error('❌ Lỗi API:', loi);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống', chi_tiet_loi: loi.message });
    }
});

// Giữ nguyên các route GET chi tiết
router.get('/chi-tiet/:idBaoCao', async (req, res) => {

    try {

        const { idBaoCao } = req.params;

        const baoCao =
            await timBaoCao(idBaoCao);

        if (!baoCao) {

            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo!'
            });

        }

        const ketQua =
            await KetQuaKiemTra.findOne({
                id_bao_cao:
                    baoCao.id_bao_cao
            }).lean();

        const thongKe =
            await ThongKe.findOne({
                id_bao_cao:
                    baoCao.id_bao_cao
            }).lean();

        const dsChiTietCauTrung =
            await ChiTietCauTrung.find({
                id_bao_cao:
                    baoCao.id_bao_cao
            }).lean();

        const dsChiTietDoanTrung =
            await ChiTietDoanTrung.find({
                id_bao_cao:
                    baoCao.id_bao_cao
            }).lean();

        const dsChiTietDoanChapVa =
            await ChiTietDoanChapVa.find({
                id_bao_cao:
                    baoCao.id_bao_cao
            }).lean();

        return res.json({

            success: true,

            data: {

                baoCao,

                ketQua,

                thongKe,

                chiTietCauTrung:
                    dsChiTietCauTrung,

                chiTietDoanTrung:
                    dsChiTietDoanTrung,

                chiTietDoanChapVa:
                    dsChiTietDoanChapVa

            }

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

});
// Thêm route này vào cuối file routes/kiemtra.js
router.get('/chi-tiet/:id/document', async (req, res) => {
    try {
        const reportId = req.params.id; // VD: BC675 hoặc BC674

        // Dùng hàm timBaoCao đã có sẵn trong file để tìm thông tin báo cáo trong MongoDB
        const baoCao = await timBaoCao(reportId);

        // Xác định tên file PDF trong thư mục upload2:
        // Ưu tiên lấy theo id_bao_cao (ví dụ BC675.pdf), nếu không có thì lấy theo tham số truyền vào
        const fileName = baoCao && baoCao.id_bao_cao ? `${baoCao.id_bao_cao}.pdf` : `${reportId}.pdf`;
        const filePath = path.join(upload2Dir, fileName);

        // Kiểm tra xem file PDF đã tồn tại trong upload2 chưa
        if (!fs.existsSync(filePath)) {
            // Thử tìm theo định dạng gốc hoặc _id nếu có
            const altFilePath = path.join(upload2Dir, `${reportId}.pdf`);
            if (fs.existsSync(altFilePath)) {
                res.setHeader('Content-Type', 'application/pdf');
                return res.sendFile(altFilePath);
            }

            return res.status(404).json({
                success: false,
                message: `File PDF bôi màu cho báo cáo ${reportId} chưa được tạo!`
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
        return res.sendFile(filePath);

    } catch (error) {
        console.error("Lỗi lấy file document:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;