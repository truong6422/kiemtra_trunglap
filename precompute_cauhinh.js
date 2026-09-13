/**
 * ============================================================================
 * PRECOMPUTE CAU HINH
 * ============================================================================
 * - Mỗi document trong chi_so_cau = 1 câu
 * - TF theo câu
 * - Fingerprint theo câu
 * - Sentence Hash theo câu
 * - TF-IDF theo câu
 * - IDF chung toàn bộ tập báo cáo mẫu
 * ============================================================================
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const BaoCao = require('./models/bao_cao');
const ChiSoCau = require('./models/chi_so_cau');
const CauHinhHeThong = require('./models/cau_hinh_he_thong');

const {
    tachCau,
    lamSachVanBan
} = require('./utils/tien_xu_ly');

const {
    tachTu,
    taoTapTuVungChung,
    tinhVectorIDF,
    tinhVectorTF
} = require('./utils/tfidf_cosine');

const {
    taoKGramsWordLevel,
    tinhHashDanhSachKGrams,
    taoFingerprints
} = require('./utils/winnowing');

async function chayTienTinhToan() {

    try {

        await mongoose.connect(
            'mongodb://localhost:27017/KiemTraTrungLap'
        );

        console.log(
            '📦 Đã kết nối MongoDB'
        );

        const danhSachMau =
            await BaoCao.find({
                mau_kiem_tra: true
            });

        if (danhSachMau.length === 0) {

            console.log(
                '⚠️ Không tìm thấy báo cáo mẫu'
            );

            process.exit(0);
        }

        console.log(
            `📚 Tìm thấy ${danhSachMau.length} báo cáo mẫu`
        );

        await ChiSoCau.deleteMany({});

        console.log(
            '🧹 Đã xoá chi_so_cau cũ'
        );

        // ============================================================
        // BƯỚC 1: XÂY DỰNG IDF TOÀN KHO
        // ============================================================

        const danhSachCacMangTu = [];

        for (const mau of danhSachMau) {

            const noiDung =
                mau.noi_dung_tien_xu_ly || '';
            console.log(
                `\n===== ${mau.id_bao_cao} =====`
            );

            console.log(
                noiDung.substring(0, 1000)
            );

            const danhSachCau =
                tachCau(noiDung);

            const mangTuBaoCao = [];

            for (const cau of danhSachCau) {

                const cleanSentence =
                    lamSachVanBan(cau);
                if (!cleanSentence) {
                    continue;
                }

                const soTuGoc =
                    cau
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .length;

                if (soTuGoc < 5) {
                    continue;
                }

                const tokens =
                    tachTu(cleanSentence);

                mangTuBaoCao.push(...tokens);

            }

            /**
             * Mỗi báo cáo chỉ đóng góp 1 lần
             * vào DF của từ.
             */

            danhSachCacMangTu.push(
                [...new Set(mangTuBaoCao)]
            );
        }

        console.log(
            '⏳ Đang tính IDF toàn kho...'
        );

        const tapTuVungToanCuc =
            taoTapTuVungChung(
                danhSachCacMangTu
            );

        const vectorIdfToanCuc =
            tinhVectorIDF(
                danhSachCacMangTu,
                tapTuVungToanCuc
            );

        const tuVungVaIdfObj = {};

        for (
            let i = 0;
            i < tapTuVungToanCuc.length;
            i++
        ) {

            tuVungVaIdfObj[
                tapTuVungToanCuc[i]
            ] =
                vectorIdfToanCuc[i];
        }

        await CauHinhHeThong.findOneAndUpdate(
            {},
            {
                $set: {

                    tu_vung_va_idf:
                        tuVungVaIdfObj,

                    ngay_cap_nhat:
                        new Date()
                },

                $unset: {

                    danh_sach_tu_vung: '',

                    vector_idf_toan_cuc: ''
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        console.log(
            '✅ Đã lưu IDF toàn cục'
        );

        // ============================================================
        // BƯỚC 2: TẠO CHI SO CAU
        // ============================================================

        console.log(
            '⏳ Đang tạo dữ liệu chi_so_cau...'
        );

        for (const mau of danhSachMau) {

            const noiDung =
                mau.noi_dung_tien_xu_ly || '';

            const danhSachCau =
                tachCau(noiDung);
            console.log(
`[CAU_GOC] ${mau.id_bao_cao} -> ${danhSachCau.length} câu`
);

            const danhSachChiSoCau = [];

            let sentenceIndex = 1;

            for (const cau of danhSachCau) {

                const cleanSentence =
                    lamSachVanBan(cau);

                if (!cleanSentence) {
                    continue;
                }

                const soTuGoc =
                    cau
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .length;

                if (soTuGoc < 5) {
                    continue;
                }

                const tokens =
                    tachTu(cleanSentence);

                // ----------------------------------------------------
                // TF
                // ----------------------------------------------------

                const tf =
                    tinhVectorTF(
                        tokens,
                        tapTuVungToanCuc
                    );

                // ----------------------------------------------------
                // TF-IDF
                // ----------------------------------------------------

                const vectorTfIdf = {};

                for (
                    let i = 0;
                    i < tapTuVungToanCuc.length;
                    i++
                ) {

                    const tfidf =
                        tf[i] *
                        vectorIdfToanCuc[i];

                    if (tfidf > 0) {

                        vectorTfIdf[
                            tapTuVungToanCuc[i]
                        ] = tfidf;
                    }
                }

                // ----------------------------------------------------
                // WINNOWING
                // ----------------------------------------------------

                const kGrams =
                    taoKGramsWordLevel(
                        cleanSentence,
                        3
                    );

                const hashes =
                    tinhHashDanhSachKGrams(
                        kGrams
                    );

                const fingerprints =
                    taoFingerprints(
                        hashes,
                        4
                    );

                // ----------------------------------------------------
                // HASH CÂU
                // ----------------------------------------------------

                const sentenceHash =
                    crypto
                        .createHash('md5')
                        .update(cleanSentence)
                        .digest('hex');

                danhSachChiSoCau.push({

                    bao_cao_mongo_id:
                        mau._id,

                    id_bao_cao:
                        mau.id_bao_cao,

                    loai_bao_cao:
                        mau.loai_bao_cao,

                    mau_kiem_tra:
                        mau.mau_kiem_tra,

                    sentenceIndex:
                        sentenceIndex++,


                    content:
                        cau,

                    clean_content:
                        cleanSentence,

                    token_count:
                        tokens.length,

                    sentence_hash:
                        sentenceHash,

                    vector_tf_idf:
                        vectorTfIdf,

                    fingerprints,

                    fingerprint_count:
                        fingerprints.length,

                    created_at:
                        new Date(),

                    updated_at:
                        new Date()
                });
            }
            if (
                danhSachChiSoCau.length > 0
            ) {

                await ChiSoCau.insertMany(
                    danhSachChiSoCau,
                    {
                        ordered: false
                    }
                );
            }

            console.log(
                `✅ ${mau.id_bao_cao} -> ${danhSachChiSoCau.length} câu`
            );
        }

        console.log(
            '🎉 Tiền tính toán hoàn tất'
        );

        process.exit(0);

    } catch (error) {

        console.error(
            '❌ Lỗi:',
            error
        );

        process.exit(1);
    }
}

chayTienTinhToan();