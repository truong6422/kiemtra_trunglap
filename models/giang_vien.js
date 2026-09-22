const mongoose = require("mongoose");

const GiangVienSchema = new mongoose.Schema({
  // Vừa là khoá hồ sơ vừa là mã giảng viên — xem ghi chú trong models/sinh_vien.js
  id_giang_vien: { type: String, required: true, unique: true }, // GV001, GV002...
  ho_ten: { type: String, required: true },
  bo_mon: { type: String, required: false },
  email: { type: String, required: true },
  id_nguoi_dung: { type: String, required: true, ref: "NguoiDung" } // liên kết FK
}, {
  versionKey: false
});

module.exports = mongoose.model("GiangVien", GiangVienSchema, "giang_vien");
