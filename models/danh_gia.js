const mongoose = require('mongoose');

const DANH_GIA_SO_SAO_MIN = 1;
const DANH_GIA_SO_SAO_MAX = 5;

const danhGiaSchema = new mongoose.Schema(
    {
        id_danh_gia: {
            type: String,
            unique: true,
            index: true
        },

        // Người đánh giá (có thể để trống nếu không yêu cầu đăng nhập)
        id_sinh_vien: {
            type: String,
            default: '',
            index: true
        },

        // Lần kiểm tra vừa hoàn thành (tùy chọn, để biết đánh giá sau lần kiểm tra nào)
        id_kiem_tra: {
            type: String,
            default: '',
            index: true
        },

        // Mã báo cáo liên quan (tùy chọn)
        id_bao_cao: {
            type: String,
            default: '',
            index: true
        },

        // Số sao đánh giá (1–5)
        so_sao: {
            type: Number,
            required: true,
            min: DANH_GIA_SO_SAO_MIN,
            max: DANH_GIA_SO_SAO_MAX
        },

        // Bình luận của người dùng
        binh_luan: {
            type: String,
            default: '',
            maxlength: 2000
        },

        ngay_danh_gia: {
            type: Date,
            default: Date.now,
            index: true
        },

        created_at: {
            type: Date,
            default: Date.now
        },

        updated_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        versionKey: false,
        collection: 'danh_gia'
    }
);

// =====================================================
// INDEX
// =====================================================

danhGiaSchema.index({ ngay_danh_gia: -1 });
danhGiaSchema.index({ id_sinh_vien: 1, ngay_danh_gia: -1 });
danhGiaSchema.index({ so_sao: 1 });

// =====================================================
// AUTO UPDATE TIMESTAMP
// =====================================================

danhGiaSchema.pre('save', function () {
    this.updated_at = new Date();
});

danhGiaSchema.pre('findOneAndUpdate', function () {
    this.set({ updated_at: new Date() });
});

module.exports = mongoose.model('DanhGia', danhGiaSchema, 'danh_gia');
