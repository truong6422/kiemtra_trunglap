const mongoose = require('mongoose');

const baiTapSchema = new mongoose.Schema({
    id_bai_tap: { 
        type: Number, 
        unique: true 
    }, // Khóa chính, tự tăng từ 1
    id_lop_hoc: { 
        type: Number, 
        required: true 
    }, // Liên kết đến bảng lop_hoc (FK)
    tieu_de: { 
        type: String, 
        required: true, 
        trim: true 
    }, // Tiêu đề chính của bài tập
    huong_dan: { 
        type: String, 
        default: "" 
    }, // Nội dung hướng dẫn
    thoi_gian_bat_dau: { 
        type: mongoose.Schema.Types.Mixed, 
        default: null 
    }, // Thời điểm bắt đầu mở bài
    thoi_gian_ket_thuc: { 
        type: mongoose.Schema.Types.Mixed, 
        default: "Không giới hạn" 
    }, // Thời điểm đóng bài hoặc "Không giới hạn"
    trang_thai: { 
        type: String, 
        enum: ['Chưa mở', 'Đang mở', 'Đã hết hạn'], 
        default: 'Chưa mở' 
    }, // Trạng thái bài tập
    dinh_dang_file: { 
        type: String, 
        default: "docx hoặc pdf" 
    }, // Các định dạng file cho phép
    id_kiem_tra: { 
        type: String, 
        default: null 
    }, // Liên kết đến bảng ket_qua_kiem_tra (FK)
    danh_sach_nop_bai: [{
        // Mã sinh viên thật (ví dụ 2200461), không phải id_nguoi_dung
        id_sinh_vien: { type: String },
        ho_ten: { type: String },
        trang_thai_nop: {
            type: String,
            enum: ['Chưa nộp', 'Đã nộp'],
            default: 'Chưa nộp'
        },
        thoi_gian_nop: { type: Date, default: null },
        // Tên tệp sinh viên đã nộp. Mỗi bài tập chỉ nhận một tài liệu nên đây là
        // một tên chứ không phải danh sách như trước.
        ten_tep: { type: String, default: "" },
        // Mã báo cáo đang được nộp cho bài tập này, để mở thẳng trang chi tiết
        id_bao_cao: { type: String, default: "" }
    }], // Mảng quản lý nộp bài của sinh viên
    ngay_tao: { 
        type: Date, 
        default: Date.now 
    }, // Thời điểm tạo bài tập
    ngay_cap_nhat: { 
        type: Date, 
        default: Date.now 
    }  // Thời điểm cập nhật gần nhất
});
// Middleware tự động tăng id_bai_tap và cập nhật ngay_cap_nhat
// Middleware tự động tăng id_bai_tap an toàn không bị trùng lặp
baiTapSchema.pre('save', async function() {
    if (this.isNew) {
        // Tìm bài tập có id_bai_tap lớn nhất hiện tại trong CSDL
        const lastBaiTap = await this.constructor.findOne().sort({ id_bai_tap: -1 }).lean();
        
        // Nếu có bài tập trước đó thì lấy ID lớn nhất + 1, ngược lại bắt đầu từ 1
        this.id_bai_tap = lastBaiTap && typeof lastBaiTap.id_bai_tap === 'number' ? lastBaiTap.id_bai_tap + 1 : 1;
    }
    this.ngay_cap_nhat = Date.now();
});
module.exports = mongoose.model('BaiTap', baiTapSchema, "bai_tap");