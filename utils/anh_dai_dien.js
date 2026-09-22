/**
 * ============================================================================
 * ẢNH ĐẠI DIỆN NGƯỜI DÙNG
 *
 * Khi đăng ký hoặc đăng nhập, tài khoản được gán sẵn một ảnh đại diện thay vì
 * để trống rồi hiện mãi tấm ảnh xám mặc định:
 *
 *   1. Thử lấy ảnh Gravatar gắn với địa chỉ email. Gravatar là dịch vụ ảnh đại
 *      diện theo email mà nhiều nơi dùng chung, nên ai đã đặt ảnh ở đó thì vào
 *      đây có ảnh luôn, không phải tải lên lần nữa.
 *
 *   2. Email chưa có ảnh ở Gravatar thì sinh một ảnh chữ cái: lấy chữ đầu của
 *      tên, đặt trên nền màu suy ra từ chính email nên mỗi người một màu cố
 *      định. Ảnh này là SVG nhúng thẳng vào trường hinh_anh dưới dạng data URI,
 *      không phải tệp trên ổ đĩa và không gọi ra ngoài Internet — mở máy không
 *      có mạng vẫn hiện đúng.
 *
 * Người dùng bấm vào ảnh đại diện để tự chọn ảnh khác; ảnh tải lên được lưu
 * trong uploads/anh-dai-dien và ghi đè hai bước trên.
 * ============================================================================
 */

const crypto = require('crypto');
const https = require('https');

// Bảng màu nền cho ảnh chữ cái. Chọn các màu đủ đậm để chữ trắng đọc rõ.
const MAU_NEN = [
    '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
    '#ca8a04', '#16a34a', '#0d9488', '#0284c7', '#4f46e5'
];

/**
 * Chữ cái đầu dùng làm ảnh đại diện.
 * Ưu tiên chữ đầu của tên riêng (từ cuối cùng trong họ tên tiếng Việt).
 */
function chuCaiDau(hoTen, email) {
    const ten = String(hoTen || '').trim();

    if (ten) {
        const cacTu = ten.split(/\s+/);
        return cacTu[cacTu.length - 1].charAt(0).toUpperCase();
    }

    return String(email || '?').charAt(0).toUpperCase();
}

/**
 * Sinh ảnh chữ cái dạng SVG, trả về chuỗi data URI nhúng thẳng vào thẻ img.
 *
 * @param {string} hoTen
 * @param {string} email Dùng để chọn màu nền, nên mỗi người một màu cố định
 */
function anhChuCai(hoTen, email) {
    const chu = chuCaiDau(hoTen, email);

    // Chọn màu theo email để cùng một người luôn ra cùng một màu
    const hash = crypto.createHash('md5')
        .update(String(email || hoTen || '').toLowerCase())
        .digest('hex');

    const mau = MAU_NEN[parseInt(hash.slice(0, 2), 16) % MAU_NEN.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">`
        + `<rect width="200" height="200" fill="${mau}"/>`
        + `<text x="100" y="100" fill="#ffffff" font-size="96"`
        + ` font-family="Segoe UI, Arial, sans-serif" font-weight="600"`
        + ` text-anchor="middle" dominant-baseline="central">${chu}</text>`
        + `</svg>`;

    return 'data:image/svg+xml;base64,'
        + Buffer.from(svg, 'utf8').toString('base64');
}

/**
 * Địa chỉ ảnh Gravatar của một email.
 *
 * Tham số d=404 bảo Gravatar trả về lỗi 404 thay vì một ảnh mặc định, nhờ vậy
 * mới phân biệt được "email này có ảnh thật" với "Gravatar đang trả ảnh bịa".
 */
function duongDanGravatar(email) {
    const hash = crypto.createHash('md5')
        .update(String(email || '').trim().toLowerCase())
        .digest('hex');

    return `https://www.gravatar.com/avatar/${hash}?s=200&d=404`;
}

/**
 * Hỏi Gravatar xem email này đã có ảnh chưa.
 *
 * Chờ tối đa 2 giây rồi thôi. Phần này chạy ngay trong lúc người dùng bấm đăng
 * nhập, nên mạng chậm hay máy không nối được Internet đều phải rơi về ảnh chữ
 * cái ngay chứ không được treo màn hình đăng nhập.
 *
 * @returns {Promise<boolean>}
 */
function gravatarCoAnh(email) {
    return new Promise(resolve => {
        if (!email) return resolve(false);

        const req = https.request(
            duongDanGravatar(email),
            { method: 'HEAD', timeout: 2000 },
            res => {
                resolve(res.statusCode === 200);
                res.resume();
            }
        );

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });
}

/**
 * Chọn ảnh đại diện cho một tài khoản chưa có ảnh.
 *
 * @param {Object} nguoiDung Cần có email và ho_ten
 * @returns {Promise<string>} Địa chỉ ảnh hoặc chuỗi data URI
 */
async function chonAnhDaiDien({ email, ho_ten }) {
    if (await gravatarCoAnh(email)) {
        // Bỏ d=404 ở bản đem đi hiển thị: đã biết chắc là có ảnh, và để nguyên
        // 404 thì lần nào ảnh lỗi cũng thành ô trống thay vì ảnh dự phòng.
        return duongDanGravatar(email).replace('&d=404', '');
    }

    return anhChuCai(ho_ten, email);
}

/**
 * Gán ảnh đại diện cho tài khoản nếu trường hinh_anh đang trống.
 *
 * Gọi được ở cả lúc đăng ký lẫn lúc đăng nhập: tài khoản cũ tạo từ trước khi
 * có tính năng này chỉ cần đăng nhập một lần là có ảnh.
 *
 * @param {Object} NguoiDung Model nguoi_dung
 * @param {Object} user Bản ghi người dùng
 * @returns {Promise<string>} Ảnh đang dùng sau khi xử lý
 */
async function ganAnhNeuThieu(NguoiDung, user) {
    if (!user) return '';
    if (user.hinh_anh) return user.hinh_anh;

    const anh = await chonAnhDaiDien(user);

    await NguoiDung.updateOne(
        { id_nguoi_dung: user.id_nguoi_dung },
        { $set: { hinh_anh: anh } }
    );

    return anh;
}

module.exports = {
    anhChuCai,
    duongDanGravatar,
    gravatarCoAnh,
    chonAnhDaiDien,
    ganAnhNeuThieu
};
