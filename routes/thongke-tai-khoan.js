const express = require('express');
const router = express.Router();

const NguoiDung = require('../models/nguoi_dung');
const SinhVien = require('../models/sinh_vien');
const GiangVien = require('../models/giang_vien');
const BaoCao = require('../models/bao_cao');

// =========================================================================
// API GET /api/thong-ke/tai-khoan?vai_tro=giang_vien|sinh_vien
//
// Danh sách tài khoản theo vai trò, kèm thông tin hồ sơ tương ứng và số bài
// đã nộp để màn thống kê tài khoản khỏi phải gọi thêm lần nữa.
// =========================================================================
router.get('/tai-khoan', async (req, res) => {
    try {
        const vaiTro = (req.query.vai_tro || "").trim();

        const dieuKien = {};
        if (vaiTro) {
            // Dữ liệu cũ còn dùng "giaovien" nên nhận cả hai cách viết
            dieuKien.vai_tro = vaiTro === "giang_vien"
                ? { $in: ["giang_vien", "giaovien"] }
                : vaiTro;
        }

        const dsNguoiDung = await NguoiDung.find(dieuKien)
            .select('id_nguoi_dung ten_dang_nhap ho_ten email vai_tro trang_thai ngay_tao hinh_anh')
            .sort({ ngay_tao: -1 })
            .lean();

        if (dsNguoiDung.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const dsId = dsNguoiDung.map(n => n.id_nguoi_dung);

        // Hồ sơ chi tiết nằm ở hai bảng riêng tuỳ vai trò
        const [dsSinhVien, dsGiangVien] = await Promise.all([
            SinhVien.find({ id_nguoi_dung: { $in: dsId } })
                .select('id_nguoi_dung id_sinh_vien ma_sinh_vien lop khoa_hoc').lean(),
            GiangVien.find({ id_nguoi_dung: { $in: dsId } })
                .select('id_nguoi_dung id_giang_vien ma_giang_vien bo_mon so_lan_kiem_tra').lean()
        ]);

        const hoSoSinhVien = new Map(dsSinhVien.map(x => [x.id_nguoi_dung, x]));
        const hoSoGiangVien = new Map(dsGiangVien.map(x => [x.id_nguoi_dung, x]));

        // Đếm số bài đã nộp. Trường id_sinh_vien trong bao_cao lúc giữ mã sinh
        // viên, lúc giữ mã người dùng tuỳ đường upload nên phải đếm theo cả hai.
        const maCanDem = dsId.concat(dsSinhVien.map(x => x.id_sinh_vien).filter(Boolean));

        const demBai = await BaoCao.aggregate([
            {
                $match: {
                    mau_kiem_tra: { $ne: true },
                    id_sinh_vien: { $in: maCanDem }
                }
            },
            { $group: { _id: "$id_sinh_vien", so_bai: { $sum: 1 } } }
        ]);

        const bangDem = new Map(demBai.map(x => [x._id, x.so_bai]));

        const ketQua = dsNguoiDung.map(nd => {

            const sv = hoSoSinhVien.get(nd.id_nguoi_dung);
            const gv = hoSoGiangVien.get(nd.id_nguoi_dung);

            const soBai =
                (bangDem.get(nd.id_nguoi_dung) || 0) +
                (sv && sv.id_sinh_vien ? (bangDem.get(sv.id_sinh_vien) || 0) : 0);

            return {
                id_nguoi_dung: nd.id_nguoi_dung,
                ho_ten: nd.ho_ten || nd.ten_dang_nhap,
                email: nd.email,
                vai_tro: nd.vai_tro,
                trang_thai: nd.trang_thai,
                ngay_tao: nd.ngay_tao,

                ma_ho_so: sv ? sv.id_sinh_vien : (gv ? gv.id_giang_vien : ""),
                ma_dinh_danh: sv ? sv.ma_sinh_vien : (gv ? gv.ma_giang_vien : ""),
                lop: sv ? sv.lop : "",
                bo_mon: gv ? gv.bo_mon : "",

                so_bai_da_nop: soBai
            };
        });

        return res.json({ success: true, data: ketQua });

    } catch (error) {
        console.error("Lỗi API thống kê tài khoản:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
