// test_pdf_debug.js

const fs = require('fs');

const { trichXuatVanBan } =
    require('./utils/trich_xuat_text');

const {
    chuanHoaPdfText,
    locNoiDungHocThuat
} = require('./utils/tien_xu_ly');

(async () => {

    const filePath =
        'D:/Hung_2200461_K46/restructuring_data/DAHP1/2100236.pdf';

    const raw =
        await trichXuatVanBan(
            filePath
        );

    fs.writeFileSync(
        'debug_01_raw.txt',
        raw,
        'utf8'
    );

    const normalized =
        chuanHoaPdfText(
            raw
        );

    fs.writeFileSync(
        'debug_02_chuanhoa.txt',
        normalized,
        'utf8'
    );

    const hocThuat =
        locNoiDungHocThuat(
            normalized
        );

    fs.writeFileSync(
        'debug_03_hocthuat.txt',
        hocThuat,
        'utf8'
    );

    console.log('DONE');

})();