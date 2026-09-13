const mongoose = require('mongoose');

const baiChiTietNopBaiSchema = new mongoose.Schema({
    id_bai_tap: { type: String, required: true },
    id_sinh_vien: { type: String, required: true },
    id_bao_cao: { type: String, required: true },
    tieu_de_tep: { type: String, required: true },
    ngay_nop: { type: Date, default: Date.now },
    trang_thai: { type: String, default: "Đã nộp" },
    loai_bao_cao: { type: String, default: "pdf" }
}, {
    timestamps: true
});

module.exports = mongoose.model('BaiChiTietNopBai', baiChiTietNopBaiSchema, "chi_tiet_nop_bai");