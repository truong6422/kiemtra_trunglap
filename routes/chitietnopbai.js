const express = require('express');
const router = express.Router();
const BaiChiTietNopBai = require('../models/chi_tiet_nop_bai');
const BaoCao = require('../models/bao_cao');
const SinhVien = require('../models/sinh_vien');

// Hàm hỗ trợ ánh xạ từ id_nguoi_dung sang id_sinh_vien chuẩn
async function resolveIdSinhVien(inputId) {
    if (!inputId) return null;
    console.log("--- Đang xử lý ánh xạ cho ID:", inputId);

    let sinhVienRecord = await SinhVien.findOne({ id_nguoi_dung: inputId }).lean();
    
    if (!sinhVienRecord) {
        sinhVienRecord = await SinhVien.findOne({ 
            $or: [
                { nguoi_dung_id: inputId },
                { user_id: inputId },
                { id_nguoidung: inputId }
            ]
        }).lean();
    }

    if (sinhVienRecord) {
        console.log("-> Tìm thấy bản ghi sinh viên:", sinhVienRecord);
        // Ưu tiên lấy trường id_sinh_vien (ví dụ "SV005")
        return sinhVienRecord.id_sinh_vien || sinhVienRecord.ma_sinh_vien || sinhVienRecord._id;
    }

    console.log("-> KHÔNG tìm thấy bản ghi sinh viên nào khớp với:", inputId);
    return inputId;
}

// 1. API xử lý khi sinh viên nhấn "Xác nhận" nộp bài
router.post('/nop-bai', async (req, res) => {
    try {
        const { id_bai_tap, id_sinh_vien: rawIdSinhVien, id_bao_cao } = req.body;

        if (!id_bai_tap || !rawIdSinhVien || !id_bao_cao) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc (id_bai_tap, id_sinh_vien, id_bao_cao)." });
        }

        // BƯỚC QUAN TRỌNG: Lưu kết quả vào biến riêng biệt `realStudentId`
        const realStudentId = await resolveIdSinhVien(rawIdSinhVien);
        console.log("-> ID sinh viên thực tế sẽ lưu vào chi_tiet_nop_bai là:", realStudentId);

        // Lấy thông tin tài liệu từ bảng BaoCao
        const taiLieu = await BaoCao.findOne({ id_bao_cao: id_bao_cao }).lean();

        if (!taiLieu) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu được chọn." });
        }

        let loaiFile = "pdf";
        const fileDuongDan = taiLieu.tep_tin || "";
        if (fileDuongDan.endsWith('.docx') || fileDuongDan.endsWith('.doc')) {
            loaiFile = "docx";
        } else if (taiLieu.loai_bao_cao) {
            loaiFile = taiLieu.loai_bao_cao;
        }

        const thoiGianHienTai = new Date();

        // Kiểm tra xem sinh viên này đã nộp bài tập này trước đó chưa (dùng realStudentId)
        let baiNop = await BaiChiTietNopBai.findOne({ id_bai_tap: id_bai_tap, id_sinh_vien: realStudentId });

        if (baiNop) {
            baiNop.id_bao_cao = id_bao_cao;
            baiNop.tieu_de_tep = taiLieu.tieu_de || "Không có tiêu đề";
            baiNop.ngay_nop = thoiGianHienTai;
            baiNop.trang_thai = "Đã nộp";
            baiNop.loai_bao_cao = loaiFile;
            await baiNop.save();
        } else {
            baiNop = new BaiChiTietNopBai({
                id_bai_tap: id_bai_tap,
                id_sinh_vien: realStudentId, // Gán đúng mã sinh viên chuẩn (ví dụ: SV005)
                id_bao_cao: id_bao_cao,
                tieu_de_tep: taiLieu.tieu_de || "Không có tiêu đề",
                ngay_nop: thoiGianHienTai,
                trang_thai: "Đã nộp",
                loai_bao_cao: loaiFile
            });
            await baiNop.save();
        }

        // Cập nhật trạng thái trong bảng BaoCao thành "Đã xử lý"
        await BaoCao.updateOne(
            { id_bao_cao: id_bao_cao },
            { $set: { trang_thai: "Đã xử lý" } }
        );

        return res.json({ 
            success: true, 
            message: "Nộp bài thành công!", 
            data: baiNop 
        });

    } catch (error) {
        console.error("Lỗi khi nộp bài:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// 2. API lấy danh sách bài nộp của một bài tập (phục vụ giao diện giáo viên)
router.get('/danh-sach/:id_bai_tap', async (req, res) => {
    try {
        const idBaiTap = req.params.id_bai_tap;
        let danhSachNop = await BaiChiTietNopBai.find({ id_bai_tap: idBaiTap }).lean();
        
        // Tự động gắn thêm id_nguoi_dung cho mỗi bản ghi bài nộp để frontend dễ dàng khớp với classMembers
        for (let item of danhSachNop) {
            if (item.id_sinh_vien) {
                // Tìm ngược lại trong bảng SinhVien xem id_sinh_vien này ứng với id_nguoi_dung nào
                const svRecord = await SinhVien.findOne({ 
                    $or: [
                        { id_sinh_vien: item.id_sinh_vien },
                        { ma_sinh_vien: item.id_sinh_vien }
                    ]
                }).lean();

                if (svRecord && svRecord.id_nguoi_dung) {
                    item.id_nguoi_dung = svRecord.id_nguoi_dung;
                }
            }
        }

        return res.json({ success: true, data: danhSachNop });
    } catch (error) {
        console.error("Lỗi lấy danh sách bài nộp:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// 3. API lấy thông tin bài nộp theo bài tập và sinh viên (phục vụ giao diện học sinh)
router.get('/submissions', async (req, res) => {
    try {
        const { id_bai_tap, id_sinh_vien: rawIdSinhVien } = req.query;
        
        if (!id_bai_tap || !rawIdSinhVien) {
            return res.status(400).json({ success: false, message: "Thiếu tham số id_bai_tap hoặc id_sinh_vien." });
        }

        const realStudentId = await resolveIdSinhVien(rawIdSinhVien);
        
        const submission = await BaiChiTietNopBai.findOne({ id_bai_tap, id_sinh_vien: realStudentId });
        
        if (submission) {
            return res.json({ success: true, data: submission });
        } else {
            return res.json({ success: false, message: "Chưa có bài nộp" });
        }
    } catch (error) {
        console.error("Lỗi lấy thông tin bài nộp:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 4. API lấy thông tin chi tiết một báo cáo theo id (ví dụ: BC671)
router.get('/chi-tiet/:id', async (req, res) => {
    try {
        const reportId = req.params.id;
        
        // Tìm báo cáo trong collection BaoCao dựa theo id_bao_cao (hoặc _id)
        const baoCao = await BaoCao.findOne({ 
            $or: [
                { id_bao_cao: reportId },
                { _id: reportId.match(/^[0-9a-fA-F]{24}$/) ? reportId : null }
            ]
        }).lean();

        if (!baoCao) {
            return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo." });
        }

        return res.json({
            success: true,
            data: {
                baoCao: baoCao,
                // Nếu collection của bạn có lưu kết quả check trùng lặp, gán vào đây
                ketQua: baoCao.ket_qua || baoCao
            }
        });
    } catch (error) {
        console.error("Lỗi lấy chi tiết báo cáo:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// 5. API trả về file PDF/Document của báo cáo để hiển thị lên iframe
router.get('/chi-tiet/:id/document', async (req, res) => {
    try {
        const reportId = req.params.id;
        
        const baoCao = await BaoCao.findOne({ 
            $or: [
                { id_bao_cao: reportId },
                { _id: reportId.match(/^[0-9a-fA-F]{24}$/) ? reportId : null }
            ]
        }).lean();

        if (!baoCao || !baoCao.tep_tin) {
            return res.status(404).send("Không tìm thấy file tài liệu.");
        }

        const fs = require('fs');
        const path = require('path');

        // Đường dẫn tới thư mục lưu file trên server (chỉnh lại path.join cho khớp với thư mục uploads thực tế của bạn)
        // Ví dụ: file được lưu ở thư mục gốc project hoặc thư mục uploads
        let filePath = path.resolve(baoCao.tep_tin);
        
        if (!fs.existsSync(filePath)) {
            // Thử tìm trong thư mục uploads nếu đường dẫn lưu tương đối
            filePath = path.join(__dirname, '../', baoCao.tep_tin);
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("File vật lý không tồn tại trên ổ cứng server.");
        }

        // Thiết lập header và gửi file PDF về cho client
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(filePath);

    } catch (error) {
        console.error("Lỗi tải file document:", error);
        return res.status(500).send("Lỗi server: " + error.message);
    }
});
module.exports = router;