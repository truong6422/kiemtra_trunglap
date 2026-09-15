const express = require('express');
const router = express.Router();

const LopHoc = require('../models/lop_hoc');
const BaiTap = require('../models/bai_tap');
const ChiTietNopBai = require('../models/chi_tiet_nop_bai');
const SinhVien = require('../models/sinh_vien');
const NguoiDung = require('../models/nguoi_dung');
const BaoCao = require('../models/bao_cao');
const ThongKe = require('../models/thong_ke');

/**
 * Thành viên lớp chỉ lưu id_nguoi_dung, còn bài nộp lại ghi theo mã sinh viên.
 * Hàm này dựng bảng tra hai chiều để nối được hai bên với nhau.
 */
async function layBangTraSinhVien(dsIdNguoiDung) {

    const ds = await SinhVien.find({ id_nguoi_dung: { $in: dsIdNguoiDung } })
        .select('id_sinh_vien id_nguoi_dung ma_sinh_vien').lean();

    const theoNguoiDung = new Map();
    const theoSinhVien = new Map();

    for (const sv of ds) {
        theoNguoiDung.set(sv.id_nguoi_dung, sv);
        theoSinhVien.set(sv.id_sinh_vien, sv);
    }

    return { theoNguoiDung, theoSinhVien };
}

/**
 * Bỏ những người không phải học viên ra khỏi danh sách thành viên lớp.
 *
 * Có hai nhóm:
 *
 * - Quản trị viên: có mặt trong lớp chỉ để xem thống kê, không phải người học
 *   nên không được tính vào sĩ số, cũng không bị coi là "chưa nộp bài" —
 *   trước đây họ luôn nằm ở nhóm chưa nộp và kéo tỉ lệ nộp bài của lớp xuống.
 *
 * - Chủ lớp: người tạo ra lớp là người ra bài, không phải người nộp bài.
 *
 * @param {Array} thanhVien   Danh sách thành viên của lớp
 * @param {string} idChuLop   Mã người tạo lớp, bỏ qua nếu không truyền
 */
async function boNguoiKhongPhaiHocVien(thanhVien, idChuLop) {

    let ds = thanhVien || [];
    if (!ds.length) return ds;

    if (idChuLop) {
        ds = ds.filter(
            t => String(t.id_nguoi_dung) !== String(idChuLop)
        );
        if (!ds.length) return ds;
    }

    const quanTri = await NguoiDung.find({
        id_nguoi_dung: { $in: ds.map(t => t.id_nguoi_dung).filter(Boolean) },
        vai_tro: { $in: ['quan_tri_vien', 'admin'] }
    }).select('id_nguoi_dung').lean();

    if (!quanTri.length) return ds;

    const loai = new Set(quanTri.map(q => String(q.id_nguoi_dung)));
    return ds.filter(t => !loai.has(String(t.id_nguoi_dung)));
}

// =========================================================================
// API GET /api/thong-ke/lop-hoc
//
// Danh sách lớp, kèm số thành viên và số bài tập của từng lớp.
// Truyền ?id_nguoi_dung= để chỉ lấy lớp do người đó phụ trách.
// =========================================================================
router.get('/lop-hoc', async (req, res) => {
    try {
        const { id_nguoi_dung } = req.query;

        const dieuKien = id_nguoi_dung ? { id_nguoi_dung } : {};

        const dsLop = await LopHoc.find(dieuKien)
            .select('id_lop_hoc ma_lop tieu_de mo_ta id_nguoi_dung danh_sach_thanh_vien ngay_tao')
            .sort({ ngay_tao: -1 })
            .lean();

        if (dsLop.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const dsIdLop = dsLop.map(l => l.id_lop_hoc);

        const demBaiTap = await BaiTap.aggregate([
            { $match: { id_lop_hoc: { $in: dsIdLop } } },
            { $group: { _id: "$id_lop_hoc", so_bai_tap: { $sum: 1 } } }
        ]);

        const bangBaiTap = new Map(demBaiTap.map(x => [x._id, x.so_bai_tap]));

        // Số báo cáo đã nộp trong từng lớp, gom từ các bài tập của lớp đó.
        // Giảng viên cần con số này để biết lớp nào nộp nhiều, lớp nào còn ít.
        const dsBaiTapCuaLop = await BaiTap.find({ id_lop_hoc: { $in: dsIdLop } })
            .select('id_bai_tap id_lop_hoc').lean();

        const lopCuaBaiTap = new Map(
            dsBaiTapCuaLop.map(b => [String(b.id_bai_tap), b.id_lop_hoc]));

        const dsNopTatCa = await ChiTietNopBai.find({
            id_bai_tap: { $in: dsBaiTapCuaLop.map(b => String(b.id_bai_tap)) }
        }).select('id_bai_tap').lean();

        const bangNop = new Map();
        for (const n of dsNopTatCa) {
            const idLop = lopCuaBaiTap.get(String(n.id_bai_tap));
            if (idLop === undefined) continue;
            bangNop.set(idLop, (bangNop.get(idLop) || 0) + 1);
        }

        // Tên giảng viên phụ trách
        const dsChuNhiem = await NguoiDung.find({
            id_nguoi_dung: { $in: dsLop.map(l => l.id_nguoi_dung) }
        }).select('id_nguoi_dung ho_ten ten_dang_nhap').lean();

        const bangTen = new Map(
            dsChuNhiem.map(n => [n.id_nguoi_dung, n.ho_ten || n.ten_dang_nhap]));

        const ketQua = [];

        for (const l of dsLop) {
            const thanhVien = await boNguoiKhongPhaiHocVien(
                l.danh_sach_thanh_vien || [], l.id_nguoi_dung);

            ketQua.push({
                id_lop_hoc: l.id_lop_hoc,
                ma_lop: l.ma_lop,
                tieu_de: l.tieu_de,
                mo_ta: Array.isArray(l.mo_ta) ? l.mo_ta.join(" ") : (l.mo_ta || ""),
                ngay_tao: l.ngay_tao,
                giang_vien: bangTen.get(l.id_nguoi_dung) || l.id_nguoi_dung,
                so_thanh_vien: thanhVien.length,
                so_bai_tap: bangBaiTap.get(l.id_lop_hoc) || 0,
                so_bai_nop: bangNop.get(l.id_lop_hoc) || 0
            });
        }

        return res.json({ success: true, data: ketQua });

    } catch (error) {
        console.error("Lỗi API thống kê lớp học:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// API GET /api/thong-ke/lop-hoc/:id_lop_hoc/bai-tap
//
// Các bài tập của một lớp, kèm số đã nộp trên tổng số thành viên.
// =========================================================================
router.get('/lop-hoc/:id_lop_hoc/bai-tap', async (req, res) => {
    try {
        const idLop = Number(req.params.id_lop_hoc);

        const lop = await LopHoc.findOne({ id_lop_hoc: idLop })
            .select('id_lop_hoc ma_lop tieu_de id_nguoi_dung danh_sach_thanh_vien')
            .lean();

        if (!lop) {
            return res.status(404).json({
                success: false, message: "Không tìm thấy lớp học!"
            });
        }

        const dsBaiTap = await BaiTap.find({ id_lop_hoc: idLop })
            .select('id_bai_tap tieu_de huong_dan trang_thai ' +
                'thoi_gian_bat_dau thoi_gian_ket_thuc danh_sach_nop_bai')
            .lean();

        const soThanhVien =
            (await boNguoiKhongPhaiHocVien(
                lop.danh_sach_thanh_vien || [], lop.id_nguoi_dung)).length;

        // Đếm số bài đã nộp thật, đối chiếu với bảng chi_tiet_nop_bai
        const dsNop = await ChiTietNopBai.find({
            id_bai_tap: { $in: dsBaiTap.map(b => String(b.id_bai_tap)) }
        }).select('id_bai_tap id_sinh_vien').lean();

        const demNop = new Map();
        for (const n of dsNop) {
            const bo = demNop.get(n.id_bai_tap) || new Set();
            bo.add(n.id_sinh_vien);
            demNop.set(n.id_bai_tap, bo);
        }

        const ketQua = dsBaiTap.map(b => {

            // Bảng chi_tiet_nop_bai là nguồn chính; nếu chưa có bản ghi nào thì
            // lấy tạm trạng thái ghi sẵn trong chính bài tập.
            const theoBangNop = demNop.get(String(b.id_bai_tap));

            const soDaNop = theoBangNop
                ? theoBangNop.size
                : (b.danh_sach_nop_bai || [])
                    .filter(x => x.trang_thai_nop === "Đã nộp").length;

            return {
                id_bai_tap: b.id_bai_tap,
                tieu_de: b.tieu_de,
                huong_dan: b.huong_dan,
                trang_thai: b.trang_thai,
                thoi_gian_bat_dau: b.thoi_gian_bat_dau,
                thoi_gian_ket_thuc: b.thoi_gian_ket_thuc,
                so_thanh_vien: soThanhVien,
                so_da_nop: soDaNop,
                so_chua_nop: Math.max(0, soThanhVien - soDaNop)
            };
        });

        return res.json({
            success: true,
            lop_hoc: {
                id_lop_hoc: lop.id_lop_hoc,
                ma_lop: lop.ma_lop,
                tieu_de: lop.tieu_de,
                so_thanh_vien: soThanhVien
            },
            data: ketQua
        });

    } catch (error) {
        console.error("Lỗi API bài tập của lớp:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// API GET /api/thong-ke/bai-tap/:id_bai_tap
//
// Chi tiết một bài tập: danh sách thành viên lớp, ai đã nộp, ai chưa nộp,
// kèm tỉ lệ trùng lặp của bài đã nộp.
// =========================================================================
router.get('/bai-tap/:id_bai_tap', async (req, res) => {
    try {
        const idBaiTap = req.params.id_bai_tap;

        const baiTap = await BaiTap.findOne({ id_bai_tap: Number(idBaiTap) }).lean();

        if (!baiTap) {
            return res.status(404).json({
                success: false, message: "Không tìm thấy bài tập!"
            });
        }

        const lop = await LopHoc.findOne({ id_lop_hoc: baiTap.id_lop_hoc })
            .select('id_lop_hoc ma_lop tieu_de id_nguoi_dung danh_sach_thanh_vien')
            .lean();

        const thanhVien =
            await boNguoiKhongPhaiHocVien(
                (lop && lop.danh_sach_thanh_vien) || [],
                lop && lop.id_nguoi_dung);

        const { theoNguoiDung, theoSinhVien } =
            await layBangTraSinhVien(thanhVien.map(t => t.id_nguoi_dung));

        // Bài đã nộp cho bài tập này
        const dsNop = await ChiTietNopBai.find({ id_bai_tap: String(idBaiTap) })
            .select('id_sinh_vien id_bao_cao tieu_de_tep ngay_nop trang_thai').lean();

        // Tỉ lệ trùng của từng bài nộp
        const dsThongKe = await ThongKe.find({
            id_bao_cao: { $in: dsNop.map(n => n.id_bao_cao) }
        }).select('id_bao_cao ti_le_trung_lap tong_so_cau tong_so_cau_trung').lean();

        const bangTiLe = new Map(dsThongKe.map(t => [t.id_bao_cao, t]));

        // Gom bài nộp theo người, một người có thể nộp lại nhiều lần
        const nopTheoNguoi = new Map();

        for (const n of dsNop) {
            const sv = theoSinhVien.get(n.id_sinh_vien);
            const khoa = sv ? sv.id_nguoi_dung : n.id_sinh_vien;

            const cu = nopTheoNguoi.get(khoa);
            if (!cu || new Date(n.ngay_nop) > new Date(cu.ngay_nop)) {
                nopTheoNguoi.set(khoa, n);
            }
        }

        // Trường hợp bài tập tự ghi trạng thái nộp mà chưa có bản ghi riêng
        const nopGhiSan = new Map(
            (baiTap.danh_sach_nop_bai || [])
                .filter(x => x.trang_thai_nop === "Đã nộp")
                .map(x => [x.ho_ten, x]));

        const daNop = [];
        const chuaNop = [];

        for (const tv of thanhVien) {

            const sv = theoNguoiDung.get(tv.id_nguoi_dung);
            const banNop = nopTheoNguoi.get(tv.id_nguoi_dung) ||
                nopGhiSan.get(tv.ho_ten);

            const nguoi = {
                id_nguoi_dung: tv.id_nguoi_dung,
                ho_ten: tv.ho_ten,
                email: tv.email || "",
                ma_sinh_vien: sv ? (sv.ma_sinh_vien || sv.id_sinh_vien) : ""
            };

            if (!banNop) {
                chuaNop.push(nguoi);
                continue;
            }

            const tk = banNop.id_bao_cao ? bangTiLe.get(banNop.id_bao_cao) : null;

            daNop.push({
                ...nguoi,
                id_bao_cao: banNop.id_bao_cao || "",
                tieu_de_tep: banNop.tieu_de_tep || "",
                ngay_nop: banNop.ngay_nop || banNop.thoi_gian_nop || null,
                ti_le_trung_lap: tk ? tk.ti_le_trung_lap : null
            });
        }

        return res.json({
            success: true,
            bai_tap: {
                id_bai_tap: baiTap.id_bai_tap,
                tieu_de: baiTap.tieu_de,
                huong_dan: baiTap.huong_dan,
                trang_thai: baiTap.trang_thai,
                thoi_gian_bat_dau: baiTap.thoi_gian_bat_dau,
                thoi_gian_ket_thuc: baiTap.thoi_gian_ket_thuc
            },
            lop_hoc: lop ? {
                id_lop_hoc: lop.id_lop_hoc,
                ma_lop: lop.ma_lop,
                tieu_de: lop.tieu_de
            } : null,
            tong_so_thanh_vien: thanhVien.length,
            danh_sach_thanh_vien: thanhVien.map(t => ({
                id_nguoi_dung: t.id_nguoi_dung,
                ho_ten: t.ho_ten,
                email: t.email || ""
            })),
            da_nop: daNop,
            chua_nop: chuaNop
        });

    } catch (error) {
        console.error("Lỗi API chi tiết bài tập:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// API GET /api/thong-ke/bai-nop-cua-lop?id_nguoi_dung=
//
// Số bài do thành viên các lớp của một giảng viên nộp — dùng cho thẻ
// "Tổng số bài đã nộp" ở màn giảng viên.
// =========================================================================
router.get('/bai-nop-cua-lop', async (req, res) => {
    try {
        const { id_nguoi_dung } = req.query;

        if (!id_nguoi_dung) {
            return res.status(400).json({
                success: false, message: "Thiếu id_nguoi_dung!"
            });
        }

        const dsLop = await LopHoc.find({ id_nguoi_dung })
            .select('id_lop_hoc ma_lop id_nguoi_dung danh_sach_thanh_vien').lean();

        // Gom thành viên của mọi lớp, bỏ trùng, bỏ quản trị viên và chủ lớp.
        // Lọc theo từng lớp một vì mỗi lớp có chủ riêng.
        const theoTungLop = [];

        for (const l of dsLop) {
            theoTungLop.push(...await boNguoiKhongPhaiHocVien(
                l.danh_sach_thanh_vien || [], l.id_nguoi_dung));
        }

        const idThanhVien = [...new Set(
            theoTungLop.map(t => t.id_nguoi_dung)
        )];

        const { theoNguoiDung } = await layBangTraSinhVien(idThanhVien);

        const maTraCuu = idThanhVien.concat(
            [...theoNguoiDung.values()].map(sv => sv.id_sinh_vien)
        ).filter(Boolean);

        const soBai = await BaoCao.countDocuments({
            mau_kiem_tra: { $ne: true },
            id_sinh_vien: { $in: maTraCuu }
        });

        return res.json({
            success: true,
            so_lop: dsLop.length,
            so_thanh_vien: idThanhVien.length,
            so_bai_da_nop: soBai
        });

    } catch (error) {
        console.error("Lỗi API bài nộp của lớp:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
