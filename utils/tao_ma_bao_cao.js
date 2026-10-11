/**
 * ============================================================================
 * CẤP MÃ BÁO CÁO MỚI (utils/tao_ma_bao_cao.js)
 *
 * Mọi chỗ tạo bản ghi bao_cao đều phải lấy mã qua hàm này để chỉ có một kiểu
 * mã duy nhất (BC + số thứ tự từ bộ đếm 'bao_cao').
 *
 * Bộ đếm không biết dữ liệu mẫu đã chiếm sẵn mã nào (BC001, BC101...), nên
 * mỗi số rút ra phải kiểm tra lại trong bảng bao_cao; trùng thì rút số tiếp.
 * Thiếu bước này, khi bộ đếm chạy tới 101 sẽ sinh "BC101" đè lên báo cáo mẫu
 * và MongoDB báo lỗi E11000 duplicate key.
 * ============================================================================
 */

const Counter = require('../models/counter');
const BaoCao = require('../models/bao_cao');

async function taoMaBaoCaoMoi() {

    while (true) {
        const counter =
            await Counter.findOneAndUpdate(
                { _id: 'bao_cao' },
                { $inc: { seq: 1 } },
                { returnDocument: 'after', upsert: true }
            );

        const ma = `BC${counter.seq}`;

        if (!(await BaoCao.exists({ id_bao_cao: ma }))) {
            return ma;
        }
    }
}

module.exports = { taoMaBaoCaoMoi };
