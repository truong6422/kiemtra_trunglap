const mongoose = require('mongoose');

const CauHinhHeThongSchema = new mongoose.Schema(
    {
        nguong_trung_lap: {
            type: Number,
            default: 0.6
        },

        thuat_toan_mac_dinh: {
            type: String,
            default: 'KET_HOP_3_THUAT_TOAN'
        },

        // Bật / tắt và trọng số của từng thuật toán. Tổng trọng số các thuật
        // toán đang bật luôn bằng 1, do màn Quản lý cấu hình kiểm trước khi lưu.
        danh_sach_thuat_toan: {
            type: [
                {
                    _id: false,
                    ma_thuat_toan: String,
                    ten_thuat_toan: String,
                    mo_ta: String,
                    trong_so: Number,
                    trang_thai: Boolean
                }
            ],
            default: undefined
        },

        cho_phep_upload: {
            type: [String],
            default: undefined
        },

        kich_thuoc_toi_da: {
            type: String,
            default: '20MB'
        },

        // Số ngày giữ báo cáo của người dùng trong hệ thống. Quá hạn thì bản
        // ghi và tệp trong uploads, upload2 bị dọn đi để hệ thống không phình
        // mãi. Mặc định 180 ngày (khoảng 6 tháng).
        // Đặt 0 để tắt hẳn việc tự động dọn.
        so_ngay_luu_bao_cao: {
            type: Number,
            default: 180
        },

        // Lần dọn gần nhất, chỉ để tra cứu
        lan_don_gan_nhat: {
            type: Date,
            default: null
        },

        nguoi_cap_nhat: {
            type: String,
            default: ''
        },

        ngay_cap_nhat: {
            type: Date,
            default: Date.now
        },

        tu_vung_va_idf: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        collection: 'cau_hinh_he_thong',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

CauHinhHeThongSchema.index({
    ngay_cap_nhat: -1
});

module.exports = mongoose.model(
    'CauHinhHeThong',
    CauHinhHeThongSchema,
    'cau_hinh_he_thong'
);