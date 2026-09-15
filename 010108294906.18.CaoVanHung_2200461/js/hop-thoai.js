/**
 * ============================================================================
 * HỘP THOẠI THÔNG BÁO DÙNG CHUNG (hop-thoai.js)
 *
 * Trước đây mỗi trang tự dựng hộp thoại riêng bằng style viết thẳng trong
 * HTML, còn phần lớn chỗ khác vẫn gọi alert() nên trình duyệt hiện dòng
 * "127.0.0.1:5500 says" — vừa xấu vừa không giống nhau giữa các màn.
 *
 * Tệp này dựng sẵn một hộp thoại duy nhất cho mọi trang và thay luôn
 * window.alert, nên những chỗ đang gọi alert() cũng tự đẹp theo mà không
 * phải sửa lại từng dòng.
 *
 * Cách dùng:
 *     thongBao('Lưu thành công!');                  // một nút Đồng ý
 *     await thongBao('Đã xoá.');                    // chờ người dùng bấm
 *     if (await xacNhan('Xoá lớp này?')) { ... }    // hai nút
 * ============================================================================
 */

(function () {
    'use strict';

    if (window.__hopThoaiDaNap) return;
    window.__hopThoaiDaNap = true;

    var CSS = `
    .ht-nen {
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(15, 23, 42, .45);
        opacity: 0; transition: opacity .18s ease;
    }
    .ht-nen.ht-hien { opacity: 1; }

    .ht-hop {
        width: min(440px, calc(100vw - 40px));
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 18px 48px rgba(15, 23, 42, .28);
        padding: 26px 26px 22px;
        text-align: center;
        font-family: Arial, Helvetica, sans-serif;
        transform: translateY(-12px) scale(.97);
        transition: transform .18s ease;
    }
    .ht-nen.ht-hien .ht-hop { transform: translateY(0) scale(1); }

    .ht-tieu-de {
        margin: 0 0 12px;
        font-size: 20px;
        font-weight: bold;
        color: #0655FF;
        line-height: 1.35;
    }

    .ht-noi-dung {
        margin: 0 0 22px;
        font-size: 15.5px;
        line-height: 1.7;
        color: #334155;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 52vh;
        overflow-y: auto;
    }

    .ht-day-nut {
        display: flex;
        gap: 12px;
        justify-content: center;
    }

    .ht-nut {
        min-width: 104px;
        padding: 10px 26px;
        border: none;
        border-radius: 7px;
        font-size: 15px;
        font-weight: bold;
        font-family: inherit;
        cursor: pointer;
        transition: background-color .16s ease, transform .1s ease, box-shadow .16s ease;
    }

    .ht-nut--chinh { background: #0655FF; color: #fff; }
    .ht-nut--chinh:hover { background: #0443cc; box-shadow: 0 5px 14px rgba(6, 85, 255, .32); }
    .ht-nut--chinh:active { transform: translateY(1px); box-shadow: none; }

    .ht-nut--phu { background: #f1f5f9; color: #475569; }
    .ht-nut--phu:hover { background: #e2e8f0; }
    .ht-nut--phu:active { transform: translateY(1px); }

    .ht-nut:focus-visible { outline: 3px solid rgba(6, 85, 255, .35); outline-offset: 2px; }
    `;

    function napCss() {
        if (document.getElementById('ht-css')) return;
        var s = document.createElement('style');
        s.id = 'ht-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /**
     * Mở hộp thoại. Trả về Promise: true nếu bấm nút chính, false nếu huỷ.
     */
    function moHopThoai(tuyChon) {
        var o = tuyChon || {};
        var tieuDe = o.tieuDe || 'Thông báo hệ thống';
        var noiDung = o.noiDung == null ? '' : String(o.noiDung);
        var tenNutChinh = o.nutChinh || 'Đồng ý';
        var tenNutPhu = o.nutPhu || null;

        napCss();

        return new Promise(function (xong) {
            var nen = document.createElement('div');
            nen.className = 'ht-nen';

            var hop = document.createElement('div');
            hop.className = 'ht-hop';
            hop.setAttribute('role', 'dialog');
            hop.setAttribute('aria-modal', 'true');

            var h = document.createElement('h3');
            h.className = 'ht-tieu-de';
            h.textContent = tieuDe;

            var p = document.createElement('p');
            p.className = 'ht-noi-dung';
            p.textContent = noiDung;

            var day = document.createElement('div');
            day.className = 'ht-day-nut';

            function dong(ketQua) {
                nen.classList.remove('ht-hien');
                document.removeEventListener('keydown', phim);
                setTimeout(function () {
                    if (nen.parentNode) nen.parentNode.removeChild(nen);
                    xong(ketQua);
                }, 180);
            }

            if (tenNutPhu) {
                var nutPhu = document.createElement('button');
                nutPhu.type = 'button';
                nutPhu.className = 'ht-nut ht-nut--phu';
                nutPhu.textContent = tenNutPhu;
                nutPhu.addEventListener('click', function () { dong(false); });
                day.appendChild(nutPhu);
            }

            var nutChinh = document.createElement('button');
            nutChinh.type = 'button';
            nutChinh.className = 'ht-nut ht-nut--chinh';
            nutChinh.textContent = tenNutChinh;
            nutChinh.addEventListener('click', function () { dong(true); });
            day.appendChild(nutChinh);

            function phim(e) {
                if (e.key === 'Escape') dong(false);
                else if (e.key === 'Enter') dong(true);
            }
            document.addEventListener('keydown', phim);

            // Bấm ra ngoài để đóng, nhưng chỉ với hộp thoại một nút. Hộp hỏi
            // xác nhận thì bắt buộc chọn rõ ràng, tránh bấm nhầm ra ngoài rồi
            // tưởng là đã đồng ý.
            if (!tenNutPhu) {
                nen.addEventListener('click', function (e) {
                    if (e.target === nen) dong(true);
                });
            }

            hop.appendChild(h);
            hop.appendChild(p);
            hop.appendChild(day);
            nen.appendChild(hop);
            document.body.appendChild(nen);

            requestAnimationFrame(function () {
                nen.classList.add('ht-hien');
                nutChinh.focus();
            });
        });
    }

    /** Báo tin, một nút. */
    function thongBao(noiDung, tieuDe) {
        return moHopThoai({ noiDung: noiDung, tieuDe: tieuDe });
    }

    /** Hỏi xác nhận, hai nút. Trả về true nếu người dùng đồng ý. */
    function xacNhan(noiDung, tieuDe) {
        return moHopThoai({
            noiDung: noiDung,
            tieuDe: tieuDe || 'Xác nhận',
            nutChinh: 'Đồng ý',
            nutPhu: 'Huỷ'
        });
    }

    window.moHopThoai = moHopThoai;
    window.thongBao = thongBao;
    window.xacNhan = xacNhan;

    // Thay alert của trình duyệt. Giữ bản gốc phòng khi cần gỡ lỗi.
    window.__alertGoc = window.alert;
    window.alert = function (noiDung) { thongBao(noiDung); };
})();
