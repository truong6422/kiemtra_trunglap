/**
 * ============================================================================
 * WORKER XỬ LÝ HÀNG CHỜ ĐẠO VĂN (worker.js)
 * Chịu trách nhiệm bốc task từ BullMQ, thực thi thuật toán kiểm tra và sinh file highlight.
 * ============================================================================
 */

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const path = require('path');
const BaoCao = require('../models/bao_cao');
const KetQuaKiemTra = require('../models/ket_qua_kiem_tra');
const { checkPlagiarism } = require('../utils/kiem_tra_trung_lap');
const ChiTietCauTrungHighlight =
    require('../models/chi_tiet_cau_trung_highlight');
const { processAndHighlightReport } = require('../workers/processHighlight');
const {
    xuLyBaoCaoUpload
} = require('../utils/xu_ly_bao_cao_upload');
const ThongKe =
    require('../models/thong_ke');

const ChiTietCauTrung =
    require('../models/chi_tiet_cau_trung');

const ChiTietDoanTrung =
    require('../models/chi_tiet_doan_trung');

const ChiTietDoanChapVa =
    require('../models/chi_tiet_doan_chap_va');
const {
    generateIdKiemTra
} = require('../utils/generateIdKiemTra');


const connection = { host: 'localhost', port: 6379 };

async function startWorker() {
    // Kết nối cơ sở dữ liệu MongoDB
    await mongoose.connect('mongodb://localhost:27017/KiemTraTrungLap');
    console.log('👷 Worker ngầm đa luồng đã sẵn sàng bốc task từ Redis...');

    const worker = new Worker('plagiarismQueueV2', async (job) => {
        const {
            idBaoCaoMoi,
            idSinhVien
        } = job.data;
        console.log(`⏳ Đang xử lý tính toán ngầm cho báo cáo: ${idBaoCaoMoi}`);

        try {
            // Cập nhật tiến trình công việc: 10%
            await job.updateProgress(10);

            // Truy vấn thông tin báo cáo hiện tại để lấy đường dẫn file gốc
            const baoCaoGoc = await BaoCao.findOne({ id_bao_cao: idBaoCaoMoi }).lean();
            if (!baoCaoGoc) {

                throw new Error(
                    `Khong tim thay bao cao ${idBaoCaoMoi}`
                );
            }

            await xuLyBaoCaoUpload(
                baoCaoGoc
            );

            const duongDanFile = baoCaoGoc ? baoCaoGoc.tep_tin : null;
            if (!duongDanFile) {

                throw new Error(
                    `Bao cao ${idBaoCaoMoi} khong co tep_tin`
                );
            }

            // Xoá sạch kết quả của những lần chấm trước cho chính báo cáo này.
            //
            // Mỗi lượt chấm sinh một mã kiểm tra mới. Trước đây bản ghi cũ được
            // để nguyên, nên một báo cáo chấm lại ba lần thì trong cơ sở dữ liệu
            // có ba bộ dữ liệu chồng lên nhau. Bảng thống kê lấy theo mã kiểm
            // tra mới nhất, còn chi tiết câu trùng lại đọc theo mã báo cáo nên
            // vớ phải dữ liệu của lượt cũ: danh sách bên trái hiện đủ 45 nguồn
            // mà bấm vào nguồn nào bảng bên phải cũng trống trơn. Đây cũng là
            // lý do đổi trọng số rồi chấm lại thì màn hình không đổi theo.
            const dsXoa = await Promise.all([
                ThongKe.deleteMany({ id_bao_cao: idBaoCaoMoi }),
                ChiTietCauTrung.deleteMany({ id_bao_cao: idBaoCaoMoi }),
                ChiTietDoanTrung.deleteMany({ id_bao_cao: idBaoCaoMoi }),
                ChiTietDoanChapVa.deleteMany({ id_bao_cao: idBaoCaoMoi }),
                ChiTietCauTrungHighlight.deleteMany({ id_bao_cao: idBaoCaoMoi }),
                KetQuaKiemTra.deleteMany({ id_bao_cao: idBaoCaoMoi })
            ]);

            const tongXoa = dsXoa.reduce((t, r) => t + (r.deletedCount || 0), 0);

            if (tongXoa > 0) {
                console.log(
                    `🧹 Đã dọn ${tongXoa} bản ghi của lượt chấm trước cho ${idBaoCaoMoi}`
                );
            }

            // Không truyền ngưỡng ở đây.
            //
            // Trước đây chỗ này gán cứng 0.6, nên quản trị viên kéo thanh ngưỡng
            // trong màn Quản lý cấu hình xong chạy lại thì kết quả vẫn y nguyên —
            // trông như màn cấu hình không có tác dụng gì. Để trống thì module
            // đối sánh tự đọc nguong_trung_lap trong bản ghi cấu hình.
            const ketQuaThuAtToan =
                await checkPlagiarism(
                    idBaoCaoMoi,
                    null
                );

            // Cập nhật tiến trình công việc: 80%
            await job.updateProgress(80);




            const nextIdKiemTra =
                await generateIdKiemTra();

            await ThongKe.create({

                bao_cao_mongo_id:
                    baoCaoGoc._id,

                id_kiem_tra:
                    nextIdKiemTra,

                id_bao_cao:
                    idBaoCaoMoi,

                id_sinh_vien:
                    idSinhVien || "",

                tong_so_cau:
                    ketQuaThuAtToan.tong_so_cau,

                tong_so_tu:
                    ketQuaThuAtToan.tong_so_tu,

                tong_so_cau_trung:
                    ketQuaThuAtToan.tong_so_cau_trung,

                tong_so_tu_trung:
                    ketQuaThuAtToan.tong_so_tu_trung,

                tong_so_doan_trung:
                    ketQuaThuAtToan.tong_so_doan_trung,

                tong_so_doan_chap_va:
                    ketQuaThuAtToan.tong_so_doan_chap_va,

                so_nguon_phat_hien:
                    ketQuaThuAtToan.so_nguon_phat_hien,

                ti_le_trung_lap:
                    ketQuaThuAtToan.ti_le_trung_lap,

                trung_toan_bai:
                    !!ketQuaThuAtToan.trung_toan_bai,

                thong_ke_theo_mau:
                    ketQuaThuAtToan.thong_ke_theo_mau
            });
            await Promise.all([

                Array.isArray(
                    ketQuaThuAtToan.chi_tiet_cau_trung
                ) &&
                    ketQuaThuAtToan.chi_tiet_cau_trung.length > 0
                    ? ChiTietCauTrung.insertMany(
                        ketQuaThuAtToan.chi_tiet_cau_trung.map(
                            item => ({
                                id_kiem_tra: nextIdKiemTra,
                                id_bao_cao: idBaoCaoMoi,
                                ...item
                            })
                        ),
                        {
                            ordered: false
                        }
                    )
                    : Promise.resolve(),

                Array.isArray(
                    ketQuaThuAtToan.chi_tiet_doan_trung
                ) &&
                    ketQuaThuAtToan.chi_tiet_doan_trung.length > 0
                    ? ChiTietDoanTrung.insertMany(
                        ketQuaThuAtToan.chi_tiet_doan_trung.map(
                            item => ({
                                id_kiem_tra: nextIdKiemTra,
                                id_bao_cao: idBaoCaoMoi,
                                ...item
                            })
                        ),
                        {
                            ordered: false
                        }
                    )
                    : Promise.resolve(),

                Array.isArray(
                    ketQuaThuAtToan.chi_tiet_doan_chap_va
                ) &&
                    ketQuaThuAtToan.chi_tiet_doan_chap_va.length > 0
                    ? ChiTietDoanChapVa.insertMany(
                        ketQuaThuAtToan.chi_tiet_doan_chap_va.map(
                            item => ({
                                id_kiem_tra: nextIdKiemTra,
                                id_bao_cao: idBaoCaoMoi,
                                ...item
                            })

                        ),
                        {
                            ordered: false
                        }
                    )
                    : Promise.resolve(),
                Array.isArray(
                    ketQuaThuAtToan.chi_tiet_cau_trung_highlight
                ) &&
                    ketQuaThuAtToan.chi_tiet_cau_trung_highlight.length > 0
                    ? ChiTietCauTrungHighlight.insertMany(
                        ketQuaThuAtToan.chi_tiet_cau_trung_highlight.map(
                            item => ({
                                id_kiem_tra: nextIdKiemTra,
                                id_bao_cao: idBaoCaoMoi,
                                ...item
                            })
                        ),
                        {
                            ordered: false
                        }
                    )
                    : Promise.resolve()

            ]);
            // Cập nhật trạng thái của báo cáo thành 'Đã xử lý'

            await processAndHighlightReport(
                idBaoCaoMoi,
                duongDanFile,
                path.extname(duongDanFile),

                ketQuaThuAtToan.chi_tiet_cau_trung,

                ketQuaThuAtToan.chi_tiet_cau_trung_highlight,

                ketQuaThuAtToan.chi_tiet_doan_trung,

                ketQuaThuAtToan.chi_tiet_doan_chap_va
            );

            await KetQuaKiemTra.create({
                bao_cao_mongo_id:
                    baoCaoGoc._id,

                id_kiem_tra:
                    nextIdKiemTra,

                id_bao_cao:
                    idBaoCaoMoi,

                id_sinh_vien:
                    idSinhVien || "",

                ti_le_trung_lap:
                    ketQuaThuAtToan.ti_le_trung_lap,

                tong_so_cau:
                    ketQuaThuAtToan.tong_so_cau,

                tong_so_tu:
                    ketQuaThuAtToan.tong_so_tu,

                tong_so_cau_trung:
                    ketQuaThuAtToan.tong_so_cau_trung,

                tong_so_tu_trung:
                    ketQuaThuAtToan.tong_so_tu_trung,

                tong_so_doan_trung:
                    ketQuaThuAtToan.tong_so_doan_trung,

                tong_so_doan_chap_va:
                    ketQuaThuAtToan.tong_so_doan_chap_va,

                so_nguon_phat_hien:
                    ketQuaThuAtToan.so_nguon_phat_hien,

                trung_toan_bai:
                    !!ketQuaThuAtToan.trung_toan_bai,

                danh_sach_nguon_trung_toan_bai:
                    ketQuaThuAtToan.danh_sach_nguon_trung_toan_bai || [],

                trang_thai:
                    "hoan_thanh",

                ngay_kiem_tra:
                    new Date()
            });
            await BaoCao.findOneAndUpdate(
                { id_bao_cao: idBaoCaoMoi },
                { trang_thai: 'Đã xử lý' }
            );

            // Hoàn tất 100% tiến trình công việc
            await job.updateProgress(100);
            console.log(`✅ Hoàn tất báo cáo ${idBaoCaoMoi} - Tỉ lệ trùng: ${ketQuaThuAtToan.ti_le_trung_lap}% (Mã KQ: ${nextIdKiemTra})`);
        } catch (error) {
            console.error(`❌ Lỗi xử lý báo cáo ${idBaoCaoMoi}:`, error);
            // Ghi nhận trạng thái lỗi vào CSDL nếu tiến trình thất bại
            await BaoCao.findOneAndUpdate(
                { id_bao_cao: idBaoCaoMoi },
                { trang_thai: 'Lỗi' }
            );
            throw error;
        }
    }, {
        connection,
        concurrency: 3,
        lockDuration: 1800000,
        lockRenewTime: 300000
    });

    // Lắng nghe sự kiện khi job thất bại toàn bộ các lần retry
    worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job ? job.id : 'unknown'} thất bại:`, err.message);
    });
}

// Khởi chạy Worker
startWorker();