const mongoose = require('mongoose');
require('dotenv').config();

const BaocaoSchema = new mongoose.Schema({}, { strict: false });
// Thêm tham số thứ 3 là 'bao_cao' để ép Mongoose lấy đúng collection này
const BaoCao = mongoose.model('bao_cao', BaocaoSchema, 'bao_cao');

async function run() {
    try {
        // Đảm bảo URI kết nối trỏ đúng database 'KiemTraTrungLap'
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/KiemTraTrungLap';
        await mongoose.connect(uri);
        console.log('🔗 Đã kết nối DB thành công!');

        const doc = await BaoCao.findById('6a83ed8cb525a47eadcbd7dc').lean();
        
        if (!doc) {
            console.log('❌ Vẫn không tìm thấy! Liệt kê thử các bản ghi có sẵn:');
            const allDocs = await BaoCao.find().limit(3).lean();
            console.log(allDocs.map(d => d._id));
            process.exit(0);
        }

        const fs = require('fs');
        fs.writeFileSync('output.json', JSON.stringify(doc, null, 2));
        console.log('✅ Đã xuất file output.json thành công!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

run();