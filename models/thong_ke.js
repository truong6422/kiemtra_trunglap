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

        // Đoạn chắp vá: nhiều câu nằm rời nhau trong báo cáo mẫu này bị ghép
        // liền lại thành một đoạn trong bài nộp.
        so_doan_chap_va: {
            type: Number,
            default: 0
        },

        ti_le_trung_lap: {
            type: Number,
            default: 0
        },

        // Báo cáo mẫu này phủ gần hết bài nộp: bài nộp là bản sao của nó chứ
        // không phải chỉ giống nhau vài đoạn.
        trung_toan_bai: {
            type: Boolean,
            default: false
        },

        // Điểm trung bình của từng thuật toán trên các câu trùng với báo cáo
        // mẫu này, tính theo phần trăm (0–100).
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

        // Bài nộp là bản sao gần như nguyên vẹn của một báo cáo mẫu.
        trung_toan_bai: {
            type: Boolean,
            default: false
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