/**
 * ============================================================================
 * PASSAGE MATCH
 * Gom các câu trùng liên tiếp thành đoạn đạo văn
 * Điều kiện:
 *  - Cùng báo cáo nguồn
 *  - Câu kiểm tra liên tiếp
 *  - Câu nguồn liên tiếp
 *  - Tối thiểu 2 câu
 * ============================================================================
 */

function buildPassageMatches(
    chiTietCauTrung = []
) {

    const records = [];

    // ==============================================================
    // Trải phẳng dữ liệu:
    // 1 câu có nhiều nguồn
    // =>
    // N record độc lập
    // ==============================================================

    for (const item of chiTietCauTrung) {

        const targetIndex =
            item.chi_so_cau_kiem_tra;

        for (
            const source of
            (item.danh_sach_nguon || [])
        ) {

            records.push({

                id_bao_cao:
                    source.id_bao_cao,

                targetSentenceIndex:
                    targetIndex,

                sourceSentenceIndex:
                    source.chi_so_cau,

                targetSentenceText:
                    item.cau_kiem_tra,

                sourceSentenceText:
                    source.cau_nguon,

                similarity:
                    source.do_tuong_dong || 0,

                // Bug 3 fix: giữ doan_id để chỉ gom câu cùng đoạn
                doan_id_kiem_tra: item.doan_id || '',
                doan_id_nguon:    source.doan_id_nguon || ''
            });
        }
    }

    if (records.length === 0) {
        return [];
    }

    // ==============================================================
    // Sắp xếp
    // ==============================================================

    records.sort(
        (a, b) => {

            if (
                a.id_bao_cao !==
                b.id_bao_cao
            ) {

                return a.id_bao_cao.localeCompare(
                    b.id_bao_cao
                );
            }

            return (
                a.targetSentenceIndex -
                b.targetSentenceIndex
            );
        }
    );

    // ==============================================================
    // Gom đoạn
    // ==============================================================

    const passages = [];

    let current = {

        id_bao_cao_nguon:
            records[0].id_bao_cao,

        tu_cau_kiem_tra:
            records[0].targetSentenceIndex,

        den_cau_kiem_tra:
            records[0].targetSentenceIndex,

        tu_cau_nguon:
            records[0].sourceSentenceIndex,

        den_cau_nguon:
            records[0].sourceSentenceIndex,

        targetTexts: [
            records[0].targetSentenceText
        ],

        sourceTexts: [
            records[0].sourceSentenceText
        ],

        similarities: [
            records[0].similarity
        ]
    };

    for (
        let i = 1;
        i < records.length;
        i++
    ) {

        const prev =
            records[i - 1];

        const cur =
            records[i];

        const sameReport =
            cur.id_bao_cao ===
            prev.id_bao_cao;

        const targetContinuous =
            cur.targetSentenceIndex ===
            prev.targetSentenceIndex + 1;

        const sourceContinuous =
            cur.sourceSentenceIndex ===
            prev.sourceSentenceIndex + 1;

        // Bug 3 fix: không ghép qua đoạn văn khác nhau
        const sameDoanKiemTra =
            !cur.doan_id_kiem_tra ||
            !prev.doan_id_kiem_tra ||
            cur.doan_id_kiem_tra === prev.doan_id_kiem_tra;

        const sameDoanNguon =
            !cur.doan_id_nguon ||
            !prev.doan_id_nguon ||
            cur.doan_id_nguon === prev.doan_id_nguon;

        if (
            sameReport &&
            targetContinuous &&
            sourceContinuous &&
            sameDoanKiemTra &&
            sameDoanNguon
        ) {

            current.den_cau_kiem_tra =
                cur.targetSentenceIndex;

            current.den_cau_nguon =
                cur.sourceSentenceIndex;

            current.similarities.push(
                cur.similarity
            );
            current.targetTexts.push(
                cur.targetSentenceText
            );

            current.sourceTexts.push(
                cur.sourceSentenceText
            );

        } else {

            const soCau =
                current.den_cau_kiem_tra -
                current.tu_cau_kiem_tra +
                1;

            // ======================================================
            // >= 2 câu liên tiếp mới tính là đoạn
            // ======================================================

            if (soCau >= 2) {

                passages.push({

                    id_bao_cao_nguon:
                        current.id_bao_cao_nguon,

                    tu_cau_kiem_tra:
                        current.tu_cau_kiem_tra,

                    den_cau_kiem_tra:
                        current.den_cau_kiem_tra,

                    tu_cau_nguon:
                        current.tu_cau_nguon,

                    den_cau_nguon:
                        current.den_cau_nguon,

                    so_cau: soCau,
                    doan_kiem_tra:
                        current.targetTexts.join(' '),

                    doan_nguon:
                        current.sourceTexts.join(' '),

                    do_tuong_dong_trung_binh:
                        current.similarities.reduce(
                            (a, b) => a + b,
                            0
                        ) /
                        current.similarities.length,

                    do_tuong_dong_cao_nhat:
                        Math.max(
                            ...current.similarities
                        )
                });
            }

            current = {

                id_bao_cao_nguon:
                    cur.id_bao_cao,

                tu_cau_kiem_tra:
                    cur.targetSentenceIndex,

                den_cau_kiem_tra:
                    cur.targetSentenceIndex,

                tu_cau_nguon:
                    cur.sourceSentenceIndex,

                den_cau_nguon:
                    cur.sourceSentenceIndex,

                targetTexts: [
                    cur.targetSentenceText
                ],

                sourceTexts: [
                    cur.sourceSentenceText
                ],

                similarities: [
                    cur.similarity
                ]
            };
        }
    }

    // ==============================================================
    // Đẩy đoạn cuối cùng
    // ==============================================================

    const soCauCuoi =
        current.den_cau_kiem_tra -
        current.tu_cau_kiem_tra +
        1;

    if (soCauCuoi >= 2) {

        passages.push({

            id_bao_cao_nguon:
                current.id_bao_cao_nguon,

            tu_cau_kiem_tra:
                current.tu_cau_kiem_tra,

            den_cau_kiem_tra:
                current.den_cau_kiem_tra,

            tu_cau_nguon:
                current.tu_cau_nguon,

            den_cau_nguon:
                current.den_cau_nguon,

            so_cau:
                soCauCuoi,
            doan_kiem_tra:
                current.targetTexts.join(' '),

            doan_nguon:
                current.sourceTexts.join(' '),

            do_tuong_dong_trung_binh:
                current.similarities.reduce(
                    (a, b) => a + b,
                    0
                ) /
                current.similarities.length,

            do_tuong_dong_cao_nhat:
                Math.max(
                    ...current.similarities
                )
        });
    }
    // =======================================
    // ƯU TIÊN ĐOẠN DÀI NHẤT
    // =======================================

    passages.sort(
        (a, b) => {

            if (
                b.so_cau !== a.so_cau
            ) {
                return (
                    b.so_cau -
                    a.so_cau
                );
            }

            return (
                b.do_tuong_dong_trung_binh -
                a.do_tuong_dong_trung_binh
            );

        }
    );

    // Chống chồng lấn RIÊNG cho từng báo cáo nguồn. Trước đây dùng một tập
    // chung cho mọi nguồn: cùng một đoạn của bài nộp khớp cả bản Word lẫn
    // bản PDF của một bài mẫu thì chỉ nguồn nào xếp trước mới giữ được đoạn,
    // nguồn kia mất hẳn — chọn xem bản Word thấy "Đoạn 1" nằm ở câu 70, các
    // đoạn trùng phía trước đã bị bản PDF lấy mất.
    const occupiedTheoNguon =
        new Map();

    const finalPassages = [];

    for (const passage of passages) {
        if (!occupiedTheoNguon.has(passage.id_bao_cao_nguon)) {
            occupiedTheoNguon.set(passage.id_bao_cao_nguon, new Set());
        }

        const occupied =
            occupiedTheoNguon.get(passage.id_bao_cao_nguon);

        let conflict = false;

        for (
            let i = passage.tu_cau_kiem_tra;
            i <= passage.den_cau_kiem_tra;
            i++
        ) {
            if (occupied.has(i)) {
                conflict = true;
                break;
            }
        }

        if (conflict) {
            continue;
        }

        finalPassages.push(
            passage
        );

        for (
            let i = passage.tu_cau_kiem_tra;
            i <= passage.den_cau_kiem_tra;
            i++
        ) {
            occupied.add(i);
        }
    }

    // Trả về theo thứ tự xuất hiện trong bài nộp
    finalPassages.sort(
        (a, b) =>
            a.tu_cau_kiem_tra - b.tu_cau_kiem_tra ||
            a.id_bao_cao_nguon.localeCompare(b.id_bao_cao_nguon)
    );

    return finalPassages;
}

/**
 * Số đoạn trùng của bài nộp (không kể nguồn): các đoạn của mọi nguồn trải ra
 * trên bài nộp, chồng nhau thì tính là một, ưu tiên đoạn dài.
 */
function demDoanTrungCuaBai(passages = []) {
    const daChiem = new Set();
    let dem = 0;

    const sapXep = [...passages].sort((a, b) => b.so_cau - a.so_cau);

    for (const p of sapXep) {
        let chongLan = false;
        for (let i = p.tu_cau_kiem_tra; i <= p.den_cau_kiem_tra; i++) {
            if (daChiem.has(i)) { chongLan = true; break; }
        }
        if (chongLan) continue;

        dem++;
        for (let i = p.tu_cau_kiem_tra; i <= p.den_cau_kiem_tra; i++) {
            daChiem.add(i);
        }
    }

    return dem;
}

module.exports = {
    buildPassageMatches,
    demDoanTrungCuaBai
};