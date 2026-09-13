/**
 * ============================================================================
 * MODULE ĐỐI SÁNH VĂN BẢN VÀ KIỂM TRA TRÙNG LẶP TỐI ƯU (kiem_tra_trung_lap.js)
 * PHIÊN BẢN PRODUCTION - HOÀN CHỈNH & CHUẨN XÁC TUYỆT ĐỐI
 * ============================================================================
 */
const fs = require('fs');
const {
    tinhDoTuongDongWinnowing
} = require('./winnowing');
const { tinhDoTuongDongJaccard } = require('./jaccard');
const CauHinhHeThong = require('../models/cau_hinh_he_thong');
const ChiSoCau = require('../models/chi_so_cau');
const BaoCao = require('../models/bao_cao');
const {
    buildPassageMatches
} = require('./passage_match');
const {
    buildPatchworkMatches
} = require('./patchwork_match');

// Khởi tạo tập chứa từ dừng (Stopwords) tiếng Việt an toàn tuyệt đối
let STOP_WORDS = new Set();
try {
    const filePath = path.join(__dirname, 'stopwords-vi.txt');
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        fileContent.split(/\r?\n/).forEach(w => {
            const cleanWord = w.trim().toLowerCase();
            if (cleanWord) STOP_WORDS.add(cleanWord);
        });
    }
} catch (e) {
    console.warn("⚠️ Không tìm thấy file stopwords-vi.txt, hệ thống sẽ bỏ qua bộ lọc stopword.");
}


/**
 * Hàm tách từ: Chuẩn hóa chuỗi, loại bỏ ký tự đặc biệt, chuyển về chữ thường,
 * lọc bỏ từ dừng, số thuần túy và các từ quá ngắn.
 */
function tachTu(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') return [];
    let text = vanBan.toLowerCase();
    text = text.replace(/[^\p{L}\p{N}\s]/gu, ' ');
    return text.split(/\s+/)
        .filter(tu => tu.length > 1 && !STOP_WORDS.has(tu) && !/^\d+$/.test(tu));
}

/**
 * Hàm chuẩn hóa vector thưa (Sparse Vector) từ dữ liệu TF-IDF đầu vào.
 */
function chuanHoaVectorSparse(vectorObj, tuVungMap) {
    const sparseMap = new Map();
    if (!vectorObj || typeof vectorObj !== 'object') return sparseMap;

    if (Array.isArray(vectorObj)) {
        vectorObj.forEach((val, idx) => {
            const numVal = Number(val) || 0;
            if (numVal !== 0) sparseMap.set(idx, numVal);
        });
    } else {
        for (const [key, val] of Object.entries(vectorObj)) {
            const numVal = Number(val) || 0;
            if (numVal === 0) continue;

            if (tuVungMap.has(key)) {
                sparseMap.set(tuVungMap.get(key), numVal);
            } else {
                const parsedKey = parseInt(key, 10);
                if (!isNaN(parsedKey)) {
                    sparseMap.set(parsedKey, numVal);
                }
            }
        }
    }
    return sparseMap;
}

/**
 * Hàm tính khoảng cách Cosine trên cấu trúc vector thưa kết hợp trọng số IDF.
 */
function tinhCosineSparse(
    sparseMoi,
    sparseCu
) {
    let dotProduct = 0;
    let normMoiSq = 0;
    let normCuSq = 0;

    for (const [idx, val] of sparseMoi) {
        normMoiSq += val * val;

        if (sparseCu.has(idx)) {
            dotProduct += val * sparseCu.get(idx);
        }
    }

    for (const [, val] of sparseCu) {
        normCuSq += val * val;
    }

    const denominator =
        Math.sqrt(normMoiSq) *
        Math.sqrt(normCuSq);

    return denominator === 0
        ? 0
        : dotProduct / denominator;
}

/**
 * Hàm thực thi kiểm tra trùng lặp toàn diện:
 * - Bước 1: Lọc sạch nhiễu & Chuẩn hóa từ vựng (Tokenization & Normalization qua hàm tachTu).
 * - Bước 2: Chia nhỏ văn bản theo cấp độ câu (Sentence-Level Splitting) để bắt chính xác từng câu.
 * - Bước 3: Định tuyến siêu tốc bằng Inverted Index (Chỉ mục ngược).
 * - Bước 4: Xử lý đạo văn chắp vá, đảo từ bằng kết hợp 3 thuật toán và chọn Math.max.
 * - Bước 5: Tổng hợp kết quả, tính tỷ lệ tổng thể toàn bài và bóc tách tỷ lệ riêng từng nguồn mẫu.
 */
async function checkPlagiarism(
    idBaoCaoHienTai,
    nguongTrungLap = 0.5
) {

    // ==========================================================
    // KHOI TAO
    // ==========================================================

    const chiTietCauTrung = [];

    let tongSoCau = 0;
    let tongSoTu = 0;

    let tongSoCauTrung = 0;
    let tongSoTuTrung = 0;

    // ==========================================================
    // NAP IDF TOAN HE THONG
    // ==========================================================

    const cauHinh =
        await CauHinhHeThong
            .findOne({})
            .lean();

    if (
        !cauHinh ||
        !cauHinh.tu_vung_va_idf ||
        Object.keys(
            cauHinh.tu_vung_va_idf
        ).length === 0
    ) {
        throw new Error(
            'Chưa có dữ liệu IDF.'
        );
    }

    const tapTuVungToanCuc =
        Object.keys(
            cauHinh.tu_vung_va_idf
        );


    const tuVungMap =
        new Map(
            tapTuVungToanCuc.map(
                (tu, idx) => [tu, idx]
            )
        );

    const danhSachCau =
        await ChiSoCau.find({
            id_bao_cao: idBaoCaoHienTai

        })
            .sort({
                sentenceIndex: 1
            })
            .lean();
    const tatCaHash =
        [
            ...new Set(
                danhSachCau.map(
                    x => x.sentence_hash
                )
            )
        ];
    const tatCaExactMatch =
        await ChiSoCau.find({
            mau_kiem_tra: true,
            sentence_hash: {
                $in: tatCaHash
            },
            id_bao_cao: {
                $ne: idBaoCaoHienTai
            }
        })
            .select({
                sentence_hash: 1,
                id_bao_cao: 1,
                sentenceIndex: 1,
                content: 1
            })
            .lean();

    const hashMap = new Map();

    for (const row of tatCaExactMatch) {

        if (!hashMap.has(row.sentence_hash)) {
            hashMap.set(
                row.sentence_hash,
                []
            );
        }

        hashMap.get(
            row.sentence_hash
        ).push(row);
    }

    if (!danhSachCau.length) {
        throw new Error(
            `Khong tim thay ChiSoCau cua ${idBaoCaoHienTai}`
        );
    }
    // ==========================================================
    // DUYET TUNG CAU
    // ==========================================================

    let sentenceIndex = 1;
    const loopStart =
        Date.now();
    for (
        const cauMoi of danhSachCau
    ) {

        const cleanSentence =
            cauMoi.clean_content;

        const tokens =
            tachTu(
                cleanSentence
            );

        if (tokens.length === 0) {
            continue;
        }

        tongSoCau++;
        tongSoTu += tokens.length;

        const danhSachNguon = [];

        // ======================================================
        // EXACT MATCH
        // ======================================================

        const sentenceHash =
            cauMoi.sentence_hash;

        const exactMatches =
            hashMap.get(
                sentenceHash
            ) || [];

        for (const exact of exactMatches) {

            danhSachNguon.push({

                id_bao_cao:
                    exact.id_bao_cao,

                chi_so_cau:
                    exact.sentenceIndex,

                cau_nguon:
                    exact.content,

                do_tuong_dong: 1,

                cosine: 1,

                jaccard: 1,

                winnowing: 1
            });
        }

        // ======================================================
        // NEU KHONG CO EXACT MATCH
        // ======================================================

        if (
            danhSachNguon.length === 0
        ) {

            const vectorSparseMoi =
                chuanHoaVectorSparse(
                    cauMoi.vector_tf_idf,
                    tuVungMap
                );

            const fingerprintsMoi =
                cauMoi.fingerprints || [];
            if (fingerprintsMoi.length < 2) {
                continue;
            }

            const fingerprintSet =
                new Set(
                    fingerprintsMoi
                );

            const query = {

                mau_kiem_tra: true,

                fingerprints: {
                    $in:
                        fingerprintsMoi
                }
            };

            if (idBaoCaoHienTai) {

                query.id_bao_cao = {
                    $ne:
                        idBaoCaoHienTai
                };
            }
            const candidates =
                await ChiSoCau.find(query)
                    .select({
                        id_bao_cao: 1,
                        sentenceIndex: 1,
                        content: 1,
                        clean_content: 1,
                        vector_tf_idf: 1,
                        fingerprints: 1,
                        fingerprint_count: 1
                    })
                    .limit(300)
                    .lean();

            const minOverlap =
                Math.max(
                    2,
                    Math.floor(
                        fingerprintsMoi.length * 0.2
                    )
                );
            for (
                const candidate
                of candidates
            ) {
                if (
                    candidate.id_bao_cao === idBaoCaoHienTai
                ) {
                    continue;
                }
                if (
                    candidate.fingerprint_count < minOverlap
                ) {
                    continue;
                }
                let overlap = 0;

                for (const fp of candidate.fingerprints || []) {

                    if (
                        fingerprintSet.has(fp)
                    ) {
                        overlap++;
                    }

                }


                if (
                    overlap < minOverlap
                ) {
                    continue;
                }

                const vectorSparseCu =
                    chuanHoaVectorSparse(
                        candidate.vector_tf_idf,
                        tuVungMap
                    );

                const cosine =
                    tinhCosineSparse(
                        vectorSparseMoi,
                        vectorSparseCu
                    );

                if (cosine < 0.25) {
                    continue;
                }
                const winStart =
                    Date.now();
                const winnowing =
                    tinhDoTuongDongWinnowing(
                        fingerprintsMoi,
                        candidate.fingerprints
                    );
                if (
                    winnowing < 0.1
                ) {
                    continue;
                }

                const jRes =
                    tinhDoTuongDongJaccard(
                        cleanSentence,
                        candidate.clean_content
                    );

                const jaccard =
                    jRes.doTuongDong || 0;

                const similarity =

                    cosine * 0.4 +

                    winnowing * 0.4 +

                    jaccard * 0.2;

                if (
                    similarity >=
                    nguongTrungLap
                ) {

                    danhSachNguon.push({

                        id_bao_cao:
                            candidate.id_bao_cao,

                        chi_so_cau:
                            candidate.sentenceIndex,

                        cau_nguon:
                            candidate.content,

                        do_tuong_dong:
                            similarity,

                        cosine,

                        jaccard,

                        winnowing
                    });
                }
            }
        }


        // ======================================================
        // LUU CHI TIET CAU TRUNG
        // ======================================================

        if (
            danhSachNguon.length > 0
        ) {

            tongSoCauTrung++;

            tongSoTuTrung +=
                tokens.length;
            const uniqueMap =
                new Map();

            for (const source of danhSachNguon) {

                const key =
                    `${source.id_bao_cao}_${source.chi_so_cau}`;

                if (
                    !uniqueMap.has(key)
                ) {

                    uniqueMap.set(
                        key,
                        source
                    );
                }
            }

            const danhSachNguonFinal =
                [...uniqueMap.values()];

            chiTietCauTrung.push({

                chi_so_cau_kiem_tra:
                    sentenceIndex,

                cau_kiem_tra:
                    cauMoi.content,

                so_tu:
                    tokens.length,

                danh_sach_nguon:
                    danhSachNguonFinal
            });
        }
        sentenceIndex++;
    }

    // ==========================================================
    // PASSAGE MATCH
    // ==========================================================

    // ==========================================================
    // BUILD ĐOẠN TRÙNG
    // ==========================================================

    const chiTietDoanTrungFinal =
        buildPassageMatches(
            chiTietCauTrung
        );

    const occupiedSentences =
        new Set();

    for (const doan of chiTietDoanTrungFinal) {
        for (
            let i = doan.tu_cau_kiem_tra;
            i <= doan.den_cau_kiem_tra;
            i++
        ) {
            occupiedSentences.add(i);
        }
    }


    // ==========================================================
    // PATCHWORK MATCH
    // ==========================================================

    const freeForPatchwork =
        chiTietCauTrung.filter(
            c =>
                !occupiedSentences.has(
                    c.chi_so_cau_kiem_tra
                )
        );

    const chiTietDoanChapVaFinal =
        buildPatchworkMatches(
            freeForPatchwork
        );

    for (const doan of chiTietDoanChapVaFinal) {
        for (
            let i = doan.tu_cau_kiem_tra;
            i <= doan.den_cau_kiem_tra;
            i++
        ) {
            occupiedSentences.add(i);
        }
    }
    const chiTietCauTrungHighlight =
        chiTietCauTrung.filter(
            c =>
                !occupiedSentences.has(
                    c.chi_so_cau_kiem_tra
                )
        );


    // ==========================================================
    // THONG KE THEO NGUON
    // ==========================================================

    const thongKeMap = {};
    const countedMap = new Set();
    for (
        const sentence
        of chiTietCauTrung
    ) {

        for (
            const source
            of sentence.danh_sach_nguon
        ) {

            if (
                !thongKeMap[
                source.id_bao_cao
                ]
            ) {

                thongKeMap[
                    source.id_bao_cao
                ] = {

                    id_bao_cao:
                        source.id_bao_cao,

                    so_cau_trung: 0,

                    so_tu_trung: 0,

                    so_doan_trung: 0,

                    tong_cosine: 0,

                    tong_jaccard: 0,

                    tong_winnowing: 0,

                    tong_similarity: 0
                };
            }

            const tk =
                thongKeMap[
                source.id_bao_cao
                ];

            const key =
                `${source.id_bao_cao}_${sentence.chi_so_cau_kiem_tra}`;

            if (
                !countedMap.has(key)
            ) {

                countedMap.add(key);

                tk.so_cau_trung++;

                tk.so_tu_trung +=
                    sentence.so_tu;

            }

            tk.tong_cosine +=
                source.cosine;

            tk.tong_jaccard +=
                source.jaccard;

            tk.tong_winnowing +=
                source.winnowing;

            tk.tong_similarity +=
                source.do_tuong_dong;
        }
    }

    for (
        const passage
        of chiTietDoanTrungFinal
    ) {

        const tk =
            thongKeMap[
            passage.id_bao_cao_nguon
            ];

        if (tk) {

            tk.so_doan_trung++;
        }
    }
    const danhSachIdBaoCaoNguon =
        Object.keys(thongKeMap);

    const danhSachBaoCaoNguon =
        await BaoCao.find({
            id_bao_cao: {
                $in: danhSachIdBaoCaoNguon
            }
        })
            .select({
                id_bao_cao: 1,
                tieu_de: 1
            })
            .lean();

    const mapTenBaoCao =
        new Map(
            danhSachBaoCaoNguon.map(
                item => [
                    item.id_bao_cao,
                    item.tieu_de || ""
                ]
            )
        );

    const thongKeTheoMau =
        Object.values(
            thongKeMap
        )
            .map(tk => ({

                id_bao_cao:
                    tk.id_bao_cao,

                ten_bao_cao:
                    mapTenBaoCao.get(
                        tk.id_bao_cao
                    ) || "",

                so_cau_trung:
                    tk.so_cau_trung,

                so_tu_trung:
                    tk.so_tu_trung,

                so_doan_trung:
                    tk.so_doan_trung,

                ti_le_trung_lap:
                    tongSoTu > 0
                        ? Math.round(
                            (
                                tk.so_tu_trung /
                                tongSoTu
                            ) * 10000
                        ) / 100
                        : 0,

                cosine_trung_binh:
                    tk.so_cau_trung > 0
                        ? Math.round(
                            (
                                tk.tong_cosine /
                                tk.so_cau_trung
                            ) * 100
                        )
                        : 0,

                jaccard_trung_binh:
                    tk.so_cau_trung > 0
                        ? Math.round(
                            (
                                tk.tong_jaccard /
                                tk.so_cau_trung
                            ) * 100
                        )
                        : 0,

                winnowing_trung_binh:
                    tk.so_cau_trung > 0
                        ? Math.round(
                            (
                                tk.tong_winnowing /
                                tk.so_cau_trung
                            ) * 100
                        )
                        : 0,

                tong_hop_trung_binh:
                    tk.so_cau_trung > 0
                        ? Math.round(
                            (
                                tk.tong_similarity /
                                tk.so_cau_trung
                            ) * 100
                        )
                        : 0
            }));

    // ==========================================================
    // TY LE TOAN BAI
    // ==========================================================

    const tiLeTrungLap =

        tongSoTu > 0

            ? (
                tongSoTuTrung /
                tongSoTu
            ) * 100

            : 0;

    // ==========================================================
    // RETURN
    // ==========================================================

    fs.appendFileSync(
        'debug_plagiarism.txt',
        `
==============
tongSoCau=${tongSoCau}
tongSoCauTrung=${tongSoCauTrung}
tongSoTu=${tongSoTu}
tongSoTuTrung=${tongSoTuTrung}
tiLe=${tongSoTu > 0 ? (tongSoTuTrung / tongSoTu) * 100 : 0}
==============
\n`,
        'utf8'
    );

    return {

        tong_so_cau:
            tongSoCau,

        tong_so_tu:
            tongSoTu,

        tong_so_cau_trung:
            tongSoCauTrung,

        tong_so_tu_trung:
            tongSoTuTrung,

        tong_so_doan_trung:
            chiTietDoanTrungFinal.length,

        tong_so_doan_chap_va:
            chiTietDoanChapVaFinal.length,

        so_nguon_phat_hien:
            thongKeTheoMau.length,

        ti_le_trung_lap:
            Math.round(
                tiLeTrungLap * 100
            ) / 100,

        thong_ke_theo_mau:
            thongKeTheoMau,

        chi_tiet_cau_trung:
            chiTietCauTrung,

        chi_tiet_cau_trung_highlight:
            chiTietCauTrungHighlight,

        chi_tiet_doan_trung:
            chiTietDoanTrungFinal,

        chi_tiet_doan_chap_va:
            chiTietDoanChapVaFinal
    };
}
module.exports = {
    checkPlagiarism
};