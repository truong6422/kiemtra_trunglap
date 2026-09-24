/**
 * ============================================================================
 * LỌC VÙNG TÀI LIỆU (utils/loc_vung_tai_lieu.js)
 * ----------------------------------------------------------------------------
 * Một báo cáo gồm nhiều vùng: bìa, lời cảm ơn, mục lục, danh mục viết tắt, nội
 * dung, tài liệu tham khảo, phụ lục. Chỉ vùng nội dung mới đáng đem đi so trùng.
 *
 * Cách làm cũ là đi tìm một "điểm bắt đầu" (MỞ ĐẦU hoặc CHƯƠNG 1) rồi giữ tất
 * cả từ đó về sau. Cách đó hỏng theo hai hướng ngược nhau, đúng như giáo viên
 * phản ánh: bài không có hai mốc ấy thì giữ cả bìa lẫn lời cảm ơn (lấy thừa),
 * còn bài có mốc nằm muộn thì mất luôn phần nội dung phía trước (bỏ sót).
 *
 * Ở đây ta đi theo vùng: mỗi đề mục lớn mở ra một vùng mới, vùng nào không phải
 * nội dung thì bỏ cả khối.
 * ============================================================================
 */

const {
    chuanHoaKhoangTrang,
    laTieuDeLon,
    laDongMucLuc,
    laSoTrang
} = require('./nhan_dien_tieu_de');

const { boNhan } = require('./danh_dau_cau_truc');

const VUNG = {
    BIA: 'BIA',
    BO_QUA: 'BO_QUA',
    NOI_DUNG: 'NOI_DUNG'
};

// Ranh giới cuối của tên đề mục. Không dùng \b vì trong JavaScript \b chỉ biết
// tới chữ cái không dấu: "NHẬT KÝ\b" hay "ĐẶT VẤN ĐỀ\b" không bao giờ khớp, và
// đó chính là lý do các vùng này vẫn lọt vào nội dung đem đi so trùng.
const HET_TEN_DE_MUC = '(?![\\p{L}\\p{N}])';

// Đề mục mở ra một vùng phải bỏ trọn khối.
const DE_MUC_BO_KHOI = new RegExp(
    '^(' +
    'LỜI CẢM ƠN|CẢM ƠN|LỜI CAM ĐOAN|CAM ĐOAN|MỤC LỤC|DANH MỤC|' +
    'NHẬT KÝ|NHẬN XÉT|ĐÁNH GIÁ CỦA|Ý KIẾN CỦA|XÁC NHẬN CỦA|' +
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

// Đề mục mở ra vùng nội dung.
const DE_MUC_MO_NOI_DUNG = new RegExp(
    '^(' +
    'LỜI MỞ ĐẦU|LỜI NÓI ĐẦU|MỞ ĐẦU|PHẦN MỞ ĐẦU|ĐẶT VẤN ĐỀ|' +
    'PHẦN NỘI DUNG|NỘI DUNG|KẾT LUẬN|TỔNG KẾT|GIỚI THIỆU' +
    ')' + HET_TEN_DE_MUC,
    'iu'
);

/**
 * Đoạn văn đủ dài và có dấu kết câu thì chắc chắn là nội dung viết ra, không
 * phải dòng bìa hay dòng mục lục. Dùng để thoát khỏi vùng bìa ở những bài không
 * hề có đề mục nào chuẩn.
 */
function laDoanVanThucSu(dong) {
    const t = chuanHoaKhoangTrang(dong);

    return t.length >= 150 && /[.!?]/.test(t);
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
 * Giữ lại phần nội dung của báo cáo, bỏ các vùng phụ trợ.
 *
 * @param {string} vanBan - văn bản đã tách dòng theo đoạn
 * @returns {string}
 */
function locVungNoiDung(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return '';
    }

    const cacDong = vanBan.split(/\r?\n/);
    const ketQua = [];

    let vungHienTai = VUNG.BIA;
    let vungKeoDaiDenHet = false;
    let soDongDaBoTrongVung = 0;

    for (const dongGoc of cacDong) {
        const dong = dongGoc.replace(/\s+$/, '');
        const t = chuanHoaKhoangTrang(boNhan(dong));

        if (!t || laSoTrang(t)) {
            continue;
        }

        const vungMoi = vungMoBoiDeMuc(dong);

        if (vungMoi) {
            vungHienTai = vungMoi;
            vungKeoDaiDenHet =
                vungMoi === VUNG.BO_QUA && DE_MUC_BO_DEN_HET.test(t);
            soDongDaBoTrongVung = 0;
            // Bản thân dòng đề mục không được tính vào nội dung
            continue;
        }

        // Ở vùng bìa, một đoạn văn thực sự đánh dấu bài đã vào phần nội dung.
        if (vungHienTai === VUNG.BIA && laDoanVanThucSu(t)) {
            vungHienTai = VUNG.NOI_DUNG;
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
            soDongDaBoTrongVung++;
            continue;
        }

        // Dòng mục lục sót lại giữa vùng nội dung (hay gặp ở bản PDF)
        if (laDongMucLuc(t)) {
            continue;
        }

        ketQua.push(dong);
    }

    // Không nhận ra vùng nội dung nào thì trả lại nguyên văn bản để bước sau còn
    // có cái mà lọc, thà thừa còn hơn chấm một bài rỗng.
    if (!ketQua.length) {
        return vanBan;
    }

    return ketQua.join('\n');
}

module.exports = {
    locVungNoiDung,
    laDoanVanThucSu,
    VUNG
};
