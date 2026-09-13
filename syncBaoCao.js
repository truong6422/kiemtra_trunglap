const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const BaoCao = require("./models/bao_cao");

mongoose.connect("mongodb://localhost:27017/KiemTraTrungLap");

const rootDir = "D:/kiemtra_trunglap/restructuring_data"; // thư mục cha chứa các loại báo cáo

async function syncBaoCao() {
  let counter = 1;

  const folders = fs.readdirSync(rootDir);

  for (const folder of folders) {
    const folderPath = path.join(rootDir, folder);
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const ext = path.extname(file);
      if (ext === ".docx" || ext === ".pdf") {
        const tieuDe = path.basename(file, ext);
        const idBaoCao = "ID" + counter.toString().padStart(3, "0");
        const tepTin = path.join(folderPath, file);

        await BaoCao.create({
          id_bao_cao: idBaoCao,
          tieu_de: tieuDe,
          loai_bao_cao: folder,
          tep_tin: tepTin,
          noi_dung_tien_xu_ly: "",
          ngay_tai_len: new Date(),
          trang_thai: "",
          id_sinh_vien: ""
        });

        console.log(`✅ Đã thêm báo cáo: ${tieuDe} (${idBaoCao})`);
        counter++;
      }
    }
  }

  console.log("🎉 Đồng bộ dữ liệu báo cáo hoàn tất!");
  mongoose.connection.close();
}

syncBaoCao();
