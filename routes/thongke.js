const express = require('express');
const router = express.Router();

const BaoCao = require('../models/bao_cao');
const ThongKe = require('../models/thong_ke');
const SinhVien = require('../models/sinh_vien');
const NguoiDung = require('../models/nguoi_dung');
const LopHoc = require('../models/lop_hoc');

// Các nhánh thống kê khác dùng chung tiền tố /api/thong-ke
router.use(require('./thongke-tai-khoan'));
router.use(require('./thongke-lop-hoc'));

/**
 * Bảng tra tên người nộp.
 *
 * Trường id_sinh_vien trong bao_cao lúc thì giữ mã sinh viên (SV001), lúc lại
 * giữ mã người dùng (ND002) tuỳ đường upload, nên phải tra cả hai bảng và gộp
 * lại thành một bảng tra duy nhất.
 */
async function layBangTenNguoiNop(dsMa) {

    const bang = new Map();

    const dsSinhVien = await SinhVien.find({
        $or: [
            { id_sinh_vien: { $in: dsMa } },
            { id_nguoi_dung: { $in: dsMa } }
        ]
    }).select('id_sinh_vien id_nguoi_dung ho_ten').lean();

    for (const sv of dsSinhVien) {
        if (sv.id_sinh_vien) bang.set(sv.id_sinh_vien, sv.ho_ten);
        if (sv.id_nguoi_dung) bang.set(sv.id_nguoi_dung, sv.ho_ten);
    }

    // Mã nào chưa tra được thì tìm nốt ở bảng người dùng
    const conThieu = dsMa.filter(ma => !bang.has(ma));

    if (conThieu.length > 0) {

        const dsNguoiDung = await NguoiDung.find({
            id_nguoi_dung: { $in: conThieu }
        }).select('id_nguoi_dung ho_ten ten_dang_nhap').lean();

        for (const nd of dsNguoiDung) {
            bang.set(nd.id_nguoi_dung, nd.ho_ten || nd.ten_dang_nhap);
        }
    }

    return bang;
}

// =========================================================================
// API GET /api/thong-ke/danh-sach
//
// Danh sách tài liệu do người dùng nộp kèm số liệu lấy từ bảng thong_ke:
// tỉ lệ trùng, số câu trùng, số từ trùng, số đoạn trùng, số nguồn phát hiện.
//
// Tài liệu kho mẫu (mau_kiem_tra) không thuộc về ai và không được chấm nên
// bị loại ngay tại đây, để lẫn vào sẽ làm sai mọi chỉ số trung bình.
// =========================================================================
router.get('/danh-sach', async (req, res) => {
    try {
        const { id_sinh_vien, giang_vien } = req.query;

        const dieuKien = {
            mau_kiem_tra: { $ne: true },
            id_sinh_vien: { $nin: [null, ""] }
        };

        if (id_sinh_vien) {
            dieuKien.id_sinh_vien = id_sinh_vien;
        }

        // Giảng viên chỉ được xem bài của thành viên trong lớp mình phụ trách
        if (giang_vien) {

            const dsLop = await LopHoc.find({ id_nguoi_dung: giang_vien })
                .select('danh_sach_thanh_vien').lean();

            const idThanhVien = [...new Set(
                dsLop.flatMap(l => (l.danh_sach_thanh_vien || [])
                    .map(t => t.id_nguoi_dung))
            )];

            const dsSinhVien = await SinhVien.find({
                id_nguoi_dung: { $in: idThanhVien }
            }).select('id_sinh_vien').lean();

            dieuKien.id_sinh_vien = {
                $in: idThanhVien.concat(dsSinhVien.map(s => s.id_sinh_vien))
                    .filter(Boolean)
            };
        }

        const danhSachBaoCao = await BaoCao.find(dieuKien)
            .select('id_bao_cao tieu_de ngay_tai_len id_sinh_vien')
            .sort({ ngay_tai_len: -1 })
            .lean();

        if (danhSachBaoCao.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const dsId = danhSachBaoCao.map(bc => bc.id_bao_cao);

        // Chỉ lấy phần số liệu tổng hợp. Trường thong_ke_theo_mau chứa tới hàng
        // trăm nguồn cho mỗi bài, kéo về đây sẽ nặng vô ích.
        const dsThongKe = await ThongKe.find({ id_bao_cao: { $in: dsId } })
            .select(
                'id_bao_cao id_kiem_tra ti_le_trung_lap ' +
                'tong_so_cau tong_so_tu ' +
                'tong_so_cau_trung tong_so_tu_trung ' +
                'tong_so_doan_trung tong_so_doan_chap_va ' +
                'so_nguon_phat_hien ngay_kiem_tra'
            )
            .lean();

        const mapThongKe = new Map();

        // Một báo cáo có thể được kiểm nhiều lần; giữ bản kiểm mới nhất.
        for (const tk of dsThongKe) {

            const cu = mapThongKe.get(tk.id_bao_cao);

            if (!cu ||
                new Date(tk.ngay_kiem_tra || 0) > new Date(cu.ngay_kiem_tra || 0)) {
                mapThongKe.set(tk.id_bao_cao, tk);
            }
        }

        const bangTen = await layBangTenNguoiNop(
            [...new Set(danhSachBaoCao.map(bc => bc.id_sinh_vien))]
        );

        const ketQua = danhSachBaoCao.map(bc => {

            const tk = mapThongKe.get(bc.id_bao_cao);

            return {
                id_bao_cao: bc.id_bao_cao,
                tieu_de: bc.tieu_de,
                ngay_tai_len: bc.ngay_tai_len,
                id_sinh_vien: bc.id_sinh_vien,
                ten_nguoi_nop: bangTen.get(bc.id_sinh_vien) || "",

                ti_le_trung_lap: tk ? tk.ti_le_trung_lap : null,
                tong_so_cau: tk ? tk.tong_so_cau : null,
                tong_so_tu: tk ? tk.tong_so_tu : null,
                tong_so_cau_trung: tk ? tk.tong_so_cau_trung : null,
                tong_so_tu_trung: tk ? tk.tong_so_tu_trung : null,
                tong_so_doan_trung: tk ? tk.tong_so_doan_trung : null,
                tong_so_doan_chap_va: tk ? tk.tong_so_doan_chap_va : null,
                so_nguon_phat_hien: tk ? tk.so_nguon_phat_hien : null,
                ngay_kiem_tra: tk ? tk.ngay_kiem_tra : null,

                trang_thai: tk ? "Đã xử lý" : "Đang xử lý"
            };
        });

        return res.json({ success: true, data: ketQua });

    } catch (error) {
        console.error("Lỗi API thống kê:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// API GET /api/thong-ke/nguon/:id_bao_cao
//
// Danh sách nguồn trùng của một bài, lấy từ thong_ke_theo_mau.
// =========================================================================
router.get('/nguon/:id_bao_cao', async (req, res) => {
    try {
        const tk = await ThongKe.findOne({ id_bao_cao: req.params.id_bao_cao })
            .sort({ ngay_kiem_tra: -1 })
            .select('id_bao_cao thong_ke_theo_mau')
            .lean();

        if (!tk) {
            return res.status(404).json({
                success: false,
                message: "Chưa có thống kê cho báo cáo này!"
            });
        }

        const nguon = (tk.thong_ke_theo_mau || [])
            .slice()
            .sort((a, b) => (b.ti_le_trung_lap || 0) - (a.ti_le_trung_lap || 0));

        return res.json({ success: true, data: nguon });

    } catch (error) {
        console.error("Lỗi API nguồn thống kê:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
