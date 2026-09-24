/**
 * ============================================================================
 * TÁCH CÂU TIẾNG VIỆT (utils/tach_cau_van_ban.js)
 * ----------------------------------------------------------------------------
 * Cách cũ thay thế các chữ viết tắt bằng chuỗi giữ chỗ rồi khôi phục lại. Vì
 * các biểu thức đó không có biên từ và lại bật cờ không phân biệt hoa thường,
 * "P." trong "thực tập." cũng bị coi là viết tắt, nên câu lưu xuống cơ sở dữ
 * liệu thành "thực tậP." — sai ngay từ dữ liệu gốc đem đi so trùng.
 *
 * Ở đây ta không đụng vào chữ của sinh viên: chỉ xét ngữ cảnh quanh dấu chấm để
 * quyết định có cắt câu hay không.
 * ============================================================================
 */

// Những chữ viết tắt kết thúc bằng dấu chấm mà không kết thúc câu.
const VIET_TAT_KHONG_KET_CAU = new Set([
    'tp', 'q', 'p', 'tt', 'ts', 'ths', 'gs', 'pgs', 'kts', 'bs',
    'mr', 'mrs', 'ms', 'dr', 'prof', 'vs', 'etc', 'vd', 'vv', 'v.v',
    'nxb', 'tr', 'st', 'no', 'fig', 'hcm', 'ltd', 'inc', 'gmbh',
    'e.g', 'i.e', 'a.m', 'p.m'
]);

const DAU_KET_CAU = new Set(['.', '!', '?']);

/**
 * Vị trí ký tự không phải khoảng trắng đầu tiên kể từ chỉ số cho trước.
 */
function viTriChuTiepTheo(chuoi, tuViTri) {
    let i = tuViTri;

    while (i < chuoi.length && /\s/.test(chuoi[i])) {
        i++;
    }

    return i;
}

/**
 * Dấu chấm ở vị trí này có thật sự kết thúc câu không.
 */
function laDauKetCau(doan, viTriDau, viTriBatDauCau) {
    let cuoiCumDau = viTriDau;

    // Gom cả cụm "..." hay "?!"
    while (
        cuoiCumDau + 1 < doan.length &&
        DAU_KET_CAU.has(doan[cuoiCumDau + 1])
    ) {
        cuoiCumDau++;
    }

    const viTriSau = cuoiCumDau + 1;

    // Dấu chấm ở cuối đoạn: câu đã hết, không cần cắt thêm
    if (viTriSau >= doan.length) {
        return { ketCau: false, cuoiCumDau };
    }

    // "1.5" hay "a.b" — không có khoảng trắng thì không phải hết câu
    if (!/\s/.test(doan[viTriSau])) {
        return { ketCau: false, cuoiCumDau };
    }

    const viTriChu = viTriChuTiepTheo(doan, viTriSau);

    if (viTriChu >= doan.length) {
        return { ketCau: false, cuoiCumDau };
    }

    // Câu mới phải mở đầu bằng chữ hoa, chữ số hoặc dấu mở ngoặc
    if (!/[\p{Lu}\d"'(\[«“]/u.test(doan[viTriChu])) {
        return { ketCau: false, cuoiCumDau };
    }

    const tuTruoc = (doan.slice(viTriBatDauCau, viTriDau).match(/(\S+)$/) || ['', ''])[1];
    const tuTruocThuong = tuTruoc.toLowerCase().replace(/^[^\p{L}\d.]+/u, '');

    if (VIET_TAT_KHONG_KET_CAU.has(tuTruocThuong)) {
        return { ketCau: false, cuoiCumDau };
    }

    // Một chữ cái đứng lẻ trước dấu chấm là chữ viết tắt tên người (Nguyễn V. A.)
    if (/^\p{Lu}$/u.test(tuTruoc)) {
        return { ketCau: false, cuoiCumDau };
    }

    // Số đứng ngay đầu đoạn là số thứ tự đề mục ("1.1. Giới thiệu"), không phải
    // câu kết thúc bằng năm hay con số.
    const doDaiDaTichLuy = viTriDau - viTriBatDauCau;

    if (/^\d+([.,]\d+)*$/.test(tuTruoc) && doDaiDaTichLuy < 15) {
        return { ketCau: false, cuoiCumDau };
    }

    return { ketCau: true, cuoiCumDau };
}

/**
 * Tách một đoạn văn thành danh sách câu.
 */
function tachCauTrongDoan(doan) {
    if (!doan || typeof doan !== 'string') {
        return [];
    }

    const vanBan = doan.replace(/\s+/g, ' ').trim();

    if (!vanBan) {
        return [];
    }

    const cacCau = [];
    let batDau = 0;

    for (let i = 0; i < vanBan.length; i++) {
        if (!DAU_KET_CAU.has(vanBan[i])) {
            continue;
        }

        const { ketCau, cuoiCumDau } = laDauKetCau(vanBan, i, batDau);

        if (!ketCau) {
            i = cuoiCumDau;
            continue;
        }

        const cau = vanBan.slice(batDau, cuoiCumDau + 1).trim();

        if (cau) {
            cacCau.push(cau);
        }

        batDau = cuoiCumDau + 1;
        i = cuoiCumDau;
    }

    const conLai = vanBan.slice(batDau).trim();

    if (conLai) {
        cacCau.push(conLai);
    }

    return cacCau;
}

module.exports = {
    tachCauTrongDoan,
    VIET_TAT_KHONG_KET_CAU
};
