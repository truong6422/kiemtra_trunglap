/**
 * ============================================================================
 * ÁP DỤNG GIỚI HẠN TỆP TẢI LÊN THEO BẢN GHI CẤU HÌNH
 *
 * Màn Quản lý cấu hình cho quản trị viên đặt hai thứ:
 *
 *   - kich_thuoc_toi_da : dung lượng tối đa mỗi tệp, dạng chuỗi "20MB"
 *   - cho_phep_upload   : danh sách phần mở rộng được nhận, ví dụ [".pdf"]
 *
 * Trước đây hai giá trị này chỉ được lưu rồi hiển thị lại: multer dựng sẵn
 * không khai limits, còn phần kiểm định dạng thì gán cứng trong mã nguồn. Đổi
 * số trong màn cấu hình không có tác dụng gì với luồng tải lên thật.
 *
 * Mô-đun này đọc bản ghi cấu hình rồi chặn ngay sau khi multer nhận tệp. Vì
 * quản trị viên có thể đổi số bất cứ lúc nào nên không nhét được vào tham số
 * lúc dựng multer — giá trị phải được đọc lại theo từng lượt tải lên. Kết quả
 * được nhớ tạm một lúc để không phải truy vấn cơ sở dữ liệu cho mỗi tệp.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const CauHinhHeThong = require('../models/cau_hinh_he_thong');

/** Dùng khi chưa có bản ghi cấu hình nào. Khớp với mặc định của schema. */
const SO_MB_MAC_DINH = 20;
const DINH_DANG_MAC_DINH = ['.docx', '.pdf', '.doc', '.txt'];

/** Thời gian nhớ tạm kết quả đọc cấu hình (mili giây). */
const THOI_GIAN_NHO = 30 * 1000;

let banNho = null;

/**
 * Đọc giới hạn hiện hành từ bản ghi cấu hình.
 * @returns {Promise<{soByte: number, soMB: number, dinhDang: string[]}>}
 */
async function layGioiHan() {
    if (banNho && Date.now() < banNho.hetHan) {
        return banNho.giaTri;
    }

    let soMB = SO_MB_MAC_DINH;
    let dinhDang = DINH_DANG_MAC_DINH;

    try {
        const cauHinh = await CauHinhHeThong
            .findOne()
            .select('kich_thuoc_toi_da cho_phep_upload')
            .lean();

        if (cauHinh) {
            const so = parseInt(cauHinh.kich_thuoc_toi_da, 10);
            if (!Number.isNaN(so) && so > 0) soMB = so;

            if (Array.isArray(cauHinh.cho_phep_upload)
                && cauHinh.cho_phep_upload.length > 0) {
                dinhDang = cauHinh.cho_phep_upload;
            }
        }
    } catch (e) {
        console.error('Không đọc được cấu hình giới hạn tệp:', e.message);
    }

    const giaTri = {
        soMB,
        soByte: soMB * 1024 * 1024,
        dinhDang: dinhDang.map(d => String(d).toLowerCase())
    };

    banNho = { giaTri, hetHan: Date.now() + THOI_GIAN_NHO };

    return giaTri;
}

/** Quên kết quả đã nhớ. Gọi ngay sau khi lưu cấu hình mới. */
function quenBanNho() {
    banNho = null;
}

/**
 * Middleware đặt ngay sau multer.
 *
 * Tệp vượt dung lượng hoặc sai định dạng thì xoá khỏi đĩa rồi trả 400 kèm câu
 * nói rõ mức trần đang đặt, để người dùng biết phải làm gì.
 */
async function apDungGioiHanTep(req, res, next) {
    if (!req.file) return next();

    const gioiHan = await layGioiHan();
    const duoi = path.extname(req.file.originalname || '').toLowerCase();

    const xoaTep = () => {
        try {
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (e) {
            console.error('Không xoá được tệp bị từ chối:', e.message);
        }
    };

    if (req.file.size > gioiHan.soByte) {
        xoaTep();

        const soMBCuaTep = (req.file.size / 1024 / 1024).toFixed(1);

        return res.status(400).json({
            success: false,
            message: `Tệp "${req.file.originalname}" nặng ${soMBCuaTep}MB, vượt `
                + `mức tối đa ${gioiHan.soMB}MB đang đặt trong Quản lý cấu hình.`
        });
    }

    if (duoi && !gioiHan.dinhDang.includes(duoi)) {
        xoaTep();

        return res.status(400).json({
            success: false,
            message: `Định dạng "${duoi}" không nằm trong danh sách được phép tải `
                + `lên (${gioiHan.dinhDang.join(', ')}). Danh sách này đặt trong `
                + `Quản lý cấu hình.`
        });
    }

    return next();
}

module.exports = { layGioiHan, quenBanNho, apDungGioiHanTep };
