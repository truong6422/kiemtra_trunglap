const mongoose = require("mongoose");
const NguoiDung = require("./models/nguoi_dung");
const GiangVien = require("./models/giang_vien");

mongoose.connect("mongodb://localhost:27017/KiemTraTrungLap");

async function syncGiangVien() {
  const users = await NguoiDung.find({ vai_tro: "giang_vien" });

  for (const user of users) {
    const exists = await GiangVien.findOne({ id_nguoi_dung: user.id_nguoi_dung });
    if (!exists) {
      const lastGV = await GiangVien.findOne().sort({ id_giang_vien: -1 });
      let nextGVId = "GV001";
      if (lastGV && lastGV.id_giang_vien) {
        const number = parseInt(lastGV.id_giang_vien.replace("GV", ""), 10);
        const newNumber = (number + 1).toString().padStart(3, "0");
        nextGVId = "GV" + newNumber;
      }

      await GiangVien.create({
        id_giang_vien: nextGVId,
        ma_giang_vien: "",
        ho_ten: user.ho_ten,
        bo_mon: "",
        email: user.email,
        id_nguoi_dung: user.id_nguoi_dung
      });

      console.log(`✅ Đã thêm giảng viên: ${user.ho_ten} (${nextGVId})`);
    }
  }

  console.log("🎉 Đồng bộ dữ liệu giảng viên hoàn tất!");
  mongoose.connection.close();
}

syncGiangVien();
