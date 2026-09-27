const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

const ThongKe = require('../models/thong_ke');
const ChiTietCauTrung = require('../models/chi_tiet_cau_trung');
const ChiTietDoanTrung = require('../models/chi_tiet_doan_trung');
const ChiTietDoanChapVa = require('../models/chi_tiet_doan_chap_va');
const BaoCao = require('../models/bao_cao');

// ============================================================
// HELPERS – Định dạng Excel
// ============================================================

const MAU_TIEU_DE_CHINH = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
const MAU_TIEU_DE_PHU   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
const MAU_HANG_CHAN     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };

const FONT_TIEU_DE = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const VIEN_MONG    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

function dinhDangHeader(row) {
    row.height = 22;
    row.eachCell(cell => {
        cell.fill  = MAU_TIEU_DE_CHINH;
        cell.font  = FONT_TIEU_DE;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = VIEN_MONG;
    });
}

function dinhDangDuLieu(row, isEven) {
    if (isEven) {
        row.eachCell(cell => {
            cell.fill = MAU_HANG_CHAN;
            cell.border = VIEN_MONG;
        });
    } else {
        row.eachCell(cell => {
            cell.border = VIEN_MONG;
        });
    }
}

function formatPhanTram(val) {
    if (val == null || isNaN(val)) return '0%';
    return `${Math.round(val * 10) / 10}%`;
}

function formatDoPhanTram(val) {
    // val là số 0–1 (cosine, jaccard, winnowing)
    if (val == null || isNaN(val)) return '0%';
    return `${Math.round(val * 1000) / 10}%`;
}

// ============================================================
// GET /api/xuat-excel/:id_bao_cao
// Xuất Excel chi tiết kết quả kiểm tra trùng lặp
// ============================================================

router.get('/:id_bao_cao', async (req, res) => {
    try {
        const { id_bao_cao } = req.params;

        // Lấy thông tin báo cáo
        const baoCao = await BaoCao.findOne({ id_bao_cao }).lean();
        if (!baoCao) {
            return res.status(404).json({ success: false, message: `Không tìm thấy báo cáo ${id_bao_cao}!` });
        }

        // Lấy dữ liệu các collection song song
        const [thongKe, dsCauTrung, dsDoanTrung, dsDoanChapVa] = await Promise.all([
            ThongKe.findOne({ id_bao_cao }).lean(),
            ChiTietCauTrung.find({ id_bao_cao }).sort({ chi_so_cau_kiem_tra: 1 }).lean(),
            ChiTietDoanTrung.find({ id_bao_cao }).sort({ tu_cau_kiem_tra: 1 }).lean(),
            ChiTietDoanChapVa.find({ id_bao_cao }).sort({ tu_cau_kiem_tra: 1 }).lean()
        ]);

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống kiểm tra trùng lặp';
        workbook.created = new Date();

        // ─────────────────────────────────────────────────────
        // SHEET 1 – TỔNG HỢP BÀI
        // ─────────────────────────────────────────────────────
        const sheetTH = workbook.addWorksheet('Tổng hợp bài');

        // Tiêu đề báo cáo
        sheetTH.mergeCells('A1:H1');
        const tieuDeCell = sheetTH.getCell('A1');
        tieuDeCell.value = `Kết quả kiểm tra trùng lặp – ${baoCao.tieu_de || id_bao_cao}`;
        tieuDeCell.font = { bold: true, size: 13, color: { argb: 'FF1F4E79' } };
        tieuDeCell.alignment = { horizontal: 'center' };
        sheetTH.getRow(1).height = 24;

        sheetTH.addRow([]);

        // Tổng quan
        const tongQuan = [
            ['Mã báo cáo', id_bao_cao],
            ['Tiêu đề', baoCao.tieu_de || ''],
            ['Ngày kiểm tra', thongKe ? new Date(thongKe.ngay_kiem_tra).toLocaleString('vi-VN') : ''],
            ['Tổng số câu', thongKe ? thongKe.tong_so_cau : 0],
            ['Tổng số từ', thongKe ? thongKe.tong_so_tu : 0],
            ['Câu trùng', thongKe ? thongKe.tong_so_cau_trung : 0],
            ['Từ trùng', thongKe ? thongKe.tong_so_tu_trung : 0],
            ['Đoạn trùng', thongKe ? thongKe.tong_so_doan_trung : 0],
            ['Đoạn chắp vá', thongKe ? thongKe.tong_so_doan_chap_va : 0],
            ['Số nguồn phát hiện', thongKe ? thongKe.so_nguon_phat_hien : 0],
            ['Tỉ lệ trùng lặp', thongKe ? `${thongKe.ti_le_trung_lap}%` : '0%'],
            ['Trùng cả bài', thongKe && thongKe.trung_toan_bai ? 'Có' : 'Không']
        ];

        for (const [label, value] of tongQuan) {
            const row = sheetTH.addRow([label, value]);
            row.getCell(1).font = { bold: true };
            row.getCell(1).fill = MAU_TIEU_DE_PHU;
            row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }

        sheetTH.getColumn(1).width = 28;
        sheetTH.getColumn(2).width = 35;

        sheetTH.addRow([]);
        sheetTH.addRow([]);

        // Bảng thống kê theo nguồn
        if (thongKe && Array.isArray(thongKe.thong_ke_theo_mau) && thongKe.thong_ke_theo_mau.length > 0) {
            const hdrNguon = sheetTH.addRow([
                'Mã báo cáo nguồn', 'Tên báo cáo nguồn', 'Số câu trùng',
                'Số từ trùng', 'Số đoạn trùng', 'Số đoạn chắp vá',
                'Tỉ lệ trùng (%)', 'Cosine (%)', 'Jaccard (%)', 'Winnowing (%)', 'Trùng cả bài'
            ]);
            dinhDangHeader(hdrNguon);

            thongKe.thong_ke_theo_mau
                .sort((a, b) => (b.ti_le_trung_lap || 0) - (a.ti_le_trung_lap || 0))
                .forEach((tk, idx) => {
                    const row = sheetTH.addRow([
                        tk.id_bao_cao || '',
                        tk.ten_bao_cao || '',
                        tk.so_cau_trung || 0,
                        tk.so_tu_trung || 0,
                        tk.so_doan_trung || 0,
                        tk.so_doan_chap_va || 0,
                        tk.ti_le_trung_lap || 0,
                        tk.cosine || 0,
                        tk.jaccard || 0,
                        tk.winnowing || 0,
                        tk.trung_toan_bai ? 'Có' : 'Không'
                    ]);
                    dinhDangDuLieu(row, idx % 2 === 1);
                });

            // Đặt rộng cột
            sheetTH.columns = [
                { width: 18 }, { width: 35 }, { width: 14 }, { width: 12 },
                { width: 14 }, { width: 15 }, { width: 16 }, { width: 12 },
                { width: 12 }, { width: 14 }, { width: 14 }
            ];
        }

        // ─────────────────────────────────────────────────────
        // SHEET 2 – CÂU TRÙNG
        // ─────────────────────────────────────────────────────
        const sheetCau = workbook.addWorksheet('Câu trùng');
        sheetCau.columns = [
            { header: 'STT câu (kiểm tra)', key: 'stt', width: 18 },
            { header: 'Mã đoạn (doan_id)', key: 'doan_id', width: 16 },
            { header: 'Câu kiểm tra', key: 'cau_kiem_tra', width: 45 },
            { header: 'Số từ', key: 'so_tu', width: 9 },
            { header: 'Mã nguồn', key: 'id_bao_cao_nguon', width: 14 },
            { header: 'STT câu (nguồn)', key: 'stt_nguon', width: 16 },
            { header: 'Câu nguồn', key: 'cau_nguon', width: 45 },
            { header: 'Độ tương đồng', key: 'do_tuong_dong', width: 15 },
            { header: 'Cosine', key: 'cosine', width: 12 },
            { header: 'Jaccard', key: 'jaccard', width: 12 },
            { header: 'Winnowing', key: 'winnowing', width: 13 }
        ];

        dinhDangHeader(sheetCau.getRow(1));

        let demDong = 0;
        for (const cauTrung of dsCauTrung) {
            for (const nguon of (cauTrung.danh_sach_nguon || [])) {
                const row = sheetCau.addRow({
                    stt:              cauTrung.chi_so_cau_kiem_tra,
                    doan_id:          cauTrung.doan_id || `DOAN_${Math.ceil(cauTrung.chi_so_cau_kiem_tra / 5)}`,
                    cau_kiem_tra:     cauTrung.cau_kiem_tra || '',
                    so_tu:            cauTrung.so_tu || 0,
                    id_bao_cao_nguon: nguon.id_bao_cao || '',
                    stt_nguon:        nguon.chi_so_cau || '',
                    cau_nguon:        nguon.cau_nguon || '',
                    do_tuong_dong:    formatDoPhanTram(nguon.do_tuong_dong),
                    cosine:           formatDoPhanTram(nguon.cosine),
                    jaccard:          formatDoPhanTram(nguon.jaccard),
                    winnowing:        formatDoPhanTram(nguon.winnowing)
                });
                row.getCell('cau_kiem_tra').alignment = { wrapText: true, vertical: 'top' };
                row.getCell('cau_nguon').alignment    = { wrapText: true, vertical: 'top' };
                dinhDangDuLieu(row, demDong % 2 === 1);
                demDong++;
            }
        }

        // ─────────────────────────────────────────────────────
        // SHEET 3 – ĐOẠN TRÙNG
        // ─────────────────────────────────────────────────────
        const sheetDoan = workbook.addWorksheet('Đoạn trùng');
        sheetDoan.columns = [
            { header: 'STT', key: 'stt', width: 7 },
            { header: 'Từ câu (KT)', key: 'tu_cau_kt', width: 13 },
            { header: 'Đến câu (KT)', key: 'den_cau_kt', width: 14 },
            { header: 'Đoạn kiểm tra', key: 'doan_kiem_tra', width: 50 },
            { header: 'Mã nguồn', key: 'id_nguon', width: 13 },
            { header: 'Từ câu (nguồn)', key: 'tu_cau_ng', width: 15 },
            { header: 'Đến câu (nguồn)', key: 'den_cau_ng', width: 16 },
            { header: 'Đoạn nguồn', key: 'doan_nguon', width: 50 },
            { header: 'Số câu', key: 'so_cau', width: 9 },
            { header: 'TB tương đồng', key: 'tb_tuong_dong', width: 16 },
            { header: 'Max tương đồng', key: 'max_tuong_dong', width: 17 }
        ];

        dinhDangHeader(sheetDoan.getRow(1));

        dsDoanTrung.forEach((doan, idx) => {
            const row = sheetDoan.addRow({
                stt:            idx + 1,
                tu_cau_kt:      doan.tu_cau_kiem_tra,
                den_cau_kt:     doan.den_cau_kiem_tra,
                doan_kiem_tra:  doan.doan_kiem_tra || '',
                id_nguon:       doan.id_bao_cao_nguon || '',
                tu_cau_ng:      doan.tu_cau_nguon,
                den_cau_ng:     doan.den_cau_nguon,
                doan_nguon:     doan.doan_nguon || '',
                so_cau:         doan.so_cau || 0,
                tb_tuong_dong:  formatDoPhanTram(doan.do_tuong_dong_trung_binh),
                max_tuong_dong: formatDoPhanTram(doan.do_tuong_dong_cao_nhat)
            });
            row.getCell('doan_kiem_tra').alignment = { wrapText: true, vertical: 'top' };
            row.getCell('doan_nguon').alignment    = { wrapText: true, vertical: 'top' };
            dinhDangDuLieu(row, idx % 2 === 1);
        });

        // ─────────────────────────────────────────────────────
        // SHEET 4 – ĐOẠN CHẮP VÁ
        // ─────────────────────────────────────────────────────
        const sheetChapVa = workbook.addWorksheet('Đoạn chắp vá');
        sheetChapVa.columns = [
            { header: 'STT', key: 'stt', width: 7 },
            { header: 'Từ câu (KT)', key: 'tu_cau_kt', width: 13 },
            { header: 'Đến câu (KT)', key: 'den_cau_kt', width: 14 },
            { header: 'Đoạn chắp vá', key: 'doan_chap_va', width: 55 },
            { header: 'Số câu', key: 'so_cau', width: 9 },
            { header: 'Số nguồn', key: 'so_nguon', width: 11 },
            { header: 'Các mã nguồn', key: 'cac_nguon', width: 30 },
            { header: 'Chi tiết nguồn (mã – từ câu – đến câu)', key: 'chi_tiet', width: 45 }
        ];

        dinhDangHeader(sheetChapVa.getRow(1));

        dsDoanChapVa.forEach((doan, idx) => {
            const cacNguon = (doan.danh_sach_id_bao_cao_nguon || []).join(', ');
            const chiTiet = (doan.chi_tiet_nguon || [])
                .map(n => `${n.id_bao_cao_nguon} (câu ${n.tu_cau_nguon}–${n.den_cau_nguon})`)
                .join(' | ');

            const row = sheetChapVa.addRow({
                stt:          idx + 1,
                tu_cau_kt:    doan.tu_cau_kiem_tra,
                den_cau_kt:   doan.den_cau_kiem_tra,
                doan_chap_va: doan.doan_chap_va || '',
                so_cau:       doan.so_cau || 0,
                so_nguon:     doan.so_nguon || 0,
                cac_nguon:    cacNguon,
                chi_tiet:     chiTiet
            });
            row.getCell('doan_chap_va').alignment = { wrapText: true, vertical: 'top' };
            row.getCell('chi_tiet').alignment      = { wrapText: true, vertical: 'top' };
            dinhDangDuLieu(row, idx % 2 === 1);
        });

        // ─────────────────────────────────────────────────────
        // GỬI FILE
        // ─────────────────────────────────────────────────────
        const tenFile = `KetQua_${id_bao_cao}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${tenFile}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        await workbook.xlsx.write(res);
        return res.end();

    } catch (error) {
        console.error('Lỗi xuất Excel kết quả kiểm tra:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
