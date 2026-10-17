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

    const API = 'http://localhost:5000/api/mau-bo-sung';
    const HEADER = { 'x-id-nguoi-dung': localStorage.getItem('id_nguoi_dung') || localStorage.getItem('userId') || '' };
    const $ = id => document.getElementById(id);
    const thoat = s => String(s ?? '').replace(/[&<>"]/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const ngay = d => (d ? new Date(d).toLocaleString('vi-VN') : '--');
    const bao = (m, t) => (window.thongBao ? thongBao(m, t) : alert(m));

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
                <td>${thoat(x.loai === 'tep' ? (x.tep.webkitRelativePath || x.tep.name) : x.tieu_de)}</td>
                <td>${x.loai === 'tep' ? 'Tệp trên máy tính' : 'Báo cáo đã kiểm tra ' + thoat(x.ma)}</td>
                <td><button class="mbs-xoa" data-bo="${i}" title="Bỏ khỏi danh sách"><i class="fa-solid fa-xmark"></i></button></td>
            </tr>`).join('')
            : '<tr><td colspan="3" class="mbs-trong">Chưa chọn báo cáo nào</td></tr>';
    }

    function themTep(cacTep) {
        const hopLe = [...cacTep].filter(f => /\.(docx|pdf)$/i.test(f.name) && !f.name.startsWith('~$'));
        for (const f of hopLe) {
            const khoa = (f.webkitRelativePath || f.name) + f.size;
            if (!dsCho.some(x => x.loai === 'tep' && (x.tep.webkitRelativePath || x.tep.name) + x.tep.size === khoa)) {
                dsCho.push({ loai: 'tep', tep: f });
            }
        }
        if (cacTep.length && !hopLe.length) bao('Chỉ nhận tệp .docx hoặc .pdf.');
        veDsCho();
    }

    $('mbsNutTep').onclick = () => $('mbsTep').click();
    $('mbsNutThuMuc').onclick = () => $('mbsThuMuc').click();
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
    function veBaoCao() {
        const tu = $('mbsTim').value.trim().toLowerCase();
        const daChon = new Set(dsCho.filter(x => x.loai === 'bao_cao').map(x => x.ma));
        const ds = dsBaoCao.filter(b => !tu || `${b.id_bao_cao} ${b.tieu_de}`.toLowerCase().includes(tu));

        $('mbsBangBaoCao').innerHTML = ds.length ? ds.map(b => {
            const khoa = b.da_lay_lam_mau || !b.con_tep;
            const ghiChu = b.da_lay_lam_mau ? ' (đã là mẫu)' : (!b.con_tep ? ' (mất tệp gốc)' : '');
            return `<tr>
                <td><input type="checkbox" data-ma="${thoat(b.id_bao_cao)}" ${daChon.has(b.id_bao_cao) ? 'checked' : ''} ${khoa ? 'disabled' : ''}></td>
                <td>${thoat(b.id_bao_cao)}</td>
                <td>${thoat(b.tieu_de)}${ghiChu}</td>
                <td>${b.ti_le_trung_lap === null ? '--' : thoat(b.ti_le_trung_lap) + '%'}</td>
                <td>${ngay(b.ngay_tai_len)}</td>
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
