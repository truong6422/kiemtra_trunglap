const mongoose = require("mongoose");

// id_sinh_vien vừa là khoá của hồ sơ vừa là mã sinh viên in trên thẻ.
//
// Trước đây có thêm ma_sinh_vien để người dùng tự nhập, nên một người mang hai
// mã: "SV005" do hệ thống đặt và "2200461" do người dùng khai. Chỗ nào nối dữ
// liệu theo mã nào thì phải đoán, và bảng điểm danh nộp bài hay lệch. Giờ chỉ
// còn một mã duy nhất: người dùng cập nhật mã trong trang Tài khoản thì mã đó
// ghi thẳng vào id_sinh_vien và mọi bản ghi trỏ tới nó được đổi theo.
const SinhVienSchema = new mongoose.Schema({
  id_sinh_vien: { type: String, required: true, unique: true },
  ho_ten: { type: String, required: true },
  lop: { type: String, required: false },
  khoa_hoc: { type: String, required: false },
  email: { type: String, required: true },
  so_bao_cao: { type: Number, default: 0 },
  id_nguoi_dung: { type: String, required: true, ref: "NguoiDung" }
}, { versionKey: false });

module.exports = mongoose.model("SinhVien", SinhVienSchema, "sinh_vien");
