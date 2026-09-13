const {
    buildPassageMatches
} = require('../utils/passage_match');

const {
    buildPatchworkMatches
} = require('../utils/patchwork_match');

function printResult(title, data) {
    console.log('\n');
    console.log('='.repeat(80));
    console.log(title);
    console.log('='.repeat(80));

    console.log(
        JSON.stringify(
            data,
            null,
            2
        )
    );
}

/* ============================================================
 * CASE 1
 * ĐOẠN TRÙNG
 *
 * 1 -> A2:10
 * 2 -> A2:11
 * 3 -> A2:12
 * ============================================================
 */

const casePassage = [

    {
        chi_so_cau_kiem_tra: 1,
        cau_kiem_tra: 'Câu A',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 10,
                cau_nguon: 'Câu A',
                do_tuong_dong: 1
            }
        ]
    },

    {
        chi_so_cau_kiem_tra: 2,
        cau_kiem_tra: 'Câu B',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 11,
                cau_nguon: 'Câu B',
                do_tuong_dong: 1
            }
        ]
    },

    {
        chi_so_cau_kiem_tra: 3,
        cau_kiem_tra: 'Câu C',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 12,
                cau_nguon: 'Câu C',
                do_tuong_dong: 1
            }
        ]
    }

];

/* ============================================================
 * CASE 2
 * CHẮP VÁ NHIỀU NGUỒN
 *
 * 1 -> A2:10
 * 2 -> A3:100
 * 3 -> A4:20
 * ============================================================
 */

const casePatchworkMultiSource = [

    {
        chi_so_cau_kiem_tra: 1,
        cau_kiem_tra: 'Câu A',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 10
            }
        ]
    },

    {
        chi_so_cau_kiem_tra: 2,
        cau_kiem_tra: 'Câu B',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A3',
                chi_so_cau: 100
            }
        ]
    },

    {
        chi_so_cau_kiem_tra: 3,
        cau_kiem_tra: 'Câu C',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A4',
                chi_so_cau: 20
            }
        ]
    }

];

/* ============================================================
 * CASE 3
 * CHẮP VÁ CÙNG NGUỒN
 *
 * 1 -> A2:10
 * 2 -> A2:50
 * 3 -> A2:90
 * ============================================================
 */

const casePatchworkSameSource = [

    {
        chi_so_cau_kiem_tra: 1,
        cau_kiem_tra: 'Câu A',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 10
            }
        ]
    },

    {
        chi_so_cau_kiem_tra: 2,
        cau_kiem_tra: 'Câu B',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 50
            }
        ]
    },

    {
        chi_so_cau_kiem_tra: 3,
        cau_kiem_tra: 'Câu C',
        danh_sach_nguon: [
            {
                id_bao_cao: 'A2',
                chi_so_cau: 90
            }
        ]
    }

];

/* ============================================================
 * TEST
 * ============================================================
 */

printResult(
    'CASE 1 - PASSAGE MATCH',
    buildPassageMatches(casePassage)
);

printResult(
    'CASE 1 - PATCHWORK',
    buildPatchworkMatches(casePassage)
);

printResult(
    'CASE 2 - PATCHWORK MULTI SOURCE',
    buildPatchworkMatches(casePatchworkMultiSource)
);

printResult(
    'CASE 3 - PATCHWORK SAME SOURCE',
    buildPatchworkMatches(casePatchworkSameSource)
);