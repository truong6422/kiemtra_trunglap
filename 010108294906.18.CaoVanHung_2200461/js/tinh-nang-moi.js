/**
 * ============================================================================
 * TÍNH NĂNG FE MỚI – 3 YÊU CẦU TỪ TÀI LIỆU THAM KHẢO
 *
 * 1. xuatExcelKetQua(idBaoCao)         – Xuất Excel chi tiết kết quả kiểm tra
 * 2. moModalChiTietLoi(chiTietLoi)     – Modal chi tiết lỗi file ảnh
 * 3. Đánh giá phần mềm (5 sao + bình luận) sau kiểm tra
 * ============================================================================
 */

// ============================================================
// API BASE
// ============================================================
const API_BASE = 'http://localhost:5000/api';

// ============================================================
// YÊU CẦU 1 – XUẤT EXCEL KẾT QUẢ KIỂM TRA
// Gọi từ trang chitiet.html sau khi có reportId
// ============================================================

/**
 * Tải file Excel chi tiết kết quả kiểm tra về máy.
 * @param {string} idBaoCao  – VD: "BC001"
 */
async function xuatExcelKetQua(idBaoCao) {
    if (!idBaoCao) {
        if (typeof thongBao === 'function') thongBao('Không xác định được mã báo cáo!');
        return;
    }

    const nut = document.getElementById('btnXuatExcelChiTiet');
    if (nut) {
        nut.disabled = true;
        nut.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất…';
    }

    try {
        const res = await fetch(`${API_BASE}/xuat-excel/${encodeURIComponent(idBaoCao)}`);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Máy chủ trả về ${res.status}`);
        }

        // Lấy tên file từ header Content-Disposition
        let tenFile = `KetQua_${idBaoCao}.xlsx`;
        const cd = res.headers.get('Content-Disposition') || '';
        const khop = cd.match(/filename="?([^";]+)"?/i);
        if (khop) tenFile = decodeURIComponent(khop[1]);

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = tenFile;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 20000);

    } catch (err) {
        console.error('Lỗi xuất Excel kết quả:', err);
        if (typeof thongBao === 'function') {
            thongBao(`Không xuất được file Excel: ${err.message}`);
        } else {
            alert(`Không xuất được file Excel: ${err.message}`);
        }
    } finally {
        if (nut) {
            nut.disabled = false;
            nut.innerHTML = '<i class="fa-solid fa-file-excel"></i> Xuất Excel';
        }
    }
}

// ============================================================
// YÊU CẦU 2 – MODAL CHI TIẾT LỖI FILE ẢNH
// ============================================================

/**
 * Hiển thị modal chi tiết lỗi khi upload file ảnh/file không đọc được.
 * @param {Object} chiTietLoi – Đối tượng chi_tiet_loi từ response API
 */
function moModalChiTietLoi(chiTietLoi) {
    // Xoá modal cũ nếu còn
    const cu = document.getElementById('modalChiTietLoi');
    if (cu) cu.remove();

    const loaiLoi = chiTietLoi?.loai_loi || 'LOI_KHONG_XAC_DINH';
    const tenTep  = chiTietLoi?.ten_tep  || '(không rõ tên)';
    const dinhDang = chiTietLoi?.dinh_dang_nhan_duoc || chiTietLoi?.dinh_dang || '';
    const dinhDangHoTro = (chiTietLoi?.dinh_dang_ho_tro || ['.pdf', '.doc', '.docx']).join(', ');
    const dungLuong = chiTietLoi?.dung_luong_mb ? `${chiTietLoi.dung_luong_mb} MB` : '';
    const lyDo  = chiTietLoi?.ly_do || 'Tệp không đọc được.';
    const goiY  = Array.isArray(chiTietLoi?.goi_y) ? chiTietLoi.goi_y : [];

    const mauLoai = loaiLoi === 'DINH_DANG_KHONG_HO_TRO'
        ? { icon: 'fa-file-circle-xmark', mau: '#dc2626', ten: 'Định dạng không hỗ trợ' }
        : { icon: 'fa-image-slash',       mau: '#ea580c', ten: 'Không đọc được văn bản' };

    const goiYHtml = goiY.length
        ? `<ul class="cl-goi-y">${goiY.map(g => `<li><i class="fa-solid fa-lightbulb"></i> ${g}</li>`).join('')}</ul>`
        : '';

    const thongTinThem = [
        dinhDang  ? `<div class="cl-dong"><span class="cl-nhan">Định dạng nhận:</span><code>${dinhDang}</code></div>` : '',
        dinhDangHoTro && loaiLoi === 'DINH_DANG_KHONG_HO_TRO'
            ? `<div class="cl-dong"><span class="cl-nhan">Định dạng chấp nhận:</span><code>${dinhDangHoTro}</code></div>` : '',
        dungLuong ? `<div class="cl-dong"><span class="cl-nhan">Dung lượng:</span>${dungLuong}</div>` : ''
    ].filter(Boolean).join('');

    const html = `
    <div id="modalChiTietLoi" class="cl-nen" role="dialog" aria-modal="true">
      <div class="cl-hop">
        <div class="cl-dau" style="background:${mauLoai.mau};">
          <i class="fa-solid ${mauLoai.icon}"></i>
          <span>${mauLoai.ten}</span>
          <button class="cl-dong" onclick="dongModalChiTietLoi()" title="Đóng">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="cl-than">
          <div class="cl-ten-tep">
            <i class="fa-regular fa-file"></i>
            <span title="${tenTep}">${tenTep}</span>
          </div>

          ${thongTinThem}

          <div class="cl-ly-do">
            <i class="fa-solid fa-circle-exclamation"></i>
            <p>${lyDo}</p>
          </div>

          ${goiY.length ? `<div class="cl-khoi-goi-y">
            <div class="cl-tieu-goi-y"><i class="fa-solid fa-wand-magic-sparkles"></i> Gợi ý xử lý</div>
            ${goiYHtml}
          </div>` : ''}
        </div>

        <div class="cl-chan">
          <button class="cl-nut cl-nut-dong" onclick="dongModalChiTietLoi()">
            <i class="fa-solid fa-check"></i> Đã hiểu
          </button>
        </div>
      </div>
    </div>`;

    // Thêm CSS nếu chưa có
    if (!document.getElementById('styleCLoi')) {
        const st = document.createElement('style');
        st.id = 'styleCLoi';
        st.textContent = `
        .cl-nen{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;
          justify-content:center;z-index:9999;animation:clFadeIn .2s ease;}
        @keyframes clFadeIn{from{opacity:0}to{opacity:1}}
        .cl-hop{background:#fff;border-radius:12px;width:500px;max-width:94vw;
          box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;font-family:'Segoe UI',sans-serif;}
        .cl-dau{display:flex;align-items:center;gap:10px;padding:16px 20px;
          color:#fff;font-size:16px;font-weight:600;}
        .cl-dau .cl-dong{margin-left:auto;background:transparent;border:none;color:#fff;
          font-size:18px;cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;}
        .cl-dau .cl-dong:hover{background:rgba(255,255,255,.2);}
        .cl-than{padding:20px 24px;display:flex;flex-direction:column;gap:12px;}
        .cl-ten-tep{display:flex;align-items:center;gap:8px;background:#f1f5f9;
          border-radius:8px;padding:10px 14px;font-size:14px;color:#1e293b;font-weight:500;
          overflow:hidden;}
        .cl-ten-tep span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cl-dong{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#475569;}
        .cl-nhan{font-weight:600;min-width:130px;display:inline-block;color:#334155;}
        .cl-dong code{background:#f1f5f9;padding:2px 7px;border-radius:4px;
          font-family:monospace;color:#0369a1;font-size:13px;}
        .cl-ly-do{display:flex;gap:10px;background:#fff7ed;border:1px solid #fed7aa;
          border-radius:8px;padding:12px 14px;font-size:13.5px;color:#9a3412;}
        .cl-ly-do i{flex-shrink:0;margin-top:2px;color:#ea580c;}
        .cl-ly-do p{margin:0;line-height:1.5;}
        .cl-khoi-goi-y{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
        .cl-tieu-goi-y{background:#f8fafc;padding:8px 14px;font-size:13px;
          font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;}
        .cl-goi-y{margin:0;padding:10px 14px 12px 14px;list-style:none;
          display:flex;flex-direction:column;gap:6px;}
        .cl-goi-y li{font-size:13.5px;color:#334155;display:flex;gap:8px;}
        .cl-goi-y li i{color:#f59e0b;flex-shrink:0;margin-top:2px;}
        .cl-chan{padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;
          justify-content:flex-end;}
        .cl-nut{padding:9px 22px;border-radius:7px;border:none;cursor:pointer;
          font-size:14px;font-weight:500;display:flex;align-items:center;gap:6px;}
        .cl-nut-dong{background:#1e40af;color:#fff;}
        .cl-nut-dong:hover{background:#1d3ea3;}`;
        document.head.appendChild(st);
    }

    document.body.insertAdjacentHTML('beforeend', html);

    // Đóng khi click nền
    document.getElementById('modalChiTietLoi').addEventListener('click', function(e) {
        if (e.target === this) dongModalChiTietLoi();
    });
}

function dongModalChiTietLoi() {
    const m = document.getElementById('modalChiTietLoi');
    if (m) m.remove();
}

// ============================================================
// YÊU CẦU 3 – ĐÁNH GIÁ PHẦN MỀM (5 SAO + BÌNH LUẬN)
// ============================================================

/**
 * Mở modal đánh giá phần mềm.
 * @param {string} idKiemTra  – ID lần kiểm tra vừa xong (tùy chọn)
 * @param {string} idBaoCao   – ID báo cáo (tùy chọn)
 */
function moModalDanhGia(idKiemTra = '', idBaoCao = '') {
    const cu = document.getElementById('modalDanhGia');
    if (cu) cu.remove();

    if (!document.getElementById('styleDG')) {
        const st = document.createElement('style');
        st.id = 'styleDG';
        st.textContent = `
        .dg-nen{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;
          align-items:center;justify-content:center;z-index:9998;
          animation:dgFade .25s ease;}
        @keyframes dgFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .dg-hop{background:#fff;border-radius:16px;width:460px;max-width:95vw;
          box-shadow:0 24px 64px rgba(0,0,0,.2);overflow:hidden;font-family:'Segoe UI',sans-serif;}
        .dg-dau{text-align:center;padding:28px 24px 20px;
          background:linear-gradient(135deg,#1e40af 0%,#0ea5e9 100%);color:#fff;}
        .dg-dau h3{margin:0 0 6px;font-size:20px;font-weight:700;}
        .dg-dau p{margin:0;font-size:14px;opacity:.9;}
        .dg-than{padding:24px;}
        .dg-nhan-sao{text-align:center;font-size:14px;color:#64748b;margin-bottom:10px;}
        .dg-sao-wrap{display:flex;justify-content:center;gap:8px;margin-bottom:18px;}
        .dg-sao{font-size:38px;cursor:pointer;color:#d1d5db;line-height:1;
          transition:color .15s,transform .1s;user-select:none;}
        .dg-sao.chon,.dg-sao.hover-on{color:#f59e0b;}
        .dg-sao:hover{transform:scale(1.15);}
        .dg-ten-sao{text-align:center;font-size:13px;color:#64748b;
          height:18px;margin-bottom:12px;font-weight:500;}
        .dg-o-binh-luan{width:100%;box-sizing:border-box;padding:10px 14px;
          border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;
          font-family:'Segoe UI',sans-serif;resize:vertical;min-height:90px;
          color:#334155;outline:none;transition:border .2s;}
        .dg-o-binh-luan:focus{border-color:#3b82f6;}
        .dg-chan{display:flex;gap:10px;padding:0 24px 22px;justify-content:flex-end;}
        .dg-nut{padding:9px 22px;border-radius:8px;border:none;cursor:pointer;
          font-size:14px;font-weight:600;transition:opacity .15s;}
        .dg-nut-huy{background:#f1f5f9;color:#64748b;}
        .dg-nut-huy:hover{background:#e2e8f0;}
        .dg-nut-gui{background:#1e40af;color:#fff;display:flex;align-items:center;gap:7px;}
        .dg-nut-gui:hover{opacity:.88;}
        .dg-nut-gui:disabled{opacity:.5;cursor:not-allowed;}
        .dg-thanh-cong{text-align:center;padding:32px 24px;}
        .dg-thanh-cong .dg-icon{font-size:52px;color:#16a34a;margin-bottom:12px;}
        .dg-thanh-cong h4{color:#1e293b;margin:0 0 6px;font-size:18px;}
        .dg-thanh-cong p{color:#64748b;margin:0;font-size:14px;}`;
        document.head.appendChild(st);
    }

    const idSinhVien = localStorage.getItem('id_nguoi_dung') || '';

    const tenSao = ['', 'Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

    const html = `
    <div id="modalDanhGia" class="dg-nen" role="dialog" aria-modal="true">
      <div class="dg-hop">
        <div class="dg-dau">
          <h3>⭐ Đánh giá phần mềm</h3>
          <p>Chia sẻ trải nghiệm của bạn để giúp chúng tôi cải thiện</p>
        </div>
        <div class="dg-than" id="dgThan">
          <div class="dg-nhan-sao">Bạn đánh giá phần mềm như thế nào?</div>
          <div class="dg-sao-wrap" id="dgSaoWrap">
            ${[1,2,3,4,5].map(i=>`<span class="dg-sao" data-sao="${i}" title="${tenSao[i]}">★</span>`).join('')}
          </div>
          <div class="dg-ten-sao" id="dgTenSao"></div>
          <textarea id="dgBinhLuan" class="dg-o-binh-luan"
            placeholder="Bình luận thêm (không bắt buộc)…" maxlength="2000"></textarea>
        </div>
        <div class="dg-chan">
          <button class="dg-nut dg-nut-huy" onclick="dongModalDanhGia()">Bỏ qua</button>
          <button class="dg-nut dg-nut-gui" id="dgBtnGui" disabled onclick="guiDanhGia('${idKiemTra}','${idBaoCao}','${idSinhVien}')">
            <i class="fa-solid fa-paper-plane"></i> Gửi đánh giá
          </button>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Sự kiện sao
    let soSaoChon = 0;
    const dsSao  = document.querySelectorAll('#dgSaoWrap .dg-sao');
    const tenSaoEl = document.getElementById('dgTenSao');
    const btnGui   = document.getElementById('dgBtnGui');

    dsSao.forEach(s => {
        s.addEventListener('mouseenter', () => {
            const v = +s.dataset.sao;
            dsSao.forEach((x, i) => {
                x.classList.toggle('hover-on', i < v);
                x.classList.remove('chon');
            });
            tenSaoEl.textContent = tenSao[v];
        });

        s.addEventListener('mouseleave', () => {
            dsSao.forEach((x, i) => {
                x.classList.remove('hover-on');
                x.classList.toggle('chon', i < soSaoChon);
            });
            tenSaoEl.textContent = soSaoChon ? tenSao[soSaoChon] : '';
        });

        s.addEventListener('click', () => {
            soSaoChon = +s.dataset.sao;
            dsSao.forEach((x, i) => {
                x.classList.toggle('chon', i < soSaoChon);
                x.classList.remove('hover-on');
            });
            tenSaoEl.textContent = tenSao[soSaoChon];
            btnGui.disabled = false;
            // Lưu số sao vào attribute để hàm guiDanhGia đọc
            document.getElementById('dgSaoWrap').dataset.chon = soSaoChon;
        });
    });

    // Đóng khi click nền
    document.getElementById('modalDanhGia').addEventListener('click', function(e) {
        if (e.target === this) dongModalDanhGia();
    });
}

function dongModalDanhGia() {
    const m = document.getElementById('modalDanhGia');
    if (m) m.remove();
}

async function guiDanhGia(idKiemTra, idBaoCao, idSinhVien) {
    const soSao   = +(document.getElementById('dgSaoWrap')?.dataset.chon || 0);
    const binhLuan = (document.getElementById('dgBinhLuan')?.value || '').trim();

    if (!soSao || soSao < 1 || soSao > 5) {
        if (typeof thongBao === 'function') thongBao('Vui lòng chọn số sao!');
        return;
    }

    const btn = document.getElementById('dgBtnGui');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

    try {
        const res = await fetch(`${API_BASE}/danh-gia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_sinh_vien: idSinhVien || '',
                id_kiem_tra:  idKiemTra  || '',
                id_bao_cao:   idBaoCao   || '',
                so_sao:       soSao,
                binh_luan:    binhLuan
            })
        });

        const kq = await res.json();

        if (!kq.success) {
            throw new Error(kq.message || 'Không lưu được đánh giá');
        }

        // Hiện màn cảm ơn
        const than = document.getElementById('dgThan');
        const chan = document.querySelector('#modalDanhGia .dg-chan');
        if (than) {
            than.innerHTML = `
            <div class="dg-thanh-cong">
              <div class="dg-icon"><i class="fa-solid fa-circle-check"></i></div>
              <h4>Cảm ơn bạn đã đánh giá!</h4>
              <p style="word-break:keep-all;overflow-wrap:normal;">Phản hồi của bạn giúp chúng tôi cải thiện phần mềm tốt&nbsp;hơn.</p>
            </div>`;
        }
        if (chan) chan.innerHTML = `
          <button class="dg-nut dg-nut-gui" onclick="dongModalDanhGia()">
            <i class="fa-solid fa-check"></i> Đóng
          </button>`;

    } catch (err) {
        console.error('Lỗi gửi đánh giá:', err);
        if (typeof thongBao === 'function') {
            thongBao(`Không gửi được đánh giá: ${err.message}`);
        } else {
            alert(`Không gửi được đánh giá: ${err.message}`);
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đánh giá';
        }
    }
}

// ============================================================
// HELPER – Export để các trang khác có thể gọi
// ============================================================
window.xuatExcelKetQua    = xuatExcelKetQua;
window.moModalChiTietLoi  = moModalChiTietLoi;
window.dongModalChiTietLoi = dongModalChiTietLoi;
window.moModalDanhGia     = moModalDanhGia;
window.dongModalDanhGia   = dongModalDanhGia;
window.guiDanhGia         = guiDanhGia;
