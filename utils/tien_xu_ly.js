/**
 * ============================================================================
 * UTILS: TIỀN XỬ LÝ VĂN BẢN (utils/tien_xu_ly.js)
 * ----------------------------------------------------------------------------
 * Đầu vào là chữ đọc thô từ tệp Word hoặc PDF, đầu ra là danh sách câu thuộc
 * phần nội dung do sinh viên viết ra. Mọi thứ chung của mọi báo cáo — bìa, mục
 * lục, tiêu đề, chú thích hình, bảng biểu, chữ ký — đều bị loại, vì giữ lại thì
 * bài nào cũng trùng bài nào.
 *
 * Các bước nhận diện nằm ở những tệp riêng để còn bổ sung được khi gặp kiểu
 * trình bày mới:
 *   - nhan_dien_tieu_de.js       tiêu đề lớn, tiêu đề con, mục lục
 *   - nhan_dien_phan_phu.js      chú thích hình/bảng, thông tin hồ sơ, chữ ký
 *   - loc_vung_tai_lieu.js       cắt bỏ trọn vùng bìa, lời cảm ơn, phụ lục
 *   - chuan_hoa_dong_van_ban.js  nối tiêu đề bị xuống dòng, bỏ dấu đầu dòng
 *   - tach_cau_van_ban.js        tách câu
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const { NHAN, coNhan, boNhan } = require('./danh_dau_cau_truc');

const {
    chuanHoaKhoangTrang,
    laTieuDeLon,
    laTieuDeCon,
    laDongMucLuc,
    laSoTrang,
    tachKyHieuDeMuc
} = require('./nhan_dien_tieu_de');

const {
    laChuThichHinhBang,
    laHangBangBiDinhLien,
    laTenNguoiDungRieng,
    laThongTinHoSo,
    laDongNgayThangChuKy,
    laDongBoCucDeTai,
    laTuKhoaKyThuatDonLe,
    laNhanTrongBang
} = require('./nhan_dien_phan_phu');

const { locVungNoiDung } = require('./loc_vung_tai_lieu');

const {
    noiTieuDeBiNgatDong,
    noiDongBiNgatGiuaCau,
    boKyHieuLietKe
} = require('./chuan_hoa_dong_van_ban');

const { tachCauTrongDoan } = require('./tach_cau_van_ban');

// ============================================================================
// NẠP TỪ VỰNG DÙNG CHO TÁCH TỪ GHÉP
// ============================================================================
function napTuVung() {
    const tapHopTuVung = new Set();

    const duongDanVocab = path.join(__dirname, 'vi-vocab.txt');

    if (!fs.existsSync(duongDanVocab)) {
        console.warn(
            `⚠️ Không có tệp từ vựng tại ${duongDanVocab} — không tách được từ `
            + `ghép, kết quả chấm sẽ lệch.`
        );
        return tapHopTuVung;
    }

    const noiDung = fs.readFileSync(duongDanVocab, 'utf-8');

    noiDung.split(/\r?\n/).forEach(dong => {
        const tu = dong.trim().toLowerCase();

        if (tu) {
            tapHopTuVung.add(tu);
            tapHopTuVung.add(tu.replace(/\s+/g, '_'));
        }
    });

    return tapHopTuVung;
}

const VOCAB_SET = napTuVung();

// ============================================================================
// TÁCH TỪ TIẾNG VIỆT THEO LỐI KHỚP DÀI NHẤT
// ============================================================================
function tachTuTiengViet(vanBan) {
    if (!vanBan) {
        return [];
    }

    const text = vanBan
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim();

    const cacTuDon = text.split(/\s+/).filter(Boolean);
    const ketQua = [];

    const SO_TU_TOI_DA = 4;

    let i = 0;

    while (i < cacTuDon.length) {
        let daKhop = false;

        for (
            let len = Math.min(SO_TU_TOI_DA, cacTuDon.length - i);
            len > 1;
            len--
        ) {
            const cumTu = cacTuDon.slice(i, i + len).join(' ');
            const cumTuGachDoi = cacTuDon.slice(i, i + len).join('_');

            if (VOCAB_SET.has(cumTu) || VOCAB_SET.has(cumTuGachDoi)) {
                ketQua.push(cumTuGachDoi);
                i += len;
                daKhop = true;
                break;
            }
        }

        if (!daKhop) {
            ketQua.push(cacTuDon[i]);
            i++;
        }
    }

    return ketQua;
}

function lamSachVanBan(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    return tachTuTiengViet(vanBan).join(' ');
}

// ============================================================================
// HÀM BĂM CHUỖI (DÙNG CHO N-GRAM)
// ============================================================================
function bamChuoi(chuoi) {
    let hash = 0;

    if (!chuoi || chuoi.length === 0) {
        return hash;
    }

    for (let i = 0; i < chuoi.length; i++) {
        hash = ((hash << 5) - hash) + chuoi.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash);
}

// ============================================================================
// XỬ LÝ NHÃN CẤU TRÚC DO BƯỚC ĐỌC TỆP WORD GẮN VÀO
// ============================================================================

/**
 * Bỏ các dòng mà chính tệp Word đã khai là mục lục, chú thích hình hoặc ô
 * trong bảng.
 *
 * Nhãn tiêu đề và nhãn mục lục được giữ nguyên: chúng vừa cho biết dòng này
 * không phải nội dung, vừa là mốc phân chia các vùng của báo cáo ở bước sau.
 * Riêng mục lục còn cho biết bài có những đề mục nào, thông tin đó dùng để nhận
 * ra chỗ thân bài bắt đầu.
 */
function xuLyNhanCauTruc(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    return vanBan
        .split(/\r?\n/)
        .filter(dong => !coNhan(
            dong,
            NHAN.CHU_THICH,
            NHAN.BANG,
            NHAN.HOP_VAN_BAN
        ))
        .join('\n');
}

// ============================================================================
// LỌC LẤY PHẦN NỘI DUNG CỦA BÁO CÁO
// ============================================================================
function locNoiDungHocThuat(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    const daBoPhanPhu = xuLyNhanCauTruc(vanBan);

    // Nối tiêu đề bị xuống dòng trước khi cắt vùng, nếu không thì phần đuôi của
    // tiêu đề đứng trơ lại và lọt vào nội dung.
    const daNoiTieuDe = noiTieuDeBiNgatDong(daBoPhanPhu);

    return locVungNoiDung(daNoiTieuDe);
}

// ============================================================================
// QUYẾT ĐỊNH MỘT DÒNG CÓ ĐƯỢC TÍNH VÀO NỘI DUNG HAY KHÔNG
// ============================================================================

/**
 * @returns {string} nội dung giữ lại của dòng, chuỗi rỗng nghĩa là bỏ dòng.
 */
function locMotDong(dongGoc) {
    if (coNhan(dongGoc, NHAN.TIEU_DE, NHAN.MUC_LUC)) {
        return '';
    }

    const daBoNhan = boNhan(dongGoc);
    const daBoKyHieu = boKyHieuLietKe(daBoNhan);
    const t = chuanHoaKhoangTrang(daBoKyHieu);

    if (!t || laSoTrang(t)) {
        return '';
    }

    if (
        laTieuDeLon(t) ||
        laDongMucLuc(t) ||
        laChuThichHinhBang(t) ||
        laHangBangBiDinhLien(t) ||
        laThongTinHoSo(t) ||
        laDongNgayThangChuKy(t) ||
        laTenNguoiDungRieng(t) ||
        laDongBoCucDeTai(t) ||
        laNhanTrongBang(t) ||
        laTuKhoaKyThuatDonLe(t)
    ) {
        return '';
    }

    if (laTieuDeCon(t)) {
        return '';
    }

    // Dòng là nội dung nhưng sinh viên có đánh số ở đầu ("1. Marketing và Quảng
    // cáo: Trong lĩnh vực tiếp thị..."). Giữ nội dung, bỏ số thứ tự.
    const deMuc = tachKyHieuDeMuc(t);

    if (deMuc && deMuc.phanChu) {
        return deMuc.phanChu;
    }

    return t;
}

// ============================================================================
// TÁCH CÂU
// ============================================================================
function tachCau(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return [];
    }

    const daBoPhanPhu = xuLyNhanCauTruc(vanBan);
    const daNoiTieuDe = noiTieuDeBiNgatDong(daBoPhanPhu);
    const daNoiCau = noiDongBiNgatGiuaCau(daNoiTieuDe);

    const cacCau = [];

    for (const dong of daNoiCau.split(/\r?\n/)) {
        const noiDung = locMotDong(dong);

        if (!noiDung) {
            continue;
        }

        for (const cau of tachCauTrongDoan(noiDung)) {
            const sach = chuanHoaKhoangTrang(cau);

            if (sach) {
                cacCau.push(sach);
            }
        }
    }

    return cacCau;
}

// ============================================================================
// XUẤT CÁC HÀM RA NGOÀI
// ============================================================================
module.exports = {
    lamSachVanBan,
    tachTuTiengViet,
    tachCau,
    bamChuoi,
    locNoiDungHocThuat,
    xuLyNhanCauTruc,
    locMotDong,
    laTieuDeCon,
    laTieuDeLon,
    laDongMucLuc
};
