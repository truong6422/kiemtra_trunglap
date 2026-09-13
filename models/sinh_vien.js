const mongoose = require("mongoose");

const SinhVienSchema = new mongoose.Schema({
  id_sinh_vien: { type: String, required: true, unique: true },
  ma_sinh_vien: { type: String, required: false },
  ho_ten: { type: String, required: true },
  lop: { type: String, required: false },
  khoa_hoc: { type: String, required: false },
  email: { type: String, required: true },
  so_bao_cao: { type: Number, default: 0 },
  id_nguoi_dung: { type: String, required: true, ref: "NguoiDung" }
}, { versionKey: false });

module.exports = mongoose.model("SinhVien", SinhVienSchema, "sinh_vien");
