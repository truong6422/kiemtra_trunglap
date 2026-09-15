/**
 * ============================================================================
 * MÀN THỐNG KÊ KẾT QUẢ
 *
 * Hai mức:
 *   1. Toàn bộ báo cáo người dùng đưa vào hệ thống
 *   2. Xem chi tiết một báo cáo: tỉ lệ trùng tổng thể và tỉ lệ so với từng
 *      tài liệu mẫu, lấy từ thong_ke_theo_mau trong bảng thong_ke.
 * ============================================================================
 */

window.TkKetQua = (() => {

    const API = "http://localhost:5000/api";
    const $ = id => document.getElementById(id);
    const T = () => window.TkTienIch;

    // Dữ liệu do màn tổng quan nạp sẵn, khỏi gọi lại máy chủ
    let nguonDuLieu = [];

    // Đang xem chi tiết báo cáo nào, và danh sách mẫu trùng của nó
    let baoCaoDangXem = null;
    let mauDangXem = [];

    function nhanDuLieu(ds) {
        // Màn này là "Thống kê kết quả" nên chỉ nhận những bài đã chấm xong.
        // Trước đây nhận cả danh sách nên bấm vào thẻ là ra nguyên toàn bộ báo
        // cáo, kể cả bài đang xử lý chưa có tỉ lệ nào để xem.
        const T = window.TkTienIch;
        nguonDuLieu = (ds || []).filter(b => T.layTiLe(b) !== null);
    }

    /**
     * Xuất bảng tính: đang ở danh sách thì xuất toàn bộ báo cáo, đang xem chi
     * tiết một bài thì xuất tỉ lệ của bài đó với từng tài liệu mẫu.
     */
    function xuat() {

        if (!baoCaoDangXem) {
            window.TkTienIch.xuatExcel(nguonDuLieu);
            return;
        }

        const b = baoCaoDangXem;
        const T = window.TkTienIch;

        window.TkTienIch.xuatBangExcel({
            tenTep: `bao-cao-${b.id_bao_cao}`,
            tenTrang: `Chi tiet ${b.id_bao_cao}`,
            cot: [
                { ten: "Mã báo cáo mẫu", rong: 120 },
                { ten: "Tên tài liệu mẫu", rong: 240 },
                { ten: "Tỉ lệ trùng (%)", rong: 120 },
                { ten: "Số câu trùng", rong: 100 },
                { ten: "Số từ trùng", rong: 100 },
                { ten: "Số đoạn trùng", rong: 110 }
            ],
            dong: [
                // Dòng đầu là chính bài đang xem, để người đọc có mốc so sánh
                [
                    b.id_bao_cao,
                    `${b.tieu_de || ""} — người nộp: ${b.ten_nguoi_nop || "--"}`,
                    {
                        v: T.lamTron(T.layTiLe(b)), so: true,
                        kieu: "muc_" + (T.xepMuc(T.layTiLe(b)) || "trong")
                    },
                    { v: b.tong_so_cau_trung, so: true },
                    { v: b.tong_so_tu_trung, so: true },
                    { v: b.tong_so_doan_trung, so: true }
                ],
                ...mauDangXem.map(m => [
                    m.id_bao_cao,
                    m.ten_bao_cao,
                    {
                        v: T.lamTron(Number(m.ti_le_trung_lap || 0)), so: true,
                        kieu: "muc_" + (T.xepMuc(Number(m.ti_le_trung_lap || 0)) || "trong")
                    },
                    { v: m.so_cau_trung || 0, so: true },
                    { v: m.so_tu_trung || 0, so: true },
                    { v: m.so_doan_trung || 0, so: true }
                ])
            ]
        });
    }

    function veDuongDan(cacMuc) {
        $("tkDuongDanKetQua").innerHTML = cacMuc
            .map(m => m.hanh_dong
                ? `<button type="button" class="tk-duong-dan__muc" data-buoc="${m.hanh_dong}">${T().thoat(m.ten)}</button>`
                : `<span>${T().thoat(m.ten)}</span>`)
            .join('<i class="fa-solid fa-angle-right tk-duong-dan__mui"></i>');

        $("tkDuongDanKetQua").querySelectorAll("[data-buoc]").forEach(nut => {
            nut.addEventListener("click", () => moDanhSach());
        });
    }

    // ========================================================================
    // MỨC 1 — DANH SÁCH BÁO CÁO
    // ========================================================================

    function moDanhSach() {

        baoCaoDangXem = null;
        mauDangXem = [];

        veDuongDan([{ ten: "Toàn bộ báo cáo" }]);

        if (nguonDuLieu.length === 0) {
            $("tkNoiDungKetQua").innerHTML =
                '<div class="tk-khoi"><p class="no-data">Chưa có báo cáo nào</p></div>';
            return;
        }

        $("tkNoiDungKetQua").innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Mã báo cáo</th><th>Tiêu đề</th><th>Người nộp</th>
                        <th>Ngày tải lên</th><th>Tỉ lệ trùng</th>
                        <th>Số nguồn</th><th>Trạng thái</th><th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    ${nguonDuLieu.map(b => {

            const tiLe = T().layTiLe(b);
            const muc = T().xepMuc(tiLe);
            const daXong = b.trang_thai === "Đã xử lý";

            return `<tr>
                            <td class="tk-ma">${T().thoat(b.id_bao_cao)}</td>
                            <td style="text-align:left">
                                <span class="tk-ten-tep" title="${T().thoat(b.tieu_de)}">${T().thoat(b.tieu_de)}</span>
                            </td>
                            <td>${T().thoat(b.ten_nguoi_nop) || '<span class="tk-so--trong">--</span>'}</td>
                            <td style="white-space:nowrap">${T().dinhDangNgay(b.ngay_tai_len)}</td>
                            <td>${tiLe === null
                    ? '<span class="tk-so--trong">Chưa chấm</span>'
                    : `<span class="tk-ti-le__so tk-so--${muc}">${tiLe.toFixed(2)}%</span>`}</td>
                            <td>${b.so_nguon_phat_hien ?? '<span class="tk-so--trong">--</span>'}</td>
                            <td>
                                <span class="tk-nhan ${daXong ? "tk-nhan--xong" : "tk-nhan--cho"}">
                                    ${T().thoat(b.trang_thai)}
                                </span>
                            </td>
                            <td>
                                ${daXong
                    ? `<button type="button" class="tk-lien-ket" data-bao-cao="${T().thoat(b.id_bao_cao)}">
                                       <i class="fa-solid fa-arrow-right" style="font-size:11px"></i> Xem chi tiết
                                   </button>`
                    : '<span class="tk-so--trong">--</span>'}
                            </td>
                        </tr>`;
        }).join("")}
                </tbody>
            </table>`;

        $("tkNoiDungKetQua").querySelectorAll("[data-bao-cao]").forEach(nut => {
            nut.addEventListener("click", () => moChiTiet(nut.dataset.baoCao));
        });
    }

    // ========================================================================
    // MỨC 2 — CHI TIẾT MỘT BÁO CÁO
    // ========================================================================

    async function moChiTiet(idBaoCao) {

        const baoCao = nguonDuLieu.find(b => b.id_bao_cao === idBaoCao) || {};

        veDuongDan([
            { ten: "Toàn bộ báo cáo", hanh_dong: "danh-sach" },
            { ten: idBaoCao }
        ]);

        $("tkNoiDungKetQua").innerHTML =
            '<div class="tk-khoi"><p class="no-data">Đang tải...</p></div>';

        try {
            const kq = await (await fetch(
                `${API}/thong-ke/nguon/${encodeURIComponent(idBaoCao)}`)).json();

            if (!kq.success) throw new Error(kq.message);

            baoCaoDangXem = baoCao;
            mauDangXem = kq.data;

            const tiLe = T().layTiLe(baoCao);
            const muc = T().xepMuc(tiLe);

            const tongQuan = `
                <section class="tk-the-so">
                    <article class="tk-the">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-file-lines"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Báo cáo</div>
                            <div class="tk-the__so" style="font-size:20px">${T().thoat(idBaoCao)}</div>
                            <div class="tk-the__phu">${T().thoat(baoCao.tieu_de || "")}</div>
                        </div>
                    </article>
                    <article class="tk-the tk-the--do">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-percent"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Tỉ lệ trùng lặp</div>
                            <div class="tk-the__so tk-so--${muc}">${tiLe === null ? "--" : tiLe.toFixed(2) + "%"}</div>
                            <div class="tk-the__phu">Người nộp: ${T().thoat(baoCao.ten_nguoi_nop || "--")}</div>
                        </div>
                    </article>
                    <article class="tk-the tk-the--tim">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-align-left"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Câu trùng</div>
                            <div class="tk-the__so">${baoCao.tong_so_cau_trung ?? "--"}</div>
                            <div class="tk-the__phu">trên tổng ${baoCao.tong_so_cau ?? "--"} câu</div>
                        </div>
                    </article>
                    <article class="tk-the tk-the--luc">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-font"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Từ trùng</div>
                            <div class="tk-the__so">${baoCao.tong_so_tu_trung ?? "--"}</div>
                            <div class="tk-the__phu">trên tổng ${baoCao.tong_so_tu ?? "--"} từ</div>
                        </div>
                    </article>
                    <article class="tk-the tk-the--xanh">
                        <div class="tk-the__bieu-tuong"><i class="fa-solid fa-layer-group"></i></div>
                        <div class="tk-the__noi-dung">
                            <div class="tk-the__nhan">Tài liệu mẫu trùng</div>
                            <div class="tk-the__so">${kq.data.length}</div>
                            <div class="tk-the__phu">nguồn phát hiện</div>
                        </div>
                    </article>
                </section>`;

            const bangMau = kq.data.length === 0
                ? '<p class="no-data">Không có tài liệu mẫu nào trùng</p>'
                : `<table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th><th>Mã tài liệu mẫu</th><th>Tên tài liệu mẫu</th>
                            <th>Tỉ lệ trùng</th><th>Số câu trùng</th>
                            <th>Số từ trùng</th><th>Số đoạn trùng</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${kq.data.map((m, i) => {

                    const t = Number(m.ti_le_trung_lap || 0);
                    const mc = T().xepMuc(t);

                    return `<tr>
                                <td>${i + 1}</td>
                                <td class="tk-ma">${T().thoat(m.id_bao_cao)}</td>
                                <td style="text-align:left">${T().thoat(m.ten_bao_cao)}</td>
                                <td><span class="tk-ti-le__so tk-so--${mc}">${t.toFixed(2)}%</span></td>
                                <td>${m.so_cau_trung ?? 0}</td>
                                <td>${m.so_tu_trung ?? 0}</td>
                                <td>${m.so_doan_trung ?? 0}</td>
                            </tr>`;
                }).join("")}
                    </tbody>
                   </table>`;

            $("tkNoiDungKetQua").innerHTML = tongQuan + `
                <section class="tk-khoi">
                    <div class="tk-khoi__dau">
                        <h3>Tỉ lệ trùng với từng tài liệu mẫu</h3>
                        <span class="tk-ghi-chu">Xếp theo tỉ lệ giảm dần</span>
                    </div>
                    ${bangMau}
                </section>

                <div style="margin-top:14px">
                    <a class="tk-lien-ket" target="_blank"
                       href="chitiet.html?id=${encodeURIComponent(idBaoCao)}">
                        <i class="fa-solid fa-file-pdf"></i> Mở tài liệu và xem chỗ trùng được bôi màu
                    </a>
                </div>`;

        } catch (err) {
            $("tkNoiDungKetQua").innerHTML =
                `<div class="tk-khoi"><p class="no-data">Không tải được: ${T().thoat(err.message)}</p></div>`;
        }
    }

    return { mo: moDanhSach, nhanDuLieu, xuat };
})();
