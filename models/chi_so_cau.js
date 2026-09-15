const mongoose = require('mongoose');

const ChiSoCauSchema = new mongoose.Schema(
    {
        // Tham chiếu báo cáo gốc
        bao_cao_mongo_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        id_bao_cao: {
            type: String,
            required: true,
            index: true
        },

        // Báo cáo mẫu hay báo cáo kiểm tra
        mau_kiem_tra: {
            type: Boolean,
            required: true,
            default: true,
            index: true
        },

        loai_bao_cao: {
            type: String,
            default: null,
            index: true
        },

        // Chỉ số câu
        sentenceIndex: {
            type: Number,
            required: true,
            index: true
        },

        // Nội dung câu
        content: {
            type: String,
            required: true
        },

        clean_content: {
            type: String,
            required: true
        },

        // Thống kê
        token_count: {
            type: Number,
            required: true,
            default: 0
        },

        sentence_hash: {
            type: String,
            required: true,
            index: true
        },

        // TF-IDF theo câu
        vector_tf_idf: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        // Winnowing fingerprint theo câu
        fingerprints: {
            type: [Number],
            default: []
        },

        fingerprint_count: {
            type: Number,
            default: 0
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
        collection: 'chi_so_cau'
    }
);

/**
 * ==========================================================
 * INDEX
 * ==========================================================
 */

// Tra cứu câu trong báo cáo
// Các trường dưới đây đã khai báo index: true ngay tại chỗ định nghĩa ở
// trên. Khai thêm một lần nữa làm Mongoose in cảnh báo "Duplicate schema
// index" mỗi lần máy chủ khởi động. Chỉ mục ghép nhiều trường vẫn giữ.
ChiSoCauSchema.index({
    id_bao_cao: 1,
    sentenceIndex: 1
});

// Trùng tuyệt đối
ChiSoCauSchema.index({
    mau_kiem_tra: 1,
    sentence_hash: 1
});
ChiSoCauSchema.index({
    fingerprints: 1
});
// Candidate retrieval
ChiSoCauSchema.index({
    mau_kiem_tra: 1,
    fingerprints: 1
});
ChiSoCauSchema.index({
    mau_kiem_tra: 1,
    id_bao_cao: 1
});
ChiSoCauSchema.index({
    id_bao_cao: 1,
    sentence_hash: 1
});

ChiSoCauSchema.index({
    id_bao_cao: 1,
    fingerprints: 1
});
// Auto update updated_at
ChiSoCauSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

ChiSoCauSchema.pre('findOneAndUpdate', function(next) {
    this.set({
        updated_at: new Date()
    });

    next();
});

module.exports = mongoose.model(
    'ChiSoCau',
    ChiSoCauSchema,
    'chi_so_cau'
);