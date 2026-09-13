const mongoose = require("mongoose");

const NguoiDungSchema = new mongoose.Schema({
  id_nguoi_dung: { type: String, required: true },
  ten_dang_nhap: { type: String, required: true },
  mat_khau: { type: String, required: true },
  ho_ten: { type: String, required: true },
  email: { type: String, required: true },
  vai_tro: { type: String, default: "sinh_vien" },
  trang_thai: { type: Boolean, default: true },
  ngay_tao: { type: Date, default: Date.now },
  ngay_cap_nhat: { type: Date, default: Date.now },
  hinh_anh: { type: String, default: "" },
  googleId: { type: String, default: null }
}, {
  timestamps: false, // ❌ tắt tự động thêm createdAt, updatedAt
  versionKey: false  // ❌ tắt __v
});

module.exports = mongoose.model("NguoiDung", NguoiDungSchema, "nguoi_dung");


