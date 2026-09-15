const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ Thiếu MONGO_URI trong tệp .env — không biết phải nối vào cơ sở dữ liệu nào.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    // In tên cơ sở dữ liệu ra màn hình. Máy chủ và worker phải cùng một tên;
    // khác nhau thì mỗi bên đọc ghi một nơi, bên kia nhìn vào thấy trống trơn.
    console.log(`✅ Kết nối MongoDB thành công — cơ sở dữ liệu: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;