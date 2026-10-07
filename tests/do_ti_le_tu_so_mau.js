/**
 * ĐO TỈ LỆ TRÙNG KHI KIỂM TRA LẠI CHÍNH MỘT BÁO CÁO MẪU
 * ----------------------------------------------------------------------------
 * Lấy tệp gốc của một báo cáo mẫu, cho đi qua đúng các bước như khi sinh viên
 * tải lên (trích xuất chữ -> tách đoạn/câu -> lập chỉ số câu -> đối sánh), rồi
 * in tỉ lệ trùng và danh sách câu không khớp. Tệp mẫu giống hệt bài trong kho
 * nên tỉ lệ phải xấp xỉ 100%; thấp hơn nhiều là có câu bị tách khác nhau giữa
 * kho mẫu và bài tải lên.
 *
 * Dùng:  node tests/do_ti_le_tu_so_mau.js restructuring_data/DATN/1800488.docx
 * Bản ghi thử được xoá sạch sau khi chạy (thêm --giu để giữ lại mà soi).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const BaoCao = require('../models/bao_cao');
const ChiSoCau = require('../models/chi_so_cau');
const { trichXuatVanBan } = require('../utils/trich_xuat_text');
const { xuLyBaoCaoUpload } = require('../utils/xu_ly_bao_cao_upload');
const { checkPlagiarism } = require('../utils/kiem_tra_trung_lap');

async function main() {
    const tep = process.argv[2];
    if (!tep) throw new Error('Thiếu đường dẫn tệp mẫu.');
    await mongoose.connect(process.env.MONGO_URI);

    const giuLai = process.argv.includes('--giu');
    const id = giuLai ? 'THU_GIU' : 'THU_' + Date.now();
    if (giuLai) {
        await BaoCao.deleteMany({ id_bao_cao: id });
        await ChiSoCau.deleteMany({ id_bao_cao: id });
    }
    try {
        const noiDung = await trichXuatVanBan(tep);
        await BaoCao.create({
            id_bao_cao: id,
            tieu_de: id,
            loai_bao_cao: 'Báo cáo kiểm tra',
            tep_tin: tep,
            noi_dung_tien_xu_ly: noiDung,
            mau_kiem_tra: false,
            trang_thai: 'Đang xử lý'
        });
        const bc = await BaoCao.findOne({ id_bao_cao: id }).lean();
        await xuLyBaoCaoUpload(bc);
        const kq = await checkPlagiarism(id, null);

        const nguon = (kq.thong_ke_theo_mau || [])
            .slice()
            .sort((a, b) => (b.ti_le_trung_lap || 0) - (a.ti_le_trung_lap || 0))
            .slice(0, 3);
        console.log(`\nTỈ LỆ TRÙNG: ${kq.ti_le_trung_lap}%  `
            + `(${kq.tong_so_cau_trung}/${kq.tong_so_cau} câu)`);
        for (const n of nguon) {
            console.log(`  nguồn ${n.id_bao_cao}: ${n.ti_le_trung_lap}%`);
        }

        // Liệt kê câu của bài thử không khớp với nguồn nào
        const trung = new Set((kq.chi_tiet_cau_trung || [])
            .map(c => Number(c.chi_so_cau_kiem_tra)));
        const cauBai = await ChiSoCau.find({ id_bao_cao: id })
            .sort({ sentenceIndex: 1 }).select({ sentenceIndex: 1, content: 1 }).lean();
        const khongKhop = cauBai.filter(c => !trung.has(Number(c.sentenceIndex)));
        console.log(`\nCÂU KHÔNG KHỚP: ${khongKhop.length}`);
        for (const c of khongKhop.slice(0, Number(process.argv[3]) || 15)) {
            console.log(`  [${c.sentenceIndex}] ${c.content.slice(0, 110)}`);
        }
    } finally {
        if (!giuLai) await Promise.all([
            BaoCao.deleteMany({ id_bao_cao: id }),
            ChiSoCau.deleteMany({ id_bao_cao: id })
        ]);
        await mongoose.disconnect();
    }
}

main().catch(e => { console.error(e); process.exit(1); });
