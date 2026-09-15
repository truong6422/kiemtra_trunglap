const mongoose = require("mongoose");

const nguonChapVaSchema = new mongoose.Schema(
    {
        id_bao_cao_nguon: {
            type: String,
            required: true
        },

        tu_cau_nguon: {
            type: Number,
            default: 0
        },

        den_cau_nguon: {
            type: Number,
            default: 0
        },

        so_cau: {
            type: Number,
            default: 0
        }
    },
    {
        _id: false
    }
);

const chiTietDoanChapVaSchema = new mongoose.Schema(
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

        tu_cau_kiem_tra: {
            type: Number,
            required: true
        },

        den_cau_kiem_tra: {
            type: Number,
            required: true
        },

        so_cau: {
            type: Number,
            default: 0
        },

        so_nguon: {
            type: Number,
            default: 0
        },

        danh_sach_id_bao_cao_nguon: {
            type: [String],
            default: []
        },

        chi_tiet_nguon: {
            type: [nguonChapVaSchema],
            default: []
        },

        doan_chap_va: {
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
        collection: "chi_tiet_doan_chap_va"
    }
);



// Các trường dưới đây đã khai báo index: true ngay tại chỗ định nghĩa ở
// trên. Khai thêm một lần nữa làm Mongoose in cảnh báo "Duplicate schema
// index" mỗi lần máy chủ khởi động. Chỉ mục ghép nhiều trường vẫn giữ.
chiTietDoanChapVaSchema.index({
    id_kiem_tra: 1,
    tu_cau_kiem_tra: 1,
    den_cau_kiem_tra: 1
});

chiTietDoanChapVaSchema.pre("save", function (next) {

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

    this.so_nguon =
        this.danh_sach_id_bao_cao_nguon.length;

    next();
});

module.exports = mongoose.model(
    "ChiTietDoanChapVa",
    chiTietDoanChapVaSchema,
    "chi_tiet_doan_chap_va"
);