const crypto = require('crypto');

const ChiSoCau = require('../models/chi_so_cau');
const CauHinhHeThong = require('../models/cau_hinh_he_thong');
const BaoCao = require('../models/bao_cao');
const { timTepBaoCao } = require('./duong_dan_tep');
const { trichXuatVanBan } = require('./trich_xuat_text');


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

    // Chấm lại một báo cáo cũ thì trường nội dung đã trống.
    //
    // Nội dung văn bản chỉ được lưu lúc tải tệp lên rồi bị dọn đi cho nhẹ cơ sở
    // dữ liệu. Vì vậy mọi lần chấm lại đều dừng ngay ở đây với câu "Báo cáo
    // không có nội dung để xử lý", hàng chờ thử lại ba lần rồi bỏ cuộc, còn
    // ngoài màn hình báo cáo nằm mãi ở trạng thái "Đang xử lý". Đúng cảnh gặp
    // phải khi đổi trọng số xong bấm chấm lại. Tệp gốc vẫn nằm trong thư mục
    // uploads nên đọc lại từ đó là chấm tiếp được.
    if (
        !noiDungXuLy ||
        typeof noiDungXuLy !== 'string' ||
        !noiDungXuLy.trim()
    ) {

        const duongDan = timTepBaoCao(baoCao.tep_tin);

        if (!duongDan) {
            throw new Error(
                `Báo cáo ${id_bao_cao} không còn nội dung và cũng không tìm `
                + `thấy tệp gốc để đọc lại.`
            );
        }

        console.log(
            `📄 ${id_bao_cao}: đọc lại nội dung từ tệp gốc để chấm lại.`
        );

        noiDungXuLy = await trichXuatVanBan(duongDan);

        if (!noiDungXuLy || !noiDungXuLy.trim()) {
            throw new Error(
                `Không đọc được chữ nào từ tệp gốc của báo cáo ${id_bao_cao}.`
            );
        }

        // Ghi lại để lần chấm sau khỏi phải đọc tệp lần nữa
        await BaoCao.updateOne(
            { id_bao_cao },
            { $set: { noi_dung_tien_xu_ly: noiDungXuLy } }
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


    // Xoá chỉ số câu của lần xử lý trước cho chính báo cáo này.
    //
    // Các câu được chèn thêm chứ không ghi đè, nên mỗi lần chấm lại là số câu
    // trong cơ sở dữ liệu lại cộng dồn: một bài 402 câu chấm bốn lần thành
    // 1716 câu. Thuật toán đối sánh đếm "tổng số câu" từ chính bảng này, nên
    // tỉ lệ trùng của cả bài bị chia cho một mẫu số phình to và cho ra con số
    // không giống lần chạy nào.
    const daXoaCauCu = await ChiSoCau.deleteMany({ id_bao_cao });

    if (daXoaCauCu.deletedCount > 0) {
        console.log(
            `[UPLOAD] ${id_bao_cao} - Da xoa ${daXoaCauCu.deletedCount} cau cua `
            + `lan xu ly truoc`
        );
    }

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