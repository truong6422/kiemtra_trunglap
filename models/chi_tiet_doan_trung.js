const mongoose = require("mongoose");

const chiTietDoanTrungSchema = new mongoose.Schema(
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

        id_bao_cao_nguon: {
            type: String,
            required: true,
            index: true
        },

        tu_cau_kiem_tra: {
            type: Number,
            required: true
        },

        den_cau_kiem_tra: {
            type: Number,
            required: true
        },

        tu_cau_nguon: {
            type: Number,
            required: true
        },

        den_cau_nguon: {
            type: Number,
            required: true
        },
        
        so_cau: {
            type: Number,
            default: 0
        },

        do_tuong_dong_trung_binh: {
            type: Number,
            default: 0
        },

        do_tuong_dong_cao_nhat: {
            type: Number,
            default: 0
        },

        doan_kiem_tra: {
            type: String,
            default: ""
        },

        doan_nguon: {
            type: String,
            default: ""
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
        collection: "chi_tiet_doan_trung"
    }
);

chiTietDoanTrungSchema.index({
    id_kiem_tra: 1,
    id_bao_cao_nguon: 1
});

chiTietDoanTrungSchema.index({
    id_kiem_tra: 1,
    tu_cau_kiem_tra: 1,
    den_cau_kiem_tra: 1
});

chiTietDoanTrungSchema.pre("save", function (next) {

    this.updated_at = new Date();

    if (
        this.tu_cau_kiem_tra !== undefined &&
        this.den_cau_kiem_tra !== undefined
    ) {
        this.so_cau =
            this.den_cau_kiem_tra -
            this.tu_cau_kiem_tra +
            1;
    }

    next();
});

module.exports = mongoose.model(
    "ChiTietDoanTrung",
    chiTietDoanTrungSchema,
    "chi_tiet_doan_trung"
);