const mongoose = require("mongoose");

const nguonDoiSanhSchema = new mongoose.Schema(
    {
        id_bao_cao: {
            type: String,
            required: true,
            index: true
        },

        chi_so_cau: {
            type: Number,
            required: true
        },

        cau_nguon: {
            type: String,
            default: ""
        },

        do_tuong_dong: {
            type: Number,
            required: true
        },

        cosine: {
            type: Number,
            default: 0
        },

        jaccard: {
            type: Number,
            default: 0
        },

        winnowing: {
            type: Number,
            default: 0
        }
    },
    {
        _id: false
    }
);

const chiTietCauTrungSchema = new mongoose.Schema(
    {
        id_kiem_tra: {
            type: String,
            required: true,
            index: true
        },

        id_bao_cao: {
            type: String,
            required: true,
            index: true
        },

        chi_so_cau_kiem_tra: {
            type: Number,
            required: true
        },

        cau_kiem_tra: {
            type: String,
            required: true
        },

        so_tu: {
            type: Number,
            default: 0
        },

        so_nguon_trung: {
            type: Number,
            default: 0
        },

        danh_sach_nguon: {
            type: [nguonDoiSanhSchema],
            default: []
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
        collection: "chi_tiet_cau_trung_highlight"
    }
);

chiTietCauTrungSchema.index({
    id_kiem_tra: 1,
    chi_so_cau_kiem_tra: 1
});

chiTietCauTrungSchema.index({
    id_kiem_tra: 1,
    id_bao_cao: 1
});

chiTietCauTrungSchema.pre("save", function (next) {

    this.updated_at = new Date();

    this.so_nguon_trung =
        this.danh_sach_nguon.length;

    next();
});

module.exports = mongoose.model(
    "ChiTietCauTrungHighlight",
    chiTietCauTrungSchema,
    "chi_tiet_cau_trung_highlight"
);