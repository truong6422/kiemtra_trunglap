/**
 * ============================================================================
 * VỆT BÔI MÀU CỦA MỘT BÁO CÁO
 *
 * Trước đây trang chi tiết tự dò chữ trên trình duyệt để bôi màu, còn bản PDF
 * tải xuống lại do worker tính riêng. Hai thuật toán khác nhau nên hai bên bôi
 * khác nhau, dù cùng một bài.
 *
 * Giờ worker là nơi duy nhất tính vùng bôi màu. Kết quả được lưu ở đây để trang
 * chi tiết vẽ lại đúng những vệt đó — một nơi tính, hai nơi vẽ.
 *
 * Toạ độ giữ nguyên hệ của PDF: gốc ở góc dưới bên trái, đơn vị point. Trang
 * chi tiết tự quy đổi sang toạ độ màn hình theo tỉ lệ đang xem.
 * ============================================================================
 */

const mongoose = require('mongoose');

const vetSchema = new mongoose.Schema(
    {
        trang: { type: Number, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        rong: { type: Number, required: true },
        cao: { type: Number, required: true },

        // Các câu trùng đã góp phần vào vệt này, dùng cho thao tác bấm vào vệt
        // để xem câu tương ứng ở trang chi tiết.
        cac_cau: { type: [Number], default: [] }
    },
    { _id: false }
);

const vetBoiMauSchema = new mongoose.Schema(
    {
        id_bao_cao: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        id_kiem_tra: {
            type: String,
            default: ''
        },

        // Kích thước từng trang của bản PDF đã dùng để tính, để trang chi tiết
        // đối chiếu chắc chắn đang vẽ lên đúng bản đó.
        kich_thuoc_trang: {
            type: [
                new mongoose.Schema(
                    {
                        trang: Number,
                        rong: Number,
                        cao: Number
                    },
                    { _id: false }
                )
            ],
            default: []
        },

        cac_vet: {
            type: [vetSchema],
            default: []
        },

        ngay_tao: {
            type: Date,
            default: Date.now
        }
    },
    { collection: 'vet_boi_mau' }
);

module.exports = mongoose.model(
    'VetBoiMau',
    vetBoiMauSchema,
    'vet_boi_mau'
);
