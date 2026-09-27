/**
 * ============================================================================
 * THỐNG KÊ ĐÁNH GIÁ PHẦN MỀM
 *
 * Module này theo đúng pattern của thongke-tai-khoan.js / thongke-ket-qua.js:
 *   - Được gọi từ thongkebaocao.js khi bấm vào thẻ "Đánh giá phần mềm"
 *   - Render toàn bộ nội dung vào #tkNoiDungDanhGia
 *   - Xuất Excel qua nút #btnXuatDanhGia
 * ============================================================================
 */

window.TkDanhGia = (() => {

    const API = 'http://localhost:5000/api';

    let danhSach = [];
    let trang    = 1;
    let soDong   = 10;

    const $ = id => document.getElementById(id);

    // ── Vẽ sao HTML ──
    function veSao(soSao) {
        return Array.from({ length: 5 }, (_, i) =>
            `<span style="color:${i < soSao ? '#f59e0b' : '#d1d5db'}">★</span>`
        ).join('');
    }

    // ── Render phần tổng quan + thanh phân bổ ──
    function renderTongQuan(thongKe) {
        const d   = thongKe || {};
        const tb  = d.trung_binh_sao || 0;
        const ts  = d.tong_so_danh_gia || 0;
        const pb  = Array.isArray(d.phan_bo_sao) ? d.phan_bo_sao : [];

        const thanhSao = [5, 4, 3, 2, 1].map(sao => {
            const soLuong = (pb.find(p => p.so_sao === sao) || {}).so_luong || 0;
            const tiLe    = ts > 0 ? (soLuong / ts * 100).toFixed(1) : 0;
            return `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-size:13px;color:#475569;width:50px;text-align:right;flex-shrink:0;">
                    ${sao} ⭐
                </span>
                <div style="flex:1;height:11px;background:#f1f5f9;border-radius:6px;overflow:hidden;">
                    <div style="height:100%;background:#f59e0b;border-radius:6px;width:${tiLe}%;
                        transition:width .5s ease;"></div>
                </div>
                <span style="font-size:13px;color:#64748b;width:36px;text-align:right;flex-shrink:0;">
                    ${soLuong}
                </span>
            </div>`;
        }).join('');

        return `
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;">

            <!-- Điểm trung bình -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;
                padding:20px 24px;flex:1;min-width:200px;box-shadow:0 1px 4px rgba(0,0,0,.05);">
                <div style="font-size:13px;color:#64748b;margin-bottom:8px;font-weight:600;">
                    Điểm trung bình
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:48px;font-weight:800;color:#f59e0b;line-height:1;">${tb || '--'}</span>
                    <div>
                        <div style="font-size:20px;">${veSao(Math.round(tb))}</div>
                        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
                            ${ts > 0 ? `Dựa trên ${ts} đánh giá` : 'Chưa có đánh giá'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Phân bổ sao -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;
                padding:20px 24px;flex:2;min-width:260px;box-shadow:0 1px 4px rgba(0,0,0,.05);">
                <div style="font-size:13px;color:#64748b;margin-bottom:12px;font-weight:600;">
                    Phân bổ đánh giá
                </div>
                ${thanhSao}
            </div>

        </div>`;
    }

    // ── Render bảng danh sách ──
    function renderBang() {
        const soTrang = Math.max(1, Math.ceil(danhSach.length / soDong));
        trang = Math.min(trang, soTrang);
        const bat  = (trang - 1) * soDong;
        const hien = danhSach.slice(bat, bat + soDong);

        if (hien.length === 0) {
            return `<tr><td colspan="6" class="no-data">Không có đánh giá nào.</td></tr>`;
        }

        return hien.map(dg => {
            const ngay = dg.ngay_danh_gia
                ? new Date(dg.ngay_danh_gia).toLocaleString('vi-VN')
                : '--';
            return `<tr>
                <td>${dg.id_danh_gia || ''}</td>
                <td>${dg.id_sinh_vien || '<em style="color:#94a3b8">Ẩn danh</em>'}</td>
                <td>${dg.id_bao_cao || '--'}</td>
                <td>
                    <span style="font-size:15px;">${veSao(dg.so_sao)}</span>
                    <span style="font-size:12px;color:#64748b;margin-left:4px;">(${dg.so_sao})</span>
                </td>
                <td>
                    <span style="max-width:280px;display:inline-block;overflow:hidden;
                        text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;
                        font-size:13px;color:#475569;"
                        title="${(dg.binh_luan || '').replace(/"/g, '&quot;')}">
                        ${dg.binh_luan || '<em style="color:#94a3b8">–</em>'}
                    </span>
                </td>
                <td style="white-space:nowrap;font-size:13px;">${ngay}</td>
            </tr>`;
        }).join('');
    }

    // ── Render toàn bộ nội dung khung ──
    function renderNoiDung(thongKe) {
        const wrap = $('tkNoiDungDanhGia');
        if (!wrap) return;

        const soTrang = Math.max(1, Math.ceil(danhSach.length / soDong));

        wrap.innerHTML = `
        ${renderTongQuan(thongKe)}

        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã đánh giá</th>
                    <th>Người đánh giá</th>
                    <th>Mã báo cáo</th>
                    <th>Số sao</th>
                    <th>Bình luận</th>
                    <th>Ngày đánh giá</th>
                </tr>
            </thead>
            <tbody id="dgThanBang">${renderBang()}</tbody>
        </table>

        <div class="pagination">
            <span>Tổng <strong>${danhSach.length}</strong></span>
            <select id="dgSoDong">
                <option value="10"${soDong===10?' selected':''}>10/trang</option>
                <option value="20"${soDong===20?' selected':''}>20/trang</option>
                <option value="50"${soDong===50?' selected':''}>50/trang</option>
            </select>
            <button type="button" class="page-btn" id="dgBtnTruoc">&lsaquo;</button>
            <span id="dgSoTrang">${trang} / ${soTrang}</span>
            <button type="button" class="page-btn" id="dgBtnSau">&rsaquo;</button>
        </div>`;

        // Sự kiện phân trang
        $('dgSoDong')?.addEventListener('change', e => {
            soDong = Number(e.target.value) || 10;
            trang  = 1;
            capNhatBang();
        });
        $('dgBtnTruoc')?.addEventListener('click', () => {
            if (trang > 1) { trang--; capNhatBang(); }
        });
        $('dgBtnSau')?.addEventListener('click', () => {
            const soTrang = Math.max(1, Math.ceil(danhSach.length / soDong));
            if (trang < soTrang) { trang++; capNhatBang(); }
        });
    }

    // ── Cập nhật chỉ phần tbody + phân trang (không render lại tổng quan) ──
    function capNhatBang() {
        const tb = $('dgThanBang');
        if (tb) tb.innerHTML = renderBang();

        const soTrang = Math.max(1, Math.ceil(danhSach.length / soDong));
        const sp = $('dgSoTrang');
        if (sp) sp.textContent = `${trang} / ${soTrang}`;
    }

    // ── Tải dữ liệu và hiển thị ──
    async function mo() {
        const wrap = $('tkNoiDungDanhGia');
        if (wrap) wrap.innerHTML = '<p class="no-data" style="padding:24px;">Đang tải...</p>';

        const soSao  = $('dgLocSao')?.value || '';
        const tuNgay = $('dgLocTuNgay')?.value || '';
        const denNgay = $('dgLocDenNgay')?.value || '';

        const params = new URLSearchParams({ limit: 500 });
        if (soSao)   params.set('so_sao', soSao);
        if (tuNgay)  params.set('tu_ngay', tuNgay);
        if (denNgay) params.set('den_ngay', denNgay);

        try {
            const [resDs, resTK] = await Promise.all([
                fetch(`${API}/danh-gia?${params}`),
                fetch(`${API}/danh-gia/thong-ke`)
            ]);

            const kqDs = await resDs.json();
            const kqTK = await resTK.json();

            danhSach = Array.isArray(kqDs?.data) ? kqDs.data : [];
            trang    = 1;

            const thongKe = kqTK?.data || {};

            // Cập nhật thẻ số bên ngoài
            const soDanhGiaEl  = $('soDanhGia');
            const phuDanhGiaEl = $('phuDanhGia');
            if (soDanhGiaEl)  soDanhGiaEl.textContent  = thongKe.tong_so_danh_gia ?? '--';
            if (phuDanhGiaEl) phuDanhGiaEl.textContent =
                thongKe.trung_binh_sao
                    ? `⭐ Trung bình ${thongKe.trung_binh_sao}/5 — bấm để xem`
                    : 'Bấm để xem chi tiết';

            renderNoiDung(thongKe);

        } catch (err) {
            console.error('Lỗi tải đánh giá:', err);
            if (wrap) wrap.innerHTML = `<p class="no-data">Không tải được: ${err.message}</p>`;
        }
    }

    // ── Xuất Excel đánh giá ──
    async function xuat() {
        const btn = $('btnXuatDanhGia');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất…'; }

        const soSao  = $('dgLocSao')?.value  || '';
        const tuNgay = $('dgLocTuNgay')?.value || '';
        const denNgay = $('dgLocDenNgay')?.value || '';
        const params = new URLSearchParams();
        if (soSao)   params.set('so_sao', soSao);
        if (tuNgay)  params.set('tu_ngay', tuNgay);
        if (denNgay) params.set('den_ngay', denNgay);

        try {
            const res = await fetch(`${API}/danh-gia/xuat-excel?${params}`);
            if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);

            let tenFile = `DanhGia_${new Date().toISOString().slice(0, 10)}.xlsx`;
            const cd = res.headers.get('Content-Disposition') || '';
            const m  = cd.match(/filename="?([^";]+)"?/i);
            if (m) tenFile = decodeURIComponent(m[1]);

            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = tenFile;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 20000);

        } catch (err) {
            const baoTin = typeof thongBao === 'function' ? thongBao : alert;
            baoTin('Không xuất được Excel: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-file-excel"></i> Xuất Excel';
            }
        }
    }

    // ── Chỉ tải lại số liệu thẻ (gọi khi trang mới load) ──
    async function demSo() {
        try {
            const res = await fetch(`${API}/danh-gia/thong-ke`);
            const kq  = await res.json();
            if (!kq.success || !kq.data) return;

            const soDanhGiaEl  = $('soDanhGia');
            const phuDanhGiaEl = $('phuDanhGia');
            const d = kq.data;

            if (soDanhGiaEl)  soDanhGiaEl.textContent  = d.tong_so_danh_gia ?? '--';
            if (phuDanhGiaEl) phuDanhGiaEl.textContent =
                d.trung_binh_sao
                    ? `⭐ Trung bình ${d.trung_binh_sao}/5 — bấm để xem`
                    : 'Bấm để xem chi tiết';

        } catch (err) {
            console.error('Không lấy được số đánh giá:', err);
        }
    }

    // Gắn sự kiện bộ lọc (chờ DOM sẵn sàng)
    document.addEventListener('DOMContentLoaded', () => {
        demSo();

        // Bộ lọc trong khung
        ['dgLocSao', 'dgLocTuNgay', 'dgLocDenNgay'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                trang = 1;
                mo();
            });
        });

        document.getElementById('dgBtnXoaLoc')?.addEventListener('click', () => {
            ['dgLocSao', 'dgLocTuNgay', 'dgLocDenNgay'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            trang = 1;
            mo();
        });

        document.getElementById('btnXuatDanhGia')?.addEventListener('click', xuat);
    });

    return { mo, xuat, demSo };

})();
