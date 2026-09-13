const fs = require('fs');

const { trichXuatVanBan } =
    require('./utils/trich_xuat_text');

const {
    locNoiDungHocThuat
} = require('./utils/tien_xu_ly');

(async () => {

    const pdfPath =
        'D:/kiemtra_trunglap/restructuring_data/DAHP1/2100236.pdf';

    const raw =
        await trichXuatVanBan(pdfPath);

    fs.writeFileSync(
        'test_raw_pdf.txt',
        raw,
        'utf8'
    );

    const hocThuat =
        locNoiDungHocThuat(
            raw
        );

    fs.writeFileSync(
        'test_pdf_no_chuanhoa.txt',
        hocThuat,
        'utf8'
    );

    console.log(
        'DONE'
    );

})();