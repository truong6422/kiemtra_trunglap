/**
 * ============================================================================
 * BỔ SUNG BÁO CÁO MẪU (chỉ quản trị viên) — /api/mau-bo-sung
 *
 * Trước đây muốn thêm báo cáo vào kho mẫu phải viết mã chạy tay rồi chạy lại
 * rebuild_file.js + precompute_cauhinh.js cho cả kho. Ở đây quản trị viên:
 *   - chọn tệp từ máy tính, hoặc chọn báo cáo người dùng đã kiểm tra,
 *   - bấm Thêm: tệp được chép vào thư mục nguon_moi_bo_sung/, bản ghi được tạo
 *     thẳng trong bao_cao với mau_kiem_tra = true, da_tinh_toan = false,
 *   - bấm Tính toán: chỉ những báo cáo mới đó được tiền xử lý và lập chỉ số.
 * ============================================================================
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const BaoCao = require('../models/bao_cao');
const ChiSoCau = require('../models/chi_so_cau');
const NguoiDung = require('../models/nguoi_dung');
const ThongKe = require('../models/thong_ke');
const { taoMaBaoCaoMoi } = require('../utils/tao_ma_bao_cao');
const { timTepBaoCao } = require('../utils/duong_dan_tep');
const { tinhToanMauBoSung } = require('../utils/tinh_toan_mau_bo_sung');

const router = express.Router();

const TEN_THU_MUC = 'nguon_moi_bo_sung';
const THU_MUC = path.resolve(__dirname, '..', TEN_THU_MUC);
// .doc không nhận: bộ bôi màu trang xem nguồn chỉ chuyển được .docx sang PDF
const DUOI_HOP_LE = ['.docx', '.pdf'];

fs.mkdirSync(THU_MUC, { recursive: true });

// Tên tệp từ trình duyệt đến dưới dạng latin1; đổi lại để giữ dấu tiếng Việt
const tenGoc = f => Buffer.from(f.originalname, 'latin1').toString('utf8');

const upload = multer({
    dest: path.join(THU_MUC, '.tam'),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, f, cb) => cb(null, DUOI_HOP_LE.includes(path.extname(tenGoc(f)).toLowerCase()))
});

/** Chỉ cho quản trị viên dùng. Mã tài khoản gửi kèm ở header x-id-nguoi-dung. */
async function chiQuanTriVien(req, res, next) {
    const id = req.get('x-id-nguoi-dung') || '';
    const nd = id ? await NguoiDung.findOne({ id_nguoi_dung: id }).select('vai_tro').lean() : null;

    if (!nd || !['quan_tri_vien', 'admin'].includes(nd.vai_tro)) {
        return res.status(403).json({ success: false, message: 'Chỉ quản trị viên mới dùng được chức năng này.' });
    }
    next();
}

router.use(chiQuanTriVien);

// Trạng thái lượt tính toán chạy nền (xem POST/GET /tinh-toan)
let tacVu = { dang_chay: false, tien_do: null, ket_qua: null, loi: null };

/** Tên tệp an toàn trong thư mục mẫu, gắn mã báo cáo để không đè tệp khác. */
function tenTepLuu(idBaoCao, tenTep) {
    const sach = tenTep.replace(/[\\/:*?"<>|]+/g, '_').trim();
    return `${idBaoCao}_${sach}`;
}

async function taoBanGhiMau({ tieuDe, loai, tepNguon, tenTep, nguonBoSung }) {
    const idBaoCao = await taoMaBaoCaoMoi();
    const tenLuu = tenTepLuu(idBaoCao, tenTep);

    const banGhi = await BaoCao.create({
        id_bao_cao: idBaoCao,
        tieu_de: tieuDe,
        loai_bao_cao: loai,
        tep_tin: `${TEN_THU_MUC}/${tenLuu}`,
        mau_kiem_tra: true,
        trang_thai: 'Chưa tính toán',
        nguon_bo_sung: nguonBoSung,
        da_tinh_toan: false
    });

    // Tạo bản ghi trước rồi mới chép tệp: chép hỏng thì gỡ bản ghi, không để
    // lại tệp mồ côi hay bản ghi trỏ vào tệp không có
    try {
        fs.copyFileSync(tepNguon, path.join(THU_MUC, tenLuu));
    } catch (e) {
        await BaoCao.deleteOne({ _id: banGhi._id });
        throw e;
    }
    return banGhi;
}

// Các loại báo cáo đang có trong kho mẫu, để chọn nhanh
router.get('/loai', async (req, res) => {
    const ds = await BaoCao.distinct('loai_bao_cao', { mau_kiem_tra: true });
    res.json({ success: true, data: ds.filter(Boolean).sort() });
});

// Báo cáo người dùng đã tải lên và đã có kết quả tỉ lệ — ứng viên làm mẫu
router.get('/bao-cao-da-kiem-tra', async (req, res) => {
    try {
        const dsBc = await BaoCao.find({ mau_kiem_tra: { $ne: true }, trang_thai: 'Đã xử lý' })
            .select('id_bao_cao tieu_de loai_bao_cao tep_tin ngay_tai_len')
            .sort({ ngay_tai_len: -1 }).lean();

        const tk = await ThongKe.find({ id_bao_cao: { $in: dsBc.map(b => b.id_bao_cao) } })
            .select('id_bao_cao ti_le_trung_lap ngay_kiem_tra').sort({ ngay_kiem_tra: 1 }).lean();
        const tiLe = new Map(tk.map(t => [t.id_bao_cao, t.ti_le_trung_lap]));

        // Báo cáo nào đã được lấy làm mẫu rồi thì đánh dấu để khỏi thêm trùng
        const daLay = new Set(await BaoCao.distinct('nguon_bo_sung', { mau_kiem_tra: true }));

        res.json({
            success: true,
            data: dsBc.map(b => ({
                ...b,
                ti_le_trung_lap: tiLe.get(b.id_bao_cao) ?? null,
                con_tep: !!timTepBaoCao(b.tep_tin),
                da_lay_lam_mau: daLay.has(b.id_bao_cao)
            }))
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Danh sách báo cáo mẫu đã bổ sung qua chức năng này
router.get('/', async (req, res) => {
    try {
        const ds = await BaoCao.find({ mau_kiem_tra: true, nguon_bo_sung: { $exists: true } })
            .select('id_bao_cao tieu_de loai_bao_cao tep_tin ngay_tai_len nguon_bo_sung da_tinh_toan')
            .sort({ ngay_tai_len: -1 }).lean();

        const dem = await ChiSoCau.aggregate([
            { $match: { id_bao_cao: { $in: ds.map(b => b.id_bao_cao) } } },
            { $group: { _id: '$id_bao_cao', n: { $sum: 1 } } }
        ]);
        const soCau = new Map(dem.map(d => [d._id, d.n]));

        res.json({ success: true, data: ds.map(b => ({ ...b, so_cau: soCau.get(b.id_bao_cao) || 0 })) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Thêm báo cáo vào kho mẫu: tệp tải lên (tep) và/hoặc mã báo cáo đã kiểm tra (ds_bao_cao)
router.post('/', upload.array('tep', 200), async (req, res) => {
    const daThem = [];
    const loi = [];
    try {
        const loai = String(req.body.loai_bao_cao || '').trim();
        if (!loai) throw Object.assign(new Error('Chưa chọn loại báo cáo mẫu.'), { ma: 400 });

        for (const f of req.files || []) {
            const ten = tenGoc(f);
            try {
                daThem.push(await taoBanGhiMau({
                    tieuDe: path.basename(ten, path.extname(ten)),
                    loai, tepNguon: f.path, tenTep: ten, nguonBoSung: 'tep_may_tinh'
                }));
            } catch (e) {
                loi.push(`${ten}: ${e.message}`);
            }
        }

        let dsMa = [];
        try { dsMa = JSON.parse(req.body.ds_bao_cao || '[]'); } catch (e) { dsMa = []; }
        // Chỉ nhận chuỗi mã, chặn kiểu {"$gt": ""} lọt vào truy vấn
        dsMa = (Array.isArray(dsMa) ? dsMa : []).filter(ma => typeof ma === 'string');

        for (const ma of dsMa) {
            const bc = await BaoCao.findOne({ id_bao_cao: ma, mau_kiem_tra: { $ne: true } }).lean();
            const tep = bc && timTepBaoCao(bc.tep_tin);
            if (!tep) { loi.push(`${ma}: không tìm thấy báo cáo hoặc tệp gốc`); continue; }
            if (await BaoCao.exists({ mau_kiem_tra: true, nguon_bo_sung: ma })) {
                loi.push(`${ma}: đã được lấy làm mẫu trước đó`);
                continue;
            }
            try {
                daThem.push(await taoBanGhiMau({
                    tieuDe: bc.tieu_de, loai, tepNguon: tep,
                    tenTep: path.basename(tep), nguonBoSung: ma
                }));
            } catch (e) {
                loi.push(`${ma}: ${e.message}`);
            }
        }

        if (!daThem.length && !loi.length) {
            throw Object.assign(new Error('Chưa chọn báo cáo nào để thêm.'), { ma: 400 });
        }

        res.json({
            success: true,
            message: `Đã thêm ${daThem.length} báo cáo vào dữ liệu mẫu.`,
            data: daThem.map(b => ({ id_bao_cao: b.id_bao_cao, tieu_de: b.tieu_de })),
            loi
        });
    } catch (e) {
        res.status(e.ma || 500).json({ success: false, message: e.message, loi });
    } finally {
        (req.files || []).forEach(f => fs.rm(f.path, { force: true }, () => {}));
    }
});

// Gỡ một báo cáo mẫu đã bổ sung (thêm nhầm) — chỉ áp dụng cho mẫu bổ sung
router.delete('/:id', async (req, res) => {
    // Đang tính toán mà gỡ thì chỉ số câu của mẫu vừa gỡ có thể bị ghi lại
    if (tacVu.dang_chay) {
        return res.status(409).json({ success: false, message: 'Đang tính toán, hãy gỡ sau khi tính xong.' });
    }
    try {
        const bc = await BaoCao.findOne({
            id_bao_cao: req.params.id, mau_kiem_tra: true, nguon_bo_sung: { $exists: true }
        }).lean();
        if (!bc) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo mẫu bổ sung.' });

        await ChiSoCau.deleteMany({ id_bao_cao: bc.id_bao_cao });
        await BaoCao.deleteOne({ _id: bc._id });
        const tep = timTepBaoCao(bc.tep_tin);
        if (tep) fs.rm(tep, { force: true }, () => {});

        res.json({ success: true, message: `Đã gỡ ${bc.id_bao_cao} khỏi dữ liệu mẫu.` });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ---------------------------------------------------------------------------
// Tính toán chạy nền: báo cáo lớn mất vài giây mỗi bài, không giữ yêu cầu HTTP
// chờ đến hết. Trang quản lý hỏi tiến độ qua GET /tinh-toan.
// ---------------------------------------------------------------------------

router.post('/tinh-toan', async (req, res) => {
    if (tacVu.dang_chay) return res.json({ success: true, message: 'Đang tính toán.', data: tacVu });

    // Giữ chỗ ngay, trước mọi await: bấm đúp không được sinh hai lượt chạy song song
    tacVu = { dang_chay: true, tien_do: null, ket_qua: null, loi: null, bat_dau: new Date() };

    const soCho = await BaoCao.countDocuments({ mau_kiem_tra: true, da_tinh_toan: false });
    if (!soCho) {
        tacVu.dang_chay = false;
        return res.json({ success: false, message: 'Không có báo cáo mẫu mới nào cần tính toán.' });
    }

    tinhToanMauBoSung(td => { tacVu.tien_do = td; })
        .then(kq => { tacVu.ket_qua = kq; })
        .catch(e => { tacVu.loi = e.message; console.error('Lỗi tính toán mẫu bổ sung:', e); })
        .finally(() => { tacVu.dang_chay = false; tacVu.ket_thuc = new Date(); });

    res.json({ success: true, message: `Bắt đầu tính toán ${soCho} báo cáo mẫu mới.`, data: tacVu });
});

router.get('/tinh-toan', (req, res) => res.json({ success: true, data: tacVu }));

module.exports = router;
