const mongoose = require("mongoose");

const lichSuKiemTraSchema = new mongoose.Schema(
    {
        bao_cao_mongo_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        id_lich_su: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        id_bao_cao: {
            type: String,
            required: true,
            ref: "BaoCao",
            index: true
        },

        id_kiem_tra: {
            type: String,
            required: true,
            ref: "KetQuaKiemTra",
            index: true
        },

        id_sinh_vien: {
            type: String,
            required: true,
            ref: "SinhVien",
            index: true
        },

        hanh_dong: {
            type: String,
            default: "kiem_tra_dao_van"
        },

        trang_thai: {
            type: String,
            default: "hoan_thanh",
            enum: [
                "dang_xu_ly",
                "hoan_thanh",
                "loi"
            ]
        },

        ngay_thuc_hien: {
            type: Date,
            default: Date.now
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
        collection: "lich_su_kiem_tra"
    }
);

lichSuKiemTraSchema.index({
    id_sinh_vien: 1,
    ngay_thuc_hien: -1
});

lichSuKiemTraSchema.index({
    id_bao_cao: 1
});

lichSuKiemTraSchema.index({
    id_kiem_tra: 1
});
lichSuKiemTraSchema.index({
    id_bao_cao: 1,
    id_kiem_tra: 1
});

lichSuKiemTraSchema.pre("save", function(next) {
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model(
    "LichSuKiemTra",
    lichSuKiemTraSchema,
    "lich_su_kiem_tra"
);