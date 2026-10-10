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
// SỐ TIẾNG TỐI THIỂU ĐỂ MỘT CÂU ĐƯỢC ĐƯA VÀO ĐỐI SÁNH
// ----------------------------------------------------------------------------
// Phải đếm trên câu gốc, không đếm sau khi tách từ. Tách từ gộp từ ghép lại
// nên "Đơn giá vé" (3 tiếng) chỉ còn 2 token "đơn_giá vé", "Nước khởi hành"
// còn "nước khởi_hành": trước đây hai dòng này bị loại oan khỏi kho mẫu, làm
// các gạch đầu dòng ngắn trong báo cáo bị lấy thiếu. Kho mẫu (precompute) và
// báo cáo tải lên phải dùng chung một quy tắc, lệch nhau là câu giống hệt vẫn
// không khớp được.
// ============================================================================
const SO_TIENG_TOI_THIEU = 2;

function demSoTieng(cau) {
    if (!cau || typeof cau !== 'string') {
        return 0;
    }
    // Chỉ đếm tiếng có chữ cái: "1.2." hay "2024" không phải nội dung để so.
    return (cau.match(/[\p{L}\p{N}]*\p{L}[\p{L}\p{N}]*/gu) || []).length;
}

function duSoTieng(cau) {
    return demSoTieng(cau) >= SO_TIENG_TOI_THIEU;
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

// ============================================================================
// CHUẨN BỊ NỘI DUNG TRƯỚC KHI TÁCH CÂU — DÙNG CHUNG CHO KHO MẪU VÀ BÀI TẢI LÊN
// ----------------------------------------------------------------------------
// Kho mẫu (rebuild_file.js) và bài tải lên (xu_ly_bao_cao_upload.js) phải đi
// qua đúng cùng một bước này. Commit 7f5c502 đổi bài tải lên sang
// tachDoanVaCau nhưng bỏ quên bước lọc nội dung học thuật, nên bìa, phiếu
// giao đề, lời cảm ơn, tài liệu tham khảo của bài tải lên vẫn bị tính vào mẫu
// số trong khi kho mẫu đã lọc bỏ: kiểm tra lại chính một báo cáo mẫu chỉ còn
// ~93-95% thay vì 100%.
// ============================================================================
function chuanBiNoiDungDoiSanh(vanBan) {
    let text = (vanBan || '')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\u00A0/g, ' ')
        .replace(/[ ]{2,}/g, ' ')
        .trim();

    const hocThuat = locNoiDungHocThuat(text);
    if (hocThuat.trim()) {
        text = hocThuat;
    }
    return text;
}

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
            // Bỏ nốt ký hiệu liệt kê ở đầu câu. Một dòng có thể chứa vài ý gạch
            // đầu dòng liền nhau, lúc tách ra thì ký hiệu của các ý từ thứ hai
            // trở đi mới lộ ra ở đầu câu.
            const sach = chuanHoaKhoangTrang(boKyHieuLietKe(cau));

            if (sach) {
                cacCau.push(sach);
            }
        }
    }

    return cacCau;
}

// ============================================================================
// TÁCH ĐOẠN RỒI MỚI TÁCH CÂU
// ----------------------------------------------------------------------------
// Mỗi đoạn văn của báo cáo (một đoạn Word, hoặc một đoạn PDF đã dựng lại theo
// bố cục trang) là một đoạn riêng, mang mã DOAN_001, DOAN_002, …
//
// Trước đây đoạn được cắt theo dòng trống và tiêu đề. Nhưng bước trích xuất đã
// gộp mọi dòng trống, nên cả một mục — "Mở đầu" ba đoạn, hay đoạn văn kèm các
// ý gạch đầu dòng bên dưới — bị gom thành một đoạn duy nhất.
//
// Dòng bị ngắt giữa câu (Enter giữa chừng) vẫn được nối lại trước khi chia
// đoạn, nên một câu không bao giờ bị chẻ sang hai đoạn. Kết quả có cùng danh
// sách câu với tachCau, chỉ thêm doan_id.
//
// Kết quả: mảng { content, doan_id }
// ============================================================================
function tachDoanVaCau(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return [];
    }

    const daBoPhanPhu = xuLyNhanCauTruc(vanBan);
    const daNoiTieuDe = noiTieuDeBiNgatDong(daBoPhanPhu);
    const daNoiCau = noiDongBiNgatGiuaCau(daNoiTieuDe);

    const ketQua = [];
    let doanIndex = 0;

    for (const dong of daNoiCau.split(/\r?\n/)) {
        const noiDung = locMotDong(dong);
        if (!noiDung) continue;

        const cacCauTrongDoan = [];

        for (const cau of tachCauTrongDoan(noiDung)) {
            const sach = chuanHoaKhoangTrang(boKyHieuLietKe(cau));
            if (sach) {
                cacCauTrongDoan.push(sach);
            }
        }

        if (cacCauTrongDoan.length === 0) continue;

        doanIndex++;
        const doanId = `DOAN_${String(doanIndex).padStart(3, '0')}`;

        for (const cau of cacCauTrongDoan) {
            ketQua.push({
                content:    cau,
                doan_id:    doanId
            });
        }
    }

    return ketQua;
}

// ============================================================================
// XUẤT CÁC HÀM RA NGOÀI
// ============================================================================
module.exports = {
    lamSachVanBan,
    demSoTieng,
    duSoTieng,
    tachTuTiengViet,
    tachCau,
    tachDoanVaCau,
    bamChuoi,
    locNoiDungHocThuat,
    chuanBiNoiDungDoiSanh,
    xuLyNhanCauTruc,
    locMotDong,
    laTieuDeCon,
    laTieuDeLon,
    laDongMucLuc
};
