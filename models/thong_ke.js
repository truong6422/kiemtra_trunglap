const mongoose = require("mongoose");

const thongKeTheoMauSchema = new mongoose.Schema(
    {
        id_bao_cao: {
            type: String,
            required: true
        },

        ten_bao_cao: {
            type: String,
            default: ""
        },

        so_cau_trung: {
            type: Number,
            default: 0
        },

        so_tu_trung: {
            type: Number,
            default: 0
        },

        so_doan_trung: {
            type: Number,
            default: 0
        },

        ti_le_trung_lap: {
            type: Number,
            default: 0
        },

        cosine_trung_binh: {
            type: Number,
            default: 0
        },

        jaccard_trung_binh: {
            type: Number,
            default: 0
        },

        winnowing_trung_binh: {
            type: Number,
            default: 0
        },

        tong_hop_trung_binh: {
            type: Number,
            default: 0
        }
    },
    {
        _id: false
    }
);

const thongKeSchema = new mongoose.Schema(
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
            index: true
        },

        id_sinh_vien: {
            type: String,
            default: "",
            index: true
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

        ti_le_trung_lap: {
            type: Number,
            default: 0
        },

        thong_ke_theo_mau: {
            type: [thongKeTheoMauSchema],
            default: []
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
        collection: "thong_ke"
    }
);

// =====================================================
// INDEX
// =====================================================

// Ba trường id_bao_cao, bao_cao_mongo_id và id_sinh_vien đã khai báo
// index: true ngay tại chỗ định nghĩa ở trên. Khai thêm một lần nữa ở đây làm
// Mongoose in cảnh báo "Duplicate schema index" mỗi lần máy chủ khởi động.
// Các chỉ mục ghép nhiều trường bên dưới thì vẫn cần giữ.

thongKeSchema.index({
    ngay_kiem_tra: -1
});

thongKeSchema.index({
    id_sinh_vien: 1,
    ngay_kiem_tra: -1
});

thongKeSchema.index({
    id_bao_cao: 1,
    ngay_kiem_tra: -1
});
thongKeSchema.index({
    id_bao_cao: 1,
    id_kiem_tra: 1
});

// =====================================================
// AUTO UPDATE TIMESTAMP
// =====================================================

thongKeSchema.pre("save", function () {
    this.updated_at = new Date();
});

thongKeSchema.pre("findOneAndUpdate", function () {
    this.set({
        updated_at: new Date()
    });
});

module.exports = mongoose.model(
    "ThongKe",
    thongKeSchema,
    "thong_ke"
);