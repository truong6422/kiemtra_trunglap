const mongoose = require('mongoose');

const baoCaoSchema = new mongoose.Schema(
    {
        id_bao_cao: {
            type: String,
            required: true,
            unique: true
        },

        tieu_de: {
            type: String,
            required: true
        },

        loai_bao_cao: {
            type: String,
            default: ""
        },

        tep_tin: {
            type: String,
            required: true
        },

        noi_dung_tien_xu_ly: {
            type: String,
            default: ""
        },

        ngay_tai_len: {
            type: Date,
            default: Date.now
        },

        trang_thai: {
            type: String,
            default: "Đang xử lý"
        },

        id_sinh_vien: {
            type: String,
            default: ""
        },

        mau_kiem_tra: {
            type: Boolean,
            default: false
        },

        // Phạm vi trang đã chấm khi người dùng chọn "Kiểm tra một phần".
        // Rỗng nghĩa là chấm toàn bộ tài liệu.
        pham_vi_trang: {
            type: String,
            default: ""
        },

        // Báo cáo mẫu do quản trị viên bổ sung từ trang Quản lý tài liệu.
        // Nguồn: "tep_may_tinh" hoặc mã báo cáo đã kiểm tra được lấy làm mẫu.
        // Báo cáo mẫu cũ không có hai trường này.
        nguon_bo_sung: {
            type: String
        },

        // false = mới thêm, chưa tiền xử lý / tính chỉ số câu. Không đặt
        // mặc định để báo cáo cũ không bị coi là đang chờ tính toán.
        da_tinh_toan: {
            type: Boolean
        }
    },
    {
        collection: 'bao_cao'
    }
);

baoCaoSchema.index({
    id_sinh_vien: 1
});
baoCaoSchema.index({
    id_bao_cao: 1,
    trang_thai: 1
});
baoCaoSchema.index({
    mau_kiem_tra: 1
});

baoCaoSchema.index({
    ngay_tai_len: -1
});

baoCaoSchema.index({
    id_sinh_vien: 1,
    ngay_tai_len: -1
});

baoCaoSchema.index({
    trang_thai: 1
});

module.exports = mongoose.model(
    'BaoCao',
    baoCaoSchema,
    'bao_cao'
);