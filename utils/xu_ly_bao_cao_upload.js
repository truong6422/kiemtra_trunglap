const crypto = require('crypto');

const ChiSoCau = require('../models/chi_so_cau');
const CauHinhHeThong = require('../models/cau_hinh_he_thong');


const {
    tachCau,
    lamSachVanBan,
    locNoiDungHocThuat
} = require('./tien_xu_ly');


const {
    taoKGramsWordLevel,
    tinhHashDanhSachKGrams,
    taoFingerprints
} = require('./winnowing');

async function xuLyBaoCaoUpload(
    baoCao
) {

    if (!baoCao) {
        throw new Error(
            'Không nhận được dữ liệu báo cáo.'
        );
    }

    const {

        _id: baoCaoMongoId,

        id_bao_cao,

        loai_bao_cao,

        mau_kiem_tra,

        noi_dung_tien_xu_ly

    } = baoCao;
    let noiDungXuLy =
        noi_dung_tien_xu_ly;

    if (
        !noi_dung_tien_xu_ly ||
        typeof noi_dung_tien_xu_ly !== 'string'
    ) {

        throw new Error(
            'Báo cáo không có nội dung để xử lý.'
        );
    }

    // =====================================================
    // NẠP IDF TOÀN HỆ THỐNG
    // =====================================================

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
            'Không tìm thấy từ vựng IDF toàn hệ thống.'
        );
    }

    // =====================================================
    // TÁCH CÂU
    // =====================================================
    const noiDungHocThuat =
        locNoiDungHocThuat(
            noiDungXuLy
        );

    if (noiDungHocThuat.trim()) {
        noiDungXuLy =
            noiDungHocThuat;
    }

    const danhSachCau =
        tachCau(
            noiDungXuLy
        );

    const tongSoCau =
        danhSachCau.length;

    console.log(
        `[UPLOAD] ${id_bao_cao} - Bat dau xu ly ${tongSoCau} cau`
    );


    let tongSoTu = 0;
    let tongSoCauHopLe = 0;
    const danhSachInsert = [];
    const BATCH_SIZE = 1000;

    // =====================================================
    // XỬ LÝ TỪNG CÂU
    // =====================================================

    let sentenceIndex = 1;

    for (
        let i = 0;
        i < danhSachCau.length;
        i++
    ) {

        const content =
            danhSachCau[i];

        const cleanContent =
            lamSachVanBan(content);

        if (
            !cleanContent ||
            cleanContent.trim() === ''
        ) {
            continue;
        }

        const tokens =
            cleanContent
                .split(/\s+/)
                .filter(Boolean);

        const tokenCount =
            tokens.length;

        if (tokenCount < 5) {
            continue;
        }

        tongSoTu += tokenCount;

        const sentenceHash =
            crypto
                .createHash('md5')
                .update(cleanContent)
                .digest('hex');

        const kgrams =
            taoKGramsWordLevel(
                cleanContent,
                3
            );

        const hashes =
            tinhHashDanhSachKGrams(
                kgrams
            );

        const fingerprints =
            taoFingerprints(
                hashes,
                4
            );
        if (
            fingerprints.length === 0
        ) {
            continue;
        }

        const tokenMap =
            new Map();

        for (const token of tokens) {

            tokenMap.set(
                token,
                (tokenMap.get(token) || 0) + 1
            );

        }

        const vectorTFIDF = {};

        let maxTF = 1;

        for (const count of tokenMap.values()) {

            if (count > maxTF) {
                maxTF = count;
            }

        }

        for (const [word, count] of tokenMap) {

            const idf =
                cauHinh.tu_vung_va_idf[word];

            if (!idf) continue;

            const tf =
                count / maxTF;

            vectorTFIDF[word] =
                tf * idf;
        }
        tongSoCauHopLe++;
        danhSachInsert.push({
            bao_cao_mongo_id:
                baoCaoMongoId,

            id_bao_cao,

            mau_kiem_tra:
                !!mau_kiem_tra,

            loai_bao_cao:
                loai_bao_cao || null,

            sentenceIndex,

            content,

            clean_content:
                cleanContent,

            token_count:
                tokenCount,

            sentence_hash:
                sentenceHash,

            vector_tf_idf:
                vectorTFIDF,

            fingerprints,

            fingerprint_count:
                fingerprints.length
        });
        if (
            danhSachInsert.length >=
            BATCH_SIZE
        ) {

            await ChiSoCau.insertMany(
                danhSachInsert,
                {
                    ordered: false
                }
            );

            danhSachInsert.length = 0;
        }


        sentenceIndex++;
    }



    // =====================================================
    // LƯU CHI_SỐ_CÂU
    // =====================================================

    if (
        danhSachInsert.length > 0
    ) {

        await ChiSoCau.insertMany(
            danhSachInsert,
            {
                ordered: false
            }
        );
        console.log(
            `[CHI_SO_CAU] ${id_bao_cao} | ` +
            `Tach duoc ${tongSoCau} cau | ` +
            `Luu ${tongSoCauHopLe} cau hop le | ` +
            `${tongSoTu} tu`
        );
    }

    return {

        id_bao_cao,

        tong_so_cau_goc:
            tongSoCau,

        so_cau_hop_le:
            tongSoCauHopLe,

        tong_so_tu:
            tongSoTu
    };
}
module.exports = {
    xuLyBaoCaoUpload
};