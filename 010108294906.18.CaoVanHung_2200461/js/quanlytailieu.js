/**
 * quanlytailieu.js - Quản lý tài liệu & xử lý các Modal & Phân trang
 */

let selectedFiles = [];
const MAX_FILES = 4;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Biến cho phân trang và lưu trữ toàn bộ dữ liệu báo cáo
let allBaoCaoData = [];
let currentPage = 1;
let rowsPerPage = 10; // Mặc định 10 dòng/trang

function getSystemUserName() {
    return localStorage.getItem("ho_ten")
        || localStorage.getItem("username")
        || document.getElementById("navUserName")?.textContent?.trim()
        || "";
}

// -------------------------------------------------------------------
// 1. CÁC HÀM XỬ LÝ ALERT (THÔNG BÁO HỆ THỐNG)
// -------------------------------------------------------------------
function showAlert(message, title = "Thông báo hệ thống!") {
    const alertBox = document.getElementById('systemAlert');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');

    if (alertMessage) alertMessage.textContent = message;
    if (alertTitle) alertTitle.textContent = title;
    if (alertBox) alertBox.style.display = 'block';
}

function closeAlert() {
    const alertBox = document.getElementById('systemAlert');
    if (alertBox) alertBox.style.display = 'none';
}

// -------------------------------------------------------------------
// 2. MODAL KIỂM TRA TÀI LIỆU & NHẬP VĂN BẢN
// -------------------------------------------------------------------
async function openDocModal() {
    const modal = document.getElementById('checkDocModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const authorInput = document.getElementById('authorName') || modal.querySelector('input[type="text"]');
    const userId = localStorage.getItem("id_nguoi_dung") || localStorage.getItem("userId") || "ND001";

    try {
        const res = await fetch(`http://localhost:5000/api/auth/profile/${userId}`);
        const result = await res.json();

        if (result.success && result.data) {
            const user = result.data;
            const freshName = user.ho_ten || user.fullname || user.ten_dang_nhap;

            if (authorInput && freshName) {
                authorInput.value = freshName;
                localStorage.setItem("ho_ten", freshName);
                return;
            }
        }
    } catch (err) {
        console.warn("Không lấy được profile từ CSDL, dùng tên dự phòng:", err);
    }

    if (authorInput) {
        authorInput.value = getSystemUserName();
    }
}

function closeDocModal() {
    const modal = document.getElementById('checkDocModal');
    if (modal) modal.style.display = 'none';
    selectedFiles = [];
    renderFileList();
    resetCheckOptions();
}

function openInputTextModal() {
    closeDocModal();
    const modal = document.getElementById('inputTextModal');
    if (modal) modal.style.display = 'flex';
}

function closeInputTextModal() {
    const modal = document.getElementById('inputTextModal');
    if (modal) modal.style.display = 'none';

    const titleInput = document.getElementById('inputTextTitle');
    const contentInput = document.getElementById('inputTextContent');
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
}

function switchToUploadModal() {
    closeInputTextModal();
    openDocModal();
}

function handleCheckTypeChange(radio) {
    const pageRangeBox = document.getElementById('pageRangeBox');
    const labelCheckAll = document.getElementById('labelCheckAll');
    const labelCheckPart = document.getElementById('labelCheckPart');

    if (radio.value === 'part') {
        if (pageRangeBox) pageRangeBox.style.display = 'block';
        if (labelCheckPart) labelCheckPart.classList.add('active');
        if (labelCheckAll) labelCheckAll.classList.remove('active');
    } else {
        if (pageRangeBox) pageRangeBox.style.display = 'none';
        if (labelCheckAll) labelCheckAll.classList.add('active');
        if (labelCheckPart) labelCheckPart.classList.remove('active');
    }
}

function resetCheckOptions() {
    const pageRangeInput = document.getElementById('pageRangeInput');
    const pageRangeBox = document.getElementById('pageRangeBox');
    const labelCheckAll = document.getElementById('labelCheckAll');
    const labelCheckPart = document.getElementById('labelCheckPart');
    const defaultRadio = document.querySelector('input[name="checkType"][value="all"]');

    if (pageRangeInput) pageRangeInput.value = '';
    if (pageRangeBox) pageRangeBox.style.display = 'none';
    if (defaultRadio) defaultRadio.checked = true;
    if (labelCheckAll) labelCheckAll.classList.add('active');
    if (labelCheckPart) labelCheckPart.classList.remove('active');
}

// -------------------------------------------------------------------
// 3. XỬ LÝ FILE & RENDER DANH SÁCH FILE
// -------------------------------------------------------------------
function handleFiles(files) {
    const fileArray = Array.from(files);

    if (selectedFiles.length + fileArray.length > MAX_FILES) {
        showAlert(`Vượt quá giới hạn! Tối đa chỉ được chọn ${MAX_FILES} tài liệu.`);
        return;
    }

    fileArray.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
            showAlert(`File "${file.name}" vượt quá dung lượng tối đa 20MB!`);
            return;
        }

        const isDuplicate = selectedFiles.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            selectedFiles.push(file);
        }
    });

    renderFileList();
}

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

function renderFileList() {
    const container = document.getElementById('fileListContainer');
    const checkOptions = document.getElementById('checkOptions');
    const pageRangeBox = document.getElementById('pageRangeBox');

    if (!container) return;

    if (selectedFiles.length === 0) {
        container.className = 'file-list-empty';
        container.innerHTML = `
            <p class="empty-title">Danh sách tài liệu trống</p>
            <p class="empty-sub">Kéo thả tài liệu hoặc chọn file ở ô bên trái</p>
        `;
        if (checkOptions) checkOptions.style.display = 'none';
        if (pageRangeBox) pageRangeBox.style.display = 'none';
        return;
    }

    container.className = '';
    container.innerHTML = selectedFiles.map((file, index) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const iconClass = ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-word';
        const iconColor = ext === 'pdf' ? '#dc2626' : '#2b579a';

        return `
            <div class="file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-bottom: 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <i class="fa-solid ${iconClass}" style="color: ${iconColor}; font-size: 20px;"></i>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;" title="${file.name}">${file.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="color: #64748b; font-size: 13px;">${formatFileSize(file.size)}</span>
                    <i class="fa-solid fa-xmark" style="color: #ef4444; cursor: pointer; font-size: 18px;" onclick="removeFile(${index})" title="Xóa"></i>
                </div>
            </div>
        `;
    }).join('');

    if (checkOptions) checkOptions.style.display = 'block';
}

// -------------------------------------------------------------------
// 4. HÀM LOAD DỮ LIỆU & PHÂN TRANG
// -------------------------------------------------------------------
async function loadBaoCaoTable() {
    try {
        const userId = localStorage.getItem("id_nguoi_dung") || localStorage.getItem("userId") || "";

        const url = userId
            ? `http://localhost:5000/api/bao-cao/tai-lieu-nop/${userId}`
            : 'http://localhost:5000/api/bao-cao';

        const response = await fetch(url);
        const result = await response.json();
        console.log("DATA API:", result.data);
        if (!result.success || !result.data) {
            allBaoCaoData = [];
        } else {
            allBaoCaoData = result.data;
        }

        renderTablePage();
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu bảng:", err);
    }
}

// Render dữ liệu theo trang hiện tại (10 dòng/trang)
// Render dữ liệu theo trang hiện tại (10 dòng/trang) một cách hoàn toàn động
function renderTablePage() {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;

    const totalRecords = allBaoCaoData.length;

    if (totalRecords === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">Không có dữ liệu tài liệu của bạn</td>
            </tr>
        `;
        updatePaginationUI(0, 1);
        return;
    }

    const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, totalRecords);
    const paginatedItems = allBaoCaoData.slice(start, end);

    tbody.innerHTML = '';
    paginatedItems.forEach((item) => {
        const row = document.createElement('tr');

        // Lấy đúng ID, Tiêu đề và Thời gian của từng item trong CSDL (không gán cứng)
        const rowId = item.id_bao_cao || item._id;
        console.log(
            "RENDER:",
            rowId,
            item.do_trung_lap,
            item.trang_thai
        );
        const tieuDe = item.tieu_de || 'Tài liệu chưa có tiêu đề';

        // Hiển thị ngày tải lên hoặc chỉnh sửa lần cuối dựa hoàn toàn vào dữ liệu của báo cáo đó
        let dateStr = '';
        if (item.ngay_tai_len) {
            const dateObj = new Date(item.ngay_tai_len);
            dateStr = dateObj.toLocaleDateString('vi-VN') + ' ' + dateObj.toLocaleTimeString('vi-VN');
        } else {
            dateStr = '-';
        }

        const chuaCoKetQua = item.do_trung_lap === undefined || item.do_trung_lap === null;

        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td style="font-weight: 500; color: #1e293b;">${rowId || '-'}</td>
            <td style="font-weight: 500; color: #0f172a;" title="${tieuDe}">${tieuDe}</td>
            <td id="trung-lap-${rowId}">
                ${chuaCoKetQua ? '<div class="loading-spinner"></div>' : `
                    <span style="color: #10b981; font-weight: 600;">${item.do_trung_lap}%</span>
                    <span class="detail-action-container">
                        <button class="detail-link-btn" onclick="xemChiTietChiTiet('${rowId}')">
                            <i class="fa-solid fa-arrow-right" style="font-size: 11px;"></i> chi tiết
                        </button>
                    </span>
                `}
            </td>
            <td style="color: #475569; white-space: nowrap;">${dateStr}</td>
            <td id="trang-thai-${rowId}">
                ${chuaCoKetQua ? '<span class="badge-dang-xu-ly">Đang xử lý</span>' : `<span style="background: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: 500;">${item.trang_thai || 'Đã xử lý'}</span>`}
            </td>
            <td style="white-space: nowrap;">
                <button style="border: none; background: transparent; cursor: pointer; color: #0284c7; margin-right: 6px; font-size: 15px;" title="Lưu tài liệu" data-hanh-dong="luu" data-ma="${rowId}"><i class="fa-solid fa-floppy-disk"></i></button>
                <button style="border: none; background: transparent; cursor: pointer; color: #d97706; margin-right: 6px; font-size: 15px;" title="Chỉnh sửa" data-hanh-dong="sua" data-ma="${rowId}"><i class="fa-solid fa-pen-to-square"></i></button>
                <button style="border: none; background: transparent; cursor: pointer; color: #16a34a; margin-right: 6px; font-size: 15px;" title="Tải xuống" data-hanh-dong="tai" data-ma="${rowId}"><i class="fa-solid fa-download"></i></button>
                <button style="border: none; background: transparent; cursor: pointer; color: #dc2626; font-size: 15px;" onclick="deleteDocRow(this)" title="Xóa tài liệu"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
    updatePaginationUI(totalRecords, totalPages);
}
// Cập nhật tổng số dòng vào #totalRecordCount và số trang vào #currentPageBtn
function updatePaginationUI(totalRecords, totalPages) {
    const totalCountElem = document.getElementById('totalRecordCount');
    if (totalCountElem) {
        totalCountElem.textContent = totalRecords;
    }

    const pageBtnEl = document.getElementById('currentPageBtn');
    if (pageBtnEl) {
        pageBtnEl.textContent = currentPage;
    }
}

/**
 * Hàm gọi API kiểm tra trạng thái xử lý ngầm định kỳ
 */
function theoDoiTrangThaiXuLy() {

    // Chặn hai lượt quét chồng lên nhau khi máy chủ trả chậm
    let dangQuet = false;

    setInterval(async () => {
        const dangXuLyElements =
            document.querySelectorAll('.badge-dang-xu-ly');

        if (dangXuLyElements.length > 0 && !dangQuet) {
            dangQuet = true;
            try {

                const userId =
                    localStorage.getItem("id_nguoi_dung")
                    || localStorage.getItem("userId")
                    || "";

                const url = userId
                    ? `http://localhost:5000/api/bao-cao/tai-lieu-nop/${userId}`
                    : 'http://localhost:5000/api/bao-cao';

                const response = await fetch(url);
                const result = await response.json();

                if (result.success && result.data) {

                    allBaoCaoData = result.data;

                    renderTablePage();
                }

            } catch (err) {
                console.error(
                    "Lỗi khi quét trạng thái tự động:",
                    err
                );
            } finally {
                dangQuet = false;
            }
        }
    }, 3000);
}
// -------------------------------------------------------------------
// 5. SUBMIT KIỂM TRA TÀI LIỆU
// -------------------------------------------------------------------
async function submitCheckDoc() {
    if (selectedFiles.length === 0) {
        showAlert("Vui lòng tải lên ít nhất một tài liệu!");
        return;
    }

    const selectedRadio = document.querySelector('input[name="checkType"]:checked');
    const checkType = selectedRadio ? selectedRadio.value : 'all';
    const pageRangeInput = document.getElementById('pageRangeInput');
    const pageRange = pageRangeInput ? pageRangeInput.value.trim() : '';

    if (checkType === 'part' && !pageRange) {
        showAlert("Vui lòng nhập trang cần kiểm tra (ví dụ: 1-5, 8, 11-13)!");
        return;
    }

    const idSinhVien = localStorage.getItem("id_nguoi_dung") || localStorage.getItem("userId") || "";
    const filesToUpload = [...selectedFiles];

    closeDocModal();

    try {
        for (const file of filesToUpload) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('id_sinh_vien', idSinhVien);
            formData.append('checkType', checkType);
            formData.append('pageRange', pageRange);

            try {
                const res = await fetch('http://localhost:5000/api/bao-cao/upload', {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                if (result.success) {
                    console.log(`Đã tiếp nhận file: ${file.name}`);
                } else {
                    console.error(`Lỗi khi upload file ${file.name}:`, result.message);
                }
            } catch (err) {
                console.error("Lỗi kết nối:", err);
            }
        }

        showAlert("Đã gửi tài liệu lên hệ thống và đang tiến hành xử lý!");
        await loadBaoCaoTable();

    } catch (error) {
        console.error("Lỗi kết nối tới API:", error);
        showAlert("Không thể kết nối đến máy chủ backend!");
    }
}

function submitInputTextDoc() {
    const title = document.getElementById('inputTextTitle')?.value.trim();
    const content = document.getElementById('inputTextContent')?.value.trim();

    if (!title) {
        showAlert("Vui lòng nhập tiêu đề!");
        return;
    }

    if (!content) {
        showAlert("Vui lòng nhập nội dung cần kiểm tra!");
        return;
    }

    closeInputTextModal();
    showAlert("Đã gửi yêu cầu kiểm tra nội dung thành công!");
}

// -------------------------------------------------------------------
// 6. POPUP XÁC NHẬN XÓA & XÓA TÀI LIỆU
// -------------------------------------------------------------------
function showConfirmModal(message, onConfirm) {
    let confirmModal = document.getElementById('customConfirmModal');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'customConfirmModal';
        confirmModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4);
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        confirmModal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 12px; width: 400px; max-width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 2px solid #0284c7;">
                <h3 style="color: #0284c7; margin-bottom: 12px; font-size: 20px; font-weight: 600;">Thông báo hệ thống!</h3>
                <p id="confirmMessageText" style="color: #334155; margin-bottom: 24px; font-size: 15px; line-height: 1.5;"></p>
                <div style="display: flex; justify-content: center; gap: 12px;">
                    <button id="confirmBtnYes" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Đồng ý</button>
                    <button id="confirmBtnNo" style="background: #e2e8f0; color: #475569; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Hủy</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }

    document.getElementById('confirmMessageText').textContent = message;
    confirmModal.style.display = 'flex';

    const btnYes = document.getElementById('confirmBtnYes');
    const btnNo = document.getElementById('confirmBtnNo');

    const newBtnYes = btnYes.cloneNode(true);
    const newBtnNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);

    newBtnYes.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        if (onConfirm) onConfirm();
    });

    newBtnNo.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });
}

async function deleteDocRow(btnElement) {
    const row = btnElement.closest('tr');
    if (!row) return;

    const idCell = row.querySelector('td:nth-child(2)');
    if (!idCell) return;
    const rowId = idCell.textContent.trim();

    showConfirmModal("Bạn có chắc chắn muốn xóa tài liệu này?", async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/bao-cao/${rowId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok && (result.success !== false)) {
                allBaoCaoData = allBaoCaoData.filter(item => (item.id_bao_cao !== rowId && item._id !== rowId));
                renderTablePage();
                updateTotalDocCount();
                showAlert("Đã xóa tài liệu thành công khỏi hệ thống!", "Thành công");
            } else {
                showAlert("Xóa thất bại: " + (result.message || "Không thể xóa tài liệu."), "Lỗi");
            }
        } catch (error) {
            console.error("Lỗi kết nối khi xóa tài liệu:", error);
            showAlert("Không thể kết nối đến máy chủ để xóa tài liệu!", "Lỗi kết nối");
        }
    });
}

function updateTotalDocCount() {
    const totalCountElem = document.getElementById('totalRecordCount');
    if (totalCountElem) {
        totalCountElem.textContent = allBaoCaoData.length;
    }
}

function clearFilter() {
    const idInput = document.getElementById('id');
    const titleInput = document.getElementById('title');
    const authorInput = document.getElementById('author') || document.getElementById('authorName');

    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';

    if (authorInput) {
        authorInput.value = getSystemUserName();
    }
}

// -------------------------------------------------------------------
// 7. CÁC HÀM ĐIỀU HƯỚNG PHÂN TRANG 
// -------------------------------------------------------------------
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage();
    }
}

function nextPage() {
    const totalPages = Math.ceil(allBaoCaoData.length / rowsPerPage) || 1;
    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage();
    }
}

function changeRowsPerPage(selectObj) {
    rowsPerPage = parseInt(selectObj.value) || 10;
    currentPage = 1;
    renderTablePage();
}

// -------------------------------------------------------------------
// 8. KHỞI TẠO SỰ KIỆN KHI DOM TẢI XONG
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadBaoCaoTable();

    // Bật lại việc tự quét trạng thái. Trước đây dòng này bị chú thích nên
    // bài chấm xong vẫn hiện "Đang xử lý" cho tới khi người dùng bấm F5.
    theoDoiTrangThaiXuLy();

    const filterAuthorInput = document.getElementById('author') || document.getElementById('authorName');
    if (filterAuthorInput) {
        filterAuthorInput.value = getSystemUserName();
    }

    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            if (e.dataTransfer && e.dataTransfer.files) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }
});

// -------------------------------------------------------------------
// 9. XỬ LÝ CHECKBOX CHỌN TẤT CẢ & ĐỔI MÀU DÒNG
// -------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const table = document.querySelector(".data-table");
    if (!table) return;

    table.addEventListener("change", function (event) {
        const target = event.target;

        if (target.matches("thead input[type='checkbox']")) {
            const isChecked = target.checked;
            const itemCheckboxes = table.querySelectorAll("tbody input.row-checkbox");

            itemCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const row = checkbox.closest("tr");
                if (row) {
                    if (isChecked) {
                        row.classList.add("selected-row");
                    } else {
                        row.classList.remove("selected-row");
                    }
                }
            });
        }

        if (target.matches("tbody input.row-checkbox")) {
            const row = target.closest("tr");
            if (row) {
                if (target.checked) {
                    row.classList.add("selected-row");
                } else {
                    row.classList.remove("selected-row");
                }
            }

            const headerCheckbox = table.querySelector("thead input[type='checkbox']");
            const itemCheckboxes = table.querySelectorAll("tbody input.row-checkbox");
            if (headerCheckbox && itemCheckboxes.length > 0) {
                const allChecked = Array.from(itemCheckboxes).every(cb => cb.checked);
                headerCheckbox.checked = allChecked;
            }
        }
    });
});

// -------------------------------------------------------------------
// 10. HÀM ĐỒNG BỘ LẠI 
// -------------------------------------------------------------------
function refreshTableData(btn) {
    const buttonElement = btn || document.querySelector('.refresh-btn');
    const icon = buttonElement ? buttonElement.querySelector('i') : null;

    if (icon) {
        icon.style.transition = "transform 0.3s ease";
        icon.style.transform = "rotate(360deg)";
    }

    location.reload();
}
/*function formatDoTrungLap(val) {
    if (val === undefined || val === null || val === '') return '0%';
    let num = Number(val);
    if (isNaN(num)) return '0%';

    // Trả về trực tiếp giá trị kèm dấu % mà không nhân 100 hay ép .toFixed(2)
    return num + '%';
}
/**
 * Chuyển hướng sang trang chi tiết kèm theo ID báo cáo
 */
/**
 * Chuyển hướng sang trang chi tiết kèm theo dữ liệu của báo cáo được chọn
 */
function xemChiTietChiTiet(rowId) {
    if (!rowId) {
        console.error("Không tìm thấy mã báo cáo!");
        return;
    }

    // Tìm đúng object báo cáo trong danh sách hiện tại
    const selectedDoc = allBaoCaoData.find(item => (item.id_bao_cao === rowId || item._id === rowId));

    if (selectedDoc) {
        // Lưu vào localStorage để trang chi tiết đọc mà không cần gọi API gây lỗi 404
        localStorage.setItem("currentChiTietBaoCao", JSON.stringify(selectedDoc));
    }

    window.location.href = `chitiet.html?id=${rowId}`;
}