/**
 * ============================================================================
 * TIỀN XỬ LÝ VÀ TÍNH TOÁN CHO BÁO CÁO MẪU MỚI BỔ SUNG
 * (utils/tinh_toan_mau_bo_sung.js)
 *
 * rebuild_file.js + precompute_cauhinh.js chạy lại TOÀN BỘ kho mẫu: đọc lại
 * mọi tệp, xoá sạch chi_so_cau rồi tính lại từ đầu. Hai tệp đó giữ nguyên để
 * dùng khi đổi thuật toán. Còn khi quản trị viên chỉ thêm vài báo cáo mẫu mới
 * thì chạy lại cả kho là lãng phí, nên ở đây làm đúng các bước của hai tệp đó
 * nhưng CHỈ cho những báo cáo mới (da_tinh_toan = false):
 *
 *   1. Như rebuild_file.js: trích chữ từ tệp gốc, chuẩn bị nội dung đối sánh,
 *      lưu vào noi_dung_tien_xu_ly.
 *   2. Như precompute_cauhinh.js: tách đoạn/câu, TF-IDF, winnowing, hash câu,
 *      ghi chi_so_cau với mau_kiem_tra = true.
 *
 * Về IDF: vector của các câu mẫu cũ đã tính theo IDF hiện có. Đổi IDF của từ
 * cũ thì các vector đó lệch hệ, buộc phải tính lại cả kho — đúng điều cần
 * tránh. Vì vậy IDF của từ đã có giữ nguyên; chỉ những từ lần đầu xuất hiện
 * (do báo cáo mới mang vào) mới được thêm IDF, theo đúng công thức
 * log10(N / df) với N là tổng số báo cáo mẫu hiện tại.
 * ============================================================================
 */

const crypto = require('crypto');

const BaoCao = require('../models/bao_cao');
const ChiSoCau = require('../models/chi_so_cau');
const CauHinhHeThong = require('../models/cau_hinh_he_thong');
const { trichXuatVanBan } = require('./trich_xuat_text');
const { timTepBaoCao } = require('./duong_dan_tep');
const { chuanBiNoiDungDoiSanh, tachDoanVaCau, lamSachVanBan, duSoTieng } = require('./tien_xu_ly');
const { tachTu } = require('./tfidf_cosine');
const { taoKGramsWordLevel, tinhHashDanhSachKGrams, taoFingerprints } = require('./winnowing');

/** Các câu hợp lệ của một nội dung, lọc giống hệt precompute_cauhinh.js. */
function cacCauHopLe(noiDung) {
    return tachDoanVaCau(noiDung)
        .map(c => ({ ...c, sach: lamSachVanBan(c.content) }))
        .filter(c => c.sach && duSoTieng(c.content));
}

/** Bước 1 — như rebuild_file.js cho một báo cáo. */
async function tienXuLy(baoCao) {
    const tep = timTepBaoCao(baoCao.tep_tin);
    if (!tep) throw new Error(`không tìm thấy tệp ${baoCao.tep_tin}`);

    const noiDung = chuanBiNoiDungDoiSanh(await trichXuatVanBan(tep));
    if (!noiDung.trim()) throw new Error('không đọc được chữ nào từ tệp');

    await BaoCao.updateOne({ _id: baoCao._id }, { $set: { noi_dung_tien_xu_ly: noiDung } });
    return noiDung;
}

/** Thêm IDF cho những từ chưa có trong từ vựng toàn hệ thống. */
async function boSungIdf(tuVungVaIdf, cacTapTuMoi) {
    const tongSoMau = await BaoCao.countDocuments({ mau_kiem_tra: true });

    const df = new Map();
    for (const tap of cacTapTuMoi) {
        for (const tu of tap) {
            if (tuVungVaIdf[tu] === undefined) df.set(tu, (df.get(tu) || 0) + 1);
        }
    }

    const capNhat = {};
    for (const [tu, soVanBan] of df) {
        const idf = Math.max(0, Math.log10(tongSoMau / soVanBan));
        tuVungVaIdf[tu] = idf;
        capNhat[`tu_vung_va_idf.${tu}`] = idf;
    }

    if (df.size) {
        await CauHinhHeThong.updateOne({}, { $set: { ...capNhat, ngay_cap_nhat: new Date() } });
    }
    return df.size;
}

/** Bước 2 — như precompute_cauhinh.js (bước tạo chi_so_cau) cho một báo cáo. */
async function lapChiSoCau(baoCao, cacCau, tuVungVaIdf) {
    const ds = [];
    let sentenceIndex = 1;

    for (const c of cacCau) {
        const tokens = tachTu(c.sach);

        // TF chuẩn hoá theo tần suất lớn nhất, nhân IDF; chỉ giữ trọng số > 0
        const dem = new Map();
        tokens.forEach(t => dem.set(t, (dem.get(t) || 0) + 1));
        const tanSuatMax = Math.max(0, ...dem.values());
        const vectorTfIdf = {};
        for (const [tu, soLan] of dem) {
            const w = (soLan / tanSuatMax) * (tuVungVaIdf[tu] || 0);
            if (w > 0) vectorTfIdf[tu] = w;
        }

        const fingerprints = taoFingerprints(
            tinhHashDanhSachKGrams(taoKGramsWordLevel(c.sach, 3)), 4);

        ds.push({
            bao_cao_mongo_id: baoCao._id,
            id_bao_cao: baoCao.id_bao_cao,
            loai_bao_cao: baoCao.loai_bao_cao,
            mau_kiem_tra: true,
            sentenceIndex: sentenceIndex++,
            doan_id: c.doan_id || '',
            content: c.content,
            clean_content: c.sach,
            token_count: tokens.length,
            sentence_hash: crypto.createHash('md5').update(c.sach).digest('hex'),
            vector_tf_idf: vectorTfIdf,
            fingerprints,
            fingerprint_count: fingerprints.length,
            created_at: new Date(),
            updated_at: new Date()
        });
    }

    // Chạy lại nhiều lần vẫn cho đúng một bộ câu
    await ChiSoCau.deleteMany({ id_bao_cao: baoCao.id_bao_cao });
    if (ds.length) await ChiSoCau.insertMany(ds, { ordered: false });
    return ds.length;
}

/**
 * Tính toán toàn bộ báo cáo mẫu bổ sung chưa tính.
 *
 * @param {function(Object):void} [baoTienDo] nhận tiến độ sau mỗi bước
 * @returns {Promise<{ket_qua:Array, so_tu_moi:number}>}
 */
async function tinhToanMauBoSung(baoTienDo = () => {}) {
    const dsCho = await BaoCao.find({ mau_kiem_tra: true, da_tinh_toan: false }).lean();
    const ketQua = [];

    const cauHinh = await CauHinhHeThong.findOne({}).select('tu_vung_va_idf').lean();
    if (!cauHinh || !cauHinh.tu_vung_va_idf) {
        throw new Error('Kho mẫu chưa có IDF toàn hệ thống — hãy chạy precompute_cauhinh.js một lần trước.');
    }
    const tuVungVaIdf = cauHinh.tu_vung_va_idf;

    // Bước 1: tiền xử lý từng báo cáo
    const daDoc = [];
    for (const [i, bc] of dsCho.entries()) {
        baoTienDo({ buoc: 'Tiền xử lý', hien_tai: i + 1, tong: dsCho.length, id_bao_cao: bc.id_bao_cao });
        try {
            const cacCau = cacCauHopLe(await tienXuLy(bc));
            daDoc.push({ bc, cacCau });
        } catch (e) {
            ketQua.push({ id_bao_cao: bc.id_bao_cao, tieu_de: bc.tieu_de, loi: e.message });
        }
    }

    // IDF cho từ mới: mỗi báo cáo đóng góp một lần vào df của từ
    const soTuMoi = await boSungIdf(tuVungVaIdf,
        daDoc.map(({ cacCau }) => new Set(cacCau.flatMap(c => tachTu(c.sach)))));

    // Bước 2: lập chỉ số câu
    for (const [i, { bc, cacCau }] of daDoc.entries()) {
        baoTienDo({ buoc: 'Tính toán chỉ số câu', hien_tai: i + 1, tong: daDoc.length, id_bao_cao: bc.id_bao_cao });
        try {
            const soCau = await lapChiSoCau(bc, cacCau, tuVungVaIdf);
            await BaoCao.updateOne({ _id: bc._id }, { $set: { da_tinh_toan: true, trang_thai: 'Đã xử lý' } });
            ketQua.push({ id_bao_cao: bc.id_bao_cao, tieu_de: bc.tieu_de, so_cau: soCau });
        } catch (e) {
            ketQua.push({ id_bao_cao: bc.id_bao_cao, tieu_de: bc.tieu_de, loi: e.message });
        }
    }

    return { ket_qua: ketQua, so_tu_moi: soTuMoi };
}

module.exports = { tinhToanMauBoSung };
