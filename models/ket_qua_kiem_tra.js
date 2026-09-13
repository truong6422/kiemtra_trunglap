const mongoose = require("mongoose");

const ketQuaKiemTraSchema = new mongoose.Schema(
    {
        bao_cao_mongo_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        id_kiem_tra: {
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

        id_sinh_vien: {
            type: String,
            default: "",
            ref: "SinhVien",
            index: true
        },

        ti_le_trung_lap: {
            type: Number,
            required: true,
            default: 0
        },

        tong_so_cau: {
            type: Number,
            default: 0
        },

        tong_so_tu: {
            type: Number,
            default: 0
        },

        tong_so_cau_trung: {
            type: Number,
            default: 0
        },

        tong_so_tu_trung: {
            type: Number,
            default: 0
        },

        tong_so_doan_trung: {
            type: Number,
            default: 0
        },

        tong_so_doan_chap_va: {
            type: Number,
            default: 0
        },

        so_nguon_phat_hien: {
            type: Number,
            default: 0
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

        ngay_kiem_tra: {
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
        collection: "ket_qua_kiem_tra"
    }
);

// =====================================================================
// INDEX
// =====================================================================

ketQuaKiemTraSchema.index({
    id_bao_cao: 1
});

ketQuaKiemTraSchema.index({
    bao_cao_mongo_id: 1
});

ketQuaKiemTraSchema.index({
    ngay_kiem_tra: -1
});

ketQuaKiemTraSchema.index({
    id_sinh_vien: 1,
    ngay_kiem_tra: -1
});
ketQuaKiemTraSchema.index({
    id_bao_cao: 1,
    trang_thai: 1
});
ketQuaKiemTraSchema.index({
    id_bao_cao: 1,
    ngay_kiem_tra: -1
});
ketQuaKiemTraSchema.index({
    id_kiem_tra: 1,
    id_bao_cao: 1
});

// =====================================================================
// AUTO UPDATE TIMESTAMP
// =====================================================================

ketQuaKiemTraSchema.pre("save", function () {

    this.updated_at = new Date();

});

ketQuaKiemTraSchema.pre("findOneAndUpdate", function () {

    this.set({
        updated_at: new Date()
    });

});
module.exports = mongoose.model(
    "KetQuaKiemTra",
    ketQuaKiemTraSchema,
    "ket_qua_kiem_tra"
);