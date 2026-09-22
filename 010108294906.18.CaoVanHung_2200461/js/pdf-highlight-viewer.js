/**
 * ============================================================================
 * PDF HIGHLIGHT VIEWER
 * Render PDF bằng pdf.js rồi phủ lớp bôi màu lên các câu trùng.
 *
 * Trình xem PDF mặc định của trình duyệt nằm trong iframe nên JavaScript của
 * trang không chạm vào được. Muốn đổi vùng bôi màu theo từng nguồn ngay tại
 * trình duyệt thì phải tự render, đó là lý do có file này.
 * ============================================================================
 */

window.PdfHighlightViewer = (() => {

    let pdfDoc = null;              // tài liệu pdf.js đang mở
    let containerEl = null;         // vùng chứa các trang
    let tyLe = 1.2;                 // hệ số phóng to
    let duLieuTrang = [];           // dữ liệu chữ + viewport theo từng trang
    let cauDangBoiMau = [];         // danh sách câu của lần vẽ gần nhất
    let chiSoCauDangChon = null;    // câu người dùng bấm xem gần nhất
    let thongKePhu = [];            // số từ khớp được của từng câu

    // Các hàm chờ nghe khi người dùng bấm vào một vệt chữ được bôi màu
    const cacHamNgheBamVet = [];

    // Vàng nhạt vừa đủ thấy mà không lấn át chữ bên dưới
    const MAU_THUONG = 'rgba(255, 213, 79, 0.30)';

    // Độ dài tối thiểu của một cụm chữ để coi là khớp có ý nghĩa
    const DO_DAI_TOI_THIEU = 25;

    // ========================================================================
    // CHUẨN HOÁ VÀ DÒ CHỮ
    // ========================================================================

    /**
     * Chuẩn hoá văn bản để so khớp.
     *
     * Chữ trong PDF hay lệch với chữ lưu trong CSDL ở dấu câu, gạch đầu dòng,
     * dấu ngoặc và khoảng trắng. Bỏ hết những thứ đó đi, chỉ giữ chữ và số,
     * thì tỉ lệ tìm thấy câu cao hơn hẳn.
     */
    function chuanHoa(text) {
        return (text || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Ghép các mẩu chữ của một trang thành một chuỗi liền mạch, đồng thời
     * ghi lại mỗi ký tự thuộc về mẩu chữ nào để suy ngược ra toạ độ.
     *
     * @param {Array} items Mảng item từ page.getTextContent()
     * @returns {{chuoi: string, viTriItem: number[]}}
     */
    function ghepChuoiTrang(items) {

        let chuoi = '';
        const viTriItem = [];

        // Mỗi mẩu chữ chiếm khoảng ký tự nào trong chuỗi, để còn cắt vệt
        // theo đúng phần chữ thuộc về câu đang xét
        const phamViItem = [];

        let itemTruoc = null;

        for (let i = 0; i < items.length; i++) {

            const phan = (items[i].str || '').toLowerCase();

            if (!phan.trim()) {
                continue;
            }

            // Chỉ ngăn cách khi hai mẩu chữ thực sự rời nhau.
            //
            // PDF hay cắt một từ thành nhiều mẩu để đặt dấu tiếng Việt:
            // "động" ra thành "đ" + "ộ" + "ng", "tổ chức" thành "tổ" + "ch"
            // + "ứ" + "c". Nếu cứ chèn dấu cách giữa mọi mẩu thì một từ vỡ
            // thành mấy từ, và câu không còn khớp được nữa.
            if (chuoi && !chuoi.endsWith(' ')) {

                let coKhoangTrang = true;

                if (itemTruoc) {

                    const yTruoc = itemTruoc.transform[5];
                    const ySau = items[i].transform[5];

                    const cungDong =
                        Math.abs(yTruoc - ySau) < 2;

                    const daySauTruoc =
                        itemTruoc.transform[4] + (itemTruoc.width || 0);

                    const khoangCach =
                        items[i].transform[4] - daySauTruoc;

                    const coChu =
                        (items[i].height || 10) * 0.18;

                    // Sát nhau trên cùng một dòng thì coi là cùng một từ
                    if (cungDong && khoangCach < coChu) {
                        coKhoangTrang = false;
                    }
                }

                if (coKhoangTrang) {
                    chuoi += ' ';
                    viTriItem.push(i);
                }
            }

            itemTruoc = items[i];

            const batDauItem = chuoi.length;

            for (const kyTu of phan) {

                // Dấu câu và ký tự lạ quy về khoảng trắng, giống chuanHoa()
                if (!/[\p{L}\p{N}]/u.test(kyTu)) {
                    if (chuoi.endsWith(' ')) continue;
                    chuoi += ' ';
                } else {
                    chuoi += kyTu;
                }

                viTriItem.push(i);
            }

            phamViItem[i] = {
                batDau: batDauItem,
                ketThuc: chuoi.length - 1,
                soKyTu: chuoi.length - batDauItem
            };
        }

        return { chuoi, viTriItem, phamViItem };
    }

    /**
     * Tách chuỗi của trang thành danh sách từ, mỗi từ nhớ khoảng ký tự của nó
     * để sau này suy ra được mẩu chữ nào chứa nó.
     *
     * @returns {Array<{tu: string, batDau: number, ketThuc: number}>}
     */
    function tachTuCoViTri(chuoi) {

        const danhSach = [];
        const bieuThuc = /[\p{L}\p{N}]+/gu;

        let khop;

        while ((khop = bieuThuc.exec(chuoi)) !== null) {
            danhSach.push({
                tu: khop[0],
                batDau: khop.index,
                ketThuc: khop.index + khop[0].length - 1
            });
        }

        return danhSach;
    }

    /**
     * Đổi toạ độ PDF của một mẩu chữ sang toạ độ CSS trong trang đã render.
     */
    function doiSangToaDoManHinh(item, viewport) {

        const x = item.transform[4];
        const y = item.transform[5];

        const cao =
            item.height || Math.abs(item.transform[3]) || 10;

        return {
            left: x * viewport.scale,
            top: viewport.height - (y + cao) * viewport.scale,
            width: (item.width || 0) * viewport.scale,
            height: cao * viewport.scale
        };
    }

    /**
     * Lấy các ô chữ nằm trong khoảng ký tự [batDau, ketThuc] của chuỗi trang.
     */
    function layOChuTheoKhoang(trang, batDau, ketThuc) {

        const itemDau = trang.viTriItem[batDau];
        const itemCuoi = trang.viTriItem[ketThuc];

        const cacO = [];

        for (let i = itemDau; i <= itemCuoi; i++) {

            const item = trang.textItems[i];

            if (!item) continue;

            const o = doiSangToaDoManHinh(item, trang.viewport);

            // Một mẩu chữ của pdf.js có thể chứa nhiều câu liền nhau. Tô trọn
            // mẩu thì lấn sang câu bên cạnh, nên cắt theo đúng phần ký tự
            // thuộc về câu này, ước lượng bề rộng theo tỉ lệ ký tự.
            const pham = trang.phamViItem[i];

            if (pham && pham.soKyTu > 0) {

                const tuKyTu =
                    Math.max(batDau, pham.batDau) - pham.batDau;

                const denKyTu =
                    Math.min(ketThuc, pham.ketThuc) - pham.batDau + 1;

                if (denKyTu <= tuKyTu) continue;

                const rongMoiKyTu = o.width / pham.soKyTu;

                o.left += tuKyTu * rongMoiKyTu;
                o.width = (denKyTu - tuKyTu) * rongMoiKyTu;
            }

            if (o.width > 0) cacO.push(o);
        }

        return cacO;
    }

    /**
     * Khớp dãy từ của câu với dãy từ của trang, bắt đầu từ một vị trí cho sẵn.
     *
     * Chữ lấy từ PDF và chữ lưu trong CSDL đi qua hai đường trích xuất khác
     * nhau nên hay thừa thiếu vài từ ở giữa. So khớp từng ký tự thì trượt cả
     * câu, vì vậy so theo từ và cho phép bỏ qua một ít từ lệch.
     *
     * @returns {{tuCuoiTrang: number, tuCuoiCau: number, soTuKhop: number}}
     */
    function khopDayTu(tuTrang, tuCau, batDauTrang, batDauCau) {

        let i = batDauTrang;
        let j = batDauCau;

        let soTuKhop = 0;
        let soTuLech = 0;

        // Nới tay với từ lệch: hai bản trích xuất khác nhau thường chênh nhau
        // vài từ do đầu mục, số trang chen vào hoặc chữ bị đọc sai.
        const lechToiDa =
            Math.max(8, Math.floor((tuCau.length - batDauCau) * 0.4));

        // Khi gặp từ lệch, ngó trước vài từ để bắt lại nhịp
        const NHIN_TRUOC = 6;

        // Vùng khớp không được dài hơn câu bao nhiêu. Không chặn thì ở cuối
        // câu, những từ hay lặp như "thưởng", "công ty" sẽ kéo vùng tô lấn
        // sang cả câu đứng ngay sau nó.
        const iToiDa =
            batDauTrang + Math.ceil((tuCau.length - batDauCau) * 1.08) + 2;

        let iCuoiKhop = i;
        let jCuoiKhop = j;

        // Ghi lại đúng những từ nào của trang đã khớp, để chỉ tô chừng ấy.
        // Tô cả khoảng từ đầu tới cuối sẽ quét luôn chữ của câu đứng xen vào.
        const cacViTriKhop = [];

        while (i < tuTrang.length && j < tuCau.length && i <= iToiDa) {

            if (tuTrang[i].tu === tuCau[j]) {
                cacViTriKhop.push(i);
                i++; j++; soTuKhop++;
                iCuoiKhop = i; jCuoiKhop = j;
                continue;
            }

            let daXuLy = false;

            // Trang có thừa vài từ: nhảy qua chúng để bắt lại từ đang cần
            for (let b = 1; b <= NHIN_TRUOC && !daXuLy; b++) {
                if (i + b < tuTrang.length &&
                    tuTrang[i + b].tu === tuCau[j]) {
                    i += b;
                    soTuLech += b;
                    daXuLy = true;
                }
            }

            // Câu có thừa vài từ: bỏ qua chúng
            for (let b = 1; b <= NHIN_TRUOC && !daXuLy; b++) {
                if (j + b < tuCau.length &&
                    tuTrang[i].tu === tuCau[j + b]) {
                    j += b;
                    soTuLech += b;
                    daXuLy = true;
                }
            }

            // Một từ bị viết khác đi, bỏ qua cả hai bên
            if (!daXuLy) {
                i++; j++; soTuLech++;
            }

            if (soTuLech > lechToiDa) break;
        }

        return {
            tuCuoiTrang: iCuoiKhop,
            tuCuoiCau: jCuoiKhop,
            soTuKhop,
            cacViTriKhop
        };
    }

    /**
     * Tìm một câu trong một trang theo dãy từ.
     *
     * @param {object} trang    Dữ liệu trang
     * @param {string[]} tuCau  Các từ của câu, đã chuẩn hoá
     * @param {boolean} chiDauTrang true = chỉ nhận đoạn khớp nằm ở đầu trang
     *                              (dùng khi ghép phần còn lại của câu vắt trang)
     * @returns {Array<{cacO: Array, tuCuoiCau: number}>}
     */
    function timTrenTrang(trang, tuCau, chiDauTrang) {

        const tuTrang = trang.tuCoViTri;

        if (!tuTrang.length || !tuCau.length) return [];

        // Đòi khớp quá ít từ thì câu ngắn sẽ bám nhầm vào chỗ khác trong bài.
        // Với phần nối tiếp ở trang sau thì nới hơn, vì phần đó vốn ngắn.
        const soTuToiThieu =
            chiDauTrang
                ? 4
                : Math.max(5, Math.ceil(tuCau.length * 0.28));

        // Thử vài từ đầu làm mỏ neo, phòng khi từ đầu câu bị lệch
        const cacTuNeo =
            chiDauTrang ? [0] : [0, 1, 2];

        // Thu hết ứng viên trước. Một câu có thể bám hờ vào đoạn khác trong
        // trang chỉ vì vài từ mở đầu giống nhau, ví dụ "Nghỉ việc riêng CÓ
        // hưởng lương" và "Nghỉ việc riêng KHÔNG hưởng lương". Nếu dừng ngay
        // ở chỗ bám đầu tiên thì bỏ mất đoạn đúng nằm phía sau.
        const ungVien = [];

        for (let iTrang = 0; iTrang < tuTrang.length; iTrang++) {

            // Phần còn lại của câu vắt trang phải nằm gần đầu trang. Cho dư
            // vài từ vì đầu trang thường có số trang hoặc tiêu đề chạy.
            if (chiDauTrang && iTrang > 15) break;

            for (const neo of cacTuNeo) {

                if (neo >= tuCau.length) continue;
                if (tuTrang[iTrang].tu !== tuCau[neo]) continue;

                // Bắt vài từ đầu phải khớp liên tiếp thì mới coi là điểm neo
                // thật. Không có ràng buộc này, một từ phổ biến như "nghỉ"
                // hay "công" ở câu khác cũng thành điểm bắt đầu, kéo vùng tô
                // lan sang cả dòng không liên quan.
                const CAN_KHOP_LIEN_TIEP = 3;

                let dayDau = 0;

                while (dayDau < CAN_KHOP_LIEN_TIEP &&
                       neo + dayDau < tuCau.length &&
                       iTrang + dayDau < tuTrang.length &&
                       tuTrang[iTrang + dayDau].tu === tuCau[neo + dayDau]) {
                    dayDau++;
                }

                const canToiThieu =
                    Math.min(CAN_KHOP_LIEN_TIEP, tuCau.length - neo);

                if (dayDau < canToiThieu) continue;

                const kq =
                    khopDayTu(tuTrang, tuCau, iTrang, neo);

                if (kq.soTuKhop < soTuToiThieu) continue;

                ungVien.push({
                    batDau: iTrang,
                    ketThuc: kq.tuCuoiTrang - 1,
                    tuCuoiCau: kq.tuCuoiCau,
                    soTuKhop: kq.soTuKhop,
                    cacViTriKhop: kq.cacViTriKhop
                });

                break;
            }
        }

        // Ưu tiên ứng viên khớp được nhiều từ nhất, bỏ những cái đè lên nó
        ungVien.sort((a, b) => b.soTuKhop - a.soTuKhop);

        const daChon = [];

        for (const uv of ungVien) {

            const deLen =
                daChon.some(
                    c => uv.batDau <= c.ketThuc && c.batDau <= uv.ketThuc
                );

            if (!deLen) daChon.push(uv);
        }

        daChon.sort((a, b) => a.batDau - b.batDau);

        return daChon.map(uv => {

            // Gom các từ đã khớp thành từng dãy liên tiếp rồi tô từng dãy.
            // Nhờ vậy chữ xen giữa mà không thuộc câu sẽ không bị tô lây.
            const cacO = [];
            const viTri = uv.cacViTriKhop || [];

            let dauDay = null;
            let cuoiDay = null;

            const chotDay = () => {
                if (dauDay === null) return;
                const tDau = tuTrang[dauDay];
                const tCuoi = tuTrang[cuoiDay];
                if (tDau && tCuoi) {
                    cacO.push(
                        ...layOChuTheoKhoang(trang, tDau.batDau, tCuoi.ketThuc)
                    );
                }
                dauDay = null;
                cuoiDay = null;
            };

            for (const v of viTri) {
                if (dauDay === null) {
                    dauDay = v;
                    cuoiDay = v;
                } else if (v === cuoiDay + 1) {
                    cuoiDay = v;
                } else {
                    chotDay();
                    dauDay = v;
                    cuoiDay = v;
                }
            }
            chotDay();

            return {
                cacO,
                tuCuoiCau: uv.tuCuoiCau,
                soTuKhop: uv.soTuKhop
            };
        });
    }

    // ========================================================================
    // GOM VÀ HỢP NHẤT VÙNG VẼ
    // ========================================================================

    /**
     * Gom các ô chữ cùng một dòng lại thành một vệt liền.
     * Mỗi vệt nhớ luôn những câu nào đi qua nó, để sau này làm nổi đúng câu.
     */
    function gomVaoDanhSachDong(danhSachDong, cacO, chiSoCau) {

        for (const o of cacO) {

            if (!o.width || o.width <= 0) continue;

            const nguongDong = Math.max(o.height, 1) * 0.6;

            // Chỉ nối tiếp vào vệt cũ khi hai ô nằm sát nhau. Nếu lấy min/max
            // cả dòng thì khoảng trống giữa hai câu cũng bị tô, và vệt của
            // câu này nuốt luôn câu đứng cạnh trên cùng dòng.
            const nguongNoi = Math.max(o.height, 1) * 0.55;

            // Chỉ nối vào vệt của CHÍNH câu này. Danh sách vệt dùng chung cho
            // cả trang, nên nếu không kiểm tra thì ô của câu này sẽ nối vào
            // vệt của câu đứng sát bên và kéo theo cả nhãn của câu đó.
            const noiTiep =
                danhSachDong.find(d =>
                    d.cacCau.has(chiSoCau) &&
                    Math.abs(d.top - o.top) <= nguongDong &&
                    o.left >= d.left - nguongNoi &&
                    o.left <= d.left + d.width + nguongNoi
                );

            if (noiTiep) {
                const phai =
                    Math.max(noiTiep.left + noiTiep.width, o.left + o.width);
                noiTiep.left = Math.min(noiTiep.left, o.left);
                noiTiep.width = phai - noiTiep.left;
                noiTiep.height = Math.max(noiTiep.height, o.height);
                noiTiep.cacCau.add(chiSoCau);
            } else {
                danhSachDong.push({
                    top: o.top,
                    left: o.left,
                    width: o.width,
                    height: o.height,
                    cacCau: new Set([chiSoCau])
                });
            }
        }
    }

    /**
     * Hợp nhất các vệt chồng lên nhau trên cùng một dòng.
     *
     * Nhiều câu trùng thường nằm sát hoặc đè lên nhau. Nếu vẽ từng vệt riêng
     * thì chỗ giao nhau bị tô hai lớp, màu đậm loang lổ. Gộp thành một vệt
     * duy nhất thì màu đều, và vệt đó thuộc về tất cả các câu liên quan.
     */
    function hopNhatVetChongNhau(danhSachDong) {

        // Gom theo dòng bằng ngưỡng chứ không theo toạ độ tuyệt đối: hai vệt
        // của hai câu khác nhau trên cùng một dòng có thể lệch nhau vài pixel
        // do chiều cao chữ khác nhau, làm tròn thì lại rơi vào hai nhóm.
        const cacNhom = [];

        for (const d of danhSachDong) {

            const nguong = Math.max(d.height, 1) * 0.6;

            const nhomCu =
                cacNhom.find(n => Math.abs(n.moc - d.top) <= nguong);

            if (nhomCu) {
                nhomCu.items.push(d);
            } else {
                cacNhom.push({ moc: d.top, items: [d] });
            }
        }

        const ketQua = [];

        for (const { items: nhom } of cacNhom) {

            // Chia dòng thành các đoạn rời nhau theo mọi mốc biên trái/phải.
            // Mỗi đoạn nằm gọn trong một hoặc nhiều câu, không đoạn nào chồng
            // đoạn nào — nhờ vậy màu không bị tô hai lớp, mà khi làm nổi một
            // câu cũng không kéo theo phần chỉ thuộc câu bên cạnh.
            const mocs = new Set();

            for (const d of nhom) {
                mocs.add(d.left);
                mocs.add(d.left + d.width);
            }

            const danhSachMoc =
                [...mocs].sort((a, b) => a - b);

            for (let k = 0; k + 1 < danhSachMoc.length; k++) {

                const trai = danhSachMoc[k];
                const phai = danhSachMoc[k + 1];

                if (phai - trai < 0.5) continue;

                const giua = (trai + phai) / 2;

                const phuDoan =
                    nhom.filter(
                        d => d.left <= giua && giua <= d.left + d.width
                    );

                if (phuDoan.length === 0) continue;

                const top =
                    Math.min(...phuDoan.map(d => d.top));

                const day =
                    Math.max(...phuDoan.map(d => d.top + d.height));

                const cacCau = new Set();
                phuDoan.forEach(d => d.cacCau.forEach(c => cacCau.add(c)));

                ketQua.push({
                    top,
                    left: trai,
                    width: phai - trai,
                    height: day - top,
                    cacCau
                });
            }
        }

        return catPhanTranDong(ketQua);
    }

    /**
     * Cắt phần tràn dọc giữa các vệt của hai dòng liền nhau.
     *
     * Chiều cao chữ mà pdf.js báo về thường lớn hơn khoảng cách giữa hai dòng,
     * nên vệt dòng trên thò xuống đè lên vệt dòng dưới. Chỗ giao nhau bị tô
     * hai lớp, thành một vạch đậm chạy ngang giữa các dòng.
     */
    function catPhanTranDong(cacVet) {

        const sapXep =
            [...cacVet].sort((a, b) => a.top - b.top);

        for (let i = 0; i < sapXep.length; i++) {

            const tren = sapXep[i];

            for (let j = i + 1; j < sapXep.length; j++) {

                const duoi = sapXep[j];

                if (duoi.top >= tren.top + tren.height) continue;

                const giaoNgang =
                    tren.left < duoi.left + duoi.width &&
                    duoi.left < tren.left + tren.width;

                if (!giaoNgang) continue;

                // Ép đáy vệt trên dừng ngay trước đỉnh vệt dưới
                const chieuCaoMoi = duoi.top - tren.top;

                if (chieuCaoMoi > 2) {
                    tren.height = chieuCaoMoi;
                }
            }
        }

        return sapXep;
    }

    // ========================================================================
    // BÔI MÀU
    // ========================================================================

    /**
     * Vẽ lại toàn bộ lớp bôi màu theo danh sách câu được truyền vào.
     * Gọi lại với danh sách khác để đổi vùng bôi màu mà không render lại PDF.
     *
     * @param {Array<{cau_kiem_tra: string}>} danhSachCau
     * @returns {number} Tổng số vệt đã vẽ
     */
    function boiMau(danhSachCau) {

        cauDangBoiMau = danhSachCau || [];
        chiSoCauDangChon = null;

        const cacCau = cauDangBoiMau
            .map(c => chuanHoa(c && c.cau_kiem_tra))
            .map(c => (c && c.length >= 10 ? c.split(' ') : null));

        // Mỗi trang một danh sách vệt, gom dần theo từng câu
        const vetTheoTrang =
            duLieuTrang.map(() => []);

        thongKePhu = [];

        for (let chiSoCau = 0; chiSoCau < cacCau.length; chiSoCau++) {

            const tuCau = cacCau[chiSoCau];

            thongKePhu[chiSoCau] = {
                tongTu: tuCau ? tuCau.length : 0,
                tuKhop: 0
            };

            if (!tuCau || tuCau.length < 4) continue;

            // Thu thập mọi lần khớp trên toàn tài liệu trước, rồi mới lọc.
            // Một câu có thể bám hờ vào vài chỗ khác chỉ nhờ dăm từ giống
            // nhau; so với lần khớp tốt nhất thì loại được những chỗ đó.
            const moiLanKhop = [];

            for (let iTrang = 0; iTrang < duLieuTrang.length; iTrang++) {
                for (const lan of timTrenTrang(duLieuTrang[iTrang], tuCau, false)) {
                    moiLanKhop.push({ iTrang, lan });
                }
            }

            if (moiLanKhop.length === 0) continue;

            const khopTotNhat =
                Math.max(...moiLanKhop.map(x => x.lan.soTuKhop));

            const duocGiu =
                moiLanKhop.filter(
                    x => x.lan.soTuKhop >= Math.max(5, khopTotNhat * 0.8)
                );

            thongKePhu[chiSoCau].tuKhop = khopTotNhat;

            for (const { iTrang, lan } of duocGiu) {

                gomVaoDanhSachDong(
                    vetTheoTrang[iTrang],
                    lan.cacO,
                    chiSoCau
                );

                // Câu dài thường vắt sang trang sau. Nếu mới khớp được một
                // phần, đi tìm nốt phần còn lại ngay đầu trang kế tiếp.
                const tuConLai = tuCau.slice(lan.tuCuoiCau);

                if (tuConLai.length >= 4 &&
                    iTrang + 1 < duLieuTrang.length) {

                    const tiepTheo =
                        timTrenTrang(
                            duLieuTrang[iTrang + 1],
                            tuConLai,
                            true
                        );

                    if (tiepTheo.length > 0) {
                        gomVaoDanhSachDong(
                            vetTheoTrang[iTrang + 1],
                            tiepTheo[0].cacO,
                            chiSoCau
                        );

                        thongKePhu[chiSoCau].tuKhop +=
                            tiepTheo[0].soTuKhop;
                    }
                }
            }
        }

        // Vẽ ra DOM sau khi đã hợp nhất, để không có chỗ nào bị tô hai lớp
        let tongVet = 0;

        for (let iTrang = 0; iTrang < duLieuTrang.length; iTrang++) {

            const lop =
                containerEl.querySelector(`#pdfHighlightLayer-${iTrang}`);

            if (!lop) continue;

            lop.innerHTML = '';

            for (const vet of hopNhatVetChongNhau(vetTheoTrang[iTrang])) {

                if (vet.width <= 0 || vet.height <= 0) continue;

                const el = document.createElement('div');

                el.className = 'pdf-vet-boi-mau';

                // Danh sách câu đi qua vệt này, phân tách bằng dấu cách để
                // chọn được bằng selector [data-cac-cau~="3"]
                el.dataset.cacCau = [...vet.cacCau].join(' ');

                // Vẽ đúng kích thước đã tính. Nở thêm cho "đẹp" sẽ làm vệt
                // dòng trên thò xuống đè dòng dưới, thành vạch đậm chạy ngang.
                el.style.cssText = `
                    position: absolute;
                    left: ${vet.left}px;
                    top: ${vet.top}px;
                    width: ${vet.width}px;
                    height: ${vet.height}px;
                    background: ${MAU_THUONG};
                    cursor: pointer;
                    border-radius: 2px;
                    transition: background .18s;
                `;

                el.title = 'Bấm để xem câu này ở bảng chi tiết bên phải';

                // Bấm vào chữ được bôi màu thì báo cho trang chi tiết biết để
                // mở đúng mục tương ứng ở bảng bên phải.
                //
                // Trước đây vệt bôi màu đặt pointer-events: none nên chuột đi
                // xuyên qua, bấm vào chỗ vàng chóe không có gì xảy ra: người
                // dùng chỉ đi được một chiều từ bảng sang tài liệu.
                el.addEventListener('click', () => {
                    const cacCau = el.dataset.cacCau
                        .split(' ')
                        .map(Number)
                        .filter(n => !Number.isNaN(n));

                    if (!cacCau.length) return;

                    // Một vệt có thể nằm trên nhiều câu khi hai câu dính liền
                    // nhau trong cùng một dòng; lấy câu đầu tiên.
                    lamNoiCau(cacCau[0]);

                    for (const ham of cacHamNgheBamVet) {
                        try {
                            ham(cacCau[0], cacCau);
                        } catch (e) {
                            console.error('Lỗi khi xử lý bấm vệt bôi màu:', e);
                        }
                    }
                });

                lop.appendChild(el);
                tongVet++;
            }
        }

        return tongVet;
    }

    /**
     * Làm nổi tất cả các vệt thuộc một câu, rồi cuộn tới vệt đầu tiên.
     * Câu trải nhiều dòng hay nhiều trang đều được đổi màu đồng loạt, nên
     * không còn cảnh nửa dòng cam nửa dòng vàng.
     *
     * @param {number|null} chiSo Chỉ số câu, null để bỏ chọn
     * @returns {boolean} true nếu tìm thấy vệt của câu này
     */
    function lamNoiCau(chiSo) {

        if (!containerEl) return false;

        chiSoCauDangChon = chiSo;

        if (chiSo === null || chiSo === undefined) return false;

        const cacVet =
            containerEl.querySelectorAll(
                `.pdf-vet-boi-mau[data-cac-cau~="${chiSo}"]`
            );

        if (cacVet.length === 0) return false;

        // Chỉ cuộn tới vị trí câu, không đổi màu.
        //
        // Ranh giới giữa hai câu liền nhau chỉ xác định được gần đúng, vì
        // toạ độ chữ phải suy ra từ bề rộng trung bình ký tự. Tô riêng câu
        // đang chọn sẽ phô ra chỗ lệch đó; để nguyên một màu vàng thì vùng
        // trùng vẫn đúng mà không lộ sai số.
        cacVet[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        return true;
    }

    /**
     * Cuộn tới vệt bôi màu đầu tiên của cả tài liệu.
     */
    function cuonToiVetDau() {

        if (!containerEl) return false;

        const vetDau =
            containerEl.querySelector('.pdf-vet-boi-mau');

        if (!vetDau) return false;

        vetDau.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
    }

    // ========================================================================
    // ĐIỀU HƯỚNG
    // ========================================================================

    /**
     * Cuộn tới một trang theo số thứ tự (tính từ 1).
     */
    function cuonToiTrang(soTrang) {

        if (!containerEl) return false;

        const trang =
            containerEl.querySelectorAll('.pdf-page')[soTrang - 1];

        if (!trang) return false;

        trang.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
    }

    /**
     * Trang nào đang chiếm phần lớn khung nhìn thì coi là trang hiện tại.
     */
    function layTrangHienTai() {

        if (!containerEl) return 1;

        const cacTrang =
            containerEl.querySelectorAll('.pdf-page');

        const giuaKhung =
            containerEl.scrollTop + containerEl.clientHeight / 2;

        for (let i = 0; i < cacTrang.length; i++) {

            const tren = cacTrang[i].offsetTop;
            const duoi = tren + cacTrang[i].offsetHeight;

            if (giuaKhung >= tren && giuaKhung <= duoi) {
                return i + 1;
            }
        }

        return 1;
    }

    /**
     * Làm nổi ảnh thu nhỏ của trang đang xem và cuộn dải ảnh theo cho thấy.
     */
    function danhDauThumbDangXem(soTrang) {

        const vung = document.getElementById('pdfThumbnails');

        if (!vung) return;

        vung.querySelectorAll('.pdf-thumb').forEach(t => {
            t.classList.toggle(
                'pdf-thumb--dangxem',
                Number(t.dataset.trang) === soTrang
            );
        });

        const dangXem = vung.querySelector('.pdf-thumb--dangxem');

        if (dangXem) {
            const dinh = dangXem.offsetTop - vung.clientHeight / 2;
            vung.scrollTo({ top: Math.max(0, dinh), behavior: 'smooth' });
        }
    }

    /**
     * Dựng dải ảnh thu nhỏ các trang, bấm vào thì nhảy tới trang đó.
     */
    async function taoThumbnail(idVungThumbnail) {

        const vung = document.getElementById(idVungThumbnail);

        if (!vung || !pdfDoc) return;

        vung.innerHTML = '';

        for (let so = 1; so <= pdfDoc.numPages; so++) {

            const page = await pdfDoc.getPage(so);
            const viewport = page.getViewport({ scale: 0.22 });

            const o = document.createElement('div');
            o.className = 'pdf-thumb';
            o.dataset.trang = String(so);

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const nhan = document.createElement('div');
            nhan.className = 'pdf-thumb__so';
            nhan.textContent = String(so);

            o.appendChild(canvas);
            o.appendChild(nhan);
            o.addEventListener('click', () => cuonToiTrang(so));
            vung.appendChild(o);

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;
        }

        danhDauThumbDangXem(layTrangHienTai());
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    /**
     * Render toàn bộ tài liệu, mỗi trang gồm một canvas và một lớp phủ trống.
     */
    async function renderTatCaTrang() {

        containerEl.innerHTML = '';
        duLieuTrang = [];

        for (let so = 1; so <= pdfDoc.numPages; so++) {

            const page = await pdfDoc.getPage(so);
            const viewport = page.getViewport({ scale: tyLe });

            const khungTrang = document.createElement('div');
            khungTrang.className = 'pdf-page';
            khungTrang.style.cssText = `
                position: relative;
                margin: 0 auto 18px auto;
                width: ${viewport.width}px;
                height: ${viewport.height}px;
                background: #fff;
                box-shadow: 0 2px 10px rgba(0,0,0,.45);
            `;

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'block';

            const lopBoiMau = document.createElement('div');
            lopBoiMau.id = `pdfHighlightLayer-${so - 1}`;
            lopBoiMau.style.cssText =
                'position:absolute;inset:0;pointer-events:none;';

            khungTrang.appendChild(canvas);
            khungTrang.appendChild(lopBoiMau);
            containerEl.appendChild(khungTrang);

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;

            const textContent = await page.getTextContent();
            const ghep = ghepChuoiTrang(textContent.items);

            duLieuTrang.push({
                textItems: textContent.items,
                viewport,
                chuoi: ghep.chuoi,
                viTriItem: ghep.viTriItem,
                phamViItem: ghep.phamViItem,
                tuCoViTri: tachTuCoViTri(ghep.chuoi)
            });
        }
    }

    /**
     * Mở một file PDF và render ra màn hình.
     *
     * @param {Blob} blob         Nội dung file PDF
     * @param {string} idVungChua id của thẻ chứa các trang
     * @returns {Promise<number>} Số trang
     */
    async function mo(blob, idVungChua) {

        containerEl = document.getElementById(idVungChua);

        if (!containerEl) {
            throw new Error(`Không tìm thấy vùng chứa #${idVungChua}`);
        }

        const duLieu = await blob.arrayBuffer();

        pdfDoc = await pdfjsLib.getDocument({ data: duLieu }).promise;

        await renderTatCaTrang();

        return pdfDoc.numPages;
    }

    /**
     * Đổi mức phóng to rồi render lại, giữ nguyên vùng đang bôi màu.
     */
    async function datTyLe(tyLeMoi) {

        tyLe = Math.min(Math.max(tyLeMoi, 0.5), 3);

        if (!pdfDoc) return tyLe;

        const cauCu = cauDangBoiMau;
        const chonCu = chiSoCauDangChon;

        await renderTatCaTrang();
        boiMau(cauCu);

        if (chonCu !== null && chonCu !== undefined) {
            lamNoiCau(chonCu);   // cuộn lại đúng câu đang xem
        }

        return tyLe;
    }

    /**
     * Đăng ký hàm được gọi mỗi khi người dùng bấm vào một vệt chữ bôi màu.
     *
     * @param {function(number, number[]): void} ham Nhận chỉ số câu đầu tiên
     *        của vệt vừa bấm và toàn bộ các chỉ số câu đi qua vệt đó.
     */
    function khiBamVetBoiMau(ham) {
        if (typeof ham === 'function') cacHamNgheBamVet.push(ham);
    }

    return {
        mo,
        boiMau,
        lamNoiCau,
        khiBamVetBoiMau,
        cuonToiCau: lamNoiCau,   // tên cũ, giữ cho chỗ gọi sẵn có
        cuonToiVetDau,
        cuonToiTrang,
        layTrangHienTai,
        taoThumbnail,
        danhDauThumbDangXem,
        datTyLe,
        layTyLe: () => tyLe,
        laySoTrang: () => (pdfDoc ? pdfDoc.numPages : 0),
        layVungChua: () => containerEl,
        layThongKePhu: () => thongKePhu,
        layDuLieuTrang: () => duLieuTrang
    };

})();
