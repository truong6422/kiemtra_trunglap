/**
 * ============================================================================
 * ĐƯỜNG DẪN TỆP BÁO CÁO
 *
 * Trường tep_tin trong bảng bao_cao không có một dạng thống nhất: bản ghi cũ
 * lưu đường dẫn tuyệt đối kiểu Windows ("D:/kiemtra_trunglap/uploads/a.pdf"),
 * bản khác lưu tương đối với dấu gạch ngược ("uploads\\a.pdf"), bản mới lưu
 * tương đối với gạch chéo xuôi.
 *
 * Mỗi kiểu lại hỏng theo một cách khi đổi máy: trên Linux thì "uploads\\a.pdf"
 * bị coi là một tên tệp duy nhất chứ không phải thư mục con, còn "D:/..." thì
 * trỏ vào ổ đĩa không tồn tại. Kết quả là mở trang chi tiết báo cáo chỉ thấy
 * "File vật lý không tồn tại trên ổ cứng server", dù tệp vẫn nằm trong thư mục
 * uploads của dự án.
 *
 * Hàm ở đây quy mọi kiểu về một tệp có thật trong dự án, để mã nguồn chạy được
 * trên cả máy của người viết lẫn máy người khác kéo về.
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');

const THU_MUC_GOC = path.join(__dirname, '..');

/**
 * Tìm tệp báo cáo trên ổ đĩa của máy đang chạy.
 *
 * Thử lần lượt: đúng đường dẫn đã lưu → ghép vào thư mục dự án → tìm theo tên
 * tệp trong uploads. Bước cuối là thứ cứu được những bản ghi mang đường dẫn
 * của máy khác, vì tên tệp luôn có phần dấu thời gian nên gần như không trùng.
 *
 * @param {string} tepTin Giá trị trường tep_tin trong bảng bao_cao
 * @returns {string|null} Đường dẫn tới tệp có thật, hoặc null nếu không thấy
 */
function timTepBaoCao(tepTin) {
    if (!tepTin) return null;

    // Gạch ngược của Windows không phải dấu ngăn thư mục trên Linux
    const chuan = String(tepTin).replace(/\\/g, '/');

    const cacNoiThu = [];

    if (path.isAbsolute(chuan)) {
        cacNoiThu.push(chuan);
    } else {
        cacNoiThu.push(path.join(THU_MUC_GOC, chuan));
        cacNoiThu.push(path.resolve(chuan));
    }

    // Đường dẫn của máy khác: chỉ giữ lại tên tệp rồi tìm trong uploads
    const tenTep = chuan.split('/').pop();

    if (tenTep) {
        cacNoiThu.push(path.join(THU_MUC_GOC, 'uploads', tenTep));
        cacNoiThu.push(path.join(THU_MUC_GOC, 'upload2', tenTep));
    }

    for (const noi of cacNoiThu) {
        try {
            if (fs.existsSync(noi) && fs.statSync(noi).isFile()) return noi;
        } catch (e) {
            // Đường dẫn không hợp lệ trên hệ điều hành này thì bỏ qua, thử tiếp
        }
    }

    return null;
}

/**
 * Tên tệp gốc, dùng để hiển thị và đặt tên khi tải xuống.
 */
function tenTepGoc(tepTin) {
    if (!tepTin) return '';
    return String(tepTin).replace(/\\/g, '/').split('/').pop();
}

module.exports = { timTepBaoCao, tenTepGoc, THU_MUC_GOC };
