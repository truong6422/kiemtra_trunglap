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