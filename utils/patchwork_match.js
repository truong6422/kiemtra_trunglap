/**
 * ============================================================================
 * PATCHWORK MATCH
 * Phát hiện đạo văn chắp vá
 *
 * Điều kiện:
 * - Các câu kiểm tra liên tiếp
 * - Có từ 2 nguồn trở lên
 * - Tối thiểu 2 câu
 * ============================================================================
 */

function buildPatchworkMatches(
    chiTietCauTrung = []
) {

    if (
        !Array.isArray(
            chiTietCauTrung
        ) ||
        chiTietCauTrung.length === 0
    ) {
        return [];
    }

    const sorted =
        [...chiTietCauTrung]
            .sort(
                (a, b) =>
                    a.chi_so_cau_kiem_tra -
                    b.chi_so_cau_kiem_tra
            );

    const patchworks = [];

    let currentGroup = [
        sorted[0]
    ];

    for (
        let i = 1;
        i < sorted.length;
        i++
    ) {

        const prev =
            sorted[i - 1];

        const cur =
            sorted[i];

        const isContinuous =

            cur.chi_so_cau_kiem_tra ===
            prev.chi_so_cau_kiem_tra + 1;

        if (
            isContinuous
        ) {

            currentGroup.push(cur);

        } else {

            processGroup(
                currentGroup,
                patchworks
            );

            currentGroup = [cur];
        }
    }

    processGroup(
        currentGroup,
        patchworks
    );

    // ======================================================
    // ƯU TIÊN CHẮP VÁ DÀI NHẤT
    // ======================================================

    patchworks.sort(
        (a, b) => {

            if (
                b.so_cau !== a.so_cau
            ) {
                return b.so_cau - a.so_cau;
            }

            if (
                b.danh_sach_id_bao_cao_nguon.length !==
                a.danh_sach_id_bao_cao_nguon.length
            ) {
                return (
                    b.danh_sach_id_bao_cao_nguon.length -
                    a.danh_sach_id_bao_cao_nguon.length
                );
            }

            return (
                b.chi_tiet_nguon.reduce(
                    (s, x) => s + x.so_cau,
                    0
                ) -
                a.chi_tiet_nguon.reduce(
                    (s, x) => s + x.so_cau,
                    0
                )
            );
        }
    );

    const occupied =
        new Set();

    const finalPatchworks =
        [];

    for (const patchwork of patchworks) {
        let conflict = false;

        for (
            let i = patchwork.tu_cau_kiem_tra;
            i <= patchwork.den_cau_kiem_tra;
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

        finalPatchworks.push(
            patchwork
        );

        for (
            let i = patchwork.tu_cau_kiem_tra;
            i <= patchwork.den_cau_kiem_tra;
            i++
        ) {
            occupied.add(i);
        }
    }

    return finalPatchworks;
}
/**
 * ============================================================
 * Kiểm tra một nhóm câu liên tiếp
 * ============================================================
 */

function processGroup(
    group,
    patchworks
) {

    if (!group || group.length < 2) {
        return;
    }

    const sourceSet =
        new Set();

    for (const sentence of group) {

        for (
            const source of
            (sentence.danh_sach_nguon || [])
        ) {

            sourceSet.add(
                source.id_bao_cao
            );
        }
    }

    const uniqueSources =
        [...sourceSet];

    const chiTietNguonMap = {};

    for (const sentence of group) {

        for (
            const source of
            (sentence.danh_sach_nguon || [])
        ) {

            if (
                !chiTietNguonMap[
                source.id_bao_cao
                ]
            ) {

                chiTietNguonMap[
                    source.id_bao_cao
                ] = [];
            }

            chiTietNguonMap[
                source.id_bao_cao
            ].push({
                chi_so_cau: source.chi_so_cau
            });
        }
    }

    // ========================================================
    // Patchwork phải có từ 2 nguồn trở lên
    // ========================================================

    let isPatchwork = false;

    // Có nhiều nguồn
    if (uniqueSources.length >= 2) {
        isPatchwork = true;
    }

    // Một nguồn nhưng câu nguồn không liên tiếp
    if (!isPatchwork) {

        const firstSource =
            uniqueSources[0];

        const sourceIndexes =
            chiTietNguonMap[firstSource]
                .map(x => x.chi_so_cau)
                .sort((a, b) => a - b);

        for (let i = 1; i < sourceIndexes.length; i++) {

            if (
                sourceIndexes[i] !==
                sourceIndexes[i - 1] + 1
            ) {
                isPatchwork = true;
                break;
            }
        }
    }

    if (!isPatchwork) {
        return;
    }
    const doanChapVa =
        group
            .map(
                sentence =>
                    sentence.cau_kiem_tra
            )
            .join(' ');

    const chiTietNguon =
        Object.entries(
            chiTietNguonMap
        ).map(
            ([id, dsNguon]) => ({
                id_bao_cao_nguon: id,

                tu_cau_nguon:
                    Math.min(
                        ...dsNguon.map(x => x.chi_so_cau)
                    ),

                den_cau_nguon:
                    Math.max(
                        ...dsNguon.map(x => x.chi_so_cau)
                    ),


                so_cau:
                    dsNguon.length
            })
        );
    patchworks.push({

        tu_cau_kiem_tra:
            group[0]
                .chi_so_cau_kiem_tra,

        den_cau_kiem_tra:
            group[
                group.length - 1
            ]
                .chi_so_cau_kiem_tra,
        so_cau:
            group.length,

        danh_sach_id_bao_cao_nguon:
            uniqueSources,

        chi_tiet_nguon:
            chiTietNguon,

        doan_chap_va:
            doanChapVa
    });
}

module.exports = {
    buildPatchworkMatches
};