/**
 * ============================================================================
 * CHẠY TAY CÁC BƯỚC CHUYỂN ĐỔI DỮ LIỆU
 *
 *     node chuyen_doi_csdl.js            — chạy những bước chưa chạy
 *     node chuyen_doi_csdl.js --xem      — chỉ liệt kê, không ghi gì
 *
 * Bình thường không cần dùng tệp này: máy chủ đã tự chạy các bước đó lúc khởi
 * động (xem utils/chuyen_doi_du_lieu.js). Nó có ở đây cho hai lúc:
 *
 *   - Muốn biết máy này còn thiếu bước nào trước khi bật máy chủ.
 *   - Một bước bị lỗi giữa chừng, cần chạy lại riêng để đọc kỹ thông báo.
 * ============================================================================
 */

const mongoose = require('mongoose');
require('dotenv').config();

const {
    chayChuyenDoi,
    CAC_BUOC,
    TEN_COLLECTION_MOC
} = require('./utils/chuyen_doi_du_lieu');

const CHI_XEM = process.argv.includes('--xem');

const MONGO_URI = process.env.MONGO_URI
    || 'mongodb://localhost:27017/KiemTraTrungLap';

async function chay() {
    await mongoose.connect(MONGO_URI);
    console.log(`Cơ sở dữ liệu: ${mongoose.connection.name}\n`);

    const daChay = new Set(
        (await mongoose.connection.db
            .collection(TEN_COLLECTION_MOC).find({}).toArray())
            .map(x => x.ma));

    console.log('Các bước chuyển đổi:');
    for (const b of CAC_BUOC) {
        console.log(`  [${daChay.has(b.ma) ? 'đã chạy ' : 'CHƯA CHẠY'}] ${b.ma}`);
        console.log(`             ${b.mo_ta}`);
    }
    console.log('');

    if (CHI_XEM) {
        console.log('Chế độ xem — không ghi gì. Bỏ --xem để chạy thật.');
    } else {
        const daXong = await chayChuyenDoi();
        console.log(daXong.length
            ? `\nĐã chạy xong ${daXong.length} bước.`
            : '\nKhông có bước nào phải chạy.');
    }

    await mongoose.disconnect();
}

chay().catch(e => {
    console.error('Chuyển đổi thất bại:', e);
    process.exit(1);
});
