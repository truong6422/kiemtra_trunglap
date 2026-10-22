/**
 * ============================================================================
 * TRANG XEM BÁO CÁO NGUỒN (xemnguon.html?id=<bài nộp>&nguon=<báo cáo nguồn>)
 *
 * Mở chính tệp báo cáo nguồn và tô màu những câu đã trùng với bài nộp, để
 * giảng viên phản biện nhìn tận mắt chỗ trùng nằm ở đâu trong nguồn. Cột phải
 * liệt kê từng cặp câu (nguồn ↔ bài nộp); bấm vào cặp thì cuộn tới chỗ đó
 * trong nguồn, bấm vào vệt màu thì cột phải nhảy tới cặp tương ứng.
 * ============================================================================
 */

(async function () {

    const API = `${window.API}/api/kiem-tra`;
    const thamSo = new URLSearchParams(window.location.search);
    const idBaiNop = thamSo.get('id') || '';
    const idNguon = thamSo.get('nguon') || '';

    const $ = id => document.getElementById(id);
    const vungPdf = $('pdfViewer');
    const vungDs = $('xnDanhSach');

    const thoat = s => String(s || '').replace(/[&<>"]/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const baoLoi = thongBao => {
        vungPdf.innerHTML = `<div style="color:#f87171;padding:40px;">${thoat(thongBao)}</div>`;
        vungDs.textContent = '';
    };

    if (!idBaiNop || !idNguon) {
        baoLoi('Thiếu mã bài nộp hoặc mã báo cáo nguồn trên đường dẫn.');
        return;
    }

    vungPdf.innerHTML = '<div style="color:#ddd;padding:40px;">Đang chuẩn bị báo cáo nguồn '
        + '(lần mở đầu tiên có thể mất vài chục giây)...</div>';

    const goc = `${API}/chi-tiet/${encodeURIComponent(idBaiNop)}/nguon/${encodeURIComponent(idNguon)}`;

    let duLieu;
    try {
        const res = await fetch(goc);
        const kq = await res.json();
        if (!res.ok || !kq.success) throw new Error(kq.message || `Máy chủ trả về ${res.status}`);
        duLieu = kq.data;
    } catch (e) {
        baoLoi(`Không tải được báo cáo nguồn: ${e.message}`);
        return;
    }

    const { nguon, cacCau, vetBoiMau } = duLieu;

    document.title = `Nguồn ${nguon.tieu_de} — so với ${idBaiNop}`;
    $('xnTieuDe').textContent = `Báo cáo nguồn: ${nguon.tieu_de}`;
    $('xnPhuDe').textContent = `(${nguon.id_bao_cao}${nguon.loai_bao_cao ? ' · ' + nguon.loai_bao_cao : ''}`
        + ` — đối chiếu với bài nộp ${idBaiNop})`;
    $('xnSoCau').textContent = `${cacCau.length} câu trùng`;
    $('xnSoCauBadge').textContent = `${cacCau.length} câu`;
    $('pdfTitle').textContent = nguon.tieu_de;

    // ---------------------------------------------------------------- cột phải
    vungDs.innerHTML = cacCau.length ? cacCau.map(c => `
        <div class="xn-cap" data-cau="${c.chi_so_cau_nguon}">
            <div class="xn-cap__dau">
                <span>Câu ${c.chi_so_cau_nguon} của nguồn</span>
                <span style="color:#ef4444;">${Math.round((c.do_tuong_dong || 0) * 100)}%</span>
            </div>
            <div class="xn-cap__nguon"><span class="xn-nhan">Nguồn</span>${thoat(c.cau_nguon)}</div>
            <div class="xn-cap__bai"><span class="xn-nhan">Bài nộp (câu ${c.chi_so_cau_bai_nop})</span>${thoat(c.cau_bai_nop)}</div>
        </div>`).join('')
        : 'Bài nộp không có câu nào trùng với báo cáo nguồn này.';

    const chonCap = (chiSo, cuonDanhSach) => {
        vungDs.querySelectorAll('.xn-cap.dang-chon').forEach(x => x.classList.remove('dang-chon'));
        const the = vungDs.querySelector(`.xn-cap[data-cau="${chiSo}"]`);
        if (the) {
            the.classList.add('dang-chon');
            if (cuonDanhSach) the.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    vungDs.addEventListener('click', e => {
        const the = e.target.closest('.xn-cap');
        if (!the) return;
        const chiSo = Number(the.dataset.cau);
        chonCap(chiSo, false);
        const thay = PdfHighlightViewer.lamNoiCau(chiSo);
        $('pdfMatchInfo').style.display = 'flex';
        $('pdfMatchInfo').textContent = thay
            ? `Đang xem câu ${chiSo} của nguồn`
            : `Không tìm thấy vị trí của câu ${chiSo} trong tệp nguồn`;
    });

    PdfHighlightViewer.khiBamVetBoiMau(chiSo => {
        PdfHighlightViewer.lamNoiCau(chiSo);
        chonCap(chiSo, true);
    });

    // ---------------------------------------------------------------- cột trái
    try {
        const res = await fetch(`${goc}/document`);
        if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);

        const soTrang = await PdfHighlightViewer.mo(await res.blob(), 'pdfViewer');
        const soVet = PdfHighlightViewer.boiMauTheoMayChu(vetBoiMau || { cac_vet: [] });

        $('pdfMatchInfo').style.display = 'flex';
        $('pdfMatchInfo').textContent =
            `Đang tô ${soVet} chỗ trùng với bài nộp ${idBaiNop}`;
        if (soVet > 0) PdfHighlightViewer.cuonToiVetDau();

        ganThanhCongCu(soTrang);
        PdfHighlightViewer.taoThumbnail('pdfThumbnails');
    } catch (e) {
        baoLoi(`Không hiển thị được tệp nguồn: ${e.message}`);
    }

    /** Nút chuyển trang, phóng to/thu nhỏ, ẩn/hiện ảnh thu nhỏ. */
    function ganThanhCongCu(soTrang) {
        const oTrang = $('pdfPageInput');
        $('pdfPageTotal').textContent = `/ ${soTrang}`;
        oTrang.max = soTrang;

        const toiTrang = so => {
            so = Math.min(Math.max(1, so), soTrang);
            oTrang.value = so;
            PdfHighlightViewer.cuonToiTrang(so);
        };
        $('pdfPrevPage').onclick = () => toiTrang(PdfHighlightViewer.layTrangHienTai() - 1);
        $('pdfNextPage').onclick = () => toiTrang(PdfHighlightViewer.layTrangHienTai() + 1);
        oTrang.onchange = () => toiTrang(Number(oTrang.value) || 1);

        const vungCuon = PdfHighlightViewer.layVungChua();
        if (vungCuon) {
            vungCuon.addEventListener('scroll', () => {
                const trang = PdfHighlightViewer.layTrangHienTai();
                oTrang.value = trang;
                PdfHighlightViewer.danhDauThumbDangXem(trang);
            });
        }

        const doiTyLe = async delta => {
            await PdfHighlightViewer.datTyLe(PdfHighlightViewer.layTyLe() + delta);
            $('pdfZoomLevel').textContent = Math.round(PdfHighlightViewer.layTyLe() * 100) + '%';
        };
        $('pdfZoomIn').onclick = () => doiTyLe(0.2);
        $('pdfZoomOut').onclick = () => doiTyLe(-0.2);
        $('pdfZoomLevel').textContent = Math.round(PdfHighlightViewer.layTyLe() * 100) + '%';

        $('pdfToggleThumbs').onclick = () => {
            const thumbs = $('pdfThumbnails');
            const an = thumbs.style.display === 'none';
            thumbs.style.display = an ? '' : 'none';
            $('pdfToggleThumbs').classList.toggle('pdf-nut--bat', an);
        };
    }
})();
