const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Counter = require('../models/counter');

const BaoCao = require('../models/bao_cao');
const KetQuaKiemTra = require('../models/ket_qua_kiem_tra');
const SinhVien = require('../models/sinh_vien');

// 1. IMPORT CÁC HÀM TIỀN XỬ LÝ VÀ ĐỌC TEXT
const { trichXuatVanBan } = require('../utils/trich_xuat_text');

// 2. IMPORT HÀM ĐẨY TASK VÀO HÀNG ĐỢI REDIS
const { addPlagiarismTask } = require('../workers/queue');

// Cấu hình Multer lưu file upload vào thư mục uploads/
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const upload2Dir = path.resolve(__dirname, '../upload2');
if (!fs.existsSync(upload2Dir)) {
    fs.mkdirSync(upload2Dir, { recursive: true });
}
async function taoMaBaoCaoMoi() {

    const counter =
        await Counter.findOneAndUpdate(
            {
                _id: 'bao_cao'
            },
            {
                $inc: {
                    seq: 1
                }
            },
            {
                new: true,
                upsert: true
            }
        );

    return `BC${counter.seq}`;
}

// API GET: Lấy danh sách báo cáo có lọc theo id_sinh_vien
router.get('/', async (req, res) => {
    try {
        const { id_sinh_vien } = req.query;
        let query = {};

        if (id_sinh_vien) {
            query.id_sinh_vien = id_sinh_vien;
        }

        const danhSach = await BaoCao.find(query)
            .select(
                'id_bao_cao tieu_de ngay_tai_len trang_thai id_sinh_vien'
            )
            .sort({ ngay_tai_len: -1 })
            .lean();

        const dsIdBaoCao =
            danhSach.map(
                bc => bc.id_bao_cao
            );
        if (dsIdBaoCao.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const dsKetQua =
            await KetQuaKiemTra.find({
                id_bao_cao: {
                    $in: dsIdBaoCao
                }
            })
                .select(
                    'id_bao_cao ti_le_trung_lap trang_thai'
                )
                .lean();

        const mapKetQua =
            new Map();

        for (const item of dsKetQua) {

            mapKetQua.set(
                item.id_bao_cao,
                item
            );

        }

        const ketQuaHoanChinh =
            danhSach.map(bc => {

                const ketQuaCheck =
                    mapKetQua.get(
                        bc.id_bao_cao
                    );

                return {

                    ...bc,

                    do_trung_lap:
                        (
                            ketQuaCheck &&
                            ketQuaCheck.trang_thai ===
                            "hoan_thanh"
                        )
                            ? ketQuaCheck.ti_le_trung_lap
                            : null,

                    trang_thai:
                        (
                            ketQuaCheck &&
                            ketQuaCheck.trang_thai ===
                            "hoan_thanh"
                        )
                            ? "Đã xử lý"
                            : "Đang xử lý"

                };

            });

        return res.json({ success: true, data: ketQuaHoanChinh });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// API POST /upload
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { id_sinh_vien } = req.body;

        if (!file) {
            return res.status(400).json({ success: false, message: 'Chưa có file nào được tải lên!' });
        }

        const originalName = file.originalname;
        const tieuDe = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        const tepTin = path.resolve(file.path).replace(/\\/g, '/');
        const ext = path.extname(originalName).toLowerCase();

        if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx' && file.mimetype !== 'text/plain') {
            if (fs.existsSync(tepTin)) fs.unlinkSync(tepTin);
            return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .doc, .docx, .pdf hoặc text!' });
        }

        const idBaoCao =
            await taoMaBaoCaoMoi();

        let rawText = "";
        if (file.mimetype === 'text/plain') {
            rawText = fs.readFileSync(file.path, 'utf-8');
        } else {
            rawText = await trichXuatVanBan(file.path);
        }

        if (!rawText || rawText.trim() === '') {
            if (fs.existsSync(tepTin)) fs.unlinkSync(tepTin);
            return res.status(400).json({ success: false, message: 'File rỗng hoặc không đọc được văn bản!' });
        }

        const newBaoCao = new BaoCao({
            id_bao_cao: idBaoCao,
            tieu_de: tieuDe,
            loai_bao_cao: req.body.loaiBaoCao || "Báo cáo kiểm tra",
            tep_tin: tepTin,
            noi_dung_tien_xu_ly: rawText,
            do_trung_lap: null,
            ngay_tai_len: new Date(),
            trang_thai: "Đang xử lý",
            id_sinh_vien: id_sinh_vien || "",
            mau_kiem_tra: false
        });

        const savedBaoCao = await newBaoCao.save();

        await addPlagiarismTask({
            idBaoCaoMoi: idBaoCao,

            noiDungVanBan: rawText,

            idSinhVien: id_sinh_vien || null
        });

        return res.status(200).json({
            success: true,
            message: "Đã tiếp nhận tài liệu và đang xử lý ngầm qua Redis!",
            data: savedBaoCao
        });

    } catch (error) {
        console.error("Lỗi server khi upload:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// API GET /api/bao-cao/chi-tiet/:id
router.get('/chi-tiet/:id', async (req, res) => {
    try {
        const baoCaoId = req.params.id;

        let baoCao = await BaoCao.findOne({ id_bao_cao: baoCaoId });
        if (!baoCao && baoCaoId.match(/^[0-9a-fA-F]{24}$/)) {
            baoCao = await BaoCao.findById(baoCaoId);
        }

        if (!baoCao) {
            return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo!" });
        }

        const ketQuaKiemTra = await KetQuaKiemTra.findOne({ id_bao_cao: baoCao.id_bao_cao }).lean();
        const daHoanThanh = baoCao.do_trung_lap !== undefined && baoCao.do_trung_lap !== null;

        return res.status(200).json({
            success: true,
            hoan_thanh: daHoanThanh,
            data: {
                ...baoCao.toObject(),
                ket_qua_chi_tiet: ketQuaKiemTra || null
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết báo cáo:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// API DELETE /api/bao-cao/:id
router.delete('/:id', async (req, res) => {
    try {
        const baoCaoId = req.params.id;

        let deletedBaoCao = await BaoCao.findOneAndDelete({ id_bao_cao: baoCaoId });
        if (!deletedBaoCao && baoCaoId.match(/^[0-9a-fA-F]{24}$/)) {
            deletedBaoCao = await BaoCao.findByIdAndDelete(baoCaoId);
        }

        if (!deletedBaoCao) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu cần xóa!" });
        }

        if (deletedBaoCao.tep_tin && fs.existsSync(deletedBaoCao.tep_tin)) {
            try {
                fs.unlinkSync(deletedBaoCao.tep_tin);
            } catch (errFile) {
                console.error("Không thể xóa tệp vật lý:", errFile);
            }
        }

        // Xóa luôn file bôi màu trong upload2 nếu có
        const highlightedPdfPath = path.join(upload2Dir, `${deletedBaoCao.id_bao_cao}.pdf`);
        if (fs.existsSync(highlightedPdfPath)) {
            try { fs.unlinkSync(highlightedPdfPath); } catch (e) { }
        }

        await KetQuaKiemTra.deleteMany({ id_bao_cao: deletedBaoCao.id_bao_cao });

        return res.status(200).json({
            success: true,
            message: "Đã xóa thành công tài liệu và dữ liệu liên quan!"
        });

    } catch (error) {
        console.error("Lỗi khi xóa báo cáo:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/upload-khac', upload.single('file'), async (req, res) => {
    try {
        let inputId = req.body.id_sinh_vien;
        let idSinhVienChinhXac = inputId;

        if (inputId) {
            const thongTinSV = await SinhVien.findOne({
                $or: [{ id_sinh_vien: inputId }, { id_nguoi_dung: inputId }]
            }).lean();

            if (thongTinSV) {
                idSinhVienChinhXac = thongTinSV.id_sinh_vien;
            }
        }

        const baoCaoMoi = new BaoCao({
            id_sinh_vien: idSinhVienChinhXac,
            tieu_de: req.file ? req.file.originalname : "Tài liệu mới",
            tep_tin: req.file ? req.file.path : "",
            ngay_tai_len: new Date(),
            trang_thai: "Đang xử lý",
        });

        await baoCaoMoi.save();

        return res.json({ success: true, message: "Upload thành công", data: baoCaoMoi });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/tai-lieu-nop/:idNguoiDung', async (req, res) => {
    try {
        const idNguoiDung = req.params.idNguoiDung;

        const sinhVien = await SinhVien.findOne({
            $or: [{ id_nguoi_dung: idNguoiDung }, { id_sinh_vien: idNguoiDung }]
        }).lean();

        let danhSachIdCanTim = [idNguoiDung];
        if (sinhVien) {
            if (sinhVien.id_sinh_vien) danhSachIdCanTim.push(sinhVien.id_sinh_vien);
            if (sinhVien.id_nguoi_dung) danhSachIdCanTim.push(sinhVien.id_nguoi_dung);
        }

        danhSachIdCanTim = [...new Set(danhSachIdCanTim)];

        const danhSachBaoCao = await BaoCao.find({
            id_sinh_vien: { $in: danhSachIdCanTim }
        })
            .select(
                'id_bao_cao tieu_de ngay_tai_len trang_thai id_sinh_vien'
            )
            .sort({ ngay_tai_len: -1 })
            .lean();


        if (!danhSachBaoCao || danhSachBaoCao.length === 0) {
            return res.json({ success: true, data: [] });
        }
        const dsIdBaoCao =
            danhSachBaoCao.map(
                bc => bc.id_bao_cao
            );

        const dsKetQua =
            await KetQuaKiemTra.find({
                id_bao_cao: {
                    $in: dsIdBaoCao
                }
            })
                .select(
                    'id_bao_cao ti_le_trung_lap trang_thai'
                )
                .lean();

        const mapKetQua = new Map();

        for (const item of dsKetQua) {
            mapKetQua.set(
                item.id_bao_cao,
                item
            );
        }

        const ketQuaHoanChinh =
            danhSachBaoCao.map(bc => {

                const ketQuaCheck =
                    mapKetQua.get(
                        bc.id_bao_cao
                    );

                return {
                    ...bc,

                    do_trung_lap:
                        (
                            ketQuaCheck &&
                            ketQuaCheck.trang_thai === 'hoan_thanh'
                        )
                            ? ketQuaCheck.ti_le_trung_lap
                            : null,

                    trang_thai:
                        (
                            ketQuaCheck &&
                            ketQuaCheck.trang_thai === 'hoan_thanh'
                        )
                            ? 'Đã xử lý'
                            : 'Đang xử lý'
                };
            });

        return res.json({ success: true, data: ketQuaHoanChinh });
    } catch (error) {
        console.error("Lỗi API tai-lieu-nop:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/tai-xuong/:id_bao_cao', async (req, res) => {
    try {
        const { id_bao_cao } = req.params;

        const baoCao = await BaoCao.findOne({ id_bao_cao: id_bao_cao });
        if (!baoCao || !baoCao.tep_tin) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin tệp tin trong cơ sở dữ liệu!"
            });
        }

        const filePath = path.resolve(baoCao.tep_tin);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "Tệp tin không tồn tại trên hệ thống lưu trữ của server!"
            });
        }

        return res.download(filePath);

    } catch (error) {
        console.error("Lỗi khi tải xuống tệp tin:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi tải xuống tệp tin",
            error: error.message
        });
    }
});

// =========================================================================
// ROUTE DUY NHẤT TRẢ VỀ FILE PDF ĐÃ BÔI MÀU (CHO IFRAME XEM CHI TIẾT)
// =========================================================================
router.get('/chi-tiet/:id/document', async (req, res) => {
    try {
        const reportId = req.params.id; // Có thể là id_bao_cao (BC688) hoặc _id MongoDB

        let baoCao = await BaoCao.findOne({ id_bao_cao: reportId });
        if (!baoCao && reportId.match(/^[0-9a-fA-F]{24}$/)) {
            baoCao = await BaoCao.findById(reportId);
        }

        const actualId = baoCao ? baoCao.id_bao_cao : reportId;

        // Ưu tiên 1: Tìm file PDF bôi màu trong thư mục upload2 theo mã chuẩn id_bao_cao
        let filePath = path.join(upload2Dir, `${actualId}.pdf`);

        // Nếu không thấy, thử tìm theo reportId trực tiếp trên URL
        if (!fs.existsSync(filePath)) {
            const altPath = path.join(upload2Dir, `${reportId}.pdf`);
            if (fs.existsSync(altPath)) {
                filePath = altPath;
            }
        }

        // Nếu vẫn không có file bôi màu trong upload2, kiểm tra xem worker đã hoàn tất chưa hay trả về 404
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: `File PDF bôi màu cho báo cáo ${reportId} chưa được khởi tạo hoặc đang trong tiến trình xử lý!`
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
        return res.sendFile(filePath);

    } catch (error) {
        console.error("Lỗi khi lấy file document:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;