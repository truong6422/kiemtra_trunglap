/**
 * =================================================================
 * FILE: routes/baitap.js - Đã bổ sung logic tự động cập nhật trạng thái
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const BaiTap = require('../models/bai_tap');
const LopHoc = require('../models/lop_hoc');
const SinhVien = require('../models/sinh_vien');

// HÀM DÙNG CHUNG: Tự động tính toán trạng thái dựa trên thời gian thực tế
function calculateExerciseStatus(thoiGianBatDau, thoiGianKetThuc) {
    const now = new Date();
    const startDate = thoiGianBatDau ? new Date(thoiGianBatDau) : null;
    const endDate = (thoiGianKetThuc && thoiGianKetThuc !== "Không giới hạn") ? new Date(thoiGianKetThuc) : null;

    if (startDate && now < startDate) {
        return 'Chưa mở';
    } else if (endDate && now > endDate) {
        return 'Đã hết hạn';
    } else {
        return 'Đang mở';
    }
}

/**
 * 1. API Thêm bài tập mới (POST /api/bai-tap)
 */
router.post('/', async (req, res) => {
    try {
        const { 
            id_lop_hoc, 
            tieu_de, 
            huong_dan, 
            dinh_dang_file, 
            id_kiem_tra, 
            thoi_gian_bat_dau, 
            thoi_gian_ket_thuc
        } = req.body;
        
        const lopHoc = await LopHoc.findOne({ id_lop_hoc: Number(id_lop_hoc) });
        let rawMembers = [];
        if (lopHoc) {
            rawMembers = lopHoc.danh_sach_thanh_vien || lopHoc.members || lopHoc.students || [];

            // Chủ lớp được thêm vào danh sách thành viên ngay lúc tạo lớp, nhưng
            // người ra bài thì không phải nộp bài. Bỏ ra ở đây để danh sách nộp
            // bài của bài tập mới chỉ gồm thành viên lớp.
            rawMembers = rawMembers.filter(
                m => String(m.id_nguoi_dung) !== String(lopHoc.id_nguoi_dung)
            );
        }

        // Thành viên lớp chỉ lưu id_nguoi_dung, không có mã sinh viên. Tra sang
        // bảng sinh_vien để điền nốt, nếu không thì hai trường này rỗng và màn
        // thống kê không nối được bài nộp với người nộp.
        const idNguoiDung = rawMembers
            .map(m => m.id_nguoi_dung)
            .filter(Boolean);

        const maTheoNguoiDung = new Map();
        if (idNguoiDung.length) {
            const dsSinhVien = await SinhVien
                .find({ id_nguoi_dung: { $in: idNguoiDung } })
                .select('id_nguoi_dung id_sinh_vien ma_sinh_vien')
                .lean();

            for (const sv of dsSinhVien) {
                maTheoNguoiDung.set(sv.id_nguoi_dung, sv);
            }
        }

        const danhSachNopBai = rawMembers.map(m => {
            const sv = maTheoNguoiDung.get(m.id_nguoi_dung) || {};

            return {
                id_sinh_vien: String(
                    m.id_nguoi_dung || m.id_sinh_vien || m.id || m._id || ""),
                ma_sinh_vien: String(
                    sv.id_sinh_vien || sv.ma_sinh_vien ||
                    m.ma_sinh_vien || m.code || m.mssv || ""),
                ho_ten: String(m.ho_ten || m.name || m.full_name || ""),
                trang_thai_nop: "Chưa nộp",
                thoi_gian_nop: null,
                danh_sach_tep: []
            };
        });

        const thoiGianMoThucTe = thoi_gian_bat_dau ? thoi_gian_bat_dau : new Date();
        const thoiGianDongThucTe = thoi_gian_ket_thuc !== undefined && thoi_gian_ket_thuc !== "" 
            ? thoi_gian_ket_thuc 
            : "Không giới hạn";

        // Tự động tính trạng thái chuẩn theo thời gian thực
        const trangThaiThucTe = calculateExerciseStatus(thoiGianMoThucTe, thoiGianDongThucTe);

        const newExercise = new BaiTap({
            id_lop_hoc: Number(id_lop_hoc),
            tieu_de: tieu_de,
            huong_dan: huong_dan !== undefined ? huong_dan : "",
            trang_thai: trangThaiThucTe,
            dinh_dang_file: dinh_dang_file || "docx hoặc pdf",
            id_kiem_tra: id_kiem_tra || null,
            danh_sach_nop_bai: danhSachNopBai,
            ngay_tao: new Date(),
            ngay_cap_nhat: new Date(),
            thoi_gian_bat_dau: thoiGianMoThucTe,
            thoi_gian_ket_thuc: thoiGianDongThucTe
        });

        const savedExercise = await newExercise.save();
        res.status(201).json({ 
            success: true, 
            message: "Thêm bài tập thành công!", 
            data: savedExercise 
        });
    } catch (error) {
        console.error("Lỗi khi thêm bài tập:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2. API Lấy danh sách bài tập theo ID lớp học (GET /api/bai-tap/lop/:id_lop_hoc)[cite: 5]
 * (Đã tích hợp cơ chế tự động cập nhật lại trạng thái vào DB nếu thời gian thay đổi)
 */
router.get('/lop/:id_lop_hoc', async (req, res) => {
    try {
        const { id_lop_hoc } = req.params;
        const exercises = await BaiTap.find({ id_lop_hoc: Number(id_lop_hoc) }).sort({ ngay_tao: -1 });
        
        // Duyệt qua từng bài tập để tự động cập nhật trạng thái mới nhất vào CSDL
        for (let ex of exercises) {
            const calculatedStatus = calculateExerciseStatus(ex.thoi_gian_bat_dau, ex.thoi_gian_ket_thuc);
            if (ex.trang_thai !== calculatedStatus) {
                ex.trang_thai = calculatedStatus;
                ex.ngay_cap_nhat = new Date();
                await ex.save(); // Lưu đồng bộ lại vào MongoDB
            }
        }

        // Lấy lại danh sách sau khi đã được cập nhật trạng thái chuẩn xác
        const updatedExercises = await BaiTap.find({ id_lop_hoc: Number(id_lop_hoc) }).sort({ ngay_tao: -1 });

        res.status(200).json({ 
            success: true, 
            data: updatedExercises 
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bài tập:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 3. API Xóa bài tập theo id_bai_tap (DELETE /api/bai-tap/:id_bai_tap)[cite: 5]
 */
router.delete('/:id_bai_tap', async (req, res) => {
    try {
        const { id_bai_tap } = req.params;
        const deletedExercise = await BaiTap.findOneAndDelete({ id_bai_tap: Number(id_bai_tap) });

        if (!deletedExercise) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bài tập cần xóa!" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Xóa bài tập thành công!" 
        });
    } catch (error) {
        console.error("Lỗi khi xóa bài tập:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 4. API Cập nhật bài tập theo id_bai_tap (PUT /api/baitap/:id_bai_tap)[cite: 5]
 * (Đã bổ sung tính toán lại trạng thái ngay khi cập nhật thời gian)
 */
router.put('/:id_bai_tap', async (req, res) => {
    try {
        const { id_bai_tap } = req.params;
        const { tieu_de, huong_dan, thoi_gian_bat_dau, thoi_gian_ket_thuc } = req.body;

        // Tính lại trạng thái theo thời gian mới gửi lên. Trước đây hai tham số
        // ở đây viết nhầm thành thoiGianBatDau / thoiGianKetThuc — không phải
        // tên biến nào đang có — nên mọi lần bấm Cập nhật đều báo lỗi và không
        // lưu được gì.
        const calculatedStatus = calculateExerciseStatus(
            thoi_gian_bat_dau, thoi_gian_ket_thuc);

        const updatedExercise = await BaiTap.findOneAndUpdate(
            { id_bai_tap: Number(id_bai_tap) },
            { 
                tieu_de, 
                huong_dan: huong_dan !== undefined ? huong_dan : "",
                thoi_gian_bat_dau, 
                thoi_gian_ket_thuc,
                trang_thai: calculatedStatus, // Cập nhật luôn trạng thái mới vào CSDL
                ngay_cap_nhat: new Date()
            },
            { returnDocument: 'after' }
        );

        if (!updatedExercise) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bài tập cần cập nhật!" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Cập nhật bài tập thành công!", 
            data: updatedExercise 
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật bài tập:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;