/**
 * ============================================================================
 * ĐỒNG BỘ HỒ SƠ THEO VAI TRÒ (utils/dong_bo_vai_tro.js)
 *
 * Tài khoản đăng ký mới mặc định là sinh_vien và được tạo một bản ghi trong
 * collection sinh_vien. Khi quản trị viên đổi vai_tro sang giang_vien thì
 * trước đây bản ghi vẫn nằm nguyên bên sinh_vien, bên giang_vien không có gì,
 * nên người đó vẫn bị hệ thống coi là sinh viên.
 *
 * Hàm dưới đây đọc vai_tro trong collection nguoi_dung rồi đưa hồ sơ về đúng
 * chỗ: tạo bản ghi ở collection đích nếu chưa có, xoá bản ghi thừa ở collection
 * còn lại. Chạy lại nhiều lần vẫn cho cùng một kết quả.
 *
 * Quản trị viên (vai_tro = "quan_tri_vien" hoặc "admin") không thuộc cả hai
 * collection: họ chỉ quản lý hệ thống, không phải người học cũng không phải
 * người dạy.
 * ============================================================================
 */

const NguoiDung = require('../models/nguoi_dung');
const SinhVien = require('../models/sinh_vien');
const GiangVien = require('../models/giang_vien');

/** Sinh mã kế tiếp theo kiểu SV001 / GV001, giống cách làm lúc đăng ký. */
async function maKeTiep(Model, truong, tienTo) {
    const cuoi = await Model.findOne().sort({ [truong]: -1 });
    if (!cuoi || !cuoi[truong]) return tienTo + '001';

    const so = parseInt(String(cuoi[truong]).replace(tienTo, ''), 10);
    if (Number.isNaN(so)) return tienTo + '001';

    return tienTo + String(so + 1).padStart(3, '0');
}

/**
 * Đưa hồ sơ của một người về đúng collection theo vai_tro hiện tại.
 * @param {string} idNguoiDung
 * @returns {Promise<{vaiTro: string, daTao: string|null, daXoa: string|null}|null>}
 */
async function dongBoVaiTro(idNguoiDung) {
    if (!idNguoiDung) return null;

    const nd = await NguoiDung.findOne({ id_nguoi_dung: String(idNguoiDung) }).lean();
    if (!nd) return null;

    const vaiTro = nd.vai_tro || 'sinh_vien';
    const ketQua = { vaiTro, daTao: null, daXoa: null };

    const dangLaSinhVien = await SinhVien.findOne({ id_nguoi_dung: nd.id_nguoi_dung });
    const dangLaGiangVien = await GiangVien.findOne({ id_nguoi_dung: nd.id_nguoi_dung });

    if (vaiTro === 'giang_vien') {
        if (!dangLaGiangVien) {
            await GiangVien.create({
                id_giang_vien: await maKeTiep(GiangVien, 'id_giang_vien', 'GV'),
                ma_giang_vien: '',
                ho_ten: nd.ho_ten || '',
                bo_mon: '',
                email: nd.email || '',
                so_lan_kiem_tra: 0,
                id_nguoi_dung: nd.id_nguoi_dung
            });
            ketQua.daTao = 'giang_vien';
        }
        if (dangLaSinhVien) {
            await SinhVien.deleteOne({ id_nguoi_dung: nd.id_nguoi_dung });
            ketQua.daXoa = 'sinh_vien';
        }
        return ketQua;
    }

    if (vaiTro === 'sinh_vien') {
        if (!dangLaSinhVien) {
            await SinhVien.create({
                id_sinh_vien: await maKeTiep(SinhVien, 'id_sinh_vien', 'SV'),
                ma_sinh_vien: '',
                ho_ten: nd.ho_ten || '',
                lop: '',
                khoa_hoc: '',
                email: nd.email || '',
                so_bao_cao: 0,
                id_nguoi_dung: nd.id_nguoi_dung
            });
            ketQua.daTao = 'sinh_vien';
        }
        if (dangLaGiangVien) {
            await GiangVien.deleteOne({ id_nguoi_dung: nd.id_nguoi_dung });
            ketQua.daXoa = 'giang_vien';
        }
        return ketQua;
    }

    // Quản trị viên: gỡ khỏi cả hai collection nếu lỡ nằm trong đó
    if (dangLaSinhVien) {
        await SinhVien.deleteOne({ id_nguoi_dung: nd.id_nguoi_dung });
        ketQua.daXoa = 'sinh_vien';
    }
    if (dangLaGiangVien) {
        await GiangVien.deleteOne({ id_nguoi_dung: nd.id_nguoi_dung });
        ketQua.daXoa = ketQua.daXoa ? 'sinh_vien + giang_vien' : 'giang_vien';
    }

    return ketQua;
}

/** Đồng bộ cho toàn bộ tài khoản. Dùng để sửa dữ liệu đã lệch từ trước. */
async function dongBoVaiTroTatCa() {
    const ds = await NguoiDung.find({}).select('id_nguoi_dung').lean();
    const ketQua = [];

    for (const nd of ds) {
        const r = await dongBoVaiTro(nd.id_nguoi_dung);
        if (r && (r.daTao || r.daXoa)) {
            ketQua.push({ id: nd.id_nguoi_dung, ...r });
        }
    }

    return ketQua;
}

module.exports = { dongBoVaiTro, dongBoVaiTroTatCa };
