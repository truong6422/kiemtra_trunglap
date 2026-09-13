const mongoose = require("mongoose");
const NguoiDung = require("./models/nguoi_dung");
const SinhVien = require("./models/sinh_vien");

// Kết nối MongoDB
/*mongoose.connect("mongodb://localhost:27017/KiemTraTrungLap", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});*/

mongoose.connect("mongodb://localhost:27017/KiemTraTrungLap");

async function syncSinhVien() {
  const users = await NguoiDung.find({ vai_tro: "sinh_vien" });

  for (const user of users) {
    const exists = await SinhVien.findOne({ id_nguoi_dung: user.id_nguoi_dung });
    if (!exists) {
      const lastSV = await SinhVien.findOne().sort({ id_sinh_vien: -1 });
      let nextSVId = "SV001";
      if (lastSV && lastSV.id_sinh_vien) {
        const number = parseInt(lastSV.id_sinh_vien.replace("SV", ""), 10);
        const newNumber = (number + 1).toString().padStart(3, "0");
        nextSVId = "SV" + newNumber;
      }

      await SinhVien.create({
        id_sinh_vien: nextSVId,
        ma_sinh_vien: "",
        ho_ten: user.ho_ten,
        lop: "",
        khoa_hoc: "",
        email: user.email,
        so_bao_cao: 0,
        id_nguoi_dung: user.id_nguoi_dung
      });

      console.log(`✅ Đã thêm sinh viên: ${user.ho_ten} (${nextSVId})`);
    }
  }

  console.log("🎉 Đồng bộ dữ liệu sinh viên hoàn tất!");
  mongoose.connection.close();
}

syncSinhVien();
