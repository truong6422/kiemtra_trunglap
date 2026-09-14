const BACKEND_URL = 'http://localhost:5000';

/**
 * Tải tệp của một bài nộp về máy.
 *
 * Máy chủ chạy ở cổng khác trang web nên thuộc tính download của thẻ a bị bỏ
 * qua, bấm vào là nhảy hẳn sang địa chỉ API. Vì vậy tải nội dung về bộ nhớ
 * trước rồi mới dựng liên kết tải.
 */
async function taiTepBaiNop(idBaoCao, tenGoiY) {
    if (!idBaoCao) {
        alert('Không tìm thấy mã báo cáo của bài nộp này!');
        return false;
    }

    try {
        const res = await fetch(
            `${BACKEND_URL}/api/bao-cao/tai-xuong/${encodeURIComponent(idBaoCao)}`);

        if (!res.ok) {
            alert(res.status === 404
                ? 'Không tìm thấy tệp của bài nộp này trên máy chủ.'
                : 'Không tải được tệp, máy chủ trả về mã ' + res.status);
            return false;
        }

        let ten = tenGoiY || 'tai-lieu-nop';
        const cd = res.headers.get('Content-Disposition') || '';
        const khop = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
        if (khop) ten = decodeURIComponent(khop[1]);

        const dia = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = dia;
        a.download = ten;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(dia), 20000);
        return true;

    } catch (err) {
        console.error('Lỗi khi tải tệp bài nộp:', err);
        alert('Không kết nối được máy chủ: ' + err.message);
        return false;
    }
}

/**
 * Hai nút ở cột Hành động của bảng bài nộp phía giảng viên.
 *
 * Bảng được dựng lại mỗi lần tải nên nghe sự kiện ở cấp tài liệu. Nút Xem mở
 * thẳng trang chi tiết báo cáo, ở đó giảng viên thấy luôn phần câu trùng đã
 * bôi màu của sinh viên.
 */
document.addEventListener('click', async function (e) {

    const nutXem = e.target.closest('[data-xem-bao-cao]');
    if (nutXem && nutXem.dataset.xemBaoCao) {
        e.preventDefault();
        window.open(`chitiet.html?id=${encodeURIComponent(nutXem.dataset.xemBaoCao)}`, '_blank');
        return;
    }

    const nutTai = e.target.closest('[data-tai-bao-cao]');
    if (nutTai && nutTai.dataset.taiBaoCao) {
        e.preventDefault();
        await taiTepBaiNop(nutTai.dataset.taiBaoCao, nutTai.dataset.tenTep);
    }
});

// Đặt đoạn kết nối socket ở ngoài cùng của file JS
// Khai báo biến lưu ID bài tập đang xem ở phạm vi toàn cục
let currentViewingBaiTapId = null;

// Đoạn code tự động cập nhật định kỳ mỗi 3 giây
setInterval(() => {
    if (currentViewingBaiTapId) {
        console.log('🔄 Đang tự động làm mới dữ liệu bài nộp...');
        
        // Thay dòng này bằng hàm gọi API lấy lại dữ liệu bài nộp của bạn
        // Ví dụ: loadDanhSachBaiNop(currentViewingBaiTapId);
    }
}, 300);
// HÀM CHUNG: Chuyển đổi định dạng thời gian cho thẻ input datetime-local
function formatDateTimeForInput(dateString) {
    if (!dateString || dateString === "Không giới hạn") return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
// HÀM CHUẨN HÓA THỜI GIAN ĐỊA PHƯƠNG SANG ISO ĐỂ GỬI LÊN CSDL KHÔNG BỊ LỆCH MÚI GIỜ
function parseLocalDateTimeToISO(datetimeLocalValue) {
    if (!datetimeLocalValue) return null;
    const date = new Date(datetimeLocalValue);
    return isNaN(date.getTime()) ? null : date.toISOString();
}
// 1. QUẢN LÝ MODAL THÊM BÀI TẬP
const createExerciseModal = document.getElementById('createExerciseModal');
const closeExerciseModalX = document.getElementById('closeExerciseModalX');
const cancelExerciseModalBtn = document.getElementById('cancelExerciseModalBtn');
document.addEventListener('click', function (e) {
    const targetBtn = e.target.closest('#openAddExerciseModalBtn') || e.target.closest('.btn-join-class');
    if (targetBtn && (targetBtn.innerText.includes('Thêm bài tập') || targetBtn.id === 'openAddExerciseModalBtn')) {
        if (createExerciseModal) {
            createExerciseModal.style.display = 'flex';
        }
    }
});
if (closeExerciseModalX) {
    closeExerciseModalX.onclick = () => { if (createExerciseModal) createExerciseModal.style.display = 'none'; };
}
if (cancelExerciseModalBtn) {
    cancelExerciseModalBtn.onclick = () => { if (createExerciseModal) createExerciseModal.style.display = 'none'; };
}
if (createExerciseModal) {
    createExerciseModal.onclick = (event) => {
        if (event.target === createExerciseModal) createExerciseModal.style.display = 'none';
    };
}
// 2. VALIDATE INPUT TÊN BÀI TẬP
const exerciseNameInput = document.getElementById('exerciseNameInput');
const saveExerciseBtn = document.getElementById('saveExerciseBtn');
if (exerciseNameInput && saveExerciseBtn) {
    exerciseNameInput.addEventListener('input', function () {
        if (this.value.trim() !== '') {
            saveExerciseBtn.removeAttribute('disabled');
            saveExerciseBtn.style.cursor = 'pointer';
            saveExerciseBtn.style.opacity = '1';
        } else {
            saveExerciseBtn.setAttribute('disabled', 'true');
            saveExerciseBtn.style.cursor = 'not-allowed';
            saveExerciseBtn.style.opacity = '0.6';
        }
    });
}
// 3. XỬ LÝ CẤU HÌNH TỆP & CHECKBOX
const deleteFileBtn = document.getElementById('deleteFileBtn');
const fileConfigBox = document.getElementById('fileConfigBox');
const fileHeaderRow = document.getElementById('fileHeaderRow');
const addFileBtn = document.getElementById('addFileBtn');
if (deleteFileBtn) {
    deleteFileBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (fileConfigBox) fileConfigBox.style.display = 'none';
        if (fileHeaderRow) fileHeaderRow.style.display = 'none';
    });
}
if (addFileBtn) {
    addFileBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (fileConfigBox) fileConfigBox.style.display = 'block';
        if (fileHeaderRow) fileHeaderRow.style.display = 'flex';
    });
}

// Modal "Cập nhật bài tập" có khung cấu hình tệp riêng nhưng chưa nơi nào gắn
// sự kiện, nên bấm "Xóa" không thu gọn được và "Thêm tệp bài tập" không mở
// lại được. Gắn bổ sung cho bộ nút của modal này.
const updateDeleteFileBtn = document.getElementById('updateDeleteFileBtn');
const updateAddFileBtn = document.getElementById('updateAddFileBtn');
const updateFileConfigBox = document.getElementById('updateFileConfigBox');
const updateFileHeaderRow = document.getElementById('updateFileHeaderRow');

if (updateDeleteFileBtn) {
    updateDeleteFileBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (updateFileConfigBox) updateFileConfigBox.style.display = 'none';
        if (updateFileHeaderRow) updateFileHeaderRow.style.display = 'none';
    });
}

if (updateAddFileBtn) {
    updateAddFileBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (updateFileConfigBox) updateFileConfigBox.style.display = 'block';
        if (updateFileHeaderRow) updateFileHeaderRow.style.display = 'flex';
    });
}
function enforceChecked(checkbox) {
    if (checkbox) {
        checkbox.addEventListener('change', function () {
            if (!this.checked) this.checked = true;
        });
    }
}
enforceChecked(document.getElementById('pdfCheckbox'));
enforceChecked(document.getElementById('wordCheckbox'));
enforceChecked(document.getElementById('duplicateCheckbox'));
// 4. HÀM KIỂM TRA QUYỀN GIÁO VIÊN (ĐÃ NÂNG CẤP TỰ ĐỘNG BẮT USER ID)
function checkIfUserIsTeacher(classData, userId) {
    if (!classData) return false;
    const currentLoggedUser = userId || window.currentUserId || localStorage.getItem('userId') || localStorage.getItem('id_nguoi_dung');
    if (classData.id_nguoi_dung && String(classData.id_nguoi_dung) === String(currentLoggedUser)) {
        return true;
    }
    const creatorId = classData.id_nguoi_tao || classData.creatorId || classData.teacher_id;
    if (creatorId && String(creatorId) === String(currentLoggedUser)) {
        return true;
    }
    const teachers = classData.teachers || classData.teachersList || [];
    return teachers.some(t => String(t.id || t.id_nguoi_dung || t._id) === String(currentLoggedUser));
}
// 5. ĐỒNG BỘ DỮ LIỆU TỪ BACKEND
async function syncClassExercisesFromDatabase(classData) {
    const classId = classData.id || classData.classId || classData.id_lop_hoc;
    if (!classId) return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/bai-tap/lop/${classId}`);
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            classData.exercisesList = result.data.map(ex => {
                const now = new Date();
                const startDate = ex.thoi_gian_bat_dau ? new Date(ex.thoi_gian_bat_dau) : null;
                const endDate = (ex.thoi_gian_ket_thuc && ex.thoi_gian_ket_thuc !== "Không giới hạn") ? new Date(ex.thoi_gian_ket_thuc) : null;
                let calculatedStatus = ex.trang_thai;
                if (startDate && now < startDate) {
                    calculatedStatus = 'Chưa mở';
                } else if (endDate && now > endDate) {
                    calculatedStatus = 'Đã hết hạn';
                } else {
                    calculatedStatus = 'Đang mở';
                }
                return {
                    id_bai_tap: ex.id_bai_tap,
                    id_lop_hoc: ex.id_lop_hoc,
                    tieu_de: ex.tieu_de,
                    huong_dan: ex.huong_dan,
                    thoi_gian_bat_dau: ex.thoi_gian_bat_dau,
                    thoi_gian_ket_thuc: ex.thoi_gian_ket_thuc,
                    trang_thai: calculatedStatus,
                    dinh_dang_file: ex.dinh_dang_file,
                    id_kiem_tra: ex.id_kiem_tra,
                    danh_sach_nop_bai: ex.danh_sach_nop_bai || [],
                    ngay_tao: ex.ngay_tao,
                    ngay_cap_nhat: ex.ngay_cap_nhat,
                    tg_mo: formatDisplayTime(ex.thoi_gian_bat_dau),
                    tg_dong: ex.thoi_gian_ket_thuc === "Không giới hạn" || !ex.thoi_gian_ket_thuc ? "Không giới hạn" : formatDisplayTime(ex.thoi_gian_ket_thuc)
                };
            });
        }
    } catch (error) {
        console.error("Lỗi đồng bộ từ CSDL:", error);
    }
}
function formatDisplayTime(timeInput) {
    if (!timeInput || timeInput === "Không giới hạn") return "Không giới hạn";
    const dateObj = new Date(timeInput);
    if (isNaN(dateObj.getTime())) return timeInput;
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
}
// 6. RENDER TAB BÀI TẬP
async function renderExercisesTab(classData, userId) {
    const tabContentContainer = document.getElementById('tabContentContainer');
    if (!tabContentContainer) return;

    // Nút lưu bài tập nằm trong một trình nghe click gắn ở cấp tài liệu nên
    // không nhận được classData qua tham số, phải lấy qua biến này. Trước đây
    // không nơi nào gán nên bài tập luôn rơi vào lớp số 1.
    window.currentClassData = classData;

    await syncClassExercisesFromDatabase(classData);
    const isTeacher = checkIfUserIsTeacher(classData, userId);
    tabContentContainer.innerHTML = `
        <div class="class-content-section" style="margin-top: 20px;">
            <div class="management-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="font-size: 20px; font-weight: 400; margin: 0; color: #202124;">Danh sách bài tập</h2>
                <div class="management-actions" style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn-refresh-sync" id="refreshExercisesBtn" title="Đồng bộ lại" style="background: #fff; border: 1px solid #dadce0; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; color: #3c4043;">
                        <i class="fa-solid fa-rotate"></i>
                        <span class="refresh-text" style="max-width: 0; overflow: hidden; white-space: nowrap; transition: max-width 0.3s ease; opacity: 0;">Đồng bộ lại</span>
                    </button>
                    ${isTeacher ? `
                    <button class="btn-join-class" id="openAddExerciseModalBtn" style="background-color: #1a73e8; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                        <i class="fa-solid fa-plus"></i> Thêm bài tập
                    </button>` : ''}
                </div>
            </div>
            <table class="class-table" style="width: 100%; margin-top: 15px; border-collapse: collapse; background: #fff; border: 1px solid #dadce0;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa; text-align: left; color: #3c4043; font-weight: 500;">Tiêu đề</th>
                        <th style="width: 150px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa; text-align: left; color: #3c4043; font-weight: 500;">Trạng thái</th>
                        <th style="width: 180px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa; text-align: left; color: #3c4043; font-weight: 500;">TG mở</th>
                        <th style="width: 180px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa; text-align: left; color: #3c4043; font-weight: 500;">TG đóng</th>
                        <th style="width: 130px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa; text-align: center; color: #3c4043; font-weight: 500;">Hành động</th>
                    </tr>
                </thead>
                <tbody id="exerciseTableBody"></tbody>
            </table>
        </div>
    `;
    updateExerciseTableContent(classData, userId);
    const refreshBtnElem = tabContentContainer.querySelector('#refreshExercisesBtn');
    if (refreshBtnElem) {
        const textSpan = refreshBtnElem.querySelector('.refresh-text');
        refreshBtnElem.onmouseenter = () => { textSpan.style.maxWidth = '100px'; textSpan.style.opacity = '1'; };
        refreshBtnElem.onmouseleave = () => { textSpan.style.maxWidth = '0'; textSpan.style.opacity = '0'; };
        refreshBtnElem.onclick = async () => {
            await syncClassExercisesFromDatabase(classData);
            const currentUserId = window.currentUserId || classData.id_nguoi_dung || 1;
            updateExerciseTableContent(classData, currentUserId);
        };
    }
    const openModalBtn = tabContentContainer.querySelector('#openAddExerciseModalBtn');
    if (openModalBtn) {
        openModalBtn.onclick = () => {
            if (createExerciseModal) {
                createExerciseModal.style.display = 'flex';
            }
        };
    }
}
// 7. CẬP NHẬT NỘI DUNG BẢNG VÀ PHÂN QUYỀN HÀNH ĐỘNG
function updateExerciseTableContent(classData, userId) {
    const tbody = document.getElementById('exerciseTableBody');
    if (!tbody) return;
    const isTeacher = checkIfUserIsTeacher(classData, userId);
    // Kiểm tra xem danh sách bài tập có dữ liệu từ CSDL hay không
    if (classData.exercisesList && classData.exercisesList.length > 0) {
        let rowsHtml = '';
        classData.exercisesList.forEach((ex, index) => {
            const title = ex.tieu_de || '';
            const status = ex.trang_thai || 'Chưa mở';
            const sTime = ex.tg_mo || '---';
            const eTime = ex.tg_dong || 'Không giới hạn';
            let statusBadge = `<span style="background-color: #f1f3f4; color: #5f6368; padding: 3px 12px; border-radius: 12px; font-size: 12px; border: 1px solid #dadce0;">${status}</span>`;
            if (status === 'Đang mở' || status === 'Đã mở') {
                statusBadge = `<span style="background-color: #e6f4ea; color: #137333; padding: 3px 12px; border-radius: 12px; font-size: 12px; border: 1px solid #ceead6;">Đang mở</span>`;
            } else if (status === 'Chưa mở') {
                statusBadge = `<span style="background-color: #fef7e0; color: #b06000; padding: 3px 12px; border-radius: 12px; font-size: 12px; border: 1px solid #fce8e6;">Chưa mở</span>`;
            } else if (status === 'Đã hết hạn') {
                statusBadge = `<span style="background-color: #fce8e6; color: #c5221f; padding: 3px 12px; border-radius: 12px; font-size: 12px; border: 1px solid #fad2cf;">Đã hết hạn</span>`;
            }
            let actionHtml = '';
            if (isTeacher) {
                // Thêm onclick="event.stopPropagation()" để không bị dính sự kiện click dòng khi bấm nút Sửa/Xóa
                actionHtml = `
                    <i class="fa-solid fa-pen-to-square edit-exercise-item" data-index="${index}" title="Sửa thông tin bài tập" style="cursor: pointer; margin-right: 14px; color: #f9ab00;" onclick="event.stopPropagation()"></i>
                    <i class="fa-solid fa-xmark delete-exercise-item" data-index="${index}" title="Xóa bài tập" style="cursor: pointer; color: #c5221f; font-weight: bold;" onclick="event.stopPropagation()"></i>
                `;
            } else {
                const isOpen = (status === 'Đang mở' || status === 'Đã mở');
                const actionStyle = isOpen
                    ? "cursor: pointer; color: #3b82f6;"
                    : "cursor: not-allowed; color: #9aa0a6; opacity: 0.5;";
                const submitStyle = isOpen
                    ? "cursor: pointer; color: #f59e0b;"
                    : "cursor: not-allowed; color: #9aa0a6; opacity: 0.5;";
                actionHtml = `
                    <i class="fa-solid fa-circle-info view-detail-exercise" data-index="${index}" title="${isOpen ? 'Chi tiết' : 'Bài tập không khả dụng'}" style="${actionStyle} margin-right: 14px; font-size: 16px;"></i>
                    <i class="fa-solid fa-paper-plane submit-exercise-item" data-index="${index}" title="${isOpen ? 'Nộp bài tập' : 'Bài tập không khả dụng'}" style="${submitStyle} font-size: 16px;"></i>
                `;
            }
            // Dành cho giáo viên: Thêm class nhận diện và đổi con trỏ thành pointer cho cả hàng
            const rowClass = isTeacher ? 'exercise-row-item' : '';
            const rowStyle = isTeacher ? 'cursor: pointer;' : '';
            rowsHtml += `
                <tr class="${rowClass}" data-index="${index}" data-id="${ex.id_bai_tap}" style="border: 1px solid #dadce0; ${rowStyle}">
                    <td style="border: 1px solid #dadce0; padding: 12px; color: #1a73e8;">${title}</td>
                    <td style="border: 1px solid #dadce0; padding: 12px;">${statusBadge}</td>
                    <td style="border: 1px solid #dadce0; padding: 12px; color: #5f6368; font-size: 13px;">${sTime}</td>
                    <td style="border: 1px solid #dadce0; padding: 12px; color: #5f6368; font-size: 13px;">${eTime}</td>
                    <td style="border: 1px solid #dadce0; padding: 12px; text-align: center;">${actionHtml}</td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;
    } else {
        // Nếu CSDL chưa có bài tập nào, hiển thị dòng trống như hình giao diện mẫu
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #5f6368; padding: 30px; border: 1px solid #dadce0;">Chưa có bài tập</td></tr>`;
    }
    // Gắn các sự kiện tương ứng
    attachExerciseActionEvents(classData, userId);
}
// 8. XỬ LÝ LƯU BÀI TẬP MỚI (GỌI API POST)
document.addEventListener('click', async function (e) {
    const saveBtn = e.target.closest('#saveExerciseBtn');
    if (!saveBtn || saveBtn.hasAttribute('disabled')) return;
    const nameInput = document.getElementById('exerciseNameInput');
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const title = nameInput ? nameInput.value.trim() : '';
    if (!title) {
        alert('Vui lòng nhập tên bài tập!');
        return;
    }
    const sVal = startTimeInput ? startTimeInput.value : '';
    const eVal = endTimeInput ? endTimeInput.value : '';
    const now = new Date();
    let startDateObj;
    let endDateObj = eVal ? new Date(eVal) : null;
    if (!sVal) {
        startDateObj = now;
    } else {
        startDateObj = new Date(sVal);
        const roundedNow = new Date();
        roundedNow.setSeconds(0, 0);
        if (startDateObj < roundedNow) {
            alert('Thời gian mở (bắt đầu) không được nhỏ hơn thời gian hiện tại!');
            return;
        }
        startDateObj = new Date(sVal);
    }
    if (endDateObj) {
        if (endDateObj < now) {
            alert('Thời gian đóng (kết thúc) không được nhỏ hơn thời gian hiện tại!');
            return;
        }
        if (endDateObj < startDateObj) {
            alert('Thời gian đóng (kết thúc) phải bằng hoặc lớn hơn thời gian mở (bắt đầu)!');
            return;
        }
    }
    let status = 'Đang mở';
    if (startDateObj && now < startDateObj) {
        status = 'Chưa mở';
    } else if (endDateObj && now > endDateObj) {
        status = 'Đã hết hạn';
    }
    const classData = window.currentClassData || window.classData;

    // Không xác định được lớp thì dừng hẳn. Trước đây chỗ này mặc định về lớp
    // số 1, nên bài tập tạo ở lớp nào cũng bị lưu sang lớp 1 mà không báo gì.
    const classId = classData &&
        (classData.id_lop_hoc || classData.id || classData.classId);

    if (!classId) {
        alert('Chưa xác định được lớp học đang mở. Vui lòng tải lại trang rồi thử lại.');
        return;
    }

    // Danh sách thành viên của lớp nằm ở classMembersList. Hai tên còn lại
    // không nơi nào gán, trước đây lấy nhầm nên bài tập mới tạo ra có danh
    // sách nộp bài rỗng, thống kê lớp học báo không ai phải nộp.
    const membersList = classData.classMembersList ||
        classData.members || classData.membersList || [];
    const fullPayload = {
        id_lop_hoc: Number(classId),
        tieu_de: title,
        huong_dan: "",
        thoi_gian_bat_dau: startDateObj.toISOString(),
        thoi_gian_ket_thuc: endDateObj ? endDateObj.toISOString() : "Không giới hạn",
        trang_thai: status,
        dinh_dang_file: "docx hoặc pdf",
        id_kiem_tra: null,
        danh_sach_nop_bai: membersList.map(m => ({
            // Thành viên lớp được lưu theo id_nguoi_dung; trước đây chỉ đọc
            // m.id nên mã người nộp luôn rỗng.
            id_sinh_vien: m.id_nguoi_dung || m.id || m.id_sinh_vien || "",
            ma_sinh_vien: m.ma_sinh_vien || m.code || "",
            ho_ten: m.ho_ten || m.name || "",
            email: m.email || m.tai_khoan || m.gmail || "",
            trang_thai_nop: "Chưa nộp",
            thoi_gian_nop: null,
            danh_sach_tep: []
        }))
    };
    try {
        const response = await fetch(`${BACKEND_URL}/api/bai-tap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullPayload)
        });
        const result = await response.json();
        if (!result.success) {
            alert('Lỗi lưu CSDL: ' + result.message);
            return;
        }
        nameInput.value = '';
        if (startTimeInput) startTimeInput.value = '';
        if (endTimeInput) endTimeInput.value = '';
        saveBtn.setAttribute('disabled', 'true');
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.style.opacity = '0.6';
        if (createExerciseModal) createExerciseModal.style.display = 'none';
        await syncClassExercisesFromDatabase(classData);
        const currentUserId = window.currentUserId || classData.id_nguoi_dung || 1;
        updateExerciseTableContent(classData, currentUserId);
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert('Không thể kết nối đến máy chủ!');
    }
});
// 9. GẮN SỰ KIỆN HÀNH ĐỘNG CHO CÁC NÚT TRÊN BẢNG
function attachExerciseActionEvents(classData, userId) {
    const isTeacher = checkIfUserIsTeacher(classData, userId);
    if (isTeacher) {
        // Dành cho giáo viên: Bấm vào bất kỳ đâu trên hàng bài tập để xem chi tiết
        document.querySelectorAll('.exercise-row-item').forEach(row => {
            row.onclick = function () {
                const index = this.getAttribute('data-index');
                const targetEx = classData.exercisesList[index];
                // Gọi đúng hàm hiển thị chi tiết bài tập dành cho giáo viên
                openTeacherExerciseDetailView(targetEx, classData, userId);
            };
        });
        let deleteModalCheck = document.getElementById('deleteConfirmModal');
        if (!deleteModalCheck) {
            const modalHtml = `
                <div id="deleteConfirmModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
                    <div style="background: #fff; padding: 24px; border-radius: 8px; width: 400px; border: 2px solid #007BFF; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: Arial, sans-serif;">
                        <h3 style="margin-top: 0; color: #202124; text-align: center; font-size: 22px; font-weight: 600;">Xóa bài tập</h3>
                        <p style="color: #5f6368; font-size: 18px; line-height: 1.5;">Bạn có chắc chắn muốn xóa bài tập này không?</p>
                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                            <button id="cancelDeleteBtn" class="btn-cancel" style="background: transparent; border: 1px solid #dadce0; background-color: #f94c17; color: #fff; font-size: 16px; padding: 9px 17px; border-radius: 4px; cursor: pointer; font-weight: 500;">Hủy</button>
                            <button id="confirmDeleteBtn" class="btn-confirm" style="background: #007BFF; border: none; color: #fff; font-size: 16px; padding: 9px 17px; border-radius: 4px; cursor: pointer; font-weight: 500;">Xác nhận</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        const deleteModal = document.getElementById('deleteConfirmModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        let targetIndexToDelete = null;
        document.querySelectorAll('.edit-exercise-item').forEach(btn => {
            btn.onclick = function (e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                const targetEx = classData && classData.exercisesList ? classData.exercisesList[index] : null;
                if (!targetEx) return;
                const updateModal = document.getElementById('updateExerciseModal');
                if (updateModal) {
                    updateModal.style.display = 'flex';
                    const nameInput = document.getElementById('updateExerciseNameInput');
                    if (nameInput) nameInput.value = targetEx.tieu_de || '';
                    const startTimeInput = document.getElementById('updateStartTimeInput');
                    if (startTimeInput) {
                        startTimeInput.value = formatDateTimeForInput(targetEx.thoi_gian_bat_dau);
                    }
                    const endTimeInput = document.getElementById('updateEndTimeInput');
                    if (endTimeInput) {
                        endTimeInput.value = formatDateTimeForInput(targetEx.thoi_gian_ket_thuc);
                    }
                    const descTextarea = document.getElementById('updateDescTextarea');
                    if (descTextarea) {
                        descTextarea.value = targetEx.huong_dan || '';
                    }
                    const saveUpdateBtn = document.getElementById('saveUpdateExerciseBtn');
                    if (saveUpdateBtn) {
                        saveUpdateBtn.setAttribute('data-editing-id', targetEx.id_bai_tap);
                    }
                }
            };
        });
        document.querySelectorAll('.delete-exercise-item').forEach(btn => {
            btn.onclick = function (e) {
                e.stopPropagation();
                targetIndexToDelete = parseInt(this.getAttribute('data-index'));
                if (deleteModal) deleteModal.style.display = 'flex';
            };
        });
        if (cancelDeleteBtn) {
            cancelDeleteBtn.onclick = () => {
                if (deleteModal) deleteModal.style.display = 'none';
                targetIndexToDelete = null;
            };
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.onclick = async () => {
                if (targetIndexToDelete !== null && classData.exercisesList) {
                    const targetEx = classData.exercisesList[targetIndexToDelete];
                    if (targetEx && targetEx.id_bai_tap) {
                        try {
                            const response = await fetch(`${BACKEND_URL}/api/bai-tap/${targetEx.id_bai_tap}`, { method: 'DELETE' });
                            const result = await response.json();
                            if (!result.success) alert('Lỗi khi xóa trên CSDL: ' + result.message);
                        } catch (error) {
                            console.error("Lỗi kết nối khi xóa:", error);
                            alert('Không thể kết nối đến máy chủ!');
                        }
                    }
                    if (deleteModal) deleteModal.style.display = 'none';
                    await syncClassExercisesFromDatabase(classData);
                    const currentUserId = window.currentUserId || classData.id_nguoi_dung || 1;
                    updateExerciseTableContent(classData, currentUserId);
                    targetIndexToDelete = null;
                }
            };
        }
    } else {
        // Dành cho học sinh
        document.querySelectorAll('.view-detail-exercise').forEach(btn => {
            btn.onclick = function (e) {
                const index = this.getAttribute('data-index');
                const targetEx = classData.exercisesList[index];
                const status = targetEx.trang_thai || '';
                if (status !== 'Đang mở' && status !== 'Đã mở') {
                    e.preventDefault();
                    alert(`Bài tập này đang ở trạng thái "${status}", bạn không thể xem chi tiết lúc này!`);
                    return;
                }
                openExerciseDetailOrSubmitView(targetEx, classData, userId, 'desc');
            };
        });
        document.querySelectorAll('.submit-exercise-item').forEach(btn => {
            btn.onclick = function (e) {
                const index = this.getAttribute('data-index');
                const targetEx = classData.exercisesList[index];
                const status = targetEx.trang_thai || '';
                if (status !== 'Đang mở' && status !== 'Đã mở') {
                    e.preventDefault();
                    alert(`Bài tập này đang ở trạng thái "${status}", bạn không thể nộp bài lúc này!`);
                    return;
                }
                openExerciseDetailOrSubmitView(targetEx, classData, userId, 'submit');
            };
        });
    }
    // --- TÍCH HỢP HOVER HIỆN POP-UP CHỌN TÀI LIỆU VÀ BẤM HIỆN MODAL ---
    const openSubmitModalBtn = document.getElementById('openSubmitModalBtn');
    if (openSubmitModalBtn) {
        let popupMenu = document.getElementById('submitPopupMenu');
        if (!popupMenu) {
            popupMenu = document.createElement('div');
            popupMenu.id = 'submitPopupMenu';
            // Chỉnh lại top: 24px hoặc canh lề right: 0 để thẳng hàng hoàn toàn với chữ Thêm file nộp phía trên
            popupMenu.style.cssText = 'display: none; position: absolute; right: 0; top: 24px; background: #fff; border: 1px solid #dadce0; box-shadow: 0 2px 6px rgba(0,0,0,0.15); border-radius: 4px; padding: 6px 0; z-index: 100; min-width: 140px;';
            popupMenu.innerHTML = `<div id="chonTaiLieuBtn" style="padding: 8px 16px; font-size: 13px; color: #3c4043; margin-left: 50px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s, color 0.2s;"><i class="fa-solid fa-paperclip" style="font-size: 12px;"></i> Chọn tài liệu</div>`;
            openSubmitModalBtn.parentNode.style.position = 'relative';
            openSubmitModalBtn.parentNode.appendChild(popupMenu);
            const chonTaiLieuItem = document.getElementById('chonTaiLieuBtn');
            if (chonTaiLieuItem) {
                chonTaiLieuItem.onmouseenter = () => {
                    chonTaiLieuItem.style.background = '#f1f3f4';
                    chonTaiLieuItem.style.color = '#1a73e8';
                };
                chonTaiLieuItem.onmouseleave = () => {
                    chonTaiLieuItem.style.background = 'transparent';
                    chonTaiLieuItem.style.color = '#3c4043';
                };
            }
        }
        let hideTimeout;
        openSubmitModalBtn.onmouseenter = () => {
            clearTimeout(hideTimeout);
            popupMenu.style.display = 'block';
        };
        openSubmitModalBtn.onmouseleave = () => {
            hideTimeout = setTimeout(() => { popupMenu.style.display = 'none'; }, 200);
        };
        popupMenu.onmouseenter = () => clearTimeout(hideTimeout);
        popupMenu.onmouseleave = () => { popupMenu.style.display = 'none'; };
    }
}
// Bắt sự kiện click toàn cục cho nút "Chọn tài liệu" (dù nút được sinh ra động)
document.addEventListener('click', function(event) {
    const chonTaiLieuBtn = event.target.closest('#chonTaiLieuBtn');
    if (chonTaiLieuBtn) {
        const popupMenu = document.getElementById('popupMenu'); // Đảm bảo đúng id menu của bạn
        const submitModal = document.getElementById('submitDocumentModal');
        if (popupMenu) popupMenu.style.display = 'none';
        if (submitModal) {
            submitModal.style.display = 'flex';
            // 👉 Gọi hàm lấy dữ liệu từ CSDL lên bảng ngay lập tức
            loadStudentDocumentsForSubmission();
        }
    }
});
// Bổ sung hàm render giao diện chi tiết / nộp bài (Hình 1 & Hình 2)
function openExerciseDetailOrSubmitView(targetEx, classData, userId, initialTab = 'submit') {
    window.currentTargetExercise = targetEx;
    const tabContentContainer = document.getElementById('tabContentContainer');
    if (!tabContentContainer) return;
    // Tính toán thời gian nộp bài hiển thị
    let timeDisplay = "Không giới hạn";
    const now = new Date("2026-08-22T22:25:37"); // Thời gian hiện tại theo hệ thống
    if (targetEx.thoi_gian_ket_thuc && targetEx.thoi_gian_ket_thuc !== "Không giới hạn") {
        const endTime = new Date(targetEx.thoi_gian_ket_thuc);
        const startTime = targetEx.thoi_gian_bat_dau ? new Date(targetEx.thoi_gian_bat_dau) : null;
        if (startTime && now < startTime) {
            timeDisplay = "Chưa mở";
        } else if (now <= endTime) {
            timeDisplay = "Đang mở";
        } else {
            timeDisplay = "Đã hết hạn";
        }
    } else {
        timeDisplay = "Không giới hạn";
    }
    // Kiểm tra trạng thái nộp bài của học sinh hiện tại (0/1 hoặc 1/1)
    const submissions = targetEx.danh_sach_nop_bai || [];
    const mySub = submissions.find(s => String(s.id_sinh_vien) === String(userId));
    const isSubmitted = mySub && mySub.trang_thai_nop === "Đã nộp";
    const submitStatusText = isSubmitted ? "1/1" : "0/1";
    const statusColor = isSubmitted ? "#137333" : "#c5221f";
    // Mô tả từ hướng dẫn của giáo viên
    const descriptionText = targetEx.huong_dan && targetEx.huong_dan.trim() !== ""
        ? targetEx.huong_dan
        : `<span style="color: #9aa0a6; font-style: italic;">Không có mô tả</span>`;
    tabContentContainer.innerHTML = `
        <div class="class-content-section" style="margin-top: 20px; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #dadce0;">
            <!-- Nút quay lại danh sách -->
            <button id="backToListBtn" style="background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 14px; margin-bottom: 15px; display: flex; align-items: center; gap: 6px; padding: 0;">
                <i class="fa-solid fa-arrow-left"></i> Quay lại danh sách bài tập
            </button>
            <h2 style="font-size: 22px; font-weight: 500; color: #202124; margin: 0 0 8px 0;">${targetEx.tieu_de || 'Bài kiểm tra'}</h2>
            <div style="font-size: 13px; color: #5f6368; margin-bottom: 20px;">
                Thời gian nộp bài: <span style="font-weight: 500; color: #3c4043;">${timeDisplay}</span>
            </div>
            <!-- Tabs: Mô tả & Bài nộp -->
            <div style="display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 20px; gap: 30px;">
                <button id="tabDescBtn" style="background: none; border: none; padding: 10px 0; font-size: 14px; font-weight: 500; cursor: pointer; color: ${initialTab === 'desc' ? '#1a73e8' : '#5f6368'}; border-bottom: ${initialTab === 'desc' ? '2px solid #1a73e8' : 'none'};">Mô tả</button>
                <button id="tabSubmitBtn" style="background: none; border: none; padding: 10px 0; font-size: 14px; font-weight: 500; cursor: pointer; color: ${initialTab === 'submit' ? '#1a73e8' : '#5f6368'}; border-bottom: ${initialTab === 'submit' ? '2px solid #1a73e8' : 'none'};">Bài nộp</button>
            </div>
            <!-- Nội dung Tab Mô tả -->
            <div id="contentDescTab" style="display: ${initialTab === 'desc' ? 'block' : 'none'}; font-size: 14px; color: #3c4043; line-height: 1.6;">
                ${descriptionText}
            </div>
            <!-- Nội dung Tab Bài nộp (Hình 1) -->
            <div id="contentSubmitTab" style="display: ${initialTab === 'submit' ? 'block' : 'none'};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 14px; font-weight: 500; color: #202124;">
                    Nộp bài tập 
                    <span class="my-badge-status" style="background-color: ${isSubmitted ? '#e6f4ea' : '#fce8e6'}; color: ${statusColor}; padding: 2px 8px; border-radius: 10px; font-size: 12px; border: 1px solid ${isSubmitted ? '#ceead6' : '#fad2cf'};">${submitStatusText}</span>
                </div>
                <div class="my-submit-box" style="border: 1px solid #dadce0; border-radius: 6px; padding: 16px; background: #fff; position: relative;">
                    ${isSubmitted ? `
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px; font-size: 14px; color: #3c4043;">
            <span style="font-weight: 500;">Mặc định</span>
            <!-- Chữ màu xanh có title Tải xuống và sự kiện bấm để tải file -->
            <span id="downloadSubmittedDoc" title="Tải xuống" style="color: #1a73e8; font-weight: 500; word-break: break-all; cursor: pointer; text-decoration: underline;">${mySub.ten_tep || 'Tài liệu đã nộp'}</span>
            <span style="font-size: 12px; color: #5f6368;">cập nhật vào ${mySub.tg_cap_nhat || ''}</span>
        </div>
        <div style="display: flex; gap: 15px; font-size: 14px;">
            <button id="downloadBtnAction" style="background: none; border: none; color: #1a73e8; cursor: pointer;" title="Tải xuống">Tải xuống</button>
            <button id="editSubmittedDocBtn" style="background: none; border: none; color: #1a73e8; cursor: pointer;" title="Chỉnh sửa">Chỉnh sửa</button>
            <button id="deleteSubmittedDocBtn" style="background: none; border: none; color: #ea4335; cursor: pointer;" title="Xoá">Xoá</button>
        </div>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: #f9ab00; font-style: italic;">
        *Bài nộp là những tài liệu đã kiểm tra trong danh mục tài liệu của bạn
    </div>
` : `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #3c4043;">
                                <span style="font-weight: 500;" title="Mặc định">Mặc định</span>
                                <span style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #5f6368; border: 1px solid #dadce0;">DOCX</span>
                                <span style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #5f6368; border: 1px solid #dadce0;">PDF</span>
                                <span style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #5f6368; border: 1px solid #dadce0;">DOC</span>
                            </div>
                            <div style="position: relative;">
                                <button id="openSubmitModalBtn" title="Mặc định" style="background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 14px; font-weight: 500;">Thêm file nộp</button>
                            </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #f9ab00; font-style: italic;">
                            *Bài nộp là những tài liệu đã kiểm tra trong danh mục tài liệu của bạn
                        </div>
                    `}
                </div>
            </div>
        <!-- Modal Gửi tài liệu / Chọn tài liệu (Hình 2) -->
       <!-- Modal Gửi tài liệu / Chọn tài liệu -->
<div id="submitDocumentModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
    <div style="background: #fff; width: 850px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column;">
        <!-- Tiêu đề căn giữa, bôi đậm -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #dadce0; position: relative;">
            <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #202124; flex: 1; text-align: center;">Gửi tài liệu</h3>
            <i class="fa-solid fa-xmark" id="closeSubmitModalX" style="cursor: pointer; color: #5f6368; font-size: 16px; position: absolute; right: 20px;"></i>
        </div>
        <div style="padding: 15px 20px;">
            <!-- Ô tìm kiếm và nút tìm kiếm -->
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                <input type="text" id="searchDocInput" placeholder="Tìm kiếm theo ID, Tiêu đề hoặc Ngày (ví dụ: BC586, BCTTKT, 19/8/2026)..." style="flex: 1; padding: 8px 12px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px; outline: none; transition: all 0.3s ease;">
                <button id="searchDocBtn" style="padding: 8px 16px; background: #f1f3f4; border: 1px solid #dadce0; border-radius: 4px; cursor: pointer; color: #3c4043; font-size: 14px; transition: all 0.2s ease;">Tìm kiếm</button>
            </div>
            <div style="max-height: 380px; overflow-y: auto; border: 1px solid #dadce0; border-radius: 4px;">
                <!-- THÊM table-layout: fixed ĐỂ CỐ ĐỊNH KÍCH THƯỚC CÁC CỘT -->
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <thead>
                        <tr style="background: #f8f9fa; position: sticky; top: 0; z-index: 1; border-bottom: 2px solid #dadce0;">
                            <!-- Cột 1: Checkbox (Cố định 45px) -->
                            <th style="padding: 8px 0; border-right: 1px solid #dadce0; font-size: 14px; text-align: center; width: 45px; min-width: 45px; max-width: 45px;">
                                <input type="checkbox" id="selectAllDocs" style="cursor: pointer; width: 15px; height: 15px; margin: 0 auto; display: block;">
                            </th>
                            <!-- Cột 2: ID (Cố định 75px) -->
                            <th style="padding: 8px 10px; border-right: 1px solid #dadce0; font-size: 14px; text-align: center; color: #3c4043; width: 75px; min-width: 75px; max-width: 75px;">ID <i class="fa-solid fa-sort"></i></th>
                            <!-- Cột 3: Tiêu đề (Tự động giãn phần còn lại) -->
                            <th style="padding: 8px 10px; border-right: 1px solid #dadce0; font-size: 14px; text-align: left; color: #3c4043;">Tiêu đề <i class="fa-solid fa-sort"></i></th>
                            <!-- Cột 4: TG tải lên (Cố định 160px) -->
                            <th style="padding: 8px 10px; border-right: 1px solid #dadce0; font-size: 14px; text-align: center; color: #3c4043; width: 160px; min-width: 160px; max-width: 160px;">TG tải lên <i class="fa-solid fa-sort"></i></th>
                            <!-- Cột 5: Độ trùng lặp (Cố định 130px) -->
                            <th style="padding: 8px 10px; font-size: 14px; text-align: center; color: #3c4043; width: 130px; min-width: 130px; max-width: 130px;">Độ trùng lặp <i class="fa-solid fa-sort"></i></th>
                        </tr>
                    </thead>
                    <tbody id="submitDocumentTableBody">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 30px; color: #5f6368; font-size: 14px;">Không có dữ liệu</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- Nút Hủy bỏ và Xác nhận -->
        <div style="display: flex; justify-content: flex-end; gap: 12px; padding: 14px 20px; border-top: 1px solid #dadce0; background: #f8f9fa;">
            <button id="cancelSubmitModalBtn" style="padding: 10px 22px; background: #fff; border: 1px solid #dadce0; border-radius: 4px; cursor: pointer; color: #3c4043; font-size: 14px; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background='#f1f3f4'; this.style.borderColor='#bdc1c6';" onmouseout="this.style.background='#fff'; this.style.borderColor='#dadce0';">Hủy bỏ</button>
            <button id="confirmSubmitModalBtn" style="padding: 10px 22px; background: #1a73e8; border: none; border-radius: 4px; cursor: pointer; color: #fff; font-size: 14px; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background='#1557b0';" onmouseout="this.style.background='#1a73e8';">Xác nhận</button>
        </div>
    </div>
</div>
    `;
    // Xử lý sự kiện tìm kiếm tài liệu trong modal
    const searchDocBtn = document.getElementById('searchDocBtn');
    const searchDocInput = document.getElementById('searchDocInput');
    if (searchDocBtn) {
        searchDocBtn.onclick = () => {
            const keyword = searchDocInput.value.toLowerCase();
            // Xử lý lọc dữ liệu trên bảng nếu cần
        };
    }
    // Xử lý nút Xác nhận nộp bài
    const confirmSubmitModalBtn = document.getElementById('confirmSubmitModalBtn');
    if (confirmSubmitModalBtn) {
        confirmSubmitModalBtn.onclick = async () => {
            const selectedInput = document.querySelector('input[name="selectedStudentDoc"]:checked, .doc-checkbox:checked');
            if (!selectedInput) {
                alert('Vui lòng chọn một tài liệu để nộp!');
                return;
            }
            const selectedDocId = selectedInput.value;
            const currentUserId = userId || window.currentUserId || localStorage.getItem('id_nguoi_dung') || localStorage.getItem('userId');
            if (!currentUserId) {
                alert('Không tìm thấy thông tin định danh sinh viên. Vui lòng đăng nhập lại!');
                return;
            }
            const currentEx = window.currentTargetExercise;
            if (!currentEx || !currentEx.id_bai_tap) {
                alert('Không xác định được bài tập mục tiêu!');
                return;
            }
            const chosenDoc = (typeof allStudentDocuments !== 'undefined') 
                ? allStudentDocuments.find(d => String(d.id_bao_cao) === String(selectedDocId)) 
                : null;
            const docTitle = chosenDoc && chosenDoc.tieu_de ? chosenDoc.tieu_de : `Tài liệu ${selectedDocId}`;
            let fileType = "docx";
            const lowerTitle = docTitle.toLowerCase();
            if (lowerTitle.endsWith('.pdf')) {
                fileType = "pdf";
            } else if (lowerTitle.endsWith('.doc')) {
                fileType = "doc";
            }
            const currentISOString = new Date().toISOString();
            const formattedTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
            const submitPayload = {
                id_bai_tap: currentEx.id_bai_tap,
                id_sinh_vien: currentUserId,
                id_bao_cao: selectedDocId,
                trang_thai_nop: "Đã nộp",
                loai_bao_cao: fileType,
                ten_tep: docTitle,
                thoi_gian_nop: currentISOString,
                tg_cap_nhat: formattedTimeStr
            };
            try {
                const response = await fetch(`${BACKEND_URL}/api/chi-tiet-nop-bai/nop-bai`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submitPayload)
                });
                const result = await response.json();
                if (response.ok || result.success) {
                    alert(`Nộp bài tập thành công!`);
                    const submitModal = document.getElementById('submitDocumentModal');
                    if (submitModal) submitModal.style.display = 'none';
                    // Cập nhật state cục bộ
                    if (!currentEx.danh_sach_nop_bai) currentEx.danh_sach_nop_bai = [];
                    let studentSub = currentEx.danh_sach_nop_bai.find(s => String(s.id_sinh_vien) === String(currentUserId));
                    if (studentSub) {
                        studentSub.trang_thai_nop = "Đã nộp";
                        studentSub.ten_tep = docTitle;
                        studentSub.thoi_gian_nop = currentISOString;
                        studentSub.tg_cap_nhat = formattedTimeStr;
                    } else {
                        currentEx.danh_sach_nop_bai.push({
                            id_sinh_vien: currentUserId,
                            trang_thai_nop: "Đã nộp",
                            ten_tep: docTitle,
                            thoi_gian_nop: currentISOString,
                            tg_cap_nhat: formattedTimeStr
                        });
                    }
                    // 👉 Gọi lại hàm render để giao diện lập tức chuyển thành 1/1 và hiện tên file đã nộp như ảnh yêu cầu
                    if (typeof openExerciseDetailOrSubmitView === 'function' && classData) {
                        openExerciseDetailOrSubmitView(currentEx, classData, currentUserId, 'submit');
                    }
                } else {
                    alert('Lỗi từ hệ thống khi lưu bài nộp: ' + (result.message || 'Không thành công'));
                }
            } catch (error) {
                console.error("Lỗi kết nối CSDL chi_tiet_nop_bai:", error);
                alert('Không thể kết nối đến máy chủ để lưu bài nộp!');
            }
        };
    }
    // Sự kiện chuyển Tab
    document.getElementById('tabDescBtn').onclick = () => {
        document.getElementById('contentDescTab').style.display = 'block';
        document.getElementById('contentSubmitTab').style.display = 'none';
        document.getElementById('tabDescBtn').style.color = '#1a73e8';
        document.getElementById('tabDescBtn').style.borderBottom = '2px solid #1a73e8';
        document.getElementById('tabSubmitBtn').style.color = '#5f6368';
        document.getElementById('tabSubmitBtn').style.borderBottom = 'none';
    };
    document.getElementById('tabSubmitBtn').onclick = () => {
        document.getElementById('contentDescTab').style.display = 'none';
        document.getElementById('contentSubmitTab').style.display = 'block';
        document.getElementById('tabSubmitBtn').style.color = '#1a73e8';
        document.getElementById('tabSubmitBtn').style.borderBottom = '2px solid #1a73e8';
        document.getElementById('tabDescBtn').style.color = '#5f6368';
        document.getElementById('tabDescBtn').style.borderBottom = 'none';
    };
    // Nút quay lại
    document.getElementById('backToListBtn').onclick = () => {
        renderExercisesTab(classData, userId);
    };
    // --- XỬ LÝ POPUP HOVER & MỞ MODAL ---
    const submitModal = document.getElementById('submitDocumentModal');
    const openSubmitModalBtn = document.getElementById('openSubmitModalBtn');
    const closeSubmitModalX = document.getElementById('closeSubmitModalX');
    const cancelSubmitModalBtn = document.getElementById('cancelSubmitModalBtn');
    if (openSubmitModalBtn) {
        let popupMenu = document.getElementById('submitPopupMenu');
        if (!popupMenu) {
            popupMenu = document.createElement('div');
            popupMenu.id = 'submitPopupMenu';
            // Canh lề phải (right: 0) và khoảng cách top phù hợp để thẳng hàng với nút Thêm file nộp
            // Sửa lại right: 0 và top: 30px để khung popup nằm ngay ngắn, thẳng hàng mép phải với chữ "Thêm file nộp"
            popupMenu.style.cssText = 'display: none; position: absolute; left: -20px; top: 30px; background: #fff; border: 1px solid #dadce0; box-shadow: 0 2px 6px rgba(0,0,0,0.15); border-radius: 4px; padding: 6px 0; z-index: 100; min-width: 140px;';
            popupMenu.innerHTML = `<div id="chonTaiLieuBtn" style="padding: 8px 16px; font-size: 13px; color: #3c4043; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s, color 0.2s;"><i class="fa-solid fa-paperclip" style="font-size: 12px;"></i> Chọn tài liệu</div>`;
            openSubmitModalBtn.parentNode.style.position = 'relative';
            openSubmitModalBtn.parentNode.appendChild(popupMenu);
            // Hiệu ứng hover đổi màu cho chữ "Chọn tài liệu"
            const chonTaiLieuItem = document.getElementById('chonTaiLieuBtn');
            if (chonTaiLieuItem) {
                chonTaiLieuItem.onmouseenter = () => {
                    chonTaiLieuItem.style.background = '#f1f3f4';
                    chonTaiLieuItem.style.color = '#1a73e8';
                };
                chonTaiLieuItem.onmouseleave = () => {
                    chonTaiLieuItem.style.background = 'transparent';
                    chonTaiLieuItem.style.color = '#3c4043';
                };
            }
        }
        let hideTimeout;
        openSubmitModalBtn.onmouseenter = () => {
            clearTimeout(hideTimeout);
            popupMenu.style.display = 'block';
        };
        openSubmitModalBtn.onmouseleave = () => {
            hideTimeout = setTimeout(() => { popupMenu.style.display = 'none'; }, 200);
        };
        popupMenu.onmouseenter = () => clearTimeout(hideTimeout);
        popupMenu.onmouseleave = () => { popupMenu.style.display = 'none'; };
        // Bấm vào chữ "Chọn tài liệu" -> Ẩn menu và bật Modal "Gửi tài liệu lên"
        const chonTaiLieuBtn = document.getElementById('chonTaiLieuBtn');
        if (chonTaiLieuBtn) {
            chonTaiLieuBtn.onclick = () => {
                popupMenu.style.display = 'none';
                if (submitModal) {
                    submitModal.style.display = 'flex';
                }
            };
        }
    }
    if (closeSubmitModalX) {
        closeSubmitModalX.onclick = () => { submitModal.style.display = 'none'; };
    }
    if (cancelSubmitModalBtn) {
        cancelSubmitModalBtn.onclick = () => { submitModal.style.display = 'none'; };
    }
}
// 11. XỬ LÝ ĐÓNG MODAL CẬP NHẬT
const closeUpdateModalX = document.getElementById('closeUpdateModalX');
const cancelUpdateModalBtn = document.getElementById('cancelUpdateModalBtn');
const updateModalElem = document.getElementById('updateExerciseModal');
if (closeUpdateModalX && updateModalElem) {
    closeUpdateModalX.onclick = () => { updateModalElem.style.display = 'none'; };
}
if (cancelUpdateModalBtn && updateModalElem) {
    cancelUpdateModalBtn.onclick = () => { updateModalElem.style.display = 'none'; };
}
// 12. XỬ LÝ LƯU CẬP NHẬT BÀI TẬP KHI BẤM NÚT "CẬP NHẬT"
const saveUpdateBtn = document.getElementById('saveUpdateExerciseBtn');
if (saveUpdateBtn) {
    saveUpdateBtn.onclick = async function () {
        const exerciseId = this.getAttribute('data-editing-id');
        if (!exerciseId) {
            alert('Không tìm thấy ID bài tập cần cập nhật!');
            return;
        }
        const tieuDe = document.getElementById('updateExerciseNameInput').value;
        const thoiGianBatDau = document.getElementById('updateStartTimeInput').value;
        const thoiGianKetThuc = document.getElementById('updateEndTimeInput').value;
        const huongDan = document.getElementById('updateDescTextarea').value;
        if (!tieuDe) {
            alert('Vui lòng nhập tên bài tập!');
            return;
        }
        const sDate = thoiGianBatDau ? new Date(thoiGianBatDau) : null;
        const eDate = thoiGianKetThuc ? new Date(thoiGianKetThuc) : null;
        const now = new Date();
        let calculatedStatus = 'Đang mở';
        if (sDate && now < sDate) {
            calculatedStatus = 'Chưa mở';
        } else if (eDate && now > eDate) {
            calculatedStatus = 'Đã hết hạn';
        }
        const updatePayload = {
            tieu_de: tieuDe,
            thoi_gian_bat_dau: sDate ? sDate.toISOString() : null,
            thoi_gian_ket_thuc: eDate ? eDate.toISOString() : "Không giới hạn",
            trang_thai: calculatedStatus,
            huong_dan: huongDan
        };
        try {
            const response = await fetch(`${BACKEND_URL}/api/bai-tap/${exerciseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload)
            });
            const result = await response.json();
            if (response.ok || result.success) {
                alert('Cập nhật bài tập và lưu vào CSDL thành công!');
                const updateModal = document.getElementById('updateExerciseModal');
                if (updateModal) updateModal.style.display = 'none';
                const classData = window.currentClassData || window.classData;
                if (classData) {
                    await syncClassExercisesFromDatabase(classData);
                    updateExerciseTableContent(classData, window.currentUserId || 1);
                }
            } else {
                alert('Lỗi cập nhật CSDL: ' + (result.message || 'Không thành công'));
            }
        } catch (error) {
            console.error('Lỗi kết nối API:', error);
            alert('Không thể kết nối đến máy chủ!');
        }
    };
}
// TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI GIAO DIỆN VÀ CSDL MỖI 1 GIÂY
setInterval(() => {
    const rows = document.querySelectorAll('#exerciseTableBody tr');
    if (!rows || rows.length === 0) return;
    const now = new Date();
    rows.forEach(row => {
        const idBaiTap = row.getAttribute('data-id');
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4 && idBaiTap && idBaiTap !== 'undefined') {
            const statusCell = cells[1];
            const endTimeText = cells[3].innerText.trim();
            if (endTimeText && endTimeText !== "Không giới hạn" && endTimeText !== "---") {
                const parts = endTimeText.split(' ');
                if (parts.length === 2) {
                    const timeParts = parts[0].split(':');
                    const dateParts = parts[1].split('/');
                    if (timeParts.length === 2 && dateParts.length === 3) {
                        const endDateTime = new Date(
                            parseInt(dateParts[2]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[0]),
                            parseInt(timeParts[0]),
                            parseInt(timeParts[1])
                        );
                        if (now > endDateTime && !statusCell.innerText.includes('Đã hết hạn')) {
                            statusCell.innerHTML = `<span style="background-color: #fce8e6; color: #c5221f; padding: 3px 12px; border-radius: 12px; font-size: 12px; border: 1px solid #fad2cf;">Đã hết hạn</span>`;
                            fetch(`${BACKEND_URL}/api/bai-tap/${idBaiTap}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ trang_thai: 'Đã hết hạn' })
                            }).then(res => res.json())
                                .then(data => console.log(`Đã cập nhật bài tập ${idBaiTap} thành Đã hết hạn trên CSDL`))
                                .catch(err => console.error("Lỗi cập nhật CSDL:", err));
                        }
                    }
                }
            }
        }
    });
}, 300);
// Hàm bật tắt hiển thị bảng chi tiết bài nộp của học sinh
function toggleStudentSubmissionDetail(rowId, iconId) {
    const detailRow = document.getElementById(rowId);
    const icon = document.getElementById(iconId);
    if (detailRow && icon) {
        if (detailRow.style.display === 'none') {
            detailRow.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
        } else {
            detailRow.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    }
}
// Hàm hiển thị giao diện chi tiết bài tập của giáo viên (Đã khôi phục đầy đủ và lấy đúng email từ CSDL)
// --- HÀM HIỂN THỊ GIAO DIỆN CHI TIẾT BÀI TẬP CỦA GIÁO VIÊN (ĐÃ NÂNG CẤP HIỂN THỊ ĐẦY ĐỦ BÀI NỘP) ---
async function openTeacherExerciseDetailView(exercise, classData, userId) {
    const tabContentContainer = document.getElementById('tabContentContainer');
    if (!tabContentContainer) return;

    // 1. Lấy chính xác mảng thành viên từ đối tượng lớp học
    let classMembers = [];
    if (classData && Array.isArray(classData.classMembersList)) {
        classMembers = classData.classMembersList;
    } else if (classData && Array.isArray(classData.danh_sach_thanh_vien)) {
        classMembers = classData.danh_sach_thanh_vien;
    } else if (window.currentClassData && Array.isArray(window.currentClassData.classMembersList)) {
        classMembers = window.currentClassData.classMembersList;
    }

    const title = exercise.tieu_de || 'Bài tập';
    const deadline = exercise.tg_dong ? `Thời gian nộp bài: ${exercise.tg_dong}` : 'Thời gian nộp bài: Không giới hạn';
    const instruction = exercise.huong_dan && exercise.huong_dan.trim() !== ""
        ? exercise.huong_dan
        : '<span style="color: #9aa0a6; font-style: italic;">Không có mô tả cho bài tập này.</span>';

    // 2. Gọi API lấy danh sách bài nộp thực tế từ CSDL cho bài tập này
    let submissions = exercise.danh_sach_nop_bai || [];
    const currentExId = String(exercise.id_bai_tap || exercise.id || exercise._id || '').trim();
    
    try {
        const res = await fetch(`${BACKEND_URL}/api/chi-tiet-nop-bai/danh-sach/${currentExId}`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
            submissions = result.data;
        }
    } catch (err) {
        console.error("Không thể đồng bộ danh sách bài nộp từ CSDL:", err);
    }

    // 3. Xây dựng danh sách hiển thị tự động
    let submissionsItems = '';
    
    const displayList = classMembers.length > 0 ? classMembers.map(member => {
        const mUserId = String(member.id_nguoi_dung || member.id || '').trim();

        // Khớp trực tiếp id_nguoi_dung của thành viên lớp với id_nguoi_dung đã được backend tự động ánh xạ
        const foundSub = submissions.find(s => {
            const sUserId = String(s.id_nguoi_dung || '').trim();
            const sStudentId = String(s.id_sinh_vien || '').trim();
            const mStudentId = String(member.id_sinh_vien || '').trim();

            return (mUserId !== '' && sUserId !== '' && sUserId.toLowerCase() === mUserId.toLowerCase()) ||
                   (mStudentId !== '' && sStudentId !== '' && sStudentId.toLowerCase() === mStudentId.toLowerCase());
        });

        // Format lại thời gian hiển thị từ ngay_nop hoặc updatedAt
        let rawTime = foundSub ? (foundSub.ngay_nop || foundSub.updatedAt || foundSub.tg_cap_nhat || '-') : '-';
        let formattedTime = '-';
        if (rawTime && rawTime !== '-') {
            try {
                const dateObj = new Date(rawTime);
                if (!isNaN(dateObj.getTime())) {
                    formattedTime = dateObj.toLocaleString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                } else {
                    formattedTime = rawTime;
                }
            } catch (e) {
                formattedTime = rawTime;
            }
        }

        return {
            ho_ten: member.ho_ten || member.name || 'Học sinh',
            email: member.email || member.tai_khoan || member.gmail || 'Chưa có email',
            trang_thai_nop: foundSub ? (foundSub.trang_thai || 'Đã nộp') : 'Chưa nộp',
            tieu_de_tep: foundSub ? (foundSub.tieu_de_tep || foundSub.ten_tep || foundSub.ten_file || '-') : '-',
            tg_cap_nhat: formattedTime,
            id_bao_cao: foundSub ? foundSub.id_bao_cao : null
        };
    }) : submissions;

    if (displayList.length > 0) {
        displayList.forEach((sub, index) => {
            const studentName = sub.ho_ten || 'Học sinh';
            const studentEmail = sub.email || 'Chưa có email';
            
            const rowId = `sub_detail_${index}`;
            const iconId = `sub_icon_${index}`;
            const assignmentTitle = exercise.tieu_de || 'Bài tập';
            
            let rawFileName = sub.tieu_de_tep || sub.ten_tep || '';
            let displayName = '-';
            if (rawFileName.trim() !== '' && rawFileName !== '-') {
                /*const lastDotIndex = rawFileName.lastIndexOf('.');
                displayName = lastDotIndex !== -1 ? rawFileName.substring(0, lastDotIndex) : rawFileName;*/
                displayName = rawFileName;
            }
            
            const updateTime = sub.tg_cap_nhat || '-';
            const subStatus = sub.trang_thai_nop || 'Chưa nộp';
            
            let statusColor = '#ea4335'; // Chưa nộp (Đỏ)
            if (subStatus === 'Đã nộp') statusColor = '#137333'; // Xanh lá
            
            let statusBadge = `<span style="color: ${statusColor}; background: #f1f3f4; padding: 2px 8px; border-radius: 12px; font-size: 13px; font-weight: 500;">${subStatus}</span>`;
            
            submissionsItems += `
                <div style="background: #fff; border: 1px solid #dadce0; border-radius: 8px; margin-bottom: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div onclick="toggleStudentSubmissionDetail('${rowId}', '${iconId}')" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='#fff'">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 16px;">
                                ${studentName.charAt(0).toUpperCase()}
                            </div>
                            <div style="display: flex; align-items: baseline; gap: 12px;">
                                <span style="font-size: 15px; font-weight: 500; color: #202124;">${studentName}</span>
                                <span style="font-size: 14px; font-style: italic; color: #5f6368;">${studentEmail}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 20px;">
                            ${statusBadge}
                            <i id="${iconId}" class="fa-solid fa-chevron-down" style="color: #5f6368; font-size: 12px; transition: transform 0.3s;"></i>
                        </div>
                    </div>
                    <div id="${rowId}" style="display: none; background: #fdfdfd; padding: 16px; border-top: 1px solid #e0e0e0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed;">
                            <thead>
                                <tr style="border-bottom: 1px solid #dadce0; color: #5f6368; text-align: left;">
                                    <th style="padding-bottom: 8px; font-weight: 500; width: 22%;">Tên bài nộp</th>
                                    <th style="padding-bottom: 8px; font-weight: 500; width: 38%;">Tên tệp</th>
                                    <th style="padding-bottom: 8px; font-weight: 500; width: 18%;">TG cập nhật</th>
                                    <th style="padding-bottom: 8px; font-weight: 500; width: 12%;">Trạng thái</th>
                                    <th style="padding-bottom: 8px; font-weight: 500; width: 10%; text-align: right;">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding-top: 10px; color: #202124; font-weight: 500;">${assignmentTitle}</td>
                                    <td style="padding-top: 10px; color: #5f6368; word-break: break-all; padding-right: 15px;">${displayName}</td>
                                    <td style="padding-top: 10px; color: #5f6368; font-size: 13px;">${updateTime}</td>
                                    <td style="padding-top: 10px; color: ${statusColor}; font-weight: 500;">${subStatus}</td>
                                    <td style="padding-top: 10px; text-align: right;">
                                        <button ${sub.id_bao_cao ? '' : 'disabled'} data-xem-bao-cao="${sub.id_bao_cao || ''}" style="background: none; border: none; margin-right: 10px; cursor: ${sub.id_bao_cao ? 'pointer' : 'not-allowed'}; color: ${sub.id_bao_cao ? '#1a73e8' : '#9aa0a6'};" title="${sub.id_bao_cao ? 'Xem chi tiết bài nộp kèm phần bôi màu' : 'Chưa có file nộp'}"><i class="fa-solid fa-eye"></i></button>
                                        <button ${sub.id_bao_cao ? '' : 'disabled'} data-tai-bao-cao="${sub.id_bao_cao || ''}" data-ten-tep="${(sub.tieu_de_tep || '').replace(/"/g, '&quot;')}" style="background: none; border: none; cursor: ${sub.id_bao_cao ? 'pointer' : 'not-allowed'}; color: ${sub.id_bao_cao ? '#1a73e8' : '#9aa0a6'};" title="${sub.id_bao_cao ? 'Tải xuống bài nộp' : 'Chưa có file nộp'}"><i class="fa-solid fa-download"></i></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
    } else {
        submissionsItems = `<div style="text-align: center; padding: 30px; color: #5f6368;">Chưa có thành viên nào trong danh sách lớp.</div>`;
    }

    // 4. Render toàn bộ giao diện trang chi tiết giáo viên
    tabContentContainer.innerHTML = `
        <div class="class-content-section" style="margin-top: 20px; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #dadce0;">
            <button id="backToListBtn" style="background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 14px; margin-bottom: 15px; display: flex; align-items: center; gap: 6px; padding: 0;">
                <i class="fa-solid fa-arrow-left"></i> Quay lại danh sách bài tập
            </button>
            <h2 style="font-size: 22px; font-weight: 500; color: #202124; margin: 0 0 8px 0;">${title}</h2>
            <div style="font-size: 13px; color: #5f6368; margin-bottom: 20px;">
                ${deadline}
            </div>
            <div style="display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 20px; gap: 30px;">
                <button id="teacherTabDescBtn" style="background: none; border: none; padding: 10px 0; font-size: 14px; font-weight: 500; cursor: pointer; color: #5f6368; border-bottom: 2px solid transparent;">Mô tả</button>
                <button id="teacherTabSubBtn" style="background: none; border: none; padding: 10px 0; font-size: 14px; font-weight: 500; cursor: pointer; color: #1a73e8; border-bottom: 2px solid #1a73e8;">Bài nộp</button>
            </div>
            <div id="teacherDescContent" style="display: none; font-size: 14px; color: #3c4043; line-height: 1.6;">
                ${instruction}
            </div>
            <div id="teacherSubContent" style="display: block;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="font-size: 16px; font-weight: 500; color: #202124; margin: 0;">Danh sách bài nộp</h3>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="openTeacherExerciseDetailView(${JSON.stringify(exercise).replace(/"/g, '&quot;')}, ${JSON.stringify(classData).replace(/"/g, '&quot;')}, '${userId}')" style="background: none; border: 1px solid #dadce0; border-radius: 4px; padding: 6px 12px; cursor: pointer; color: #5f6368;" title="Làm mới"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                </div>
                <div style="margin-top: 8px;">
                    ${submissionsItems}
                </div>
            </div>
        </div>
    `;

    // Gắn sự kiện chuyển tab và nút quay lại
    document.getElementById('teacherTabDescBtn').onclick = () => {
        document.getElementById('teacherDescContent').style.display = 'block';
        document.getElementById('teacherSubContent').style.display = 'none';
        document.getElementById('teacherTabDescBtn').style.color = '#1a73e8';
        document.getElementById('teacherTabDescBtn').style.borderBottom = '2px solid #1a73e8';
        document.getElementById('teacherTabSubBtn').style.color = '#5f6368';
        document.getElementById('teacherTabSubBtn').style.borderBottom = '2px solid transparent';
    };
    
    document.getElementById('teacherTabSubBtn').onclick = () => {
        document.getElementById('teacherDescContent').style.display = 'none';
        document.getElementById('teacherSubContent').style.display = 'block';
        document.getElementById('teacherTabSubBtn').style.color = '#1a73e8';
        document.getElementById('teacherTabSubBtn').style.borderBottom = '2px solid #1a73e8';
        document.getElementById('teacherTabDescBtn').style.color = '#5f6368';
        document.getElementById('teacherTabDescBtn').style.borderBottom = '2px solid transparent';
    };
    
    document.getElementById('backToListBtn').onclick = () => {
        renderExercisesTab(classData, userId);
    };
}
// Hàm gọi API lấy danh sách tài liệu đã kiểm tra và đổ vào bảng trong modal
let allStudentDocuments = []; // Biến toàn cục lưu danh sách gốc để phục vụ tìm kiếm
async function loadStudentDocumentsForSubmission() {
    // Tìm phần tbody của bảng trong modal "Gửi tài liệu"
    const tableBody = document.querySelector('#submitDocumentModal table tbody');
    if (!tableBody) return;
    // Lấy id_nguoi_dung của tài khoản đang đăng nhập
    const userId = window.currentUserId || localStorage.getItem('id_nguoi_dung') || localStorage.getItem('userId');
    if (!userId) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #5f6368;">Vui lòng đăng nhập lại</td></tr>`;
        return;
    }
    // Hiển thị trạng thái đang tải
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #5f6368;">Đang tải danh sách tài liệu...</td></tr>`;
    try {
        const response = await fetch(`${BACKEND_URL}/api/bao-cao/tai-lieu-nop/${userId}`);
        const result = await response.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            allStudentDocuments = result.data; // Lưu lại dữ liệu gốc để dùng khi tìm kiếm
            renderDocumentTable(allStudentDocuments); // Gọi hàm render bảng
        } else {
            allStudentDocuments = [];
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #5f6368; font-size: 14px; border: 1px solid #dadce0;">
                        Không có dữ liệu
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error("Lỗi khi tải tài liệu của sinh viên:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #c5221f; border: 1px solid #dadce0;">Không thể kết nối đến máy chủ.</td></tr>`;
    }
}
// Cập nhật trạng thái ô chọn tất cả
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllDocs');
    const checkboxes = document.querySelectorAll('.doc-checkbox');
    
    // Bảo vệ lỗi null/undefined nếu chưa render DOM
    if (!selectAllCheckbox || checkboxes.length === 0) return;
    
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = anyChecked && !allChecked;
}
function updateRowStyle(checkbox) {
    const row = checkbox.closest('tr');
    if (!row) return;
    if (checkbox.checked) {
        row.style.backgroundColor = '#e8f0fe'; // Màu bôi khi được chọn
    } else {
        row.style.backgroundColor = ''; // Trở về mặc định khi bỏ chọn
    }
}
function highlightText(text, keyword) {
    if (!keyword || !text) return text;
    try {
        const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.replace(regex, `<mark style="background-color: #fef08a; padding: 0 2px; color: #202124; border-radius: 2px;">$1</mark>`);
    } catch (e) {
        return text;
    }
}
// 1. Hàm render dữ liệu ra bảng và bôi vàng chuẩn xác (không phân biệt hoa thường)
function renderDocumentTable(docs, keyword = '', currentIdBaoCao = null) {
    const tableBody = document.querySelector('#submitDocumentModal table tbody');
    if (!tableBody) return;

    if (!docs || docs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #5f6368; font-size: 14px; border: 1px solid #dadce0;">Không tìm thấy tài liệu phù hợp</td></tr>`;
        return;
    }
    
    let rowsHtml = '';
    docs.forEach((item) => {
        let rawId = String(item.id_bao_cao || '-');
        let rawTitle = String(item.tieu_de || '-');
        let rawDate = item.ngay_tai_len ? new Date(item.ngay_tai_len).toLocaleString('vi-VN') : '-';
        
        // Kiểm tra xem dòng này có khớp với file đang được chọn nộp hay không
        const isCurrentSelected = currentIdBaoCao !== null && String(item.id_bao_cao) === String(currentIdBaoCao);
        
        // Thiết lập màu nền: Xanh nhạt nếu đang chọn, ngược lại để trắng
        const rowBg = isCurrentSelected ? '#e8f0fe' : '#ffffff'; 
        const rowHover = isCurrentSelected ? '#d2e3fc' : '#f8f9fa';

        // Hàm bôi màu an toàn không dùng Regex
        const highlightSafe = (text, kw) => {
            if (!kw || !kw.trim()) return text;
            const lowerText = text.toLowerCase();
            const lowerKw = kw.trim().toLowerCase();
            if (!lowerText.includes(lowerKw)) return text;
            
            let result = '';
            let startIndex = 0;
            let index = lowerText.indexOf(lowerKw, startIndex);
            while (index !== -1) {
                result += text.substring(startIndex, index);
                const matchedPart = text.substring(index, index + lowerKw.length);
                result += `<span style="background-color: #fef08a !important; color: #111827 !important; padding: 1px 3px !important; font-weight: bold !important; border-radius: 2px !important;">${matchedPart}</span>`;
                startIndex = index + lowerKw.length;
                index = lowerText.indexOf(lowerKw, startIndex);
            }
            result += text.substring(startIndex);
            return result;
        };

        const displayId = highlightSafe(rawId, keyword);
        const displayTitle = highlightSafe(rawTitle, keyword);
        const displayDate = highlightSafe(rawDate, keyword);
        const tyLeTrungLap = item.do_trung_lap !== null && item.do_trung_lap !== undefined
            ? `<span style="color: #10b981; font-weight: 600;">${item.do_trung_lap}%</span>`
            : '<span style="color: #64748b;">Chưa có</span>';

        rowsHtml += `
            <tr style="border: 1px solid #dadce0; background: ${rowBg}; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='${rowHover}'" onmouseout="this.style.background='${rowBg}'">
                <td style="padding: 10px 0; border: 1px solid #dadce0; text-align: center; width: 45px; min-width: 45px; max-width: 45px;">
                    <input type="checkbox" name="selectedStudentDoc" value="${item.id_bao_cao}" class="doc-checkbox" ${isCurrentSelected ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px; margin: 0 auto; display: block;">
                </td>
                <td style="padding: 10px; border: 1px solid #dadce0; color: #202124; font-weight: 500; text-align: center; width: 80px; min-width: 80px; max-width: 80px;">${displayId}</td>
                <td style="padding: 10px; border: 1px solid #dadce0; color: #3c4043; word-break: break-all; width: 260px; min-width: 260px; max-width: 260px;">
                    ${displayTitle}
                    ${isCurrentSelected ? '<span style="font-size: 12px; color: #1967d2; font-weight: 500; margin-left: 6px;">(Đang nộp)</span>' : ''}
                </td>
                <td style="padding: 10px; border: 1px solid #dadce0; color: #5f6368; font-size: 13px; text-align: center; width: 160px; min-width: 160px; max-width: 160px;">${displayDate}</td>
                <td style="padding: 10px; border: 1px solid #dadce0; text-align: center; width: 110px; min-width: 110px; max-width: 110px;">${tyLeTrungLap}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rowsHtml;
    
    if (typeof initCheckboxEvents === 'function') {
        initCheckboxEvents();
    }
}
// 2. Hàm xử lý tìm kiếm
function handleSearchDocuments() {
    const searchInput = document.getElementById('searchDocInput');
    if (!searchInput) return;
    const keyword = searchInput.value.trim();
    const lowerKeyword = keyword.toLowerCase();
    if (typeof allStudentDocuments === 'undefined' || !allStudentDocuments) return;
    const filtered = allStudentDocuments.filter(doc => {
        if (!lowerKeyword) return true;
        const idStr = String(doc.id_bao_cao || '').toLowerCase();
        const titleStr = String(doc.tieu_de || '').toLowerCase();
        const dateStr = doc.ngay_tai_len ? new Date(doc.ngay_tai_len).toLocaleString('vi-VN').toLowerCase() : '';

        return idStr.includes(lowerKeyword) || titleStr.includes(lowerKeyword) || dateStr.includes(lowerKeyword);
    });
    renderDocumentTable(filtered, keyword);
}
// 3. Gắn sự kiện lắng nghe
const searchInputEl = document.getElementById('searchDocInput');
if (searchInputEl) {
    searchInputEl.addEventListener('input', handleSearchDocuments);
    searchInputEl.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') handleSearchDocuments();
    });
}
document.getElementById('searchDocBtn')?.addEventListener('click', handleSearchDocuments);
// 3. Các sự kiện tương tác bảng (Checkbox, đổi màu dòng)
function initCheckboxEvents() {
    const selectAllCheckbox = document.getElementById('selectAllDocs');
    const checkboxes = document.querySelectorAll('.doc-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.onchange = function() {
            checkboxes.forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
                updateRowStyle(cb);
            });
        };
    }
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        row.onclick = function(e) {
            if (e.target.tagName !== 'INPUT') {
                cb.checked = !cb.checked;
            }
            updateRowStyle(cb);
            updateSelectAllState();
        };
        cb.onchange = function(e) {
            e.stopPropagation();
            updateRowStyle(this);
            updateSelectAllState();
        };
        updateRowStyle(cb);
    });
}
// Dùng Event Delegation để bắt sự kiện gõ phím bất kể phần tử được sinh ra sau
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'searchDocInput') {
        handleSearchDocuments();
    }
});
document.addEventListener('keyup', function(e) {
    if (e.target && e.target.id === 'searchDocInput' && e.key === 'Enter') {
        handleSearchDocuments();
    }
});
document.addEventListener('click', function(e) {
    // Xử lý sự kiện click cho nút tìm kiếm tài liệu
    if (e.target && e.target.id === 'searchDocBtn') {
        handleSearchDocuments();
    }
    // Xử lý sự kiện click cho các nút liên quan đến bài tập (dùng .closest để bắt cả phần tử con bên trong)
    const submitItemBtn = e.target.closest('.submit-exercise-item, .view-detail-exercise, .exercise-row-item');
    if (submitItemBtn) {
        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const idBaiTap = urlParams.get('id') || (window.currentTargetExercise ? window.currentTargetExercise.id_bai_tap : "7");
            const currentUserId = window.currentUserId || localStorage.getItem('id_nguoi_dung') || localStorage.getItem('userId') || "ND007";
            if (idBaiTap && currentUserId) {
                fetchAndRenderSubmission(idBaiTap, currentUserId);
            }
        }, 300); // Đợi DOM render xong rồi gọi hàm đổ dữ liệu
    }
});
// Hàm xử lý chung để gọi API hoặc kích hoạt tải file xuống máy
const handleDownloadFile = async () => {
    try {
        const reportId = mySub.id_bao_cao;
        if (!reportId) {
            alert('Không tìm thấy ID báo cáo để tải xuống!');
            return;
        }
        const downloadUrl = `${BACKEND_URL}/api/bao-cao/tai-xuong/${reportId}`;
        // Tạo thẻ a ẩn để kích hoạt trình duyệt tự động tải file về máy
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = mySub.ten_tep || 'bao-cao';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } catch (error) {
        console.error("Lỗi khi tải file:", error);
        alert('Không thể tải xuống tệp tin này!');
    }
};
// 1. Gắn sự kiện cho chữ màu xanh tên tệp
const downloadTextElem = document.getElementById('downloadSubmittedDoc');
if (downloadTextElem) {
    downloadTextElem.onclick = handleDownloadFile;
}
// 2. Gắn sự kiện cho nút chữ "Tải xuống" ở bên phải
const downloadBtnAction = document.getElementById('downloadBtnAction');
if (downloadBtnAction) {
    downloadBtnAction.onclick = handleDownloadFile;
}
/// Hàm tải lại trạng thái bài nộp (Đã tối ưu để tránh lỗi 404 và tránh vỡ giao diện)
async function loadExistingSubmission(assignmentId, studentId) {
    // Ủy quyền hoàn toàn việc render cho fetchAndRenderSubmission
    if (typeof fetchAndRenderSubmission === 'function') {
        await fetchAndRenderSubmission(assignmentId, studentId);
    }
}
// KÍCH HOẠT DUY NHẤT KHI TẢI TRANG (GỘP ĐỦ TỪ 2 ĐOẠN CODE)
// KÍCH HOẠT DUY NHẤT KHI TẢI TRANG (ĐÃ FIX CHUẨN BIẾN)
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentId = typeof currentAssignmentId !== 'undefined' ? currentAssignmentId : '';
    const assignmentId = urlParams.get('id') || currentId || "7";
    const idBaiTap = assignmentId; 

    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { id: "ND007" };
    const idSinhVien = currentUser.id_nguoi_dung || currentUser.id || currentUser.id_sinh_vien || "ND007";

    // Lưu biến toàn cục để dùng chung
    window._globalIdBaiTap = idBaiTap;
    window._globalIdSinhVien = idSinhVien;

    // 1. Gọi hàm load bài nộp cũ (nếu có sẵn trong code dự án của bạn)
    if (typeof loadExistingSubmission === 'function' && assignmentId && currentUser.id) {
        loadExistingSubmission(assignmentId, currentUser.id);
    }

    // 2. Gọi hàm render giao diện bài nộp chuẩn xác
    if (idBaiTap && idSinhVien) {
        if (typeof fetchAndRenderSubmission === 'function') {
            fetchAndRenderSubmission(idBaiTap, idSinhVien);
        }
    }
});
// Trước đây có hai khối gắn sự kiện cho các nút trong khung bài nộp, cả hai
// cùng kiểm tra cờ window._isGlobalSubEventAttached nên chỉ khối đầu được gắn.
// Khối đầu lại bỏ qua mọi cú bấm khi submitBox._currentSub chưa có — tình
// trạng xảy ra ngay sau khi khung được dựng lại — nên nút Chỉnh sửa chỉ ăn
// được một lần rồi thôi. Khối còn lại (phía dưới) tự gọi API lấy dữ liệu khi
// thiếu nên giữ lại một mình nó.

// Hàm gọi API lấy dữ liệu bài nộp và tự động cập nhật giao diện khi đã có DOM
// --- HÀM GỌI API LẤY DỮ LIỆU VÀ RENDER GIAO DIỆN BÀI NỘP ---
async function fetchAndRenderSubmission(idBaiTap, idSinhVien) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/chi-tiet-nop-bai/submissions?id_bai_tap=${idBaiTap}&id_sinh_vien=${idSinhVien}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && data.success && data.data) {
            const sub = data.data; 
            
            // Xử lý lấy và định dạng thời gian từ trường updatedAt (hoặc các trường tương đương)
            let rawTime = sub.updatedAt || sub.updated_at || sub.tg_cap_nhat || sub.ngay_nop;
            let formattedTime = "";
            
            if (rawTime) {
                const dateObj = new Date(rawTime);
                if (!isNaN(dateObj.getTime())) {
                    const hours = dateObj.getHours().toString().padStart(2, '0');
                    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
                    const day = dateObj.getDate().toString().padStart(2, '0');
                    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    const year = dateObj.getFullYear();
                    formattedTime = `${hours}:${minutes} ${day}/${month}/${year}`;
                } else {
                    formattedTime = rawTime;
                }
            }
            
            // Tìm badge trạng thái 0/1 hoặc đã nộp trên giao diện
            const badges = document.querySelectorAll('span');
            badges.forEach(el => {
                if (el.innerText.trim() === "0/1" || el.innerText.trim() === "1/1") {
                    el.innerText = "1/1";
                    el.style.backgroundColor = "#e6f4ea";
                    el.style.color = "#137333";
                    el.style.border = "1px solid #ceead6";
                }
            });

            // Tìm chính xác khung chứa nút "Thêm file nộp" (my-submit-box)
            const submitBox = document.querySelector('.my-submit-box');
            if (submitBox) {
                submitBox.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 12px; font-size: 14px; color: #3c4043;">
                            <span style="font-weight: 500;">Mặc định</span>
                            <span id="downloadFileLink" style="color: #1a73e8; font-weight: 500; word-break: break-all; cursor: pointer; text-decoration: underline;" title="Tải xuống">${sub.tieu_de_tep || 'Tài liệu đã nộp'}</span>
                            <span style="font-size: 12px; color: #5f6368;">cập nhật vào ${formattedTime}</span>
                        </div>
                        <div style="display: flex; gap: 15px; font-size: 14px;">
                            <button type="button" id="btnDownloadSub" style="background: none; border: none; color: #1a73e8; cursor: pointer;" title="Tải xuống">Tải xuống</button>
                            <button type="button" id="btnEditSub" style="background: none; border: none; color: #1a73e8; cursor: pointer;" title="Chỉnh sửa">Chỉnh sửa</button>
                            <button type="button" id="btnDeleteSub" style="background: none; border: none; color: #ea4335; cursor: pointer;" title="Xóa">Xoá</button>
                        </div>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #f9ab00; font-style: italic;">
                        *Bài nộp là những tài liệu đã kiểm tra trong danh mục tài liệu của bạn
                    </div>
                `;

                // Lưu trực tiếp đối tượng sub hiện tại vào thuộc tính của DOM để các hàm bên ngoài dễ dàng sử dụng
                submitBox._currentSub = sub;
                submitBox._idBaiTap = idBaiTap;
                submitBox._idSinhVien = idSinhVien;
                window._globalIdBaiTap = idBaiTap;
                window._globalIdSinhVien = idSinhVien;
            }
        }
    } catch (e) {
        console.error("Lỗi đồng bộ giao diện bài nộp:", e);
    }
}

// --- GẮN SỰ KIỆN TOÀN CỤC (EVENT DELEGATION) - AN TOÀN TUYỆT ĐỐI ---
// --- GẮN SỰ KIỆN TOÀN CỤC (EVENT DELEGATION) ĐÃ TỐI ƯU ---
// --- BẮT SỰ KIỆN TOÀN CỤC CHUẨN XÁC KHÔNG BAO GIỜ BỊ "TỊT" ---
if (!window._isGlobalSubEventAttached) {
    window._isGlobalSubEventAttached = true;
    
    document.addEventListener('click', async function(event) {
        const target = event.target;
        
        // Kiểm tra xem click có nằm trong khung nộp bài .my-submit-box không
        const submitBox = target.closest('.my-submit-box');
        if (!submitBox) return; // Nếu bấm ở chỗ khác ngoài khung này thì bỏ qua

        // Xác định hành động dựa vào nội dung chữ hoặc thuộc tính của nút vừa bấm
        const textClicked = target.innerText ? target.innerText.trim().toLowerCase() : '';
        const isDownload = textClicked.includes('tải xuống') || target.id === 'downloadFileLink' || target.id === 'btnDownloadSub';
        const isEdit = textClicked.includes('chỉnh sửa') || target.id === 'btnEditSub';
        const isDelete = textClicked.includes('xoá') || textClicked.includes('xóa') || target.id === 'btnDeleteSub';

        if (!isDownload && !isEdit && !isDelete) return;

        event.preventDefault();

        // Lấy ID bài tập và sinh viên từ thuộc tính của DOM hoặc biến toàn cục
        const idBaiTap = submitBox._idBaiTap || window._globalIdBaiTap;
        const idSinhVien = submitBox._idSinhVien || window._globalIdSinhVien;

        if (!idBaiTap || !idSinhVien) {
            console.warn("Thiếu ID bài tập hoặc sinh viên.");
            return;
        }

        // Lấy thông tin bài nộp mới nhất từ cache DOM hoặc gọi API ngầm
        let sub = submitBox._currentSub || window._globalCurrentSub;
        
        // Nếu trong cache chưa có, gọi API lấy ngay lập tức
        if (!sub) {
            try {
                const apiRes = await fetch(`${BACKEND_URL}/api/chi-tiet-nop-bai/submissions?id_bai_tap=${idBaiTap}&id_sinh_vien=${idSinhVien}`);
                const apiData = await apiRes.json();
                if (apiData && apiData.success && apiData.data) {
                    sub = apiData.data;
                    submitBox._currentSub = sub;
                }
            } catch (err) {
                console.error("Lỗi lấy dữ liệu bài nộp:", err);
            }
        }

        if (!sub) {
            alert('Không tìm thấy thông tin bài nộp!');
            return;
        }

        // 1. XỬ LÝ NÚT TẢI XUỐNG / TÊN FILE
        if (isDownload) {
            const targetIdBaoCao = sub.id_bao_cao;
            if (!targetIdBaocao && !targetIdBaoCao) {
                alert('Không tìm thấy mã báo cáo của tệp này!');
                return;
            }
            // Dùng API tải tệp thay vì ghép đường dẫn ổ đĩa của máy chủ
            await taiTepBaiNop(targetIdBaoCao, sub.tieu_de_tep);
        }

        // 2. XỬ LÝ NÚT CHỈNH SỬA (Mở Modal chọn file thay thế)
        if (isEdit) {
            if (typeof openEditSubmissionModal === 'function') {
                openEditSubmissionModal(sub);
            } else {
                const modal = document.getElementById('submitDocumentModal');
                if (modal) {
                    modal.style.display = 'flex';
                    if (typeof loadDocumentsForModal === 'function') {
                        loadDocumentsForModal(sub.id_sinh_vien, sub.id_bai_tap, sub.id_bao_cao);
                    }
                }
            }
        }

        // 3. XỬ LÝ NÚT XÓA
        if (isDelete) {
            if (typeof showDeleteConfirmModal === 'function') {
                showDeleteConfirmModal(idBaiTap, idSinhVien);
            }
        }
    });
}
// --- HÀM MỞ MODAL VÀ TRUYỀN THÔNG TIN BÀI NỘP HIỆN TẠI ---
function openEditSubmissionModal(sub) {
    const modal = document.getElementById('submitDocumentModal');
    if (!modal) {
        alert('Không tìm thấy giao diện Modal gửi tài liệu (submitDocumentModal) trong trang!');
        return;
    }
    
    // Hiển thị Modal
    modal.style.display = 'flex';
    
    // Gọi hàm tải danh sách tài liệu, truyền thêm id_bao_cao đang được chọn để bôi màu/tích chọn
    loadDocumentsForModal(sub.id_sinh_vien, sub.id_bai_tap, sub.id_bao_cao);
}
// --- HÀM TẢI DANH SÁCH GIỐNG HỆT MODAL GỐC VÀ BÔI MÀU FILE ĐANG NỘP ---
async function loadDocumentsForModal(idSinhVien, idBaiTap, currentIdBaoCao) {
    // Tìm phần tbody của bảng trong modal "Gửi tài liệu"
    const tableBody = document.querySelector('#submitDocumentModal table tbody');
    if (!tableBody) return;
    
    // Lấy id_nguoi_dung của tài khoản đang đăng nhập
    const userId = window.currentUserId || localStorage.getItem('id_nguoi_dung') || localStorage.getItem('userId');
    if (!userId) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #5f6368;">Vui lòng đăng nhập lại</td></tr>`;
        return;
    }
    
    // Hiển thị trạng thái đang tải
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #5f6368;">Đang tải danh sách tài liệu...</td></tr>`;
    
    try {
        // Đảm bảo BACKEND_URL có giá trị (nếu chưa khai báo toàn cục thì dùng dự phòng)
        const baseUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/bao-cao/tai-lieu-nop/${userId}`);
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            allStudentDocuments = result.data; // Lưu lại dữ liệu gốc để dùng khi tìm kiếm
            
            // SỬA Ở ĐÂY: Thay biến 'keyword' (chưa định nghĩa) bằng chuỗi rỗng '' và truyền đúng 'currentIdBaoCao'
            renderDocumentTable(allStudentDocuments, '', currentIdBaoCao); 
        } else {
            allStudentDocuments = [];
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #5f6368; font-size: 14px; border: 1px solid #dadce0;">
                        Không có dữ liệu
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error("Lỗi khi tải tài liệu của sinh viên:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #c5221f; border: 1px solid #dadce0;">Không thể kết nối đến máy chủ.</td></tr>`;
    }
}
/// --- HÀM PHỤ TRỢ HIỂN THỊ POPUP XÁC NHẬN XÓA BÀI NỘP (ĐÃ FIX CHUẨN SỰ KIỆN) ---
function showDeleteConfirmModal(idBaiTap, idSinhVien) {
    let modal = document.getElementById('customDeleteModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customDeleteModal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999;";
        modal.innerHTML = `
            <div style="background: #fff; padding: 24px; border-radius: 12px; width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 2px solid #1a73e8;">
                <!-- Tiêu đề màu xanh dương -->
                <h3 style="margin-top: 0; color: #1a73e8; font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 12px;">
                    Xác nhận xóa bài tập
                </h3>
                <p style="color: #3c4043; font-size: 14px; text-align: center; margin-bottom: 24px; line-height: 1.5;">
                    Bạn có chắc chắn muốn xóa bài tập này không?
                </p>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" id="cancelDeleteBtn" style="padding: 8px 20px; background: #f1f3f4; border: 1px solid #dadce0; border-radius: 6px; cursor: pointer; color: #3c4043; font-weight: 500; transition: background 0.2s, transform 0.1s;">Hủy bỏ</button>
                    <button type="button" id="confirmDeleteBtn" style="padding: 8px 20px; background: #1a73e8; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s, transform 0.1s, box-shadow 0.2s;">Xác nhận</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Thêm hiệu ứng Hover và Active bằng JS động cho các nút vừa tạo
        const btnCancel = modal.querySelector('#cancelDeleteBtn');
        const btnConfirm = modal.querySelector('#confirmDeleteBtn');

        btnCancel.onmouseover = () => btnCancel.style.background = '#e8eaed';
        btnCancel.onmouseout = () => btnCancel.style.background = '#f1f3f4';
        btnCancel.onmousedown = () => btnCancel.style.transform = 'scale(0.97)';
        btnCancel.onmouseup = () => btnCancel.style.transform = 'scale(1)';

        btnConfirm.onmouseover = () => {
            btnConfirm.style.background = '#1557b0';
            btnConfirm.style.boxShadow = '0 2px 4px rgba(26, 115, 232, 0.3)';
        };
        btnConfirm.onmouseout = () => {
            btnConfirm.style.background = '#1a73e8';
            btnConfirm.style.boxShadow = 'none';
        };
        btnConfirm.onmousedown = () => btnConfirm.style.transform = 'scale(0.97)';
        btnConfirm.onmouseup = () => btnConfirm.style.transform = 'scale(1)';
    } else {
        modal.style.display = 'flex';
    }

    // Gán sự kiện cho nút Hủy bỏ bằng modal.querySelector để đảm bảo luôn bắt đúng nút dù bật modal lại nhiều lần
    const cancelBtn = modal.querySelector('#cancelDeleteBtn');
    cancelBtn.onclick = (e) => {
        e.preventDefault();
        modal.style.display = 'none';
    };

    // Gán sự kiện cho nút Xác nhận kèm đúng idBaiTap và idSinhVien của lần gọi hiện tại
    const confirmBtn = modal.querySelector('#confirmDeleteBtn');
    confirmBtn.onclick = async (e) => {
        e.preventDefault();
        try {
            const baseUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'http://localhost:3000';
            const deleteRes = await fetch(`${baseUrl}/api/chi-tiet-nop-bai/submissions?id_bai_tap=${idBaiTap}&id_sinh_vien=${idSinhVien}`, {
                method: 'DELETE'
            });

            if (deleteRes.ok) {
                modal.style.display = 'none';
                alert('Đã xóa bài nộp thành công!');
                location.reload(); 
            } else {
                alert('Có lỗi xảy ra khi xóa ở máy chủ. Vui lòng thử lại!');
            }
        } catch (error) {
            console.error("Lỗi khi xóa bài nộp:", error);
            alert('Không thể kết nối đến máy chủ để xóa.');
        }
    };
}
// Tự động làm tươi giao diện bài nộp ngay khi đóng modal nộp/sửa tài liệu
// Tự động làm tươi giao diện bài nộp ngay khi đóng modal nộp/sửa tài liệu
const submitModalElement = document.getElementById('submitDocumentModal');
if (submitModalElement) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const display = window.getComputedStyle(submitModalElement).display;
                if (display === 'none') {
                    const submitBox = document.querySelector('.my-submit-box');
                    // Ưu tiên lấy ID từ biến toàn cục nếu DOM đã bị code cũ ghi đè mất
                    const idBT = window._globalIdBaiTap || (submitBox ? submitBox._idBaiTap : null);
                    const idSV = window._globalIdSinhVien || (submitBox ? submitBox._idSinhVien : null);
                    
                    if (idBT && idSV && typeof fetchAndRenderSubmission === 'function') {
                        // Trì hoãn 500ms để đảm bảo backend đã lưu file mới vào Database xong xuôi
                        setTimeout(() => {
                            fetchAndRenderSubmission(idBT, idSV);
                        }, 500);
                    }
                }
            }
        });
    });
    observer.observe(submitModalElement, { attributes: true });
}