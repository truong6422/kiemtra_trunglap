/**
 * ============================================================================
 * BỔ SUNG BÁO CÁO MẪU — khu cuối trang Quản lý tài liệu, chỉ quản trị viên
 *
 * Quản trị viên gom báo cáo vào "danh sách chờ" (tệp từ máy tính, cả thư mục,
 * hoặc báo cáo người dùng đã kiểm tra), xem lại rồi bấm Thêm: máy chủ lưu
 * thẳng vào bao_cao với mau_kiem_tra = true. Nút Tính toán chỉ tiền xử lý và
 * lập chỉ số cho những báo cáo mẫu mới đó.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    const vaiTro = (localStorage.getItem('vai_tro') || localStorage.getItem('userRole') || '').trim();
    const khu = document.getElementById('khuMauBoSung');
    if (!khu || !['quan_tri_vien', 'admin'].includes(vaiTro)) return;
    khu.hidden = false;

    const API = `${window.API}/api/mau-bo-sung`;
    const HEADER = { 'x-id-nguoi-dung': localStorage.getItem('id_nguoi_dung') || localStorage.getItem('userId') || '' };
    const $ = id => document.getElementById(id);
    const thoat = s => String(s ?? '').replace(/[&<>"]/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const ngay = d => (d ? new Date(d).toLocaleString('vi-VN') : '--');
    const bao = (m, t) => (window.thongBao ? thongBao(m, t) : alert(m));
    // Tệp kéo thả không có webkitRelativePath nên đường dẫn lưu riêng ở duongDanTha
    const duongDanTep = f => f.webkitRelativePath || f.duongDanTha || f.name;

    async function goi(duongDan, tuyChon = {}) {
        const res = await fetch(API + duongDan, { ...tuyChon, headers: { ...HEADER, ...(tuyChon.headers || {}) } });
        const kq = await res.json().catch(() => ({}));
        if (!res.ok || kq.success === false) throw new Error(kq.message || `Máy chủ trả về ${res.status}`);
        return kq;
    }

    // Danh sách chờ: { loai: 'tep', tep: File } | { loai: 'bao_cao', ma, tieu_de }
    let dsCho = [];
    let dsBaoCao = [];

    // ------------------------------------------------------------ danh sách chờ
    function veDsCho() {
        $('mbsSoCho').textContent = dsCho.length;
        $('mbsBangCho').innerHTML = dsCho.length ? dsCho.map((x, i) => `<tr>
                <td>${thoat(x.loai === 'tep' ? duongDanTep(x.tep) : x.tieu_de)}</td>
                <td>${x.loai === 'tep' ? 'Tệp trên máy tính' : 'Báo cáo đã kiểm tra ' + thoat(x.ma)}</td>
                <td><button class="mbs-xoa" data-bo="${i}" title="Bỏ khỏi danh sách"><i class="fa-solid fa-xmark"></i></button></td>
            </tr>`).join('')
            : '<tr><td colspan="3" class="mbs-trong">Chưa chọn báo cáo nào</td></tr>';
    }

    /** Thêm tệp vào danh sách chờ, trả về số tệp thực sự được thêm. */
    function themTep(cacTep) {
        const hopLe = [...cacTep].filter(f => /\.(docx|pdf)$/i.test(f.name) && !f.name.startsWith('~$'));
        let soMoi = 0;
        for (const f of hopLe) {
            const khoa = duongDanTep(f) + f.size;
            if (!dsCho.some(x => x.loai === 'tep' && duongDanTep(x.tep) + x.tep.size === khoa)) {
                dsCho.push({ loai: 'tep', tep: f });
                soMoi++;
            }
        }
        if (cacTep.length && !hopLe.length) bao('Chỉ nhận tệp .docx hoặc .pdf.');
        veDsCho();
        return soMoi;
    }

    /** Đọc hết một mục kéo thả (tệp hoặc thư mục, kể cả thư mục con). */
    async function docMuc(muc, ketQua) {
        if (muc.isFile) {
            const f = await new Promise((ok, loi) => muc.file(ok, loi));
            f.duongDanTha = muc.fullPath.replace(/^\//, '');
            ketQua.push(f);
            return;
        }
        if (!muc.isDirectory) return;
        const docTep = muc.createReader();
        // readEntries trả từng đợt (tối đa 100 mục), phải gọi tới khi rỗng mới đủ
        for (;;) {
            const dot = await new Promise((ok, loi) => docTep.readEntries(ok, loi));
            if (!dot.length) break;
            for (const con of dot) await docMuc(con, ketQua);
        }
    }

    /**
     * Form "Chọn cả thư mục" giữa màn hình, cùng kiểu hộp Thông báo hệ thống.
     *
     * Hộp "Upload N files to this site?" là của trình duyệt (Chrome/Edge luôn
     * hỏi khi chọn thư mục bằng hộp chọn tệp), trang web không đổi được giao
     * diện hay vị trí của nó. Kéo thả thư mục vào form này thì không đi qua hộp
     * chọn tệp nên trình duyệt không hỏi nữa.
     */
    function moFormThuMuc() {
        const vung = document.createElement('div');
        vung.className = 'mbs-vung-tha';
        vung.innerHTML = `<i class="fa-solid fa-folder-open"></i>
            <b>Kéo thả thư mục vào đây</b>
            <span>Nhận tệp .docx, .pdf, gồm cả thư mục con</span>`;

        moHopThoai({
            tieuDe: 'Thêm cả thư mục',
            noiDung: 'Kéo thả thư mục vào khung dưới, hoặc bấm "Chọn thư mục" để mở hộp chọn của máy.',
            phanTu: vung,
            nutChinh: 'Chọn thư mục',
            nutPhu: 'Huỷ',
            khiMo(dong) {
                // Nhận thả trên cả lớp nền, lỡ tay thả lệch khung cũng không
                // bị trình duyệt mở tệp ra tab mới
                const nen = vung.closest('.ht-nen');
                nen.ondragover = e => { e.preventDefault(); vung.classList.add('dang-keo'); };
                nen.ondragleave = e => { if (!nen.contains(e.relatedTarget)) vung.classList.remove('dang-keo'); };
                nen.ondrop = async e => {
                    e.preventDefault();
                    vung.classList.remove('dang-keo');
                    // Lấy hết mục ngay: sau lần await đầu trình duyệt xoá dataTransfer
                    const cacMuc = [...e.dataTransfer.items]
                        .map(it => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
                    const cacTep = [];
                    if (cacMuc.length) {
                        for (const m of cacMuc) await docMuc(m, cacTep);
                    } else {
                        cacTep.push(...e.dataTransfer.files);
                    }
                    dong(false);
                    const soMoi = themTep(cacTep);
                    if (soMoi) bao(`Đã thêm ${soMoi} tệp vào danh sách chờ.`);
                };
            }
        }).then(chon => { if (chon) $('mbsThuMuc').click(); });
    }

    $('mbsNutTep').onclick = () => $('mbsTep').click();
    $('mbsNutThuMuc').onclick = moFormThuMuc;
    $('mbsTep').onchange = e => { themTep(e.target.files); e.target.value = ''; };
    $('mbsThuMuc').onchange = e => { themTep(e.target.files); e.target.value = ''; };
    $('mbsBangCho').onclick = e => {
        const nut = e.target.closest('[data-bo]');
        if (!nut) return;
        dsCho.splice(Number(nut.dataset.bo), 1);
        veDsCho();
        veBaoCao();
    };

    // ------------------------------------------------- báo cáo đã kiểm tra
    /** Thoát HTML rồi tô vàng chỗ khớp từ khoá (thoát từng đoạn, không thoát xong mới tô). */
    function toTuKhoa(chuoi, tu) {
        const goc = String(chuoi ?? '');
        if (!tu) return thoat(goc);
        const thuong = goc.toLowerCase();
        let kq = '', dau = 0, vt;
        while ((vt = thuong.indexOf(tu, dau)) !== -1) {
            kq += thoat(goc.slice(dau, vt)) + `<span class="mbs-to">${thoat(goc.slice(vt, vt + tu.length))}</span>`;
            dau = vt + tu.length;
        }
        return kq + thoat(goc.slice(dau));
    }

    // Tìm theo ID, tiêu đề và ngày tải lên — giống ô tìm ở hộp "Gửi tài liệu"
    function veBaoCao() {
        const tu = $('mbsTim').value.trim().toLowerCase();
        const daChon = new Set(dsCho.filter(x => x.loai === 'bao_cao').map(x => x.ma));
        const ds = dsBaoCao.filter(b => !tu || [b.id_bao_cao, b.tieu_de, ngay(b.ngay_tai_len)]
            .some(x => String(x ?? '').toLowerCase().includes(tu)));

        $('mbsBangBaoCao').innerHTML = ds.length ? ds.map(b => {
            const khoa = b.da_lay_lam_mau || !b.con_tep;
            const ghiChu = b.da_lay_lam_mau ? ' (đã là mẫu)' : (!b.con_tep ? ' (mất tệp gốc)' : '');
            return `<tr>
                <td><input type="checkbox" data-ma="${thoat(b.id_bao_cao)}" ${daChon.has(b.id_bao_cao) ? 'checked' : ''} ${khoa ? 'disabled' : ''}></td>
                <td>${toTuKhoa(b.id_bao_cao, tu)}</td>
                <td>${toTuKhoa(b.tieu_de, tu)}${ghiChu}</td>
                <td>${b.ti_le_trung_lap === null ? '--' : thoat(b.ti_le_trung_lap) + '%'}</td>
                <td>${toTuKhoa(ngay(b.ngay_tai_len), tu)}</td>
            </tr>`;
        }).join('') : '<tr><td colspan="5" class="mbs-trong">Không có báo cáo phù hợp</td></tr>';
    }

    $('mbsNutBaoCao').onclick = async () => {
        const khuBc = $('mbsKhuBaoCao');
        khuBc.hidden = !khuBc.hidden;
        if (khuBc.hidden) return;
        $('mbsBangBaoCao').innerHTML = '<tr><td colspan="5" class="mbs-trong">Đang tải...</td></tr>';
        try {
            dsBaoCao = (await goi('/bao-cao-da-kiem-tra')).data;
            veBaoCao();
        } catch (e) {
            bao(`Không tải được danh sách báo cáo: ${e.message}`);
        }
    };
    $('mbsTim').oninput = veBaoCao;
    $('mbsTim').onkeyup = e => { if (e.key === 'Enter') veBaoCao(); };
    $('mbsNutTim').onclick = veBaoCao;
    $('mbsBangBaoCao').onchange = e => {
        const o = e.target.closest('[data-ma]');
        if (!o) return;
        const ma = o.dataset.ma;
        dsCho = dsCho.filter(x => !(x.loai === 'bao_cao' && x.ma === ma));
        if (o.checked) {
            const b = dsBaoCao.find(x => x.id_bao_cao === ma);
            dsCho.push({ loai: 'bao_cao', ma, tieu_de: b ? b.tieu_de : ma });
        }
        veDsCho();
    };

    // ------------------------------------------------------------- thêm mẫu
    $('mbsNutThem').onclick = async () => {
        const loai = $('mbsLoai').value.trim();
        if (!loai) return bao('Hãy nhập hoặc chọn loại báo cáo mẫu (VD: DATN_KS).');
        if (!dsCho.length) return bao('Danh sách chờ đang trống.');

        const fd = new FormData();
        fd.append('loai_bao_cao', loai);
        dsCho.filter(x => x.loai === 'tep').forEach(x => fd.append('tep', x.tep, x.tep.name));
        fd.append('ds_bao_cao', JSON.stringify(dsCho.filter(x => x.loai === 'bao_cao').map(x => x.ma)));

        const nut = $('mbsNutThem');
        nut.disabled = true;
        try {
            const kq = await goi('/', { method: 'POST', body: fd });
            dsCho = [];
            veDsCho();
            await taiDaThem();
            if (!$('mbsKhuBaoCao').hidden) { dsBaoCao = (await goi('/bao-cao-da-kiem-tra')).data; veBaoCao(); }
            bao(kq.message + (kq.loi && kq.loi.length ? '\nKhông thêm được: ' + kq.loi.join('; ') : ''));
        } catch (e) {
            bao(`Không thêm được: ${e.message}`);
        } finally {
            nut.disabled = false;
        }
    };

    // ---------------------------------------------- báo cáo mẫu đã bổ sung
    async function taiDaThem() {
        try {
            const ds = (await goi('/')).data;
            $('mbsBangDaThem').innerHTML = ds.length ? ds.map(b => `<tr>
                    <td>${thoat(b.id_bao_cao)}</td>
                    <td>${thoat(b.tieu_de)}</td>
                    <td>${thoat(b.loai_bao_cao)}</td>
                    <td>${b.nguon_bo_sung === 'tep_may_tinh' ? 'Tệp trên máy tính' : thoat(b.nguon_bo_sung)}</td>
                    <td>${ngay(b.ngay_tai_len)}</td>
                    <td>${b.da_tinh_toan
                        ? `<span class="mbs-nhan mbs-nhan--xong">Đã tính toán · ${b.so_cau} câu</span>`
                        : '<span class="mbs-nhan mbs-nhan--cho">Chưa tính toán</span>'}</td>
                    <td><button class="mbs-xoa" data-go="${thoat(b.id_bao_cao)}" title="Gỡ khỏi dữ liệu mẫu"><i class="fa-solid fa-trash"></i></button></td>
                </tr>`).join('')
                : '<tr><td colspan="7" class="mbs-trong">Chưa bổ sung báo cáo mẫu nào</td></tr>';
        } catch (e) {
            $('mbsBangDaThem').innerHTML = `<tr><td colspan="7" class="mbs-trong">${thoat(e.message)}</td></tr>`;
        }
    }

    $('mbsBangDaThem').onclick = async e => {
        const nut = e.target.closest('[data-go]');
        if (!nut) return;
        const dongY = window.xacNhan
            ? await xacNhan(`Gỡ ${nut.dataset.go} khỏi dữ liệu mẫu? Tệp và chỉ số câu của báo cáo này sẽ bị xoá.`)
            : confirm(`Gỡ ${nut.dataset.go} khỏi dữ liệu mẫu?`);
        if (!dongY) return;
        try {
            bao((await goi('/' + encodeURIComponent(nut.dataset.go), { method: 'DELETE' })).message);
            taiDaThem();
        } catch (err) {
            bao(`Không gỡ được: ${err.message}`);
        }
    };

    // --------------------------------------------------------------- tính toán
    function hienTienDo(tv) {
        const o = $('mbsTienDo');
        if (tv.dang_chay) {
            const t = tv.tien_do;
            o.textContent = t ? `${t.buoc}: ${t.hien_tai}/${t.tong} (${t.id_bao_cao})...` : 'Đang bắt đầu...';
        } else if (tv.loi) {
            o.textContent = `Lỗi: ${tv.loi}`;
        } else if (tv.ket_qua) {
            const ds = tv.ket_qua.ket_qua;
            const loi = ds.filter(x => x.loi);
            o.textContent = `Xong: ${ds.length - loi.length}/${ds.length} báo cáo, thêm ${tv.ket_qua.so_tu_moi} từ mới vào IDF.`
                + (loi.length ? ' Lỗi: ' + loi.map(x => `${x.id_bao_cao} (${x.loi})`).join('; ') : '');
        }
        $('mbsNutTinhToan').disabled = !!tv.dang_chay;
    }

    async function theoDoi() {
        const tv = (await goi('/tinh-toan')).data;
        hienTienDo(tv);
        if (tv.dang_chay) setTimeout(() => theoDoi().catch(() => {}), 1500);
        else taiDaThem();
    }

    $('mbsNutTinhToan').onclick = async () => {
        try {
            const kq = await goi('/tinh-toan', { method: 'POST' });
            hienTienDo(kq.data);
            theoDoi();
        } catch (e) {
            bao(e.message);
        }
    };

    // ------------------------------------------------------------- khởi tạo
    goi('/loai').then(kq => {
        $('mbsDsLoai').innerHTML = kq.data.map(l => `<option value="${thoat(l)}">`).join('');
    }).catch(() => {});
    veDsCho();
    taiDaThem();
    theoDoi().catch(() => {});
});
