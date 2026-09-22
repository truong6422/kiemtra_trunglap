/**
 * ============================================================================
 * CHUYỂN ĐỔI DỮ LIỆU THEO PHIÊN BẢN
 *
 * Mỗi lần cấu trúc dữ liệu đổi, mã nguồn mới không đọc được bản ghi cũ nữa.
 * Sửa tay trên máy mình thì chỉ máy mình chạy được: người khác kéo mã về, mở
 * lên là hỏng. Nên mọi thay đổi cấu trúc đều viết thành một "bước" ở đây và
 * máy chủ tự chạy lúc khởi động, trước khi nhận yêu cầu đầu tiên.
 *
 * Bước nào đã chạy thì được ghi tên vào collection `phien_ban_du_lieu`, lần
 * khởi động sau bỏ qua. Vì vậy chạy bao nhiêu lần cũng không sao, và máy mới
 * chỉ cần `git pull` rồi `npm start` là dữ liệu tự khớp với mã nguồn.
 *
 * Thêm bước mới: viết thêm một phần tử vào mảng CAC_BUOC bên dưới, đặt `ma`
 * chưa từng dùng. Không bao giờ sửa nội dung một bước đã phát hành — máy đã
 * chạy bước đó rồi sẽ không chạy lại.
 * ============================================================================
 */

const mongoose = require('mongoose');

const TEN_COLLECTION_MOC = 'phien_ban_du_lieu';

/**
 * Chặn một con số về khoảng 0–100 và làm tròn.
 * Dùng cho các điểm trung bình thuật toán trong bảng thống kê.
 */
function chanTramPhanTram(so) {
    return Math.round(Math.min(100, Math.max(0, Number(so) || 0)));
}

/**
 * Dựng bảng tra mã tài khoản -> mã sinh viên từ toàn bộ hồ sơ sinh viên.
 */
async function bangMaSinhVien(db) {
    const ds = await db.collection('sinh_vien').find({}).toArray();

    const bang = new Map();
    for (const sv of ds) bang.set(sv.id_nguoi_dung, sv.id_sinh_vien);

    return bang;
}


// ============================================================================
// DANH SÁCH CÁC BƯỚC
// ============================================================================

const CAC_BUOC = [

    {
        ma: '2026-09-22-mot-ma-duy-nhat-cho-ho-so',
        mo_ta: 'Bỏ ma_sinh_vien / ma_giang_vien, giữ lại một mã duy nhất là '
            + 'id_sinh_vien / id_giang_vien',

        async chay(db, ghiLog) {
            const dsSinhVien = await db.collection('sinh_vien').find({}).toArray();

            for (const sv of dsSinhVien) {
                const maKhai = String(sv.ma_sinh_vien || '').trim();

                // Người dùng từng khai mã thật vào ô riêng thì mã ấy mới là mã
                // chính thức; mã SV001 do hệ thống đặt chỉ là tạm.
                if (!maKhai || maKhai === sv.id_sinh_vien) continue;

                const daCoNguoiKhac = dsSinhVien.find(
                    x => x.id_sinh_vien === maKhai
                        && String(x._id) !== String(sv._id));

                if (daCoNguoiKhac) {
                    ghiLog(`Giữ nguyên ${sv.id_sinh_vien}: mã "${maKhai}" đã `
                        + `thuộc về ${daCoNguoiKhac.ho_ten}.`);
                    continue;
                }

                ghiLog(`Sinh viên ${sv.id_sinh_vien} -> ${maKhai} (${sv.ho_ten})`);

                await db.collection('sinh_vien').updateOne(
                    { _id: sv._id }, { $set: { id_sinh_vien: maKhai } });

                await db.collection('chi_tiet_nop_bai').updateMany(
                    { id_sinh_vien: sv.id_sinh_vien },
                    { $set: { id_sinh_vien: maKhai } });

                await db.collection('thong_ke').updateMany(
                    { id_sinh_vien: sv.id_sinh_vien },
                    { $set: { id_sinh_vien: maKhai } });
            }

            const dsGiangVien = await db.collection('giang_vien').find({}).toArray();

            for (const gv of dsGiangVien) {
                const maKhai = String(gv.ma_giang_vien || '').trim();
                if (!maKhai || maKhai === gv.id_giang_vien) continue;

                const daCoNguoiKhac = dsGiangVien.find(
                    x => x.id_giang_vien === maKhai
                        && String(x._id) !== String(gv._id));

                if (daCoNguoiKhac) continue;

                ghiLog(`Giảng viên ${gv.id_giang_vien} -> ${maKhai} (${gv.ho_ten})`);

                await db.collection('giang_vien').updateOne(
                    { _id: gv._id }, { $set: { id_giang_vien: maKhai } });

                await db.collection('ket_qua_kiem_tra').updateMany(
                    { id_giang_vien: gv.id_giang_vien },
                    { $set: { id_giang_vien: maKhai } });
            }

            const a = await db.collection('sinh_vien').updateMany(
                {}, { $unset: { ma_sinh_vien: '' } });

            const b = await db.collection('giang_vien').updateMany(
                {}, { $unset: { ma_giang_vien: '' } });

            ghiLog(`Đã bỏ trường mã phụ ở ${a.modifiedCount} hồ sơ sinh viên `
                + `và ${b.modifiedCount} hồ sơ giảng viên.`);
        }
    },

    {
        ma: '2026-09-22-thanh-vien-lop-theo-ma-sinh-vien',
        mo_ta: 'lop_hoc.danh_sach_thanh_vien chuyển từ id_nguoi_dung sang '
            + 'id_sinh_vien',

        async chay(db, ghiLog) {
            const bang = await bangMaSinhVien(db);
            const dsLop = await db.collection('lop_hoc').find({}).toArray();

            let soLopDaSua = 0;
            let soNguoiThieuMa = 0;

            for (const lop of dsLop) {
                const thanhVien = lop.danh_sach_thanh_vien || [];
                if (!thanhVien.length) continue;

                const moi = thanhVien.map(tv => {
                    const ma = tv.id_sinh_vien || bang.get(tv.id_nguoi_dung) || '';
                    if (!ma) soNguoiThieuMa++;

                    return {
                        id_sinh_vien: ma,
                        ho_ten: tv.ho_ten || '',
                        email: tv.email || ''
                    };
                });

                await db.collection('lop_hoc').updateOne(
                    { _id: lop._id },
                    { $set: { danh_sach_thanh_vien: moi } });

                soLopDaSua++;
            }

            ghiLog(`Đã chuyển danh sách thành viên của ${soLopDaSua} lớp.`
                + (soNguoiThieuMa
                    ? ` ${soNguoiThieuMa} người chưa có hồ sơ sinh viên nên để `
                    + `trống mã — họ sẽ được điền khi đăng nhập lại.`
                    : ''));
        }
    },

    {
        ma: '2026-09-22-danh-sach-nop-bai-theo-ma-sinh-vien',
        mo_ta: 'bai_tap.danh_sach_nop_bai: bỏ ma_sinh_vien, đổi danh_sach_tep '
            + 'thành ten_tep, điền lại trạng thái nộp theo chi_tiet_nop_bai',

        async chay(db, ghiLog) {
            const bang = await bangMaSinhVien(db);

            const dsBaiTap = await db.collection('bai_tap').find({}).toArray();
            const dsLop = await db.collection('lop_hoc').find({}).toArray();
            const dsNopBai = await db.collection('chi_tiet_nop_bai')
                .find({}).toArray();
            const dsBaoCao = await db.collection('bao_cao')
                .find({}, { projection: { id_bao_cao: 1, tep_tin: 1, tieu_de: 1 } })
                .toArray();

            const lopTheoId = new Map(dsLop.map(l => [l.id_lop_hoc, l]));

            const tenTepTheoBaoCao = new Map(
                dsBaoCao.map(bc => [
                    bc.id_bao_cao,
                    bc.tep_tin
                        ? String(bc.tep_tin).split(/[\\/]/).pop()
                        : (bc.tieu_de || '')
                ]));

            let tongDaNop = 0;

            for (const bt of dsBaiTap) {
                const danhSachCu = bt.danh_sach_nop_bai || [];
                if (!danhSachCu.length) continue;

                // Dựng lại từ danh sách thành viên của lớp chứ không chắp vá
                // danh sách cũ.
                //
                // Bản ghi cũ để trống cả id_sinh_vien lẫn ma_sinh_vien, chỉ còn
                // mỗi họ tên, nên không tra ngược ra được ai là ai. Trong khi
                // danh sách nộp bài đúng ra chính là danh sách thành viên lớp
                // (trừ chủ lớp) — thứ vừa được điền đủ mã sinh viên ở bước
                // trước. Lấy thẳng từ đó vừa đúng vừa không phải đoán.
                const lop = lopTheoId.get(bt.id_lop_hoc);

                const maChuLop = lop ? (bang.get(lop.id_nguoi_dung) || '') : '';

                const thanhVien = (lop && lop.danh_sach_thanh_vien) || [];

                // Lớp không tra ra được thì giữ nguyên danh sách cũ, chỉ đổi tên
                // trường — thà thiếu mã còn hơn xoá mất tên người.
                const nguon = thanhVien.length
                    ? thanhVien.filter(tv => !maChuLop || tv.id_sinh_vien !== maChuLop)
                    : danhSachCu;

                const daNopCuaBai = dsNopBai.filter(
                    n => String(n.id_bai_tap) === String(bt.id_bai_tap));

                // Giữ lại trạng thái cũ theo họ tên, phòng khi có bài đã nộp mà
                // chi_tiet_nop_bai không còn bản ghi
                const cuTheoTen = new Map(
                    danhSachCu.map(t => [t.ho_ten, t]));

                const moi = nguon.map(tv => {
                    const ma = tv.id_sinh_vien || '';
                    const cu = cuTheoTen.get(tv.ho_ten) || {};

                    const banNop = ma
                        ? daNopCuaBai.find(
                            n => String(n.id_sinh_vien) === String(ma))
                        : null;

                    if (banNop) tongDaNop++;

                    return {
                        id_sinh_vien: ma,
                        ho_ten: tv.ho_ten || '',
                        trang_thai_nop: banNop
                            ? 'Đã nộp'
                            : (cu.trang_thai_nop === 'Đã nộp' ? 'Đã nộp' : 'Chưa nộp'),
                        thoi_gian_nop: banNop
                            ? (banNop.ngay_nop || null)
                            : (cu.thoi_gian_nop || null),
                        ten_tep: banNop
                            ? (tenTepTheoBaoCao.get(banNop.id_bao_cao)
                                || banNop.tieu_de_tep || '')
                            : '',
                        id_bao_cao: banNop ? (banNop.id_bao_cao || '') : ''
                    };
                });

                await db.collection('bai_tap').updateOne(
                    { _id: bt._id },
                    { $set: { danh_sach_nop_bai: moi } });
            }

            ghiLog(`Đã dựng lại danh sách nộp bài của ${dsBaiTap.length} bài tập, `
                + `điền đúng ${tongDaNop} lượt đã nộp.`);
        }
    },

    {
        ma: '2026-09-22-doi-ten-diem-thuat-toan-trong-thong-ke',
        mo_ta: 'thong_ke_theo_mau: cosine_trung_binh -> cosine (và tương tự), '
            + 'bỏ tong_hop_trung_binh, thêm so_doan_chap_va, chặn trần 100',

        async chay(db, ghiLog) {
            const dsThongKe = await db.collection('thong_ke').find({}).toArray();

            let soBanGhi = 0;
            let soMucVuotTran = 0;

            for (const tk of dsThongKe) {
                const theoMau = tk.thong_ke_theo_mau || [];
                if (!theoMau.length) continue;

                const moi = theoMau.map(m => {
                    const cosine = m.cosine !== undefined
                        ? m.cosine : m.cosine_trung_binh;
                    const jaccard = m.jaccard !== undefined
                        ? m.jaccard : m.jaccard_trung_binh;
                    const winnowing = m.winnowing !== undefined
                        ? m.winnowing : m.winnowing_trung_binh;

                    if (Number(cosine) > 100 || Number(jaccard) > 100
                        || Number(winnowing) > 100) {
                        soMucVuotTran++;
                    }

                    return {
                        id_bao_cao: m.id_bao_cao,
                        ten_bao_cao: m.ten_bao_cao || '',
                        so_cau_trung: m.so_cau_trung || 0,
                        so_tu_trung: m.so_tu_trung || 0,
                        so_doan_trung: m.so_doan_trung || 0,
                        so_doan_chap_va: m.so_doan_chap_va || 0,
                        ti_le_trung_lap: m.ti_le_trung_lap || 0,
                        cosine: chanTramPhanTram(cosine),
                        jaccard: chanTramPhanTram(jaccard),
                        winnowing: chanTramPhanTram(winnowing)
                    };
                });

                await db.collection('thong_ke').updateOne(
                    { _id: tk._id },
                    { $set: { thong_ke_theo_mau: moi } });

                soBanGhi++;
            }

            ghiLog(`Đã đổi tên trường trong ${soBanGhi} bản ghi thống kê. `
                + `${soMucVuotTran} mục từng vượt 100% đã được chặn trần — `
                + `những bài đó nên chạy kiểm tra lại để có số chính xác.`);
        }
    },

    {
        ma: '2026-09-22-don-ket-qua-cham-chong-lap',
        mo_ta: 'Xoá kết quả của những lượt chấm cũ còn sót, chỉ giữ lượt mới nhất '
            + 'của mỗi báo cáo',

        async chay(db, ghiLog) {
            // Một báo cáo chấm lại nhiều lần thì trước đây mỗi lượt để lại một
            // bộ dữ liệu riêng mang mã kiểm tra khác nhau. Bảng thống kê đọc
            // theo mã kiểm tra mới nhất còn chi tiết câu trùng đọc theo mã báo
            // cáo, nên hai bên trỏ vào hai lượt khác nhau: màn hình chi tiết
            // liệt kê đủ nguồn nhưng bấm vào không có gì. Giữ lại đúng lượt
            // mới nhất để hai bên nói về cùng một lần chấm.
            const CAC_BANG = [
                'thong_ke',
                'chi_tiet_cau_trung',
                'chi_tiet_doan_trung',
                'chi_tiet_doan_chap_va',
                'chi_tiet_cau_trung_highlight',
                'ket_qua_kiem_tra'
            ];

            // Lượt chấm mới nhất của mỗi báo cáo, lấy theo bảng thống kê
            const moiNhat = await db.collection('thong_ke').aggregate([
                { $sort: { _id: -1 } },
                { $group: { _id: '$id_bao_cao', id_kiem_tra: { $first: '$id_kiem_tra' } } }
            ]).toArray();

            const giuLai = new Map(
                moiNhat.map(x => [x._id, x.id_kiem_tra]));

            let tongXoa = 0;
            let soBaoCao = 0;

            for (const [idBaoCao, idKiemTra] of giuLai) {
                if (!idKiemTra) continue;

                let xoaCuaBaiNay = 0;

                for (const ten of CAC_BANG) {
                    const r = await db.collection(ten).deleteMany({
                        id_bao_cao: idBaoCao,
                        id_kiem_tra: { $exists: true, $ne: idKiemTra }
                    });

                    xoaCuaBaiNay += r.deletedCount || 0;
                }

                if (xoaCuaBaiNay > 0) {
                    soBaoCao++;
                    tongXoa += xoaCuaBaiNay;
                }
            }

            // Báo cáo chấm hỏng giữa chừng thì không có bản ghi thống kê nào,
            // nên vòng trên bỏ qua, trong khi bảng kết quả vẫn còn mấy bản ghi
            // của những lần thử. Dọn riêng cho nhóm này, giữ bản mới nhất.
            const ketQuaLe = await db.collection('ket_qua_kiem_tra').aggregate([
                { $group: { _id: '$id_bao_cao', ids: { $push: '$_id' }, n: { $sum: 1 } } },
                { $match: { n: { $gt: 1 } } }
            ]).toArray();

            for (const nhom of ketQuaLe) {
                if (giuLai.has(nhom._id)) continue;

                const ids = nhom.ids.slice().sort();
                ids.pop();

                const r = await db.collection('ket_qua_kiem_tra')
                    .deleteMany({ _id: { $in: ids } });

                tongXoa += r.deletedCount || 0;
                if (r.deletedCount) soBaoCao++;
            }

            ghiLog(tongXoa
                ? `Đã xoá ${tongXoa} bản ghi thừa của ${soBaoCao} báo cáo từng `
                + `được chấm nhiều lần.`
                : 'Không có kết quả chấm chồng lấn nào.');
        }
    },

    {
        ma: '2026-09-22-don-chi-so-cau-cong-don',
        mo_ta: 'Xoá chỉ số câu bị chèn trùng qua nhiều lần chấm, chỉ giữ mỗi vị '
            + 'trí câu một bản',

        async chay(db, ghiLog) {
            // Mỗi lượt chấm trước đây chèn thêm một bộ chỉ số câu mới mà không
            // xoá bộ cũ, nên một bài 402 câu chấm bốn lần thành 1716 dòng.
            // Thuật toán lấy tổng số câu từ bảng này để tính tỉ lệ trùng của cả
            // bài, nên mẫu số phình ra và kết quả sai hẳn.
            const trung = await db.collection('chi_so_cau').aggregate([
                {
                    $group: {
                        _id: { bc: '$id_bao_cao', vt: '$sentenceIndex' },
                        ids: { $push: '$_id' },
                        n: { $sum: 1 }
                    }
                },
                { $match: { n: { $gt: 1 } } }
            ], { allowDiskUse: true }).toArray();

            if (!trung.length) {
                ghiLog('Không có chỉ số câu nào bị chèn trùng.');
                return;
            }

            // Giữ bản ghi mới nhất của mỗi vị trí câu, xoá phần còn lại
            const canXoa = [];

            for (const nhom of trung) {
                const ids = nhom.ids.slice().sort();
                ids.pop();
                canXoa.push(...ids);
            }

            let daXoa = 0;

            for (let i = 0; i < canXoa.length; i += 5000) {
                const r = await db.collection('chi_so_cau').deleteMany({
                    _id: { $in: canXoa.slice(i, i + 5000) }
                });
                daXoa += r.deletedCount || 0;
            }

            const soBaoCao = new Set(trung.map(t => t._id.bc)).size;

            ghiLog(`Đã xoá ${daXoa} chỉ số câu bị chèn trùng ở ${soBaoCao} báo `
                + `cáo. Những bài đó nên chấm lại để tỉ lệ trùng tính đúng.`);
        }
    },

    {
        ma: '2026-09-23-bo-so-lan-kiem-tra-cua-giang-vien',
        mo_ta: 'giang_vien: bỏ hẳn trường so_lan_kiem_tra — không nơi nào đọc, '
            + 'cũng không nơi nào cộng thêm, chỉ nằm đó mãi ở 0',

        async chay(db, ghiLog) {
            const ketQua = await db.collection('giang_vien').updateMany(
                { so_lan_kiem_tra: { $exists: true } },
                { $unset: { so_lan_kiem_tra: '' } }
            );

            ghiLog(`Đã bỏ trường so_lan_kiem_tra khỏi `
                + `${ketQua.modifiedCount} hồ sơ giảng viên.`);
        }
    }
];


// ============================================================================
// BỘ CHẠY
// ============================================================================

/**
 * Chạy những bước chuyển đổi chưa từng chạy trên cơ sở dữ liệu đang kết nối.
 *
 * @param {Object} tuyChon
 * @param {boolean} tuyChon.im  true thì chỉ in khi thật sự có việc phải làm
 * @returns {Promise<string[]>} Mã các bước vừa chạy trong lượt này
 */
async function chayChuyenDoi({ im = false } = {}) {
    const db = mongoose.connection.db;

    if (!db) {
        throw new Error('Chưa kết nối cơ sở dữ liệu nên không chuyển đổi được.');
    }

    const moc = db.collection(TEN_COLLECTION_MOC);

    const daChay = new Set(
        (await moc.find({}).toArray()).map(x => x.ma));

    const canChay = CAC_BUOC.filter(b => !daChay.has(b.ma));

    if (!canChay.length) {
        if (!im) console.log('🗃️  Dữ liệu đã khớp với mã nguồn, không phải chuyển đổi.');
        return [];
    }

    console.log(`🗃️  Có ${canChay.length} bước chuyển đổi dữ liệu cần chạy.`);

    const daXong = [];

    for (const buoc of canChay) {
        console.log(`   → ${buoc.mo_ta}`);

        const ghiLog = noiDung => console.log(`      ${noiDung}`);

        try {
            await buoc.chay(db, ghiLog);

            await moc.insertOne({
                ma: buoc.ma,
                mo_ta: buoc.mo_ta,
                chay_luc: new Date()
            });

            daXong.push(buoc.ma);

        } catch (e) {
            // Không đánh dấu đã chạy khi bước bị lỗi, để lần khởi động sau còn
            // thử lại. Nhưng cũng không chặn máy chủ khởi động: phần lớn màn
            // hình vẫn dùng được, và người quản trị cần thấy được lỗi này.
            console.error(`      ✖ Bước "${buoc.ma}" lỗi: ${e.message}`);
            break;
        }
    }

    return daXong;
}

module.exports = { chayChuyenDoi, CAC_BUOC, TEN_COLLECTION_MOC };
