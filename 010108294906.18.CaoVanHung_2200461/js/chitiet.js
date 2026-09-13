document.addEventListener("DOMContentLoaded", async function () {
    // =========================================================================
    // 1. LẤY ID BÁO CÁO TỪ URL
    // =========================================================================
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get("id");
    console.log("==============================================");
    console.log("🚀 TRANG CHI TIẾT BÁO CÁO");
    console.log("📌 Report ID:", reportId);
    console.log("==============================================");
    // =========================================================================
    // NÚT QUAY LẠI
    // =========================================================================
    function goBack() {
        window.history.back();
    }
    window.goBack = goBack;
    // =========================================================================
    // 2. KIỂM TRA ID
    // =========================================================================
    if (!reportId) {
        alert("Không tìm thấy mã báo cáo!");
        console.error("❌ Không có reportId trong URL.");
        return;
    }
    // =========================================================================
    // BIẾN DỮ LIỆU
    // =========================================================================
    let dataBaoCao = null;
    let dataKetQua = null;
    let chiTietDanhSach = [];
    let thongKe = {};
    let chiTietCauTrung = [];
    let chiTietDoanTrung = [];
    let chiTietDoanChapVa = [];

    try {
        // =====================================================================
        // 3. LẤY THÔNG TIN BÁO CÁO
        // =====================================================================
        console.log("📡 Đang lấy thông tin báo cáo...");
        const reportApiUrl = `http://localhost:5000/api/kiem-tra/chi-tiet/${encodeURIComponent(reportId)}`;
        console.log("📡 API báo cáo:");
        console.log(reportApiUrl);
        const response =
            await fetch(reportApiUrl);
        console.log(
            "📡 HTTP Status:",
            response.status
        );
        if (!response.ok) {
            throw new Error(
                `Không thể kết nối API báo cáo. HTTP ${response.status}`
            );
        }
        // =====================================================================
        // ĐỌC JSON BÁO CÁO
        // =====================================================================
        let result = null;
        try {
            result =
                await response.json();
        } catch (jsonError) {
            console.error(
                "❌ API báo cáo không trả JSON:",
                jsonError
            );
            throw new Error(
                "API báo cáo không trả dữ liệu JSON hợp lệ."
            );
        }
        console.log("📦 Dữ liệu API báo cáo:");
        console.log(result);
        // =====================================================================
        // LẤY DỮ LIỆU
        // =====================================================================
        if (
            result &&
            result.success &&
            result.data
        ) {
            dataBaoCao =
                result.data.baoCao || result.data.bao_cao || null;
            // Hỗ trợ hứng kết quả từ nhiều kiểu tên biến khác nhau của API
            dataKetQua =
                result.data.ketQua ||
                result.data.ket_qua ||
                result.data.ketQuaKiểmTra ||
                result.data; // Phòng hờ nếu result.data chính là document kết quả
            thongKe =
                result.data.thongKe || {};
            console.log(
                "THONG KE:",
                thongKe
            );

            console.log(
                "THONG_KE_THEO_MAU:",
                thongKe.thong_ke_theo_mau
            );
            console.log(
                "SO NGUON:",
                thongKe?.thong_ke_theo_mau?.length
            );
            console.log(
                "CHI TIET DANH SACH:",
                chiTietDanhSach
            );
            chiTietCauTrung =
                result.data.chiTietCauTrung || [];

            chiTietDoanTrung =
                result.data.chiTietDoanTrung || [];

            chiTietDoanChapVa =
                result.data.chiTietDoanChapVa || [];
            console.log(
                "✅ Đã lấy dữ liệu từ API."
            );
        } else {
            console.warn(
                "⚠️ API không trả về dữ liệu hợp lệ."
            );
            // =================================================================
            // FALLBACK LOCAL STORAGE
            // =================================================================
            const dataString =
                localStorage.getItem(
                    "currentChiTietBaoCao"
                );
            if (dataString) {
                try {
                    dataBaoCao =
                        JSON.parse(dataString);
                    console.log(
                        "✅ Đã lấy dữ liệu từ localStorage."
                    );
                } catch (storageError) {
                    console.error(
                        "❌ Không thể đọc localStorage:",
                        storageError
                    );
                }
            }
        }
        // =====================================================================
        // KIỂM TRA DỮ LIỆU
        // =====================================================================
        if (!dataBaoCao) {
            console.error(
                "❌ Không tìm thấy thông tin báo cáo."
            );
            alert(
                "Không tìm thấy thông tin báo cáo!"
            );
            return;
        }
        console.log("📄 Báo cáo:");
        console.log(dataBaoCao);
        console.log("📊 Kết quả:");
        console.log(dataKetQua);
        // =====================================================================
        // 4. HIỂN THỊ TIÊU ĐỀ
        // =====================================================================
        const titleEl =
            document.getElementById(
                "headerFileName"
            );
        if (titleEl) {
            titleEl.textContent =
                dataBaoCao.tieu_de ||
                dataBaoCao.ten_file ||
                dataBaoCao.file_name ||
                reportId;
        }
        // =====================================================================
        // 5. HIỂN THỊ TÀI LIỆU PDF KÈM LỚP BÔI MÀU
        // =====================================================================
        const vungPdf =
            document.getElementById("pdfViewer");

        if (!vungPdf) {
            console.error(
                "❌ Không tìm thấy vùng #pdfViewer trong HTML."
            );
        } else {

            vungPdf.innerHTML =
                '<div style="color:#ddd;padding:40px;">Đang tải tài liệu...</div>';

            try {
                const pdfBlob =
                    await layPdfSach();

                if (!pdfBlob || pdfBlob.size === 0) {
                    throw new Error("File tài liệu rỗng.");
                }

                const soTrang =
                    await PdfHighlightViewer.mo(
                        pdfBlob,
                        "pdfViewer"
                    );

                // Mặc định bôi màu toàn bộ câu trùng với mọi nguồn
                const soVet =
                    PdfHighlightViewer.boiMau(chiTietCauTrung);

                console.log(
                    `📄 Đã render ${soTrang} trang, bôi màu ${soVet} vệt.`
                );

                // Link tải xuống trỏ về bản có sẵn highlight do worker vẽ,
                // không phải bản sạch đang dùng để render
                capNhatThanhCongCu(
                    soTrang,
                    `http://localhost:5000/api/kiem-tra/chi-tiet/${encodeURIComponent(reportId)}/document`
                );

                // Dải ảnh thu nhỏ dựng sau cùng để không làm chậm nội dung chính
                PdfHighlightViewer.taoThumbnail("pdfThumbnails");

            } catch (err) {

                console.error("❌ Lỗi hiển thị tài liệu:", err);

                vungPdf.innerHTML = `
                    <div style="color:#f87171;padding:40px;">
                        Không tải được tài liệu: ${err.message}
                    </div>`;
            }
        }

        /**
         * Lấy bản PDF CHƯA bôi màu để render.
         *
         * API /document trả về file trong thư mục upload2 — bản này đã được
         * worker vẽ sẵn highlight. Nếu lấy bản đó, lớp bôi màu của trang sẽ
         * chồng lên lớp có sẵn trong file. Vì vậy ưu tiên bản PDF trung gian
         * mà LibreOffice sinh ra khi convert (`..._temp.pdf`) — file này sạch
         * và đã được server phục vụ tĩnh qua /uploads.
         *
         * @returns {Promise<Blob>} Nội dung PDF
         */
        async function layPdfSach() {

            const duongDanGoc =
                (dataBaoCao && dataBaoCao.tep_tin) || "";

            const tenFile =
                duongDanGoc.split(/[\\/]/).pop() || "";

            if (tenFile) {

                // .docx -> bản convert trung gian; .pdf -> dùng luôn file gốc
                const tenPdfSach =
                    /\.pdf$/i.test(tenFile)
                        ? tenFile
                        : tenFile.replace(/\.[^.]+$/, "") + "_temp.pdf";

                const urlSach =
                    `http://localhost:5000/uploads/${encodeURIComponent(tenPdfSach)}`;

                try {
                    const res = await fetch(urlSach);

                    if (res.ok) {
                        const blob = await res.blob();

                        if (blob.size > 0) {
                            console.log(
                                "📄 Dùng bản PDF sạch:",
                                tenPdfSach
                            );
                            return blob;
                        }
                    }
                } catch (err) {
                    console.warn(
                        "Không lấy được bản PDF sạch, quay về bản đã bôi màu.",
                        err
                    );
                }
            }

            // Dự phòng: bản trong upload2 (đã có sẵn highlight của worker)
            const res =
                await fetch(
                    `http://localhost:5000/api/kiem-tra/chi-tiet/${encodeURIComponent(reportId)}/document`
                );

            if (!res.ok) {
                throw new Error(`Máy chủ trả về ${res.status}`);
            }

            console.warn(
                "⚠️ Đang dùng bản PDF đã bôi màu sẵn, highlight có thể chồng lớp."
            );

            return await res.blob();
        }

        /**
         * Gắn số trang, nút phóng to/thu nhỏ và liên kết tải xuống.
         */
        function capNhatThanhCongCu(soTrang, urlTaiXuong) {

            const oTieuDe = document.getElementById("pdfTitle");
            const oTrangHienTai = document.getElementById("pdfPageInput");
            const oTongTrang = document.getElementById("pdfPageTotal");
            const oMucZoom = document.getElementById("pdfZoomLevel");
            const nutPhongTo = document.getElementById("pdfZoomIn");
            const nutThuNho = document.getElementById("pdfZoomOut");
            const nutIn = document.getElementById("pdfPrint");
            const linkTai = document.getElementById("pdfDownload");

            if (oTieuDe && dataBaoCao) {
                oTieuDe.textContent = dataBaoCao.tieu_de || reportId;
            }

            if (oTongTrang) {
                oTongTrang.textContent = `/ ${soTrang}`;
            }

            if (oTrangHienTai) {

                oTrangHienTai.max = soTrang;

                // Gõ số trang rồi Enter thì nhảy tới trang đó
                oTrangHienTai.addEventListener("change", () => {
                    const so = Number(oTrangHienTai.value);
                    if (so >= 1 && so <= soTrang) {
                        PdfHighlightViewer.cuonToiTrang(so);
                    }
                });

                // Cuộn tới đâu thì ô số trang và ảnh thu nhỏ chạy theo tới đó
                const vungPdf = PdfHighlightViewer.layVungChua();

                if (vungPdf) {
                    let dangCho = null;
                    vungPdf.addEventListener("scroll", () => {
                        clearTimeout(dangCho);
                        dangCho = setTimeout(() => {
                            const trang =
                                PdfHighlightViewer.layTrangHienTai();
                            oTrangHienTai.value = trang;
                            PdfHighlightViewer.danhDauThumbDangXem(trang);
                        }, 120);
                    });
                }
            }

            const nutTrangTruoc = document.getElementById("pdfPrevPage");
            const nutTrangSau = document.getElementById("pdfNextPage");

            if (nutTrangTruoc) {
                nutTrangTruoc.addEventListener("click", () => {
                    PdfHighlightViewer.cuonToiTrang(
                        Math.max(1, PdfHighlightViewer.layTrangHienTai() - 1)
                    );
                });
            }

            if (nutTrangSau) {
                nutTrangSau.addEventListener("click", () => {
                    PdfHighlightViewer.cuonToiTrang(
                        Math.min(soTrang, PdfHighlightViewer.layTrangHienTai() + 1)
                    );
                });
            }

            // Ẩn/hiện dải ảnh thu nhỏ để lấy thêm chỗ cho tài liệu
            const nutThumbs = document.getElementById("pdfToggleThumbs");
            const vungThumbs = document.getElementById("pdfThumbnails");

            if (nutThumbs && vungThumbs) {
                nutThumbs.addEventListener("click", () => {
                    const dangAn = vungThumbs.style.display === "none";
                    vungThumbs.style.display = dangAn ? "block" : "none";
                    nutThumbs.classList.toggle("pdf-nut--bat", dangAn);
                });
            }

            if (linkTai) {
                linkTai.href = urlTaiXuong;
                linkTai.setAttribute("download", `${reportId}.pdf`);
            }

            if (nutIn) {
                nutIn.addEventListener("click", () => {
                    window.open(urlTaiXuong, "_blank");
                });
            }

            const hienMucZoom = () => {
                if (oMucZoom) {
                    oMucZoom.textContent =
                        Math.round(PdfHighlightViewer.layTyLe() * 100) + "%";
                }
            };

            hienMucZoom();

            if (nutPhongTo) {
                nutPhongTo.addEventListener("click", async () => {
                    await PdfHighlightViewer.datTyLe(
                        PdfHighlightViewer.layTyLe() + 0.2
                    );
                    hienMucZoom();
                });
            }

            if (nutThuNho) {
                nutThuNho.addEventListener("click", async () => {
                    await PdfHighlightViewer.datTyLe(
                        PdfHighlightViewer.layTyLe() - 0.2
                    );
                    hienMucZoom();
                });
            }
        }



        // =====================================================================
        // 6. HIỂN THỊ TỶ LỆ TRÙNG LẶP TỔNG QUAN
        // =====================================================================

        const scoreEl =
            document.getElementById(
                "overallSimilarityScore"
            );


        let tiLeTongQuan = 0;


        if (dataKetQua) {

            tiLeTongQuan =
                Number(
                    dataKetQua.ti_le_trung_lap
                ) || 0;

        } else {

            tiLeTongQuan =
                Number(
                    dataBaoCao.do_trung_lap
                ) || 0;
        }


        console.log(
            "📊 Tỷ lệ trùng lặp:",
            tiLeTongQuan + "%"
        );


        if (scoreEl) {

            scoreEl.textContent =
                `${tiLeTongQuan}%`;
        }


        // =====================================================================
        // 7. ĐỒNG BỘ ID total-similarity-percent
        // =====================================================================

        const totalSimPercentEl =
            document.getElementById(
                "total-similarity-percent"
            );


        if (totalSimPercentEl) {

            totalSimPercentEl.textContent =
                `${tiLeTongQuan}%`;
        }


        // =====================================================================
        // 8. DANH SÁCH NGUỒN TRÙNG LẶP
        // =====================================================================

        const similarityListContainer =
            document.getElementById(
                "similarityListContainer"
            );


        const sidebarMatchCount =
            document.getElementById(
                "sidebarMatchCount"
            );


        const totalSourcesCount =
            document.getElementById(
                "totalSourcesCount"
            );


        // =====================================================================
        // LẤY DANH SÁCH ĐOẠN TRÙNG LẶP
        //
        // Cấu trúc dữ liệu mong muốn:
        //
        // dataKetQua.do_trung_lap = [
        //     {
        //         tieu_de_doi_sanh: "Quyết định 3875/QĐ-UBND 2017 ...",
        //         do_tuong_dong: 64
        //     },
        //     {
        //         tieu_de_doi_sanh: "Luận văn: Trắc nghiệm trực tuyến",
        //         do_tuong_dong: 79
        //     }
        // ]
        // =====================================================================


        if (
            thongKe &&
            Array.isArray(
                thongKe.thong_ke_theo_mau
            )
        ) {
            chiTietDanhSach =
                thongKe.thong_ke_theo_mau;
        }


        console.log(
            "📚 Danh sách nguồn trùng từ API:",
            chiTietDanhSach
        );


        // =====================================================================
        // 9. SẮP XẾP
        //
        // Ưu tiên 1:
        //     do_tuong_dong giảm dần
        //
        // Ưu tiên 2:
        //     Nếu cùng % thì sắp xếp theo
        //     tieu_de_doi_sanh tăng dần
        // =====================================================================

        chiTietDanhSach.sort(
            function (a, b) {

                const similarityA =
                    Number(a.ti_le_trung_lap) || 0;

                const similarityB =
                    Number(b.ti_le_trung_lap) || 0;


                // -------------------------------------------------------------
                // 1. Độ tương đồng cao hơn đứng trước
                // -------------------------------------------------------------

                if (
                    similarityB !== similarityA
                ) {

                    return (
                        similarityB -
                        similarityA
                    );
                }


                // -------------------------------------------------------------
                // 2. Nếu bằng nhau thì sắp xếp theo tên file
                // -------------------------------------------------------------

                const titleA =
                    String(
                        a.ten_bao_cao || ""
                    ).trim();

                const titleB =
                    String(
                        b.ten_bao_cao || ""
                    ).trim();


                return titleA.localeCompare(
                    titleB,
                    "vi",
                    {
                        sensitivity: "base"
                    }
                );

            }
        );

        const tongSoTaiLieu =
            chiTietDanhSach.length;

        chiTietDanhSach =
            chiTietDanhSach.slice(0, 20);



        console.log(
            "📚 Tổng số nguồn trùng:",
            tongSoTaiLieu
        );


        // =====================================================================
        // 10. HIỂN THỊ SỐ NGUỒN
        // =====================================================================

        if (sidebarMatchCount) {

            sidebarMatchCount.textContent =
                `${tongSoTaiLieu} tài liệu`;

        }


        if (totalSourcesCount) {

            totalSourcesCount.textContent =
                `${tongSoTaiLieu} nguồn trùng lặp`;

        }


        // =====================================================================
        // 11. HIỂN THỊ CARD NGUỒN TRÙNG
        // =====================================================================

        if (similarityListContainer) {

            // -------------------------------------------------------------
            // XÓA DANH SÁCH CŨ
            // -------------------------------------------------------------

            similarityListContainer.innerHTML = "";


            // =============================================================
            // CÓ NGUỒN TRÙNG
            // =============================================================

            if (tongSoTaiLieu > 0) {

                chiTietDanhSach.forEach(
                    function (item, index) {

                        // -------------------------------------------------
                        // TÊN FILE ĐỐI SÁNH
                        // -------------------------------------------------

                        const tenTaiLieuMau =
                            String(
                                item.ten_bao_cao ||
                                item.id_bao_cao ||
                                "Không có tên tài liệu"
                            ).trim();


                        // -------------------------------------------------
                        // ĐỘ TƯƠNG ĐỒNG
                        // -------------------------------------------------

                        const phanTramTrung =
                            Number(
                                item.ti_le_trung_lap
                            ) || 0;


                        // -------------------------------------------------
                        // CARD
                        // -------------------------------------------------

                        const card =
                            document.createElement("div");


                        card.className =
                            "source-card";


                        // -------------------------------------------------
                        // HEADER
                        //
                        // Ví dụ:
                        //
                        // 1.  TRÙNG LẶP - 79%
                        //
                        // -------------------------------------------------

                        const header =
                            document.createElement("div");


                        header.className =
                            "source-card-header";


                        header.innerHTML = `

                    <span>
                        <span style="
                            color:#64748b;
                            margin-right:6px;
                        ">
                            ${index + 1}
                        </span>

                        <span>
                            TRÙNG LẶP -
                        </span>

                        <span style="
                            color:#94a3b8;
                            margin-left:3px;
                        ">
                            ${phanTramTrung}%
                        </span>
                    </span>

                `;


                        // -------------------------------------------------
                        // TÊN FILE
                        //
                        // Đây chính là:
                        // item.tieu_de_doi_sanh
                        //
                        // -------------------------------------------------

                        const title =
                            document.createElement("div");


                        title.className =
                            "source-card-title";


                        title.textContent =
                            tenTaiLieuMau;

                        card.style.cursor = "pointer";
                        card.addEventListener("click", function () {
console.log(
"🔥 CLICK NGUON:",
tenTaiLieuMau
);
                            document.querySelectorAll(".source-card")
                                .forEach(c => c.style.border = "none");

                            card.style.border = "2px solid #3b82f6";

                            const idBaoCaoNguon =
                                item.id_bao_cao;

                            const dsCauTrung =
                                chiTietCauTrung.filter(cau =>
                                    cau.danh_sach_nguon.some(
                                        nguon =>
                                            nguon.id_bao_cao === idBaoCaoNguon
                                    )
                                );

                            // Bôi màu lại trong PDF, chỉ giữ phần trùng với
                            // đúng nguồn vừa chọn, rồi cuộn tới chỗ đầu tiên
                            // để thấy ngay thay đổi
                            if (window.PdfHighlightViewer) {

                                const soVet =
                                    PdfHighlightViewer.boiMau(dsCauTrung);

                                console.log(
                                    `🖍️ Bôi màu ${soVet} vệt cho nguồn ${idBaoCaoNguon}`
                                );

                                if (soVet > 0) {
                                    PdfHighlightViewer.cuonToiVetDau();
                                }

                                const oThongBao =
                                    document.getElementById("pdfMatchInfo");

                                if (oThongBao) {
                                    oThongBao.style.display = "flex";
                                    oThongBao.textContent =
                                        soVet > 0
                                            ? `Đang tô ${soVet} chỗ trùng với ${tenTaiLieuMau}`
                                            : `Không tìm thấy vị trí trùng của ${tenTaiLieuMau} trong tài liệu`;
                                }
                            }

                            const dsDoanTrung =
                                chiTietDoanTrung.filter(doan =>
                                    doan.id_bao_cao_nguon ===
                                    idBaoCaoNguon
                                );

                            const dsDoanChapVa =
                                chiTietDoanChapVa.filter(doan =>
                                    doan.danh_sach_id_bao_cao_nguon.includes(
                                        idBaoCaoNguon
                                    )
                                );

                            console.log("================================");
                            console.log("📚 NGUỒN:", tenTaiLieuMau);
                            console.log("🆔 ID:", idBaoCaoNguon);

                            console.log(
                                "✅ SỐ CÂU TRÙNG:",
                                dsCauTrung.length
                            );

                            console.log(
                                "✅ SỐ ĐOẠN TRÙNG:",
                                dsDoanTrung.length
                            );

                            console.log(
                                "✅ SỐ ĐOẠN CHẮP VÁ:",
                                dsDoanChapVa.length
                            );

                            console.log(
                                "CHI TIẾT CÂU:",
                                dsCauTrung
                            );
                            console.log(
                                "MAU CAU TRUNG:",
                                dsCauTrung[0]
                            );
                            console.log(
                                "CHI TIẾT ĐOẠN:",
                                dsDoanTrung
                            );

                            console.log(
                                "CHI TIẾT CHẮP VÁ:",
                                dsDoanChapVa
                            );
                            window.currentSourceData = {
                                source: item,
                                dsCauTrung,
                                dsDoanTrung,
                                dsDoanChapVa
                            };
                            const panel =
                                document.getElementById(
                                    "matchedSentencePanel"
                                );
console.log(
    "PANEL TIM THAY:",
    panel
);

console.log(
    "SO CAU:",
    dsCauTrung.length
);

console.log(
    "SO DOAN:",
    dsDoanTrung.length
);
                            panel.innerHTML = `
    <h3 style="
        margin-bottom:12px;
        color:#0f172a;
    ">
        ${tenTaiLieuMau}
    </h3>
`;
                            dsCauTrung.forEach((cau, index) => {

                                const nguon =
                                    cau.danh_sach_nguon.find(
                                        n => n.id_bao_cao === idBaoCaoNguon
                                    );

                                if (!nguon) return;

                                panel.innerHTML += `
        <div class="khoi-cau-trung" data-chi-so-cau="${index}" style="
            border:1px solid #ddd;
            border-radius:8px;
            margin-bottom:12px;
            overflow:hidden;
            cursor:pointer;
        " title="Bấm để xem vị trí câu này trong tài liệu">

            <div style="
                background:#f1f5f9;
                padding:8px;
                font-weight:bold;
                display:flex;
                justify-content:space-between;
            ">
                <span>Câu trùng ${index + 1}</span>
                <span style="color:#2563eb;font-weight:normal;">Xem trong bài &rsaquo;</span>
            </div>

            <div style="
                padding:10px;
                background:#fff7cc;
            ">
                <b>Bài nộp</b><br>
                ${cau.cau_kiem_tra}
            </div>

            <div style="
                padding:10px;
                background:#dbeafe;
            ">
                <b>Nguồn</b><br>
                ${nguon.cau_nguon}
            </div>

        </div>
    `;
                            });
                            if (dsDoanTrung.length > 0) {

                                panel.innerHTML += `
        <h3 style="
            margin-top:15px;
            margin-bottom:10px;
            color:#dc2626;
        ">
            Đoạn trùng
        </h3>
    `;

                                dsDoanTrung.forEach((doan, index) => {

                                    panel.innerHTML += `
            <div style="
                border:1px solid #ddd;
                border-radius:8px;
                margin-bottom:12px;
                overflow:hidden;
            ">

                <div style="
                    background:#fef2f2;
                    padding:8px;
                    font-weight:bold;
                ">
                    Đoạn ${index + 1}
                </div>

                <div style="
                    padding:10px;
                    background:#fff7cc;
                ">
                    ${doan.doan_kiem_tra}
                </div>

                <div style="
                    padding:10px;
                    background:#dbeafe;
                ">
                    ${doan.doan_nguon}
                </div>

            </div>
        `;
                                });
                            }

                            // Bấm vào một câu ở bảng bên phải thì cuộn tài liệu
                            // tới đúng vị trí câu đó và làm nổi nó lên
                            panel
                                .querySelectorAll(".khoi-cau-trung")
                                .forEach(khoi => {

                                    khoi.addEventListener("click", () => {

                                        const chiSo =
                                            Number(khoi.dataset.chiSoCau);

                                        const timThay =
                                            window.PdfHighlightViewer &&
                                            PdfHighlightViewer.cuonToiCau(chiSo);

                                        // Làm nổi khối đang chọn ở bảng bên phải
                                        panel
                                            .querySelectorAll(".khoi-cau-trung")
                                            .forEach(k => {
                                                k.style.borderColor = "#ddd";
                                                k.style.boxShadow = "none";
                                            });

                                        khoi.style.borderColor =
                                            timThay ? "#f57c00" : "#cbd5e1";
                                        khoi.style.boxShadow =
                                            timThay
                                                ? "0 0 0 2px rgba(245,124,0,.25)"
                                                : "none";

                                        const oThongBao =
                                            document.getElementById("pdfMatchInfo");

                                        if (oThongBao && !timThay) {
                                            oThongBao.style.display = "flex";
                                            oThongBao.textContent =
                                                "Không xác định được vị trí câu này trong tài liệu"
                                                + " (chữ trong PDF khác với chữ đã trích xuất).";
                                        }
                                    });
                                });

                            console.log("================================");
                        });
                        card.appendChild(
                            header
                        );

                        card.appendChild(
                            title
                        );

                        similarityListContainer.appendChild(
                            card
                        );

                    }
                );


            }

            // =============================================================
            // KHÔNG CÓ NGUỒN TRÙNG
            // =============================================================

            else {

                similarityListContainer.innerHTML = `

            <p style="
                text-align:center;
                color:#64748b;
                padding:20px;
                font-size:13px;
            ">

                Không phát hiện nguồn trùng lặp.

            </p>

        `;

            }

        }



        // =====================================================================
        // 12. HIỂN THỊ FOOTER
        // =====================================================================

        const lastModifiedEl =
            document.getElementById(
                "lastModifiedDisplay"
            );


        if (lastModifiedEl) {

            // =================================================================
            // NGƯỜI THỰC HIỆN
            // =================================================================

            const systemAuthor =
                localStorage.getItem("ho_ten") ||
                dataBaoCao.tac_gia ||
                "văn hưng";


            // =================================================================
            // THỜI GIAN
            // =================================================================

            let timeSource =
                (
                    dataKetQua &&
                    dataKetQua.ngay_kiem_tra
                ) ||
                dataBaoCao.ngay_tai_len;


            let formattedDate =
                "20/08/2026 14:35:37";
            // =================================================================
            // FORMAT NGÀY
            // =================================================================
            if (timeSource) {
                const dateObj =
                    new Date(timeSource);
                if (
                    !isNaN(
                        dateObj.getTime()
                    )
                ) {
                    formattedDate =
                        dateObj.toLocaleString(
                            "vi-VN",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric"
                            }
                        );
                }
            }
            // =================================================================
            // HIỂN THỊ
            // =================================================================
            lastModifiedEl.textContent =
                `Chỉnh sửa lần cuối: ${formattedDate} bởi ${systemAuthor}`;
        }
        // =====================================================================
        // 13. HOÀN TẤT
        // =====================================================================
        console.log(
            "=============================================="
        );
        console.log(
            "✅ HOÀN TẤT TẢI TRANG CHI TIẾT"
        );
        console.log(
            "📌 Report ID:",
            reportId
        );
        console.log(
            "📊 Tỷ lệ:",
            tiLeTongQuan + "%"
        );
        console.log(
            "📚 Nguồn:",
            tongSoTaiLieu
        );
        console.log(
            "=============================================="
        );
    } catch (error) {

        // =====================================================================
        // LỖI CHUNG
        // =====================================================================
        console.error(
            "=============================================="
        );
        console.error(
            "❌ LỖI KHI TẢI CHI TIẾT BÁO CÁO"
        );
        console.error(
            error
        );
        console.error(
            "=============================================="
        );
    }
});
