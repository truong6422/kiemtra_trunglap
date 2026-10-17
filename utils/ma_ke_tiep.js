/**
 * ============================================================================
 * CẤP MÃ KẾ TIẾP KIỂU ND001 / SV001 / GV001
 *
 * Trước đây lấy bản ghi có mã lớn nhất bằng cách sắp xếp chuỗi rồi cộng 1.
 * Cách đó hỏng khi người dùng đã tự đổi mã trong trang Tài khoản: mã "GV01"
 * xếp sau "GV002" theo thứ tự chữ, nên hệ thống đọc ra 1, cộng thành "GV002"
 * — đúng mã đã có người giữ — và MongoDB báo E11000 duplicate key.
 *
 * Hàm dưới đây chỉ xét những mã đúng dạng TIỀN_TỐ + số, lấy số lớn nhất theo
 * giá trị số, rồi vẫn kiểm tra lại cho chắc mã sắp cấp chưa ai dùng.
 * ============================================================================
 */

/**
 * @param {import('mongoose').Model} Model Collection cần cấp mã
 * @param {string} truong Tên trường giữ mã, ví dụ 'id_giang_vien'
 * @param {string} tienTo Tiền tố mã, ví dụ 'GV'
 * @returns {Promise<string>} Mã chưa tồn tại, ví dụ 'GV003'
 */
async function maKeTiep(Model, truong, tienTo) {
    const mau = new RegExp(`^${tienTo}(\\d+)$`);

    const ds = await Model.find({ [truong]: { $regex: mau } })
        .select(truong).lean();

    let lonNhat = 0;
    for (const x of ds) {
        const so = parseInt(mau.exec(String(x[truong]))[1], 10);
        if (so > lonNhat) lonNhat = so;
    }

    let so = lonNhat + 1;
    for (;;) {
        const ma = tienTo + String(so).padStart(3, '0');
        if (!(await Model.exists({ [truong]: ma }))) return ma;
        so++;
    }
}

module.exports = { maKeTiep };
