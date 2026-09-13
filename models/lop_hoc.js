const mongoose = require('mongoose');

const lopHocSchema = new mongoose.Schema({
    id_lop_hoc: {
        type: Number,
        required: true,
        unique: true
    },
    id_nguoi_dung: {
        type: String,
        required: true
    },
    tieu_de: {
        type: String,
        required: true
    },
    mo_ta: {
        type: Array,
        default: []
    },
    ma_lop: {
        type: String,
        required: true,
        unique: true
    },
    danh_sach_thanh_vien: { 
        type: Array, 
        default: [] 
    },
    ngay_tao: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'lop_hoc',
    timestamps: { createdAt: 'ngay_tao', updatedAt: 'ngay_cap_nhat' }
});

module.exports = mongoose.model('LopHoc', lopHocSchema);