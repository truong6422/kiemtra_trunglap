/**
 * ============================================================================
 * LỌC VÙNG TÀI LIỆU (utils/loc_vung_tai_lieu.js)
 * ----------------------------------------------------------------------------
 * Một báo cáo gồm nhiều vùng: bìa, lời cảm ơn, mục lục, danh mục viết tắt, nội
 * dung, tài liệu tham khảo, phụ lục. Chỉ vùng nội dung mới đáng đem đi so trùng.
 *
 * Giáo viên đã chốt cách lấy nội dung: bắt đầu từ phần có tiêu đề "Mở đầu";
 * bài nào không có phần Mở đầu thì chuyển sang "Chương" hoặc "Phần", rồi lấy
 * đến hết nội dung. Mọi thứ nằm trước mốc đó — trang bìa, phiếu giao đề tài,
 * lời cảm ơn, mục lục — đều không tính.
 *
 * Bài không có mốc nào trong ba mốc ấy thì mới đi theo vùng: mỗi đề mục lớn mở
 * ra một vùng mới, vùng nào không phải nội dung thì bỏ cả khối. Cách này giữ
 * cho những bài trình bày không theo khuôn vẫn chấm được thay vì ra bài rỗng.
 * ============================================================================
 */

const {
    chuanHoaKhoangTrang,
    laTieuDeLon,
    laDongMucLuc,
    laSoTrang,
    CHUONG_HOAC_PHAN
} = require('./nhan_dien_tieu_de');

const { boNhan, coNhan, NHAN } = require('./danh_dau_cau_truc');
const { laThongTinHoSo } = require('./nhan_dien_phan_phu');

const VUNG = {
    BIA: 'BIA',
    BO_QUA: 'BO_QUA',
    NOI_DUNG: 'NOI_DUNG'
};

// Ranh giới cuối của tên đề mục. Không dùng \b vì trong JavaScript \b chỉ biết
// tới chữ cái không dấu: "NHẬT KÝ\b" hay "ĐẶT VẤN ĐỀ\b" không bao giờ khớp, và
// đó chính là lý do các vùng này vẫn lọt vào nội dung đem đi so trùng.
const HET_TEN_DE_MUC = '(?![\\p{L}\\p{N}])';

// Đề mục mở ra một vùng phải bỏ trọn khối. Các mục này hay được gọi là "phiếu"
// hoặc "bản" nên cho phép tiền tố đó đứng trước tên mục.
const DE_MUC_BO_KHOI = new RegExp(
    '^(PHIẾU|BẢN|GIẤY|TỜ)?\\s*(' +
    'LỜI CẢM ƠN|CẢM ƠN|LỜI CAM ĐOAN|CAM ĐOAN|MỤC LỤC|DANH MỤC|' +
    'NHẬT KÝ|NHẬN XÉT|ĐÁNH GIÁ|Ý KIẾN|XÁC NHẬN|THEO DÕI TIẾN ĐỘ|' +
    'TÀI LIỆU THAM KHẢO|PHỤ LỤC|TÓM TẮT ĐỀ TÀI|LỜI KẾT' +
    ')' + HET_TEN_DE_MUC,
    'iu'
);

// Các vùng chỉ chiếm một hai trang; nếu để chúng kéo dài tới khi gặp đề mục
// tiếp theo thì ở bản PDF — nơi không còn khai báo tiêu đề của Word — một dòng
// "Lời cảm ơn" có thể nuốt trọn phần còn lại của bài.
const SO_DONG_TOI_DA_CUA_VUNG_BO = 40;

// Vùng tài liệu tham khảo và phụ lục thì kéo dài tới hết bài là đúng.
const DE_MUC_BO_DEN_HET = /^(TÀI LIỆU THAM KHẢO|PHỤ LỤC)/iu;

// Mục lục và các danh mục chỉ gồm toàn tên đề mục. Đang ở trong đó mà gặp một
// dòng trông như tiêu đề thì đó vẫn là mục lục, không phải đã sang phần nội
// dung — có bài in mục lục không kèm số trang nên không còn dấu hiệu nào khác.
const DE_MUC_TOAN_TEN_MUC = /^(MỤC LỤC|DANH MỤC)/iu;

/**
 * Tên của một đề mục, bỏ dấu chấm nối và số trang, để so được dòng trong mục
 * lục với chính đề mục đó khi nó xuất hiện lại ở thân bài.
 */
function tenDeMuc(dong) {
    return chuanHoaKhoangTrang(dong)
        .replace(/[.·…]{2,}\s*\d*\s*$/, '')
        .replace(/\s+\d{1,3}\s*$/, '')
        .replace(/[\s:.\-–)]+$/, '')
        .toLowerCase();
}

// Đề mục mở ra vùng nội dung.
const DE_MUC_MO_NOI_DUNG = new RegExp(
    '^(' +
    'LỜI MỞ ĐẦU|LỜI NÓI ĐẦU|MỞ ĐẦU|PHẦN MỞ ĐẦU|ĐẶT VẤN ĐỀ|' +
    'PHẦN NỘI DUNG|NỘI DUNG|KẾT LUẬN|TỔNG KẾT|GIỚI THIỆU' +
    ')' + HET_TEN_DE_MUC,
    'iu'
);

// Đề mục hay được đánh số trước tên: "A: MỞ ĐẦU", "I. Mở đầu", "1. Mở đầu".
const SO_THU_TU_TRUOC_TEN = '(?:[A-Z]|[IVXLCDM]+|\\d+)\\s*[.:)\\-]\\s*';

// Mốc mở đầu phần nội dung, xếp theo đúng thứ tự ưu tiên giáo viên đưa ra.
const MOC_MO_DAU = new RegExp(
    '^(?:' + SO_THU_TU_TRUOC_TEN + ')?' +
    '(LỜI MỞ ĐẦU|PHẦN MỞ ĐẦU|MỞ ĐẦU|LỜI NÓI ĐẦU)' + HET_TEN_DE_MUC,
    'iu'
);

const MOC_CHUONG_PHAN = /^(CHƯƠNG|CHUONG|PHẦN|PHAN|CHAPTER|PART)\s*[:\-–]?\s*(1|I)(?![\dIVXLCDM])/iu;

/**
 * Tìm dòng mở đầu phần nội dung.
 *
 * Ưu tiên "Mở đầu"; không có thì lấy "Chương 1" hoặc "Phần 1". Dòng nằm trong
 * mục lục không tính, vì ở đó tên mục nào cũng có mặt.
 *
 * @returns {number} chỉ số dòng của mốc, -1 nếu không tìm thấy
 */
function timMocMoDauNoiDung(cacDong) {
    let viTriChuongPhan = -1;

    for (let i = 0; i < cacDong.length; i++) {
        const t = chuanHoaKhoangTrang(boNhan(cacDong[i]));

        if (!t || laDongMucLuc(t)) {
            continue;
        }

        if (MOC_MO_DAU.test(t)) {
            return i;
        }

        if (viTriChuongPhan < 0 && MOC_CHUONG_PHAN.test(t)) {
            viTriChuongPhan = i;
        }
    }

    return viTriChuongPhan;
}

/**
 * Đoạn văn đủ dài và có dấu kết câu thì chắc chắn là nội dung viết ra, không
 * phải dòng bìa hay dòng mục lục. Dùng để thoát khỏi vùng bìa ở những bài không
 * hề có đề mục nào chuẩn.
 */
function laDoanVanThucSu(dong) {
    const t = chuanHoaKhoangTrang(dong);

    if (t.length < 150) {
        return false;
    }

    // Phải kết thúc bằng dấu chấm câu. Trang khai thông tin thực tập cũng có
    // dòng dài — "Địa chỉ : Khu công nghiệp cao Hoà Lạc, xã Hạ Bằng, huyện
    // Thạch Thất, Hà Nội Người hướng dẫn tại nơi thực tập:" — nhưng nó kết thúc
    // bằng dấu hai chấm của một nhãn còn bỏ ngỏ, không phải một câu viết ra.
    return /[.!?]["'”’)\]]?$/.test(t);
}

/**
 * Xác định vùng mà một dòng đề mục mở ra; trả về null nếu dòng không phải đề
 * mục lớn.
 */
function vungMoBoiDeMuc(dongCoNhan) {
    const t = chuanHoaKhoangTrang(boNhan(dongCoNhan));

    // Dòng trong mục lục cũng mang tên đề mục ("GIỚI THIỆU VỀ ĐƠN VỊ THỰC
    // TẬP......7"). Nếu nhận nhầm nó là đề mục thật thì cả khối mục lục phía
    // sau bị tính vào nội dung.
    if (laDongMucLuc(t)) {
        return null;
    }

    // Dòng khai hồ sơ viết tắt nhiều chữ hoa nên trông giống tiêu đề
    // ("Lớp: 4628CNTT"). Nó không bao giờ mở ra phần nội dung; nhận nhầm thì
    // cả trang thông tin sinh viên bị tính là nội dung.
    if (laThongTinHoSo(t)) {
        return null;
    }

    if (!laTieuDeLon(dongCoNhan)) {
        return null;
    }

    if (DE_MUC_BO_KHOI.test(t)) {
        return VUNG.BO_QUA;
    }

    // Mọi đề mục còn lại đều mở ra phần nội dung: "CHƯƠNG 2", "MỞ ĐẦU", nhưng
    // cũng gồm những tiêu đề do chính tệp Word khai báo mà không theo khuôn mẫu
    // nào — "GIỚI THIỆU VỀ ĐƠN VỊ THỰC TẬP", "Cơ cấu tổ chức".
    return VUNG.NOI_DUNG;
}

/**
 * Bóc đi các vùng phụ trợ: trang bìa, lời cảm ơn, mục lục, danh mục, nhật ký,
 * tài liệu tham khảo, phụ lục.
 *
 * @param {string[]} cacDong
 * @returns {string[]} các dòng còn lại
 */
function bocVungPhuTro(cacDong) {
    const ketQua = [];

    let vungHienTai = VUNG.BIA;
    let vungKeoDaiDenHet = false;
    let dangTrongMucLuc = false;
    let soDongDaBoTrongVung = 0;

    // Tên các đề mục đã thấy trong mục lục, để nhận ra lần xuất hiện thứ hai
    const tenDaLietKe = new Set();

    for (const dongGoc of cacDong) {
        const dong = dongGoc.replace(/\s+$/, '');
        const t = chuanHoaKhoangTrang(boNhan(dong));

        if (!t || laSoTrang(t)) {
            continue;
        }

        // Dòng do Word khai là mục lục: bỏ đi, nhưng ghi lại tên đề mục vì lát
        // nữa chính tên đó xuất hiện lại chỗ thân bài bắt đầu.
        if (coNhan(dong, NHAN.MUC_LUC)) {
            tenDaLietKe.add(tenDeMuc(t));
            dangTrongMucLuc = true;
            soDongDaBoTrongVung++;
            continue;
        }

        const vungMoi = vungMoBoiDeMuc(dong);

        if (vungMoi) {
            // Trang bìa đầy dòng in hoa — tên trường, tên đề tài, tên sinh
            // viên — dòng nào cũng có dáng tiêu đề. Chỉ một đề mục gọi đúng tên
            // (Mở đầu, Chương, Phần...) mới đưa được bài ra khỏi trang bìa.
            if (
                vungHienTai === VUNG.BIA &&
                vungMoi === VUNG.NOI_DUNG &&
                !CHUONG_HOAC_PHAN.test(t) &&
                !DE_MUC_MO_NOI_DUNG.test(t)
            ) {
                continue;
            }

            // Đang trong mục lục thì mọi tên đề mục vẫn là một dòng của mục
            // lục. Chỉ khi một tên đã liệt kê xuất hiện lần nữa thì mới là thân
            // bài — đó là cách duy nhất phân biệt với mục lục không có số trang.
            if (dangTrongMucLuc && vungMoi === VUNG.NOI_DUNG) {
                const ten = tenDeMuc(t);

                if (!tenDaLietKe.has(ten)) {
                    tenDaLietKe.add(ten);
                    soDongDaBoTrongVung++;
                    continue;
                }

                dangTrongMucLuc = false;
            }

            vungHienTai = vungMoi;
            vungKeoDaiDenHet =
                vungMoi === VUNG.BO_QUA && DE_MUC_BO_DEN_HET.test(t);
            dangTrongMucLuc =
                vungMoi === VUNG.BO_QUA && DE_MUC_TOAN_TEN_MUC.test(t);
            soDongDaBoTrongVung = 0;
            // Bản thân dòng đề mục không được tính vào nội dung
            continue;
        }

        // Ở vùng bìa, một đoạn văn thực sự đánh dấu bài đã vào phần nội dung.
        if (vungHienTai === VUNG.BIA && laDoanVanThucSu(t)) {
            vungHienTai = VUNG.NOI_DUNG;
        }

        // Mục lục chỉ kết thúc khi gặp một đoạn văn thật sự
        if (dangTrongMucLuc && laDoanVanThucSu(t)) {
            vungHienTai = VUNG.NOI_DUNG;
            dangTrongMucLuc = false;
        }

        // Vùng phụ trợ đã dài quá mức một lời cảm ơn hay một mục lục thì coi
        // như đã sang phần nội dung mà không có tiêu đề nào đánh dấu.
        if (
            vungHienTai === VUNG.BO_QUA &&
            !vungKeoDaiDenHet &&
            soDongDaBoTrongVung >= SO_DONG_TOI_DA_CUA_VUNG_BO &&
            laDoanVanThucSu(t)
        ) {
            vungHienTai = VUNG.NOI_DUNG;
        }

        if (vungHienTai !== VUNG.NOI_DUNG) {
            if (dangTrongMucLuc) {
                tenDaLietKe.add(tenDeMuc(t));
            }

            soDongDaBoTrongVung++;
            continue;
        }

        // Dòng mục lục sót lại giữa vùng nội dung (hay gặp ở bản PDF)
        if (laDongMucLuc(t)) {
            continue;
        }

        ketQua.push(dong);
    }

    return ketQua;
}

/**
 * Giữ lại phần nội dung của báo cáo.
 *
 * @param {string} vanBan - văn bản đã tách dòng theo đoạn
 * @returns {string}
 */
function locVungNoiDung(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    const cacDongGoc = vanBan.split(/\r?\n/);

    // Bóc vùng phụ trợ trước, rồi mới đi tìm mốc mở đầu trong phần còn lại. Làm
    // ngược lại thì mốc rơi đúng vào dòng "PHẦN 1: CƠ SỞ LÝ LUẬN" nằm trong mục
    // lục, và cả khối mục lục phía sau bị tính thành nội dung.
    const conLai = bocVungPhuTro(cacDongGoc);

    if (!conLai.length) {
        // Không nhận ra vùng nội dung nào thì trả lại nguyên văn bản để bước sau
        // còn có cái mà lọc, thà thừa còn hơn chấm một bài rỗng.
        return vanBan;
    }

    // Giáo viên chốt: lấy nội dung từ phần "Mở đầu", không có thì từ "Chương"
    // hoặc "Phần". Cắt thẳng tại đó, mọi thứ phía trước không tính.
    const viTriMoc = timMocMoDauNoiDung(conLai);

    const noiDung = viTriMoc >= 0
        ? conLai.slice(viTriMoc + 1)
        : conLai;

    return (noiDung.length ? noiDung : conLai).join('\n');
}

module.exports = {
    locVungNoiDung,
    timMocMoDauNoiDung,
    laDoanVanThucSu,
    VUNG
};
