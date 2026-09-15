const express = require('express');
const router = express.Router();
const CauHinhHeThong = require('../models/cau_hinh_he_thong');
const { donBaoCaoQuaHan } = require('../utils/don_bao_cao_qua_han');

// Danh sách thuật toán dựng sẵn, dùng khi bản ghi cấu hình chưa có mục nào.
const THUAT_TOAN_MAC_DINH = [
    {
        ma_thuat_toan: 'TFIDF_COSINE',
        ten_thuat_toan: 'TF-IDF & Cosine Similarity',
        mo_ta: 'Đo độ giống nhau theo từ khoá quan trọng, bắt được câu diễn đạt lại.',
        trong_so: 0.4,
        trang_thai: true
    },
    {
        ma_thuat_toan: 'WINNOWING',
        ten_thuat_toan: 'Winnowing Fingerprinting',
        mo_ta: 'Tạo dấu vân tay văn bản, bắt sao chép nguyên văn kể cả khi đảo đoạn.',
        trong_so: 0.4,
        trang_thai: true
    },
    {
        ma_thuat_toan: 'JACCARD',
        ten_thuat_toan: 'Jaccard Similarity',
        mo_ta: 'So sánh tập hợp từ vựng, phát hiện việc dùng lại vốn từ của tài liệu khác.',
        trong_so: 0.2,
        trang_thai: true
    }
];

const DINH_DANG_HO_TRO = ['.docx', '.pdf', '.doc', '.txt'];

/**
 * Bỏ bớt phần dữ liệu nặng trước khi trả cho giao diện.
 * Trường tu_vung_va_idf chứa bảng IDF toàn hệ thống, nặng hàng chục MB.
 */
function gonCauHinh(cauHinh) {
    if (!cauHinh) return null;

    const { tu_vung_va_idf, ...phanConLai } = cauHinh;

    return {
        ...phanConLai,
        danh_sach_thuat_toan:
            (cauHinh.danh_sach_thuat_toan && cauHinh.danh_sach_thuat_toan.length)
                ? cauHinh.danh_sach_thuat_toan
                : THUAT_TOAN_MAC_DINH,
        cho_phep_upload:
            (cauHinh.cho_phep_upload && cauHinh.cho_phep_upload.length)
                ? cauHinh.cho_phep_upload
                : ['.docx', '.pdf'],
        kich_thuoc_toi_da: cauHinh.kich_thuoc_toi_da || '20MB',
        so_tu_vung_idf: tu_vung_va_idf ? Object.keys(tu_vung_va_idf).length : 0
    };
}

// API lấy thông tin cấu hình hệ thống
router.get('/', async (req, res) => {
    try {
        const cauHinh = await CauHinhHeThong.findOne().lean();

        res.json({
            success: true,
            data: gonCauHinh(cauHinh),
            dinh_dang_ho_tro: DINH_DANG_HO_TRO
        });
    } catch (error) {
        console.error('Lỗi khi lấy cấu hình:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Kiểm tra dữ liệu người dùng gửi lên trước khi ghi vào cơ sở dữ liệu.
 * Trả về chuỗi mô tả lỗi đầu tiên gặp phải, hoặc null nếu hợp lệ.
 */
function kiemTraDuLieu({ nguong_trung_lap, danh_sach_thuat_toan,
    cho_phep_upload, kich_thuoc_toi_da }) {

    const nguong = Number(nguong_trung_lap);
    if (isNaN(nguong) || nguong < 0.1 || nguong > 1) {
        return 'Ngưỡng trùng lặp phải nằm trong khoảng 0.1 đến 1.';
    }

    if (!Array.isArray(danh_sach_thuat_toan) || danh_sach_thuat_toan.length === 0) {
        return 'Danh sách thuật toán không được để trống.';
    }

    const dangBat = danh_sach_thuat_toan.filter(t => t.trang_thai);
    if (dangBat.length === 0) {
        return 'Phải bật ít nhất một thuật toán.';
    }

    for (const t of danh_sach_thuat_toan) {
        const ts = Number(t.trong_so);
        if (isNaN(ts) || ts < 0 || ts > 1) {
            return `Trọng số của "${t.ten_thuat_toan}" phải nằm trong khoảng 0 đến 1.`;
        }
    }

    const tong = dangBat.reduce((s, t) => s + Number(t.trong_so), 0);
    // Cộng số thập phân trong JavaScript có sai số nhỏ nên phải so gần đúng.
    if (Math.abs(tong - 1) > 0.001) {
        return `Tổng trọng số của các thuật toán đang bật phải bằng 1 `
            + `(hiện tại là ${tong.toFixed(2)}).`;
    }

    if (!Array.isArray(cho_phep_upload) || cho_phep_upload.length === 0) {
        return 'Phải chọn ít nhất một định dạng tệp được phép tải lên.';
    }

    const laDinhDangLa = cho_phep_upload.find(d => !DINH_DANG_HO_TRO.includes(d));
    if (laDinhDangLa) {
        return `Định dạng "${laDinhDangLa}" không nằm trong danh sách hỗ trợ.`;
    }

    if (!/^\d+MB$/.test(String(kich_thuoc_toi_da || ''))) {
        return 'Kích thước tối đa phải có dạng số kèm đơn vị MB, ví dụ 20MB.';
    }

    const soMB = parseInt(kich_thuoc_toi_da, 10);
    if (soMB < 1 || soMB > 100) {
        return 'Kích thước tối đa phải nằm trong khoảng 1MB đến 100MB.';
    }

    return null;
}

// API cập nhật cấu hình hệ thống — chỉ quản trị viên mới gọi tới
router.put('/', async (req, res) => {
    try {
        const loi = kiemTraDuLieu(req.body);
        if (loi) {
            return res.status(400).json({ success: false, message: loi });
        }

        const duLieuMoi = {
            nguong_trung_lap: Number(req.body.nguong_trung_lap),
            thuat_toan_mac_dinh:
                req.body.thuat_toan_mac_dinh || 'KET_HOP_3_THUAT_TOAN',
            danh_sach_thuat_toan: req.body.danh_sach_thuat_toan.map(t => ({
                ma_thuat_toan: t.ma_thuat_toan,
                ten_thuat_toan: t.ten_thuat_toan,
                mo_ta: t.mo_ta || '',
                trong_so: Number(t.trong_so),
                trang_thai: !!t.trang_thai
            })),
            cho_phep_upload: req.body.cho_phep_upload,
            kich_thuoc_toi_da: req.body.kich_thuoc_toi_da,
            nguoi_cap_nhat: req.body.nguoi_cap_nhat || 'admin',
            ngay_cap_nhat: new Date()
        };

        // Số ngày giữ báo cáo: chỉ ghi khi người dùng có gửi lên, để lần lưu
        // cấu hình thuật toán không vô tình đặt lại giá trị này.
        if (req.body.so_ngay_luu_bao_cao !== undefined) {
            duLieuMoi.so_ngay_luu_bao_cao = Number(req.body.so_ngay_luu_bao_cao);
        }

        // Hệ thống chỉ có duy nhất một bản ghi cấu hình; nếu chưa có thì tạo mới.
        const daLuu = await CauHinhHeThong.findOneAndUpdate(
            {},
            { $set: duLieuMoi },
            { returnDocument: 'after', upsert: true }
        ).lean();

        res.json({
            success: true,
            message: 'Đã lưu cấu hình hệ thống.',
            data: gonCauHinh(daLuu)
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật cấu hình:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// DỌN BÁO CÁO QUÁ HẠN LƯU TRỮ
//
// GET  /api/cau-hinh/don-bao-cao/thu   — chỉ liệt kê những gì sẽ bị xoá
// POST /api/cau-hinh/don-bao-cao       — xoá thật
//
// Truyền ?so_ngay=20 để thử với mốc khác mà không phải đổi cấu hình.
// =========================================================================
router.get('/don-bao-cao/thu', async (req, res) => {
    try {
        const soNgay = req.query.so_ngay !== undefined
            ? Number(req.query.so_ngay) : undefined;

        const kq = await donBaoCaoQuaHan({ chayThu: true, soNgay });
        res.json({ success: true, data: kq });

    } catch (error) {
        console.error('Lỗi khi thử dọn báo cáo:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/don-bao-cao', async (req, res) => {
    try {
        const soNgay = req.body && req.body.so_ngay !== undefined
            ? Number(req.body.so_ngay) : undefined;

        const kq = await donBaoCaoQuaHan({ chayThu: false, soNgay });

        res.json({
            success: true,
            message: kq.batDau
                ? `Đã dọn ${kq.so_bao_cao_da_xoa || 0} báo cáo quá hạn.`
                : kq.ly_do,
            data: kq
        });

    } catch (error) {
        console.error('Lỗi khi dọn báo cáo:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
