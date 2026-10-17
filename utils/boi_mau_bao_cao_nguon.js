/**
 * ============================================================================
 * BÔI MÀU NGAY TRÊN BÁO CÁO NGUỒN (utils/boi_mau_bao_cao_nguon.js)
 *
 * Trang chi tiết chỉ cho xem bài nộp, còn phía nguồn chỉ có từng câu trích ra.
 * Giảng viên phản biện cần thấy chính báo cáo nguồn, câu nào bị trùng nằm ở
 * đâu trong đó, mới tin được kết quả. Ở đây lấy những câu của MỘT nguồn đã
 * trùng với bài nộp, rồi bôi màu lên tệp gốc của nguồn bằng đúng bộ bôi màu
 * worker dùng cho bài nộp (câu / đoạn trùng / đoạn chắp vá cùng bảng màu).
 *
 * Vệt được lưu vào vet_boi_mau với khoá NGUON_<bài nộp>_<nguồn>, nên mỗi cặp
 * chỉ tính một lần; chấm lại bài nộp thì vệt cũ hết hạn và được tính lại.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const BaoCao = require('../models/bao_cao');
const ChiTietCauTrung = require('../models/chi_tiet_cau_trung');
const ChiTietDoanTrung = require('../models/chi_tiet_doan_trung');
const ChiTietDoanChapVa = require('../models/chi_tiet_doan_chap_va');
const VetBoiMau = require('../models/vet_boi_mau');
const { processAndHighlightReport } = require('../workers/processHighlight');
const { timTepBaoCao } = require('./duong_dan_tep');

const khoaVetNguon = (idBaoCao, idNguon) => `NGUON_${idBaoCao}_${idNguon}`;

/** Đường dẫn bản PDF chưa bôi màu của nguồn (bản convert từ Word, hoặc PDF gốc). */
function duongDanPdfSachNguon(nguon) {
    const tep = timTepBaoCao(nguon.tep_tin);
    if (!tep) return null;
    return /\.pdf$/i.test(tep) ? tep : tep.replace(/\.[^.]+$/, '_temp.pdf');
}

/**
 * Câu của nguồn đã trùng với bài nộp, kèm câu tương ứng phía bài nộp.
 * Mỗi câu nguồn chỉ một lần (một câu nguồn có thể khớp nhiều câu bài nộp).
 */
async function layCauTrungCuaNguon(idBaoCao, idNguon) {
    const ds = await ChiTietCauTrung.find({
        id_bao_cao: idBaoCao,
        'danh_sach_nguon.id_bao_cao': idNguon
    }).sort({ chi_so_cau_kiem_tra: 1 }).lean();

    const theoCauNguon = new Map();

    for (const c of ds) {
        for (const n of c.danh_sach_nguon || []) {
            if (n.id_bao_cao !== idNguon || !n.cau_nguon) continue;
            if (theoCauNguon.has(n.chi_so_cau)) continue;

            theoCauNguon.set(n.chi_so_cau, {
                chi_so_cau_nguon: n.chi_so_cau,
                cau_nguon: n.cau_nguon,
                chi_so_cau_bai_nop: c.chi_so_cau_kiem_tra,
                cau_bai_nop: c.cau_kiem_tra,
                do_tuong_dong: n.do_tuong_dong
            });
        }
    }

    return [...theoCauNguon.values()].sort((a, b) => a.chi_so_cau_nguon - b.chi_so_cau_nguon);
}

/**
 * Tính (hoặc lấy lại) vệt bôi màu trên báo cáo nguồn.
 *
 * @returns {Promise<{nguon:Object, cacCau:Array, vetBoiMau:Object}>}
 */
async function boiMauBaoCaoNguon(idBaoCao, idNguon) {
    // Trang chi tiết có thể mang _id của MongoDB thay cho mã BC…
    const dieuKienBaiNop = /^[0-9a-fA-F]{24}$/.test(idBaoCao)
        ? { $or: [{ id_bao_cao: idBaoCao }, { _id: idBaoCao }] }
        : { id_bao_cao: idBaoCao };

    const [baiNop, nguon] = await Promise.all([
        BaoCao.findOne(dieuKienBaiNop).lean(),
        BaoCao.findOne({ id_bao_cao: idNguon }).lean()
    ]);

    if (!baiNop) throw Object.assign(new Error('Không tìm thấy bài nộp.'), { ma: 404 });
    // Chỉ cho xem báo cáo trong kho mẫu, không mở được bài nộp của người khác
    if (!nguon || !nguon.mau_kiem_tra) {
        throw Object.assign(new Error('Không tìm thấy báo cáo nguồn.'), { ma: 404 });
    }
    if (!timTepBaoCao(nguon.tep_tin)) {
        throw Object.assign(
            new Error(`Không tìm thấy tệp gốc của báo cáo nguồn ${idNguon}.`), { ma: 404 });
    }

    idBaoCao = baiNop.id_bao_cao;
    const cacCau = await layCauTrungCuaNguon(idBaoCao, idNguon);
    if (!cacCau.length) {
        throw Object.assign(
            new Error(`Bài nộp không có câu nào trùng với báo cáo nguồn ${idNguon}.`), { ma: 404 });
    }
    const khoa = khoaVetNguon(idBaoCao, idNguon);

    // Vệt đã tính sau lần chấm gần nhất của bài nộp thì dùng lại luôn
    const daCo = await VetBoiMau.findOne({ id_bao_cao: khoa }).lean();
    const lanCham = await ChiTietCauTrung.findOne({ id_bao_cao: idBaoCao })
        .sort({ created_at: -1 }).select('created_at').lean();
    const pdfSach = duongDanPdfSachNguon(nguon);
    const conMoi = daCo && pdfSach && fs.existsSync(pdfSach)
        && (!lanCham || new Date(daCo.ngay_tao) >= new Date(lanCham.created_at));

    if (conMoi) return { nguon, cacCau, vetBoiMau: daCo };

    // Đoạn trùng / chắp vá tính theo chỉ số câu phía nguồn để tô đúng màu
    const [dsDoan, dsChapVa] = await Promise.all([
        ChiTietDoanTrung.find({ id_bao_cao: idBaoCao, id_bao_cao_nguon: idNguon }).lean(),
        ChiTietDoanChapVa.find({ id_bao_cao: idBaoCao, 'chi_tiet_nguon.id_bao_cao_nguon': idNguon }).lean()
    ]);

    const doanTheoNguon = dsDoan.map(d => ({
        tu_cau_kiem_tra: d.tu_cau_nguon, den_cau_kiem_tra: d.den_cau_nguon
    }));
    const chapVaTheoNguon = dsChapVa.flatMap(d => (d.chi_tiet_nguon || [])
        .filter(n => n.id_bao_cao_nguon === idNguon)
        .map(n => ({ tu_cau_kiem_tra: n.tu_cau_nguon, den_cau_kiem_tra: n.den_cau_nguon })));

    // Bộ bôi màu đọc "câu cần tìm" ở cau_kiem_tra / chi_so_cau_kiem_tra
    const cauCanBoi = cacCau.map(c => ({
        cau_kiem_tra: c.cau_nguon,
        chi_so_cau_kiem_tra: c.chi_so_cau_nguon
    }));

    await processAndHighlightReport(
        khoa,
        nguon.tep_tin,
        path.extname(nguon.tep_tin),
        cauCanBoi,
        [],
        doanTheoNguon,
        chapVaTheoNguon
    );

    const vetBoiMau = await VetBoiMau.findOne({ id_bao_cao: khoa }).lean();
    return { nguon, cacCau, vetBoiMau };
}

module.exports = { boiMauBaoCaoNguon, duongDanPdfSachNguon, khoaVetNguon };
