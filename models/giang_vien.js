const mongoose = require("mongoose");

const GiangVienSchema = new mongoose.Schema({
  id_giang_vien: { type: String, required: true, unique: true }, // GV001, GV002...
  ma_giang_vien: { type: String, required: false },
  ho_ten: { type: String, required: true },
  bo_mon: { type: String, required: false },
  email: { type: String, required: true },
  so_lan_kiem_tra: { type: Number, default: 0 },
  id_nguoi_dung: { type: String, required: true, ref: "NguoiDung" } // liên kết FK
}, {
  versionKey: false
});

module.exports = mongoose.model("GiangVien", GiangVienSchema, "giang_vien");
