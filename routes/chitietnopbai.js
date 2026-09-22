const express = require('express');
const router = express.Router();
const BaiChiTietNopBai = require('../models/chi_tiet_nop_bai');
const BaoCao = require('../models/bao_cao');
const SinhVien = require('../models/sinh_vien');
const BaiTap = require('../models/bai_tap');
const path = require('path');
const { timTepBaoCao } = require('../utils/duong_dan_tep');

/**
 * Đổi một mã bất kỳ (mã tài khoản hoặc mã sinh viên) sang mã sinh viên chuẩn.
 *
 * Giao diện chỗ thì gửi lên id_nguoi_dung, chỗ thì gửi id_sinh_vien, nên hàm
 * này nhận cả hai. Không tra ra hồ sơ nào thì trả lại đúng cái đã nhận để
 * người gọi tự quyết, thay vì ném lỗi giữa chừng lúc sinh viên đang nộp bài.
 */
async function resolveIdSinhVien(inputId) {
    if (!inputId) return null;

    const sinhVienRecord = await SinhVien.findOne({
        $or: [
            { id_nguoi_dung: inputId },
            { id_sinh_vien: inputId }
        ]
    }).lean();

    if (sinhVienRecord) return sinhVienRecord.id_sinh_vien;

    console.warn(`Không tìm thấy hồ sơ sinh viên khớp với "${inputId}".`);
    return inputId;
}

/**
 * Ghi lại kết quả nộp bài vào danh sách nộp bài nằm trong bản ghi bài tập.
 *
 * Việc nộp bài vốn chỉ tạo bản ghi trong chi_tiet_nop_bai, còn mảng
 * danh_sach_nop_bai của bài tập thì không ai đụng tới. Vì thế màn hình chi tiết
 * hiện "Đã nộp" nhờ đọc chi_tiet_nop_bai, nhưng mở collection bai_tap ra vẫn
 * thấy "Chưa nộp" và thời gian nộp để trống. Hàm này đồng bộ hai nơi đó.
 *
 * @param {Object} tt Thông tin bài nộp đã chuẩn hoá
 * @returns {Promise<boolean>} true nếu tìm được dòng để ghi
 */
async function ghiTrangThaiVaoBaiTap({
    idBaiTap, idSinhVien, idNguoiDung, hoTen, tenTep, idBaoCao, thoiGianNop
}) {
    const baiTap = await BaiTap.findOne({ id_bai_tap: Number(idBaiTap) });

    if (!baiTap) {
        console.warn(`Không có bài tập ${idBaiTap} để ghi trạng thái nộp.`);
        return false;
    }

    if (!Array.isArray(baiTap.danh_sach_nop_bai)) {
        baiTap.danh_sach_nop_bai = [];
    }

    const khop = giaTri => giaTri && String(giaTri) === String(idSinhVien);

    // Dữ liệu cũ có thể còn lưu mã tài khoản ở ô mã sinh viên, nên vẫn dò thêm
    // theo id_nguoi_dung để không tạo ra dòng trùng người.
    let dong = baiTap.danh_sach_nop_bai.find(
        tv => khop(tv.id_sinh_vien)
            || (idNguoiDung && String(tv.id_sinh_vien) === String(idNguoiDung))
    );

    if (!dong) {
        // Sinh viên vào lớp sau khi bài tập đã được tạo thì chưa có dòng nào
        dong = {
            id_sinh_vien: idSinhVien,
            ho_ten: hoTen || "",
            trang_thai_nop: "Chưa nộp",
            thoi_gian_nop: null,
            ten_tep: "",
            id_bao_cao: ""
        };
        baiTap.danh_sach_nop_bai.push(dong);
    }

    dong.id_sinh_vien = idSinhVien;
    if (hoTen) dong.ho_ten = hoTen;
    dong.trang_thai_nop = "Đã nộp";
    dong.thoi_gian_nop = thoiGianNop;
    dong.ten_tep = tenTep || "";
    dong.id_bao_cao = idBaoCao || "";

    baiTap.markModified('danh_sach_nop_bai');
    await baiTap.save();

    return true;
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

        // Ghi luôn sang danh sách nộp bài của bài tập để hai nơi không lệch nhau
        const hoSoSinhVien = await SinhVien
            .findOne({ id_sinh_vien: realStudentId })
            .select('ho_ten id_nguoi_dung')
            .lean();

        const daGhiVaoBaiTap = await ghiTrangThaiVaoBaiTap({
            idBaiTap: id_bai_tap,
            idSinhVien: realStudentId,
            idNguoiDung: rawIdSinhVien,
            hoTen: hoSoSinhVien ? hoSoSinhVien.ho_ten : "",
            tenTep: path.basename(taiLieu.tep_tin || "")
                || taiLieu.tieu_de || "",
            idBaoCao: id_bao_cao,
            thoiGianNop: thoiGianHienTai
        });

        return res.json({
            success: true,
            message: "Nộp bài thành công!",
            data: baiNop,
            da_ghi_vao_bai_tap: daGhiVaoBaiTap
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
        
        // Giao diện lớp học khớp bài nộp với thành viên lớp theo id_nguoi_dung,
        // nên gắn kèm mã tài khoản tương ứng với từng mã sinh viên. Tra một lượt
        // cho cả danh sách thay vì hỏi cơ sở dữ liệu từng người một.
        const dsMaSinhVien = danhSachNop
            .map(item => item.id_sinh_vien)
            .filter(Boolean);

        if (dsMaSinhVien.length) {
            const hoSo = await SinhVien
                .find({ id_sinh_vien: { $in: dsMaSinhVien } })
                .select('id_sinh_vien id_nguoi_dung')
                .lean();

            const maTaiKhoan = new Map(
                hoSo.map(sv => [sv.id_sinh_vien, sv.id_nguoi_dung])
            );

            for (const item of danhSachNop) {
                const idNguoiDung = maTaiKhoan.get(item.id_sinh_vien);
                if (idNguoiDung) item.id_nguoi_dung = idNguoiDung;
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
/**
 * API xoá bài nộp của một sinh viên cho một bài tập.
 *
 * Giao diện đã gọi tới đường dẫn này từ trước nhưng máy chủ chưa hề có, nên
 * bấm nút Xoá là nhận về 404 rồi báo "Có lỗi xảy ra khi xóa ở máy chủ".
 *
 * Chỉ gỡ bản ghi nộp bài và đánh dấu lại trạng thái trong bài tập. Tài liệu
 * gốc trong kho tài liệu của sinh viên giữ nguyên — đây là bỏ nộp, không phải
 * xoá tài liệu.
 */
router.delete('/submissions', async (req, res) => {
    try {
        const { id_bai_tap, id_sinh_vien: rawIdSinhVien } = req.query;

        if (!id_bai_tap || !rawIdSinhVien) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tham số id_bai_tap hoặc id_sinh_vien."
            });
        }

        const realStudentId = await resolveIdSinhVien(rawIdSinhVien);

        const daXoa = await BaiChiTietNopBai.findOneAndDelete({
            id_bai_tap,
            id_sinh_vien: realStudentId
        });

        if (!daXoa) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bài nộp để xoá."
            });
        }

        // Đưa trạng thái trong danh sách nộp bài của bài tập về "Chưa nộp"
        try {
            const baiTap = await BaiTap.findOne({ id_bai_tap: Number(id_bai_tap) });

            if (baiTap && Array.isArray(baiTap.danh_sach_nop_bai)) {
                let coDoi = false;

                baiTap.danh_sach_nop_bai.forEach(tv => {
                    const trung = String(tv.id_sinh_vien) === String(realStudentId)
                        || String(tv.id_sinh_vien) === String(rawIdSinhVien);

                    if (trung) {
                        tv.trang_thai_nop = "Chưa nộp";
                        tv.thoi_gian_nop = null;
                        tv.ten_tep = "";
                        tv.id_bao_cao = "";
                        coDoi = true;
                    }
                });

                if (coDoi) {
                    baiTap.markModified('danh_sach_nop_bai');
                    await baiTap.save();
                }
            }
        } catch (e) {
            console.error("Không cập nhật được trạng thái nộp bài:", e.message);
        }

        return res.json({
            success: true,
            message: "Đã xoá bài nộp.",
            data: { id_bai_tap, id_sinh_vien: realStudentId }
        });

    } catch (error) {
        console.error("Lỗi khi xoá bài nộp:", error);
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

        // Bản ghi cũ lưu đường dẫn của máy khác (ổ D:, dấu gạch ngược), nên
        // phải dò qua nhiều cách mới ra tệp — xem utils/duong_dan_tep.js
        const filePath = timTepBaoCao(baoCao.tep_tin);

        if (!filePath) {
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