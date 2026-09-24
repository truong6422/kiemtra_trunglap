/**
 * ============================================================================
 * CHUẨN HOÁ DÒNG VĂN BẢN (utils/chuan_hoa_dong_van_ban.js)
 * ----------------------------------------------------------------------------
 * Giáo viên nêu rõ: "có những tiêu đề họ dùng enter hoặc bị nhiều dấu cách, dấu
 * tab đều phải xử lý được". Tiêu đề bị bẻ làm hai ba dòng là chuyện thường gặp:
 *
 *      CHƯƠNG 1
 *      CƠ SỞ LÝ THUYẾT
 *
 * Nếu không nối lại thì dòng "CƠ SỞ LÝ THUYẾT" đứng trơ ra và lọt vào phần nội
 * dung đem đi so trùng.
 * ============================================================================
 */

const {
    chuanHoaKhoangTrang,
    laTieuDeLon,
    laDongMucLuc,
    laSoTrang
} = require('./nhan_dien_tieu_de');

// Ký hiệu liệt kê ở đầu dòng. Giáo viên yêu cầu loại bỏ các dấu này; phần chữ
// phía sau vẫn là nội dung nên được giữ nguyên.
//
// Chữ "o" dính liền một chữ hoa cũng là dấu đầu dòng: Word vẽ dấu tròn cấp hai
// bằng phông Courier New, khi sang PDF nó rơi lại thành chữ "o" thường.
const KY_HIEU_LIET_KE = /^[\s]*(?:[-–—+*•·▪●○◦>»‣⁃➢➣➤❖✓✔]+|o(?=[\p{Lu}]))[\s]*/u;

// "CHƯƠNG 1", "PHẦN II:" — đã có số nhưng chưa có tên, nên tên chắc chắn nằm ở
// dòng dưới.
const TIEU_DE_CHUA_CO_TEN =
    /^(CHƯƠNG|CHUONG|PHẦN|PHAN|CHAPTER|PART)\s*[:\-–]?\s*(\d+|[IVXLCDM]+)\s*[:.\-–]?$/i;

/**
 * Dòng in hoa gần như toàn bộ — dấu hiệu của một tiêu đề bị bẻ làm nhiều dòng.
 */
function laDongInHoa(dong) {
    const chuCai = chuanHoaKhoangTrang(dong).replace(/[^\p{L}]/gu, '');

    if (chuCai.length < 3) {
        return false;
    }

    const soChuHoa = [...chuCai].filter(c => c === c.toUpperCase()).length;

    return soChuHoa / chuCai.length >= 0.9;
}

/**
 * Dòng có dáng của một phần tiêu đề nối tiếp: ngắn, viết hoa hoặc in hoa toàn
 * bộ, không kết thúc bằng dấu câu.
 */
function laPhanNoiCuaTieuDe(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (!t || t.length > 100) {
        return false;
    }

    if (/[.!?;,]$/.test(t)) {
        return false;
    }

    const chuCai = t.replace(/[^\p{L}]/gu, '');

    if (!chuCai) {
        return false;
    }

    const toanHoa = chuCai === chuCai.toUpperCase();
    const batDauHoa = /^[\p{Lu}]/u.test(t);

    return toanHoa || batDauHoa;
}

/**
 * Nối các tiêu đề bị xuống dòng giữa chừng thành một dòng duy nhất.
 *
 * Chỉ nối khi dòng trước đã được nhận là tiêu đề lớn, để không vô tình dán hai
 * câu nội dung vào nhau.
 */
function noiTieuDeBiNgatDong(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    const cacDong = vanBan.split(/\r?\n/);
    const ketQua = [];

    for (let i = 0; i < cacDong.length; i++) {
        const dong = cacDong[i].trim();

        if (!dong) {
            continue;
        }

        ketQua.push(dong);

        if (!laTieuDeLon(dong) || laDongMucLuc(dong)) {
            continue;
        }

        // Chỉ nối khi tiêu đề còn dở: "CHƯƠNG 1" đứng một mình thì tên chương
        // nằm ở dòng dưới. Tiêu đề đã có tên đầy đủ mà nối thêm dòng dưới thì
        // hai tiêu đề khác cấp dính vào nhau và không còn nhận ra được nữa.
        if (!TIEU_DE_CHUA_CO_TEN.test(chuanHoaKhoangTrang(dong))) {
            continue;
        }

        // Tên tiêu đề có thể trải dài vài dòng:
        //   CHƯƠNG I / TÌM HIỂU VỀ TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP VIỆT / NAM – HUNGARY
        let soDongDaNoi = 0;

        while (
            soDongDaNoi < 3 &&
            i + 1 < cacDong.length
        ) {
            const dongSau = cacDong[i + 1].trim();

            if (laSoTrang(dongSau)) {
                i++;
                continue;
            }

            // Dòng mục lục cũng ngắn và không có dấu chấm cuối. Nối nó vào
            // tiêu đề thì dấu chấm nối bị xoá mất ranh giới, cả khối mục lục
            // sau đó không còn nhận ra được nữa.
            if (laDongMucLuc(dongSau) || !laPhanNoiCuaTieuDe(dongSau)) {
                break;
            }

            // Từ dòng thứ hai trở đi chỉ nối tiếp phần in hoa của cùng một tiêu
            // đề, không lấn sang tiêu đề cấp dưới.
            if (soDongDaNoi >= 1 && !laDongInHoa(dongSau)) {
                break;
            }

            ketQua[ketQua.length - 1] += ' ' + dongSau;
            i++;
            soDongDaNoi++;
        }
    }

    return ketQua.join('\n');
}

/**
 * Bỏ ký hiệu liệt kê ở đầu dòng, giữ lại phần nội dung phía sau.
 */
function boKyHieuLietKe(dong) {
    if (!dong || typeof dong !== 'string') {
        return '';
    }

    let t = dong;
    let truoc;

    // Lặp vì có dòng gõ "- +" hoặc "• -" chồng nhau
    do {
        truoc = t;
        t = t.replace(KY_HIEU_LIET_KE, '');
    } while (t !== truoc);

    return t.trim();
}

/**
 * Nối các dòng bị ngắt giữa câu thành câu hoàn chỉnh.
 *
 * Bản PDF hay bẻ một câu thành nhiều dòng theo bề rộng trang. Dòng trước chưa
 * kết thúc bằng dấu câu và dòng sau bắt đầu bằng chữ thường thì chắc chắn là
 * cùng một câu.
 */
function noiDongBiNgatGiuaCau(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    const cacDong = vanBan.split(/\r?\n/);
    const ketQua = [];

    for (const dongGoc of cacDong) {
        const dong = dongGoc.trim();

        if (!dong) {
            continue;
        }

        if (!ketQua.length) {
            ketQua.push(dong);
            continue;
        }

        const truoc = ketQua[ketQua.length - 1];

        const truocDaKetThuc = /[.!?:;]$/.test(truoc);
        const sauBatDauThuong = /^[\p{Ll}]/u.test(dong);
        const sauLaTieuDe = laTieuDeLon(dong);

        // Câu bị bấm Enter giữa chừng: dòng trước đã dài như một dòng chữ đầy
        // trang mà vẫn chưa có dấu chấm thì phần còn lại nằm ở dòng dưới, kể cả
        // khi dòng dưới mở đầu bằng chữ hoa ("... báo cáo Đồ án học phần" /
        // "I em đã được thực hành..."). Dòng ngắn thì để nguyên, vì đó là các ý
        // gạch đầu dòng người viết chủ ý tách ra.
        const truocDaiNhuMotDongDay = truoc.length >= 60;
        const sauLaLietKe = KY_HIEU_LIET_KE.test(dong);

        if (
            !truocDaKetThuc &&
            !sauLaTieuDe &&
            !sauLaLietKe &&
            !laDongMucLuc(dong) &&
            (sauBatDauThuong || truocDaiNhuMotDongDay)
        ) {
            ketQua[ketQua.length - 1] = truoc + ' ' + dong;
            continue;
        }

        ketQua.push(dong);
    }

    return ketQua.join('\n');
}

module.exports = {
    noiTieuDeBiNgatDong,
    noiDongBiNgatGiuaCau,
    boKyHieuLietKe,
    laPhanNoiCuaTieuDe
};
