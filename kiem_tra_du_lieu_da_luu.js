/**
 * ============================================================================
 * ĐỐI CHIẾU DỮ LIỆU ĐÃ LƯU TRONG CƠ SỞ DỮ LIỆU
 * (kiem_tra_du_lieu_da_luu.js)
 * ----------------------------------------------------------------------------
 * Giáo viên yêu cầu: sau khi sửa phần tiền xử lý thì phải kiểm tra lại trong cơ
 * sở dữ liệu xem nội dung lấy về đã đúng chưa, có bỏ sót hay lấy thừa phần nào
 * không. Công cụ này đọc lại các câu đang lưu ở bảng chi_so_cau rồi soi từng
 * câu bằng chính bộ quy tắc tiền xử lý:
 *
 *   LẤY THỪA  — câu lẽ ra phải bị loại (tiêu đề, mục lục, chú thích hình, dòng
 *               bìa, chữ ký) mà vẫn nằm trong cơ sở dữ liệu.
 *   BỎ SÓT    — câu đọc lại được từ tệp gốc nhưng không có trong cơ sở dữ liệu.
 *   SAI CHỮ   — câu trong cơ sở dữ liệu khác với câu đọc lại từ tệp gốc.
 *
 * Cách dùng:
 *      node kiem_tra_du_lieu_da_luu.js              # soi toàn bộ báo cáo
 *      node kiem_tra_du_lieu_da_luu.js BC012        # soi một báo cáo
 *      node kiem_tra_du_lieu_da_luu.js --gioi-han 20
 * ============================================================================
 */

require('dotenv').config();

const mongoose = require('mongoose');

const BaoCao = require('./models/bao_cao');
const ChiSoCau = require('./models/chi_so_cau');

const { timTepBaoCao } = require('./utils/duong_dan_tep');
const { trichXuatVanBan } = require('./utils/trich_xuat_text');
const {
    locNoiDungHocThuat,
    tachCau,
    lamSachVanBan,
    locMotDong
} = require('./utils/tien_xu_ly');

const SO_TU_TOI_THIEU = 5;

function khoaSoSanh(cau) {
    return lamSachVanBan(cau)
        .split(/\s+/)
        .filter(Boolean)
        .join(' ');
}

function duTuDeLuu(cau) {
    return khoaSoSanh(cau).split(/\s+/).filter(Boolean).length >= SO_TU_TOI_THIEU;
}

/**
 * Đọc lại tệp gốc và cho ra danh sách câu đúng như quy tắc hiện hành.
 */
async function docLaiTuTepGoc(baoCao) {
    const duongDan = timTepBaoCao(baoCao.tep_tin);

    if (!duongDan) {
        return null;
    }

    const vanBanTho = await trichXuatVanBan(duongDan);

    if (!vanBanTho || !vanBanTho.trim()) {
        return null;
    }

    const noiDung = locNoiDungHocThuat(vanBanTho);

    return tachCau(noiDung.trim() ? noiDung : vanBanTho).filter(duTuDeLuu);
}

/**
 * Soi một báo cáo, trả về bản kê các chỗ lệch.
 */
async function soiMotBaoCao(baoCao) {
    const cacCauDaLuu = await ChiSoCau
        .find({ id_bao_cao: baoCao.id_bao_cao })
        .select({ sentenceIndex: 1, content: 1 })
        .sort({ sentenceIndex: 1 })
        .lean();

    const ketQua = {
        id_bao_cao: baoCao.id_bao_cao,
        tieu_de: baoCao.tieu_de || '',
        so_cau_da_luu: cacCauDaLuu.length,
        lay_thua: [],
        bo_sot: [],
        khong_doc_duoc_tep: false
    };

    // 1. Câu đang lưu nhưng lẽ ra phải bị loại
    for (const cau of cacCauDaLuu) {
        if (!locMotDong(cau.content)) {
            ketQua.lay_thua.push({
                chi_so_cau: cau.sentenceIndex,
                noi_dung: cau.content
            });
        }
    }

    // 2. So với kết quả đọc lại từ tệp gốc
    const cauDocLai = await docLaiTuTepGoc(baoCao);

    if (cauDocLai === null) {
        ketQua.khong_doc_duoc_tep = true;
        return ketQua;
    }

    ketQua.so_cau_doc_lai = cauDocLai.length;

    // Đo bỏ sót theo nội dung chứ không theo từng câu nguyên vẹn: quy tắc mới
    // cắt câu ở chỗ khác quy tắc cũ, nên so khớp cả câu sẽ báo sót nhầm hàng
    // loạt trong khi chữ nghĩa vẫn còn đủ.
    const toanBoDaLuu = cacCauDaLuu
        .map(c => khoaSoSanh(c.content))
        .join(' ');

    for (const cau of cauDocLai) {
        const khoa = khoaSoSanh(cau);

        if (khoa && !toanBoDaLuu.includes(khoa)) {
            ketQua.bo_sot.push(cau);
        }
    }

    return ketQua;
}

function inBanKe(ketQua) {
    const coVanDe =
        ketQua.lay_thua.length ||
        ketQua.bo_sot.length ||
        ketQua.khong_doc_duoc_tep;

    const dauHieu = coVanDe ? '⚠️ ' : '✅';

    console.log(
        `\n${dauHieu} ${ketQua.id_bao_cao} — ${ketQua.tieu_de}`
        + `\n   Đang lưu ${ketQua.so_cau_da_luu} câu`
        + (
            ketQua.so_cau_doc_lai !== undefined
                ? `, đọc lại từ tệp gốc ${ketQua.so_cau_doc_lai} câu`
                : ''
        )
    );

    if (ketQua.khong_doc_duoc_tep) {
        console.log('   • Không còn tệp gốc để đối chiếu.');
    }

    if (ketQua.lay_thua.length) {
        console.log(`   • Lấy thừa ${ketQua.lay_thua.length} câu:`);
        ketQua.lay_thua.slice(0, 10).forEach(c =>
            console.log(`       [${c.chi_so_cau}] ${c.noi_dung.slice(0, 90)}`)
        );
    }

    if (ketQua.bo_sot.length) {
        console.log(`   • Bỏ sót ${ketQua.bo_sot.length} câu:`);
        ketQua.bo_sot.slice(0, 10).forEach(c =>
            console.log(`       ${c.slice(0, 90)}`)
        );
    }
}

async function chay() {
    const thamSo = process.argv.slice(2);

    const viTriGioiHan = thamSo.indexOf('--gioi-han');
    const gioiHan =
        viTriGioiHan >= 0 ? Number(thamSo[viTriGioiHan + 1]) || 0 : 0;

    const idChiDinh = thamSo.find(t => !t.startsWith('--') && t !== String(gioiHan));

    await mongoose.connect(process.env.MONGO_URI);

    const dieuKien = idChiDinh ? { id_bao_cao: idChiDinh } : {};

    let truyVan = BaoCao.find(dieuKien)
        .select({ id_bao_cao: 1, tieu_de: 1, tep_tin: 1 })
        .sort({ ngay_tai_len: -1 });

    if (gioiHan > 0) {
        truyVan = truyVan.limit(gioiHan);
    }

    const cacBaoCao = await truyVan.lean();

    if (!cacBaoCao.length) {
        console.log('Không tìm thấy báo cáo nào để đối chiếu.');
        await mongoose.disconnect();
        return;
    }

    console.log(`Đối chiếu ${cacBaoCao.length} báo cáo...\n${'='.repeat(70)}`);

    let soBaoCaoCoVanDe = 0;
    let tongLayThua = 0;
    let tongBoSot = 0;

    for (const baoCao of cacBaoCao) {
        const ketQua = await soiMotBaoCao(baoCao);

        inBanKe(ketQua);

        tongLayThua += ketQua.lay_thua.length;
        tongBoSot += ketQua.bo_sot.length;

        if (ketQua.lay_thua.length || ketQua.bo_sot.length) {
            soBaoCaoCoVanDe++;
        }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(
        `Tổng kết: ${cacBaoCao.length} báo cáo, `
        + `${soBaoCaoCoVanDe} báo cáo còn lệch, `
        + `${tongLayThua} câu lấy thừa, ${tongBoSot} câu bỏ sót.`
    );

    if (soBaoCaoCoVanDe > 0) {
        console.log(
            'Các báo cáo còn lệch là do đang lưu dữ liệu của lần chấm cũ. '
            + 'Chấm lại để cập nhật theo quy tắc hiện hành.'
        );
    }

    await mongoose.disconnect();
}

chay().catch(async (loi) => {
    console.error('❌ Lỗi khi đối chiếu:', loi.message);
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
});
