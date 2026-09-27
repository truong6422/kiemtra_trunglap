const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

const DanhGia = require('../models/danh_gia');
const SinhVien = require('../models/sinh_vien');
const NguoiDung = require('../models/nguoi_dung');

// ============================================================
// CONSTANTS
// ============================================================

const SO_SAO_MIN = 1;
const SO_SAO_MAX = 5;

const MA_DANH_GIA_PREFIX = 'DG';

// ============================================================
// HELPER
// ============================================================

/**
 * Tạo mã đánh giá tự động: DG001, DG002, ...
 */
async function taoMaDanhGia() {
    const latest = await DanhGia.findOne({ id_danh_gia: /^DG/ })
        .sort({ _id: -1 })
        .select('id_danh_gia')
        .lean();

    let next = 1;
    if (latest && latest.id_danh_gia) {
        const cur = parseInt(latest.id_danh_gia.replace(MA_DANH_GIA_PREFIX, ''), 10);
        if (!isNaN(cur)) next = cur + 1;
    }

    // Tìm mã chưa tồn tại
    while (true) {
        const ma = MA_DANH_GIA_PREFIX + String(next).padStart(3, '0');
        const existed = await DanhGia.exists({ id_danh_gia: ma });
        if (!existed) return ma;
        next++;
    }
}

/**
 * Tra tên người dùng từ id_sinh_vien / id_nguoi_dung.
 */
async function layTenNguoiDung(id) {
    if (!id) return '';

    const sv = await SinhVien.findOne({
        $or: [{ id_sinh_vien: id }, { id_nguoi_dung: id }]
    }).select('ho_ten').lean();
    if (sv) return sv.ho_ten || '';

    const nd = await NguoiDung.findOne({ id_nguoi_dung: id })
        .select('ho_ten ten_dang_nhap').lean();
    if (nd) return nd.ho_ten || nd.ten_dang_nhap || '';

    return '';
}

// ============================================================
// POST /api/danh-gia
// Người dùng gửi đánh giá sau khi kiểm tra xong
// ============================================================

router.post('/', async (req, res) => {
    try {
        const { id_sinh_vien, id_kiem_tra, id_bao_cao, so_sao, binh_luan } = req.body;

        // Validate số sao
        const saoSo = Number(so_sao);
        if (!so_sao || isNaN(saoSo) || saoSo < SO_SAO_MIN || saoSo > SO_SAO_MAX) {
            return res.status(400).json({
                success: false,
                message: `Số sao phải từ ${SO_SAO_MIN} đến ${SO_SAO_MAX}!`
            });
        }

        const maDanhGia = await taoMaDanhGia();

        const danhGia = await DanhGia.create({
            id_danh_gia: maDanhGia,
            id_sinh_vien: id_sinh_vien || '',
            id_kiem_tra: id_kiem_tra || '',
            id_bao_cao: id_bao_cao || '',
            so_sao: saoSo,
            binh_luan: (binh_luan || '').trim(),
            ngay_danh_gia: new Date()
        });

        return res.status(201).json({
            success: true,
            message: 'Cảm ơn bạn đã đánh giá!',
            data: {
                id_danh_gia: danhGia.id_danh_gia,
                so_sao: danhGia.so_sao,
                binh_luan: danhGia.binh_luan,
                ngay_danh_gia: danhGia.ngay_danh_gia
            }
        });

    } catch (error) {
        console.error('Lỗi lưu đánh giá:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/danh-gia
// Lấy danh sách đánh giá (dùng cho admin/thống kê)
// Hỗ trợ filter: ?so_sao=5&id_sinh_vien=SV001&tu_ngay=...&den_ngay=...
// ============================================================

router.get('/', async (req, res) => {
    try {
        const { so_sao, id_sinh_vien, tu_ngay, den_ngay, page, limit } = req.query;

        const dieuKien = {};

        if (so_sao) {
            dieuKien.so_sao = Number(so_sao);
        }
        if (id_sinh_vien) {
            dieuKien.id_sinh_vien = id_sinh_vien;
        }
        if (tu_ngay || den_ngay) {
            dieuKien.ngay_danh_gia = {};
            if (tu_ngay) dieuKien.ngay_danh_gia.$gte = new Date(tu_ngay);
            if (den_ngay) dieuKien.ngay_danh_gia.$lte = new Date(den_ngay);
        }

        const trang = Math.max(1, parseInt(page || '1', 10));
        const soTrang = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
        const skip = (trang - 1) * soTrang;

        const [danhSach, tongSo] = await Promise.all([
            DanhGia.find(dieuKien)
                .sort({ ngay_danh_gia: -1 })
                .skip(skip)
                .limit(soTrang)
                .lean(),
            DanhGia.countDocuments(dieuKien)
        ]);

        // Tính điểm trung bình
        const trungBinhSao = tongSo > 0
            ? await DanhGia.aggregate([
                { $match: dieuKien },
                { $group: { _id: null, trung_binh: { $avg: '$so_sao' } } }
            ]).then(r => r[0] ? Math.round(r[0].trung_binh * 10) / 10 : 0)
            : 0;

        return res.json({
            success: true,
            tong_so: tongSo,
            trang_hien_tai: trang,
            tong_trang: Math.ceil(tongSo / soTrang),
            trung_binh_sao: trungBinhSao,
            data: danhSach
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách đánh giá:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/danh-gia/thong-ke
// Thống kê tổng quan: phân bổ sao, trung bình
// ============================================================

router.get('/thong-ke', async (req, res) => {
    try {
        const [phanBo, tongSo] = await Promise.all([
            DanhGia.aggregate([
                { $group: { _id: '$so_sao', so_luong: { $sum: 1 } } },
                { $sort: { _id: -1 } }
            ]),
            DanhGia.countDocuments()
        ]);

        const trungBinh = tongSo > 0
            ? await DanhGia.aggregate([
                { $group: { _id: null, avg: { $avg: '$so_sao' } } }
            ]).then(r => r[0] ? Math.round(r[0].avg * 10) / 10 : 0)
            : 0;

        // Đảm bảo đủ 5 mức sao (kể cả mức = 0)
        const phanBoDay = Array.from({ length: 5 }, (_, i) => {
            const sao = 5 - i;
            const found = phanBo.find(p => p._id === sao);
            return { so_sao: sao, so_luong: found ? found.so_luong : 0 };
        });

        return res.json({
            success: true,
            data: {
                tong_so_danh_gia: tongSo,
                trung_binh_sao: trungBinh,
                phan_bo_sao: phanBoDay
            }
        });

    } catch (error) {
        console.error('Lỗi thống kê đánh giá:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/danh-gia/xuat-excel
// Xuất toàn bộ đánh giá ra file Excel
// ============================================================

router.get('/xuat-excel', async (req, res) => {
    try {
        const { tu_ngay, den_ngay, so_sao } = req.query;

        const dieuKien = {};
        if (so_sao) dieuKien.so_sao = Number(so_sao);
        if (tu_ngay || den_ngay) {
            dieuKien.ngay_danh_gia = {};
            if (tu_ngay) dieuKien.ngay_danh_gia.$gte = new Date(tu_ngay);
            if (den_ngay) dieuKien.ngay_danh_gia.$lte = new Date(den_ngay);
        }

        const danhSach = await DanhGia.find(dieuKien)
            .sort({ ngay_danh_gia: -1 })
            .lean();

        // Tra tên người dùng hàng loạt
        const dsMa = [...new Set(danhSach.map(d => d.id_sinh_vien).filter(Boolean))];
        const bangTen = new Map();
        await Promise.all(dsMa.map(async (ma) => {
            const ten = await layTenNguoiDung(ma);
            bangTen.set(ma, ten);
        }));

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống kiểm tra trùng lặp';
        workbook.created = new Date();

        // ── Sheet 1: Danh sách đánh giá ──
        const sheetDanhSach = workbook.addWorksheet('Danh sách đánh giá');

        const mauTieuDe = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F4E79' }
        };
        const fontTieuDe = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

        sheetDanhSach.columns = [
            { header: 'Mã đánh giá', key: 'id_danh_gia', width: 14 },
            { header: 'Người đánh giá (ID)', key: 'id_sinh_vien', width: 20 },
            { header: 'Họ tên', key: 'ho_ten', width: 25 },
            { header: 'Mã kiểm tra', key: 'id_kiem_tra', width: 16 },
            { header: 'Mã báo cáo', key: 'id_bao_cao', width: 14 },
            { header: 'Số sao', key: 'so_sao', width: 10 },
            { header: 'Bình luận', key: 'binh_luan', width: 50 },
            { header: 'Ngày đánh giá', key: 'ngay_danh_gia', width: 22 }
        ];

        // Định dạng header
        sheetDanhSach.getRow(1).eachCell(cell => {
            cell.fill = mauTieuDe;
            cell.font = fontTieuDe;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });
        sheetDanhSach.getRow(1).height = 22;

        // Dữ liệu
        for (const dg of danhSach) {
            const row = sheetDanhSach.addRow({
                id_danh_gia: dg.id_danh_gia || '',
                id_sinh_vien: dg.id_sinh_vien || '',
                ho_ten: bangTen.get(dg.id_sinh_vien) || '',
                id_kiem_tra: dg.id_kiem_tra || '',
                id_bao_cao: dg.id_bao_cao || '',
                so_sao: dg.so_sao,
                binh_luan: dg.binh_luan || '',
                ngay_danh_gia: dg.ngay_danh_gia
                    ? new Date(dg.ngay_danh_gia).toLocaleString('vi-VN')
                    : ''
            });
            row.getCell('so_sao').alignment = { horizontal: 'center' };
        }

        // ── Sheet 2: Thống kê tổng quan ──
        const sheetThongKe = workbook.addWorksheet('Thống kê');

        const tongSo = danhSach.length;
        const tongSao = danhSach.reduce((t, d) => t + d.so_sao, 0);
        const trungBinh = tongSo > 0 ? Math.round((tongSao / tongSo) * 10) / 10 : 0;

        sheetThongKe.addRow(['Chỉ số', 'Giá trị']);
        sheetThongKe.getRow(1).eachCell(cell => {
            cell.fill = mauTieuDe;
            cell.font = fontTieuDe;
            cell.alignment = { horizontal: 'center' };
        });
        sheetThongKe.addRow(['Tổng số đánh giá', tongSo]);
        sheetThongKe.addRow(['Điểm trung bình', trungBinh]);

        sheetThongKe.addRow([]);
        sheetThongKe.addRow(['Số sao', 'Số lượt', 'Tỉ lệ (%)']);
        const headerRow = sheetThongKe.lastRow;
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
        });

        for (let sao = 5; sao >= 1; sao--) {
            const soLuong = danhSach.filter(d => d.so_sao === sao).length;
            const tiLe = tongSo > 0 ? Math.round((soLuong / tongSo) * 1000) / 10 : 0;
            sheetThongKe.addRow([`${sao} ⭐`, soLuong, `${tiLe}%`]);
        }

        sheetThongKe.columns = [
            { key: 'A', width: 20 },
            { key: 'B', width: 15 },
            { key: 'C', width: 15 }
        ];

        // Gửi file
        const tenFile = `danh_gia_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${tenFile}"`);

        await workbook.xlsx.write(res);
        return res.end();

    } catch (error) {
        console.error('Lỗi xuất Excel đánh giá:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
