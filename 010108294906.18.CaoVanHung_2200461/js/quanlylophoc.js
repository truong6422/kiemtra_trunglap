const createModal = document.getElementById('createClassModal');
const joinModal = document.getElementById('joinClassModal');

const closeCreate = document.getElementById('closeCreate');
const cancelCreate = document.getElementById('cancelCreate');

const closeJoin = document.getElementById('closeJoin');
const cancelJoin = document.getElementById('cancelJoin');

const classNameInput = createModal.querySelector('.form-input-large');
const submitCreateBtn = createModal.querySelector('.btn-submit-large');

const classCodeJoinInput = joinModal.querySelector('.form-input-large');
const submitJoinBtn = joinModal.querySelector('.btn-submit-large') || joinModal.querySelector('.btn-primary, .btn-submit, .btn-blue') || joinModal.querySelector('.modal-actions .btn-blue') || joinModal.querySelector('.modal-content button:last-of-type');

function getCurrentUserId() {
    let user = localStorage.getItem('id_nguoi_dung') ||
        localStorage.getItem('current_user') ||
        localStorage.getItem('logged_in_user') ||
        'default_user_id';
    return user;
}

function generateClassCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
async function syncMembersToServer(classData, userId) {
    try {
        const validMembers = (classData.classMembersList || []).filter(m => m.isValid !== false && m.isRegistered !== false);

        const membersPayload = validMembers.map(m => ({
            id_nguoi_dung: m.id_nguoi_dung || 'N/A',
            ho_ten: m.ho_ten || 'Thành viên',
            email: m.email
        }));

        const response = await fetch(`http://localhost:5000/api/lop-hoc/${classData.id}/thanh-vien`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ danh_sach_thanh_vien: membersPayload })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            console.error('Lưu thành viên vào CSDL thất bại:', result.message);
        }
    } catch (err) {
        console.error('Lỗi kết nối khi đồng bộ thành viên:', err);
    }
}

async function handleJoinClass(enteredCode) {
    const userId = getCurrentUserId();

    try {
        const response = await fetch('http://localhost:5000/api/lop-hoc/tham-gia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ma_lop: enteredCode, id_nguoi_dung: userId })
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || 'Mã lớp không tồn tại!');
            return;
        }

        // Chờ bấm Đồng ý rồi mới tải lại, không thì hộp thoại hiện ra chưa
        // kịp đọc đã bị trang mới cuốn đi.
        await thongBao('Tham gia lớp học thành công!');
        location.reload();
    } catch (error) {
        console.error('Lỗi kết nối:', error);
        alert('Không thể kết nối đến server!');
    }
}
function saveClassDataToStorage(classData, userId) {
    const storageKey = `user_classes_${userId}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        try {
            let classList = JSON.parse(savedData);
            if (!Array.isArray(classList)) classList = [classList];

            classList = classList.map(c => {
                if (c.ma_lop === classData.ma_lop) {
                    return classData;
                }
                return c;
            });
            localStorage.setItem(storageKey, JSON.stringify(classList));
        } catch (err) {
            console.error(err);
        }
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function renderClassDetail(classData, userId, currentHoTen, activeTabName = 'description') {
    const mainElement = document.querySelector('main');

    // Ghi nhớ lớp đang mở ngay từ đây, không đợi tới lúc vào tab bài tập. Các
    // phần gắn sự kiện ở cấp tài liệu (tạo bài tập, liên kết mời tham gia)
    // không nhận được classData qua tham số nên phải lấy qua biến này.
    window.currentClassData = classData;

    const isOwner = String(classData.id_nguoi_dung) === String(userId);
    const ownerDisplayName = classData.chu_lop_ho_ten || classData.ho_ten_chu_lop || (isOwner ? currentHoTen : 'Chủ lớp học');

    const editInfoLinkHtml = isOwner
        ? `<a href="#" class="edit-info-link" id="openUpdateModalBtn"><i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa thông tin</a>`
        : `<span style="color: #5f6368; font-style: italic; font-size: 13px;">(Bạn là thành viên)</span>`;

    // Lớp chưa sửa lần nào thì mốc cập nhật đúng bằng mốc tạo. Không có mốc nào
    // thì để gạch ngang — thà thiếu còn hơn in ra chữ undefined như trước.
    const mocTao = classData.created_time || classData.time || '--';
    const mocCapNhat = classData.ngay_cap_nhat || classData.time || mocTao;

    mainElement.innerHTML = `
        <div class="classroom-detail-container">
            <div class="class-header-row">
                <div class="class-title-area">
                    <h1 id="detailClassTitle">${classData.tieu_de || classData.name}</h1>
                    ${editInfoLinkHtml}
                    <div class="class-sub-info">
                        <span id="detailOwnerName"><b>${ownerDisplayName}</b></span> là <strong>Chủ lớp học</strong> - tạo lúc: <b>${mocTao}</b> - cập nhật cuối vào <b id="detailClassTime">${mocCapNhat}</b>
                    </div>
                </div>
                <div class="class-code-area">
                    <div class="class-code-label">Mã lớp học</div>
                    <div class="class-code-value">${classData.ma_lop}</div>
                </div>
            </div>

            <div class="class-tabs">
                <a href="#" class="class-tab-item ${activeTabName === 'description' ? 'active' : ''}" data-tab="description">Mô tả chung</a>
                <a href="#" class="class-tab-item ${activeTabName === 'exercises' ? 'active' : ''}" data-tab="exercises">Danh sách bài tập</a>
                <a href="#" class="class-tab-item ${activeTabName === 'members' ? 'active' : ''}" data-tab="members">Danh sách thành viên</a>
                <a href="#" class="class-tab-item ${activeTabName === 'requests' ? 'active' : ''}" data-tab="requests">Yêu cầu tham gia</a>
            </div>

            <div id="tabContentContainer"></div>
        </div>
    `;

    function switchTab(tabName) {
        const tabContentContainer = document.getElementById('tabContentContainer');
        if (!tabContentContainer) return;

        if (tabName === 'description') {
            let cleanDesc = classData.mo_ta ? String(classData.mo_ta) : '';
            if (cleanDesc && typeof cleanDesc === 'string') {
                cleanDesc = cleanDesc.split('\n').map(line => line.trim()).join('\n');
            }

            const descFormatted = cleanDesc ? cleanDesc.replace(/\n/g, '<br>') : '<span style="color: #5f6368;">Chưa có mô tả cho lớp học này.</span>';

            tabContentContainer.innerHTML = `
                <div style="display: block !important; width: 100% !important; clear: both !important; margin-top: 15px !important;">
                    <div style="background: #ffffff !important; border: 1px solid #dadce0 !important; border-radius: 8px !important; padding: 20px 24px !important; text-align: left !important; box-sizing: border-box !important;">
                        <div style="font-family: inherit !important; font-size: 14px !important; line-height: 1.6 !important; color: #3c4043 !important; text-align: left !important; white-space: pre-wrap !important; word-break: break-word !important; margin: 0 !important; padding: 0 !important;">${descFormatted}</div>
                    </div>
                </div>
            `;
        } else if (tabName === 'exercises') {
            renderExercisesTab(classData, userId);
        } else if (tabName === 'members') {
            renderMembersSubTab('thanh-vien');
        } else if (tabName === 'requests') {
            tabContentContainer.innerHTML = `
                <div class="class-content-section" style="padding: 20px; background: #fff; border-radius: 8px; margin-top: 20px;">
                    <h2 style="font-size: 20px; font-weight: 400; margin-bottom: 15px;">Yêu cầu tham gia</h2>
                    <p style="color: #5f6368;">Không có yêu cầu tham gia nào.</p>
                </div>
            `;
        }
    }

    function renderMembersSubTab(subType) {
        const tabContentContainer = document.getElementById('tabContentContainer');
        if (!tabContentContainer) return;

        const isThanhVienActive = subType === 'thanh-vien';

        tabContentContainer.innerHTML = `
            <div class="class-content-section" style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: relative;">
                    <div style="display: flex; background: #fff; border: 1px solid #dadce0; border-radius: 4px; overflow: hidden;">
                        <button id="subTabThanhVien" style="padding: 6px 16px; border: none; background: ${isThanhVienActive ? '#1a73e8' : '#fff'}; color: ${isThanhVienActive ? '#fff' : '#3c4043'}; cursor: pointer; font-size: 14px;">Thành viên</button>
                        <button id="subTabAdmin" style="padding: 6px 16px; border: none; background: ${!isThanhVienActive ? '#1a73e8' : '#fff'}; color: ${!isThanhVienActive ? '#fff' : '#3c4043'}; cursor: pointer; font-size: 14px;">Quản trị viên</button>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; position: relative;">
                        <button class="btn-refresh-sync" title="Đồng bộ lại" style="background: #fff; border: 1px solid #dadce0; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; color: #3c4043; transition: all 0.2s;"><i class="fa-solid fa-rotate"></i><span class="refresh-text" style="max-width: 0; overflow: hidden; white-space: nowrap; transition: max-width 0.3s ease; opacity: 0;">Đồng bộ lại</span></button>
                        
                        <div style="position: relative;">
                            <button id="addMemberDropdownBtn" style="background-color: #1a73e8; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                                <i class="fa-solid fa-user-plus"></i> ${isThanhVienActive ? 'Thêm thành viên' : 'Thêm quản trị viên'}
                            </button>

                            <div id="addMemberDropdownMenu" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 4px; background: #fff; border: 1px solid #dadce0; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 180px; z-index: 100; text-align: left;">
                                <a href="#" id="importEmailOption" class="dropdown-item-hover" style="display: block; padding: 10px 14px; color: #3c4043; text-decoration: none; font-size: 13px; border-bottom: 1px solid #f1f3f4; transition: background 0.2s;"><i class="fa-solid fa-envelope" style="width: 20px;"></i> Nhập danh sách email</a>
                                <a href="#" id="importExcelOption" class="dropdown-item-hover" style="display: block; padding: 10px 14px; color: #3c4043; text-decoration: none; font-size: 13px; border-bottom: 1px solid #f1f3f4; transition: background 0.2s;"><i class="fa-solid fa-file-excel" style="width: 20px;"></i> Nhập từ tệp Excel</a>
                                <a href="#" id="shareLinkOption" class="dropdown-item-hover" style="display: block; padding: 10px 14px; color: #3c4043; text-decoration: none; font-size: 13px; transition: background 0.2s;"><i class="fa-solid fa-link" style="width: 20px;"></i> Chia sẻ liên kết</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="membersListArea" style="background: #fff; border-radius: 8px; min-height: 150px; padding: 20px;">
                    ${isThanhVienActive ? renderThanhVienContent() : renderAdminsCustomList()}
                </div>
            </div>
        `;

        const styleHover = document.createElement('style');
        styleHover.innerHTML = `.dropdown-item-hover:hover { background-color: #f1f3f4 !important; }`;
        document.head.appendChild(styleHover);

        const refreshBtnElem = tabContentContainer.querySelector('.btn-refresh-sync');
        if (refreshBtnElem) {
            const textSpan = refreshBtnElem.querySelector('.refresh-text');
            refreshBtnElem.onmouseenter = function () {
                textSpan.style.maxWidth = '100px';
                textSpan.style.opacity = '1';
            };
            refreshBtnElem.onmouseleave = function () {
                textSpan.style.maxWidth = '0';
                textSpan.style.opacity = '0';
            };
            refreshBtnElem.onclick = function () {
                renderClassDetail(classData, userId, currentHoTen, 'members');
            };
        }

        document.getElementById('subTabThanhVien').onclick = () => renderMembersSubTab('thanh-vien');
        document.getElementById('subTabAdmin').onclick = () => renderMembersSubTab('quan-tri-vien');

        const dropdownBtn = document.getElementById('addMemberDropdownBtn');
        const dropdownMenu = document.getElementById('addMemberDropdownMenu');

        dropdownBtn.onclick = function (e) {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        };

        window.onclick = function () {
            if (dropdownMenu) dropdownMenu.style.display = 'none';
        };

        const shareLinkOpt = document.getElementById('shareLinkOption');
        if (shareLinkOpt) {
            shareLinkOpt.onclick = function (e) {
                e.preventDefault();
                let shareModal = document.getElementById('shareClassLinkModal');

                const currentDomain = window.location.origin;
                const classJoinLink = `${currentDomain}/classrooms/join?code=${classData.ma_lop}`;

                if (!shareModal) {
                    shareModal = document.createElement('div');
                    shareModal.id = 'shareClassLinkModal';
                    shareModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;';

                    shareModal.innerHTML = `
                        <div style="background: #fff; width: 650px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; font-family: inherit; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #dadce0;">
                                <h3 style="margin: 0 auto; font-size: 20px; font-weight: 400; color: #202124;">Chia sẻ liên kết</h3>
                                <button id="closeShareModalX" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #5f6368; position: absolute; right: 20px;"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div style="padding: 24px;">
                                <p style="font-size: 14px; color: #3c4043; margin-top: 0; margin-bottom: 15px;">Chia sẻ liên kết để các thành viên tự đăng ký tham gia vào lớp</p>
                                <div style="display: flex; gap: 10px;">
                                    <input type="text" id="shareLinkInputBox" readonly style="flex: 1; padding: 10px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px; background: #f8f9fa; color: #3c4043; outline: none;">
                                    <button id="copyShareLinkBtn" style="background: #f1f3f4; border: 1px solid #dadce0; color: #3c4043; padding: 0 16px; border-radius: 4px; cursor: pointer; font-size: 14px; white-space: nowrap;">Sao chép đường dẫn</button>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: flex-end; padding: 12px 24px; background: #fff; border-top: 1px solid #dadce0;">
                                <button id="closeShareModalBtn" style="background: #fff; border: 1px solid #dadce0; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; color: #3c4043;">Đóng</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(shareModal);

                    const closeShareBtn1 = shareModal.querySelector('#closeShareModalX');
                    const closeShareBtn2 = shareModal.querySelector('#closeShareModalBtn');
                    const copyBtn = shareModal.querySelector('#copyShareLinkBtn');

                    const closeShareModalFunc = () => {
                        shareModal.style.display = 'none';
                    };

                    closeShareBtn1.onclick = closeShareModalFunc;
                    closeShareBtn2.onclick = closeShareModalFunc;
                    shareModal.onclick = (ev) => { if (ev.target === shareModal) closeShareModalFunc(); };

                    copyBtn.onclick = function () {
                        const inputVal = shareModal.querySelector('#shareLinkInputBox');
                        inputVal.select();
                        navigator.clipboard.writeText(inputVal.value).then(() => {
                            copyBtn.innerText = 'Đã sao chép!';
                            copyBtn.style.color = '#1a73e8';
                            setTimeout(() => {
                                copyBtn.innerText = 'Sao chép đường dẫn';
                                copyBtn.style.color = '#3c4043';
                            }, 2000);
                        });
                    };
                }

                const inputValBox = shareModal.querySelector('#shareLinkInputBox');
                inputValBox.value = classJoinLink;
                shareModal.style.display = 'flex';
            };
        }

        const importEmailOpt = document.getElementById('importEmailOption');
        if (importEmailOpt) {
            importEmailOpt.onclick = function (e) {
                e.preventDefault();
                let emailModal = document.getElementById('emailUploadModal');
                if (!emailModal) {
                    emailModal = document.createElement('div');
                    emailModal.id = 'emailUploadModal';
                    emailModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;';

                    emailModal.innerHTML = `
                        <div style="background: #fff; width: 750px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; font-family: inherit; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #dadce0;">
                                <h3 style="margin: 0 auto; font-size: 20px; font-weight: 400; color: #202124;">Thêm các thành viên vào lớp học</h3>
                                <button id="closeEmailModalX" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #5f6368; position: absolute; right: 20px;"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div style="padding: 24px; display: flex; align-items: center; gap: 15px;">
                                <label style="font-size: 14px; color: #3c4043; min-width: 100px;">Danh sách email:</label>
                                <input type="text" id="emailListInputArea" placeholder="Danh sách E-mail cách nhau bằng dấu ',' hoặc dấu ';' hoặc dấu xuống dòng" style="flex: 1; padding: 10px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px; outline: none; color: #3c4043;">
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 12px 24px; background: #fff; border-top: 1px solid #dadce0;">
                                <button id="closeEmailModalBtn" style="background: #fff; border: 1px solid #dadce0; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; color: #3c4043;">Đóng</button>
                                <button id="confirmEmailUploadBtn" style="background: #1a73e8; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">Xác nhận</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(emailModal);

                    const emailInput = emailModal.querySelector('#emailListInputArea');
                    const confirmBtn = emailModal.querySelector('#confirmEmailUploadBtn');
                    const closeBtn1 = emailModal.querySelector('#closeEmailModalX');
                    const closeBtn2 = emailModal.querySelector('#closeEmailModalBtn');

                    const closeEmailModalFunc = () => {
                        emailModal.style.display = 'none';
                        emailInput.value = '';
                    };

                    closeBtn1.onclick = closeEmailModalFunc;
                    closeBtn2.onclick = closeEmailModalFunc;
                    emailModal.onclick = (ev) => { if (ev.target === emailModal) closeEmailModalFunc(); };

                    confirmBtn.onclick = async function () {
                        const rawText = emailInput.value.trim();
                        if (!rawText) {
                            alert('Vui lòng nhập ít nhất một email!');
                            return;
                        }

                        const rawList = rawText.split(/,|\n|;/);
                        const emailsToProcess = [];

                        for (let item of rawList) {
                            const trimmedEmail = item.trim();
                            if (trimmedEmail !== '') {
                                if (!isValidEmail(trimmedEmail)) {
                                    alert('Có một tài khoản đang không đúng định dạng!');
                                    return;
                                }
                                emailsToProcess.push(trimmedEmail);
                            }
                        }

                        if (emailsToProcess.length === 0) {
                            alert('Không tìm thấy email hợp lệ nào!');
                            return;
                        }

                        let addedCount = 0;

                        for (let email of emailsToProcess) {
                            let isSystemRegistered = false;

                            try {
                                const resCheck = await fetch(`http://localhost:5000/api/lop-hoc/kiem-tra-email?email=${encodeURIComponent(email)}`);
                                const resultCheck = await resCheck.json();
                                if (resultCheck.exists) {
                                    isSystemRegistered = true;
                                }
                            } catch (err) {
                                console.error('Lỗi kết nối kiểm tra email:', err);
                            }

                            if (!classData.classMembersList.some(m => m.email === email)) {
                                const defaultName = email.split('@')[0];
                                const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

                                classData.classMembersList.push({
                                    ho_ten: formattedName,
                                    email: email,
                                    isValid: true,
                                    isRegistered: isSystemRegistered
                                });
                                addedCount++;
                            }
                        }

                        saveClassDataToStorage(classData, userId);
                        await syncMembersToServer(classData, userId);
                        alert(`Thêm thành công ${addedCount} thành viên!`);

                        closeEmailModalFunc();

                        const membersListArea = document.getElementById('membersListArea');
                        if (membersListArea) {
                            membersListArea.innerHTML = renderThanhVienContent();
                        }
                    };
                }

                emailModal.style.display = 'flex';
            };
        }

        const importExcelOpt = document.getElementById('importExcelOption');
        if (importExcelOpt) {
            importExcelOpt.onclick = function (e) {
                e.preventDefault();
                let excelModal = document.getElementById('excelUploadModal');
                if (!excelModal) {
                    excelModal = document.createElement('div');
                    excelModal.id = 'excelUploadModal';
                    excelModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;';

                    excelModal.innerHTML = `
                        <div style="background: #fff; width: 650px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; font-family: inherit;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dadce0;">
                                <h3 style="margin: 0; font-size: 18px; font-weight: 500; color: #202124;">Nhập từ Excel</h3>
                                <button id="closeExcelModalX" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #5f6368;"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div style="padding: 20px;">
                                <button id="downloadTemplateBtn" style="background: #fff; border: 1px solid #dadce0; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; color: #3c4043; margin-bottom: 15px;"><i class="fa-solid fa-download" style="margin-right: 5px;"></i> Tải file excel mẫu</button>
                                
                                <div id="dropZoneArea" style="border: 2px dashed #dadce0; border-radius: 8px; padding: 40px 20px; text-align: center; background: #f8f9fa; cursor: pointer; position: relative;">
                                    <input type="file" id="excelFileInputHidden" accept=".xlsx, .xls" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                                    <div style="font-size: 36px; color: #1a73e8; margin-bottom: 10px;"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                                    <div style="font-size: 14px; color: #3c4043; margin-bottom: 5px;">Kéo thả file excel vào đây hoặc <span style="color: #1a73e8; text-decoration: underline;">click để chọn file</span></div>
                                    <div style="font-size: 12px; color: #5f6368;" id="fileInfoLabel">Định dạng file hỗ trợ: xlsx<br>Dung lượng file không quá 20M.</div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; background: #f8f9fa; border-top: 1px solid #dadce0;">
                                <button id="closeExcelModalBtn" style="background: #fff; border: 1px solid #dadce0; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; color: #3c4043;">Đóng</button>
                                <button id="confirmExcelUploadBtn" disabled style="background: #1a73e8; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; cursor: not-allowed; opacity: 0.6; font-size: 14px;">Xác nhận</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(excelModal);

                    const hiddenInput = excelModal.querySelector('#excelFileInputHidden');
                    const confirmBtn = excelModal.querySelector('#confirmExcelUploadBtn');
                    const fileInfoLabel = excelModal.querySelector('#fileInfoLabel');
                    const closeBtn1 = excelModal.querySelector('#closeExcelModalX');
                    const closeBtn2 = excelModal.querySelector('#closeExcelModalBtn');
                    const downloadTemplateBtn = excelModal.querySelector('#downloadTemplateBtn');

                    downloadTemplateBtn.onclick = function () {
                        const link = document.createElement('a');
                        // Lấy từ máy chủ, không dùng đường dẫn tương đối leo ra
                        // ngoài thư mục giao diện — đường dẫn đó phụ thuộc vào
                        // cách bày thư mục nên đổi gốc một cái là tải hỏng.
                        link.href = 'http://localhost:5000/api/lop-hoc/file-excel-mau';
                        link.download = 'file_excel_mau.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    };

                    const closeModalFunc = () => {
                        excelModal.style.display = 'none';
                        hiddenInput.value = '';
                        fileInfoLabel.innerHTML = 'Định dạng file hỗ trợ: xlsx<br>Dung lượng file không quá 20M.';
                        confirmBtn.disabled = true;
                        confirmBtn.style.cursor = 'not-allowed';
                        confirmBtn.style.opacity = '0.6';
                    };

                    closeBtn1.onclick = closeModalFunc;
                    closeBtn2.onclick = closeModalFunc;
                    excelModal.onclick = (ev) => { if (ev.target === excelModal) closeModalFunc(); };

                    hiddenInput.onchange = function (evt) {
                        const file = evt.target.files[0];
                        if (!file) return;

                        const fileName = file.name.toLowerCase();
                        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
                            alert('File bạn upload không phải dạng Excel!');
                            hiddenInput.value = '';
                            confirmBtn.disabled = true;
                            confirmBtn.style.cursor = 'not-allowed';
                            confirmBtn.style.opacity = '0.6';
                            fileInfoLabel.innerHTML = 'Định dạng file hỗ trợ: xlsx<br>Dung lượng file không quá 20M.';
                            return;
                        }

                        fileInfoLabel.innerHTML = `<b style="color: #1a73e8;">Đã chọn file:</b> ${file.name}`;
                        confirmBtn.disabled = false;
                        confirmBtn.style.cursor = 'pointer';
                        confirmBtn.style.opacity = '1';
                    };

                    confirmBtn.onclick = async function () {
                        if (confirmBtn.disabled) return;
                        const file = hiddenInput.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async function (e) {
                            try {
                                const data = new Uint8Array(e.target.result);
                                const workbook = XLSX.read(data, { type: 'array' });

                                const firstSheetName = workbook.SheetNames[0];
                                const worksheet = workbook.Sheets[firstSheetName];
                                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                                if (jsonData.length === 0) {
                                    alert('File Excel trống!');
                                    return;
                                }

                                const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
                                const emailColIndex = headers.findIndex(h => h.includes('email người dùng') || h.includes('email'));
                                const roleColIndex = headers.findIndex(h => h.includes('vai trò') || h.includes('vai tro') || h.includes('role'));

                                if (emailColIndex === -1 || roleColIndex === -1) {
                                    alert('Cấu trúc file Excel không đúng với file mẫu!');
                                    return;
                                }

                                let addedCount = 0;
                                let invalidOrUnregisteredCount = 0;

                                for (let i = 1; i < jsonData.length; i++) {
                                    const row = jsonData[i];
                                    if (!row || row.length === 0) continue;

                                    const email = row[emailColIndex] ? row[emailColIndex].toString().trim() : '';
                                    const role = roleColIndex !== -1 && row[roleColIndex] ? row[roleColIndex].toString().trim().toLowerCase() : '';

                                    if (email) {
                                        const isFormatValid = isValidEmail(email);
                                        let isSystemRegistered = false;

                                        if (isFormatValid) {
                                            try {
                                                const resCheck = await fetch(`http://localhost:5000/api/lop-hoc/kiem-tra-email?email=${encodeURIComponent(email)}`);
                                                const resultCheck = await resCheck.json();
                                                if (resultCheck.exists || resultCheck.success) {
                                                    isSystemRegistered = true;
                                                }
                                            } catch (err) {
                                                console.error('Lỗi khi kiểm tra email trong CSDL:', err);
                                                isSystemRegistered = false;
                                            }
                                        }

                                        const defaultName = email.split('@')[0] || 'User';
                                        const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

                                        const memberObj = {
                                            ho_ten: formattedName,
                                            email: email,
                                            isValid: isFormatValid,
                                            isRegistered: isSystemRegistered
                                        };

                                        if (!isFormatValid || !isSystemRegistered) {
                                            invalidOrUnregisteredCount++;
                                        }

                                        if (role.includes('quản trị viên') || role.includes('admin')) {
                                            if (!classData.classAdminsList.some(item => item.email === email)) {
                                                classData.classAdminsList.push(memberObj);
                                                addedCount++;
                                            }
                                        } else {
                                            if (!classData.classMembersList.some(item => item.email === email)) {
                                                classData.classMembersList.push(memberObj);
                                                addedCount++;
                                            }
                                        }
                                    }
                                }

                                if (addedCount === 0) {
                                    alert('Không tìm thấy dữ liệu email nào trong file!');
                                    return;
                                }

                                saveClassDataToStorage(classData, userId);
                                await syncMembersToServer(classData, userId);

                                if (invalidOrUnregisteredCount > 0) {
                                    alert(`Đã thêm ${addedCount} người dùng, nhưng có ${invalidOrUnregisteredCount} email không hợp lệ hoặc chưa đăng ký tài khoản hệ thống (đã được bôi đỏ cảnh báo)!`);
                                } else {
                                    alert(`Nhập thành công ${addedCount} người dùng từ file Excel!`);
                                }

                                closeModalFunc();

                                const subTabThanhVienBtn = document.getElementById('subTabThanhVien');
                                const membersListArea = document.getElementById('membersListArea');
                                if (membersListArea) {
                                    if (subTabThanhVienBtn && subTabThanhVienBtn.style.background.includes('26')) {
                                        membersListArea.innerHTML = renderThanhVienContent();
                                    } else {
                                        membersListArea.innerHTML = renderAdminsCustomList();
                                    }
                                }
                            } catch (error) {
                                console.error(error);
                                alert('Đã xảy ra lỗi khi đọc file Excel!');
                            }
                        };
                        reader.readAsArrayBuffer(file);
                    };
                }

                excelModal.style.display = 'flex';
            };
        }
    }

    function renderThanhVienContent() {
        if (classData.classMembersList && classData.classMembersList.length > 0) {
            let html = '';
            classData.classMembersList.forEach((member, index) => {
                const hasError = member.isValid === false || member.isRegistered === false;
                const rowBgColor = hasError ? '#fce8e6' : '#ffffff';
                const errorLabel = member.isValid === false
                    ? ' <span style="color: #c5221f; font-weight: bold; font-size: 11px;">(Email không hợp lệ)</span>'
                    : (member.isRegistered === false ? ' <span style="color: #c5221f; font-weight: bold; font-size: 11px;">(Chưa đăng ký hệ thống)</span>' : '');

                // Người tạo lớp không được xoá khỏi chính lớp mình tạo, và
                // không ai được tự xoá mình ra khỏi lớp. Hai trường hợp đó thay
                // nút Xoá bằng dấu cấm, các thành viên khác vẫn xoá như thường.
                const laChuLop = member.id_nguoi_dung &&
                    String(member.id_nguoi_dung) === String(classData.id_nguoi_dung);
                const laChinhMinh = member.id_nguoi_dung &&
                    String(member.id_nguoi_dung) === String(userId);

                const nutHtml = (laChuLop || laChinhMinh)
                    ? `<span title="${laChuLop
                        ? 'Người tạo lớp không thể bị xoá khỏi lớp'
                        : 'Không thể tự xoá mình khỏi lớp'}"
                             style="display: inline-flex; align-items: center; gap: 6px; color: #9aa0a6; font-size: 13px; padding: 6px 12px; cursor: not-allowed;">
                             <i class="fa-solid fa-ban"></i>${laChuLop ? 'Chủ lớp' : 'Bạn'}
                       </span>`
                    : `<button onclick="removeMemberItem(${index})" style="background: #fff; color: #c5221f; border: 1px solid #dadce0; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;">Xóa</button>`;

                html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #f1f3f4; background-color: ${rowBgColor};">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 40px; height: 40px; background: ${hasError ? '#ea4335' : '#bdc1c6'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; margin-right: 15px;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500; color: #3c4043; font-size: 15px;">${member.ho_ten}</div>
                            <div style="color: #5f6368; font-size: 13px; font-style: italic;">${member.email} ${errorLabel}</div>
                        </div>
                    </div>
                    ${nutHtml}
                </div>
            `;
            });
            return html;
        }
        return `<p style="color: #5f6368; text-align: center; padding: 40px 0; margin: 0;">Lớp học chưa có thành viên</p>`;
    }

    function renderAdminsCustomList() {
        let htmlRows = '';
        if (classData.classAdminsList) {
            classData.classAdminsList.forEach(admin => {
                htmlRows += `
                    <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f3f4;">
                        <div style="width: 40px; height: 40px; background: #bdc1c6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; margin-right: 15px;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500; color: #3c4043; font-size: 15px;">${admin.ho_ten}</div>
                            <div style="color: #5f6368; font-size: 13px; font-style: italic;">${admin.email}</div>
                        </div>
                    </div>
                `;
            });
        }

        htmlRows += `
            <div style="display: flex; align-items: center; padding: 12px 0;">
                <div style="width: 40px; height: 40px; background: #bdc1c6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; margin-right: 15px;">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div>
                    <div style="font-weight: 500; color: #3c4043; font-size: 15px;">Hưng Cao Văn</div>
                    <div style="color: #5f6368; font-size: 13px; font-style: italic;">hungdeptral2200461@gmail.com</div>
                </div>
            </div>
        `;
        return htmlRows;
    }

    window.removeMemberItem = async function (index) {
        classData.classMembersList.splice(index, 1);
        saveClassDataToStorage(classData, userId);
        await syncMembersToServer(classData, userId);
        const membersListArea = document.getElementById('membersListArea');
        if (membersListArea) membersListArea.innerHTML = renderThanhVienContent();
    };

    switchTab(activeTabName);

    const tabItems = document.querySelectorAll('.class-tab-item');
    tabItems.forEach(tab => {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            tabItems.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            switchTab(this.getAttribute('data-tab'));
        });
    });

    const updateInput = document.getElementById('updateClassNameInput');
    const updateDescElem = document.querySelector('#updateClassModal .editor-textarea');

    const openUpdateBtn = document.getElementById('openUpdateModalBtn');

    if (openUpdateBtn) {
        openUpdateBtn.onclick = function (e) {
            e.preventDefault();
            if (updateInput) updateInput.value = classData.tieu_de || classData.name;
            if (updateDescElem) updateDescElem.value = classData.mo_ta || '';
            if (updateModal) updateModal.style.display = 'flex';
        };
    }

    const closeUpdateModal = () => {
        if (updateModal) updateModal.style.display = 'none';
    };

    if (closeUpdateBtn) closeUpdateBtn.onclick = closeUpdateModal;
    if (cancelUpdateBtn) cancelUpdateBtn.onclick = closeUpdateModal;

    if (submitUpdateBtn) {
        submitUpdateBtn.onclick = async function () {
            const idLopHoc = classData.id;
            const newName = document.getElementById('updateClassNameInput').value.trim();
            const newDesc = document.querySelector('#updateClassModal .editor-textarea').value.trim();

            if (!newName) {
                alert('Tên lớp học không được để trống!');
                return;
            }

            if (!idLopHoc) {
                alert('Không tìm thấy ID lớp học cần cập nhật!');
                return;
            }

            try {
                const response = await fetch(`http://localhost:5000/api/lop-hoc/${idLopHoc}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tieu_de: newName, mo_ta: newDesc })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    classData.tieu_de = newName;
                    classData.name = newName;
                    classData.mo_ta = newDesc;

                    // Lấy mốc cập nhật từ bản ghi máy chủ vừa lưu. Đồng hồ máy
                    // người dùng có thể lệch, mà cột "TG cập nhật" ở màn danh
                    // sách lại đọc thẳng ngay_cap_nhat trong cơ sở dữ liệu — hai
                    // chỗ lấy từ hai nguồn khác nhau thì hiện ra hai giờ khác
                    // nhau cho cùng một lớp.
                    const timeString =
                        formatVNDate(result.data && result.data.ngay_cap_nhat)
                        || nhanThoiGianHienTai();

                    classData.time = timeString;
                    classData.ngay_cap_nhat = timeString;

                    if (!classData.created_time) {
                        classData.created_time =
                            formatVNDate(result.data && result.data.ngay_tao)
                            || timeString;
                    }

                    saveClassDataToStorage(classData, userId);

                    document.getElementById('detailClassTitle').innerText = newName;
                    const timeElem = document.getElementById('detailClassTime');
                    if (timeElem) {
                        timeElem.innerHTML = `<b>${timeString}</b>`;
                    }

                    const activeTab = document.querySelector('.class-tab-item.active');
                    if (activeTab && activeTab.getAttribute('data-tab') === 'description') {
                        switchTab('description');
                    }

                    closeUpdateModal();
                    alert('Cập nhật thông tin lớp học thành công trên CSDL và giao diện!');

                } else {
                    alert('Lỗi: ' + (result.message || 'Không thể cập nhật'));
                }
            } catch (error) {
                console.error('Lỗi khi cập nhật:', error);
                alert('Không thể kết nối đến server để cập nhật!');
            }
        };
    }
}

/**
 * Chuỗi thời gian hiện tại theo đúng định dạng đang hiển thị ở cột "TG cập nhật"
 * và ở dòng "cập nhật cuối vào" trong trang chi tiết lớp: HH:mm dd/MM/yy.
 */
function nhanThoiGianHienTai() {
    const now = new Date();
    const hai = so => String(so).padStart(2, '0');

    return `${hai(now.getHours())}:${hai(now.getMinutes())} `
        + `${hai(now.getDate())}/${hai(now.getMonth() + 1)}/`
        + `${String(now.getFullYear()).slice(-2)}`;
}

/**
 * Gắn cách lưu cho nút "Cập nhật" khi hộp thoại được mở từ danh sách lớp học.
 *
 * Lưu xong thì vẽ lại đúng bảng danh sách đang đứng, không tải lại trang: trước
 * đây nút này gọi location.reload() nên người dùng bị đưa ra khỏi chỗ đang làm.
 */
function ganLuuCapNhatLopTuDanhSach(classData, userId, storageKey, classList) {
    const updateModal = document.getElementById('updateClassModal');
    const submitUpdateBtn = document.getElementById('submitUpdateBtn');
    if (!submitUpdateBtn) return;

    submitUpdateBtn.onclick = async function () {
        const tenMoi = document.getElementById('updateClassNameInput').value.trim();
        const moTaMoi = document.querySelector('#updateClassModal .editor-textarea').value.trim();

        if (!tenMoi) {
            alert('Tên lớp học không được để trống!');
            return;
        }

        if (!classData.id) {
            alert('Không tìm thấy ID lớp học cần cập nhật!');
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/lop-hoc/${classData.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tieu_de: tenMoi, mo_ta: moTaMoi })
                }
            );
            const result = await response.json();

            if (!response.ok || !result.success) {
                alert('Lỗi: ' + (result.message || 'Không thể cập nhật'));
                return;
            }

            classData.tieu_de = tenMoi;
            classData.name = tenMoi;
            classData.mo_ta = moTaMoi;

            // Cùng lý do như ở trang chi tiết: lấy mốc máy chủ trả về, không lấy
            // đồng hồ máy người dùng.
            classData.time =
                formatVNDate(result.data && result.data.ngay_cap_nhat)
                || nhanThoiGianHienTai();
            classData.ngay_cap_nhat = classData.time;

            if (!classData.created_time) {
                classData.created_time =
                    formatVNDate(result.data && result.data.ngay_tao)
                    || classData.time;
            }

            localStorage.setItem(storageKey, JSON.stringify(classList));

            if (updateModal) updateModal.style.display = 'none';
            await thongBao('Cập nhật lớp học thành công!');

            renderMainContent();
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
            alert('Không thể kết nối đến server để cập nhật!');
        }
    };
}

function renderMainContent() {
    const mainElement = document.querySelector('main');
    const userId = getCurrentUserId();
    const storageKey = `user_classes_${userId}`;
    const savedData = localStorage.getItem(storageKey);

    const currentHoTen = localStorage.getItem('ho_ten') || 'Người dùng';

    let classList = [];
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            classList = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            classList = [];
        }
    }

    if (classList.length > 0) {
        let tableRowsHTML = '';
        classList.forEach((classData, index) => {
            const isOwner = String(classData.id_nguoi_dung) === String(userId);
            const ownerName = classData.chu_lop_ho_ten || classData.ho_ten_chu_lop || 'Chủ lớp';

            const roleText = isOwner
                ? `<b>${currentHoTen}</b> là <b>Chủ lớp học</b>`
                : `<b>${ownerName}</b> là <b>Chủ lớp học</b> (Bạn là thành viên)`;

            const actionHtml = isOwner ? `
                <button class="action-icon-edit btn-open-update" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-icon-delete delete-class-item" data-index="${index}" title="Xóa"><i class="fa-solid fa-xmark"></i></button>
            ` : `<span style="color: #5f6368; font-style: italic; font-size: 13px;">Thành viên</span>`;

            tableRowsHTML += `
                <tr class="class-row-item" data-index="${index}" style="cursor: pointer;">
                    <td style="border: 1px solid #dadce0; padding: 15px;">${classData.id}</td>
                    <td style="border: 1px solid #dadce0; padding: 15px;">
                        <a href="#" class="table-class-title" data-index="${index}">${classData.name}</a>
                        <div class="table-role-sub">${roleText}</div>
                        <div class="table-role-sub" style="color: #666;">Mã lớp: <b>${classData.ma_lop || 'N/A'}</b></div>
                    </td>
                    <td style="border: 1px solid #dadce0; padding: 15px;"><b>${classData.created_time || classData.time}</b></td>
                    <td style="border: 1px solid #dadce0; padding: 15px;"><b>${classData.time}</b></td>
                    <td style="border: 1px solid #dadce0; padding: 15px; text-align: center;">
                        ${actionHtml}
                    </td>
                </tr>
            `;
        });

        mainElement.innerHTML = `
            <div class="class-management-container">
                <div class="management-header-row">
                    <h2>Quản lý lớp học</h2>
                    <div class="management-actions">
                        <button class="btn-refresh-sync" id="refreshTableBtn" title="Đồng bộ lại" style="background: #fff; border: 1px solid #dadce0; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; color: #3c4043; transition: all 0.2s;"><i class="fa-solid fa-rotate"></i><span class="refresh-text" style="max-width: 0; overflow: hidden; white-space: nowrap; transition: max-width 0.3s ease; opacity: 0;">Đồng bộ lại</span></button>
                        <button class="btn-join-class" id="tableJoinBtn"><i class="fa-solid fa-link"></i> Tham gia lớp học</button>
                        <button class="btn-create-class-main" id="tableCreateBtn"><i class="fa-solid fa-plus"></i> Tạo lớp học</button>
                    </div>
                </div>

                <table class="class-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr>
                            <th style="width: 80px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa;">ID <i class="fa-solid fa-sort"></i></th>
                            <th style="border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa;">Tiêu đề <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 180px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa;">TG tạo <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 180px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa;">TG cập nhật <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 100px; border: 1px solid #dadce0; padding: 12px; background-color: #f8f9fa;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>
            </div>
        `;

        const refreshTableBtn = document.getElementById('refreshTableBtn');
        if (refreshTableBtn) {
            const textSpan = refreshTableBtn.querySelector('.refresh-text');
            refreshTableBtn.onmouseenter = function () {
                textSpan.style.maxWidth = '100px';
                textSpan.style.opacity = '1';
            };
            refreshTableBtn.onmouseleave = function () {
                textSpan.style.maxWidth = '0';
                textSpan.style.opacity = '0';
            };
            refreshTableBtn.onclick = function () {
                location.reload();
            };
        }

        const editButtons = mainElement.querySelectorAll('.action-icon-edit');
        editButtons.forEach(btn => {
            btn.onclick = function () {
                const idx = parseInt(this.closest('tr').querySelector('.table-class-title').getAttribute('data-index'));
                const classData = classList[idx];

                // Chỉ mở hộp thoại ngay trên danh sách. Trước đây hàm này gọi
                // renderClassDetail() nên vừa bấm cây bút là màn hình đã bị đẩy
                // hẳn vào bên trong lớp học, xong việc lại không quay ra được.
                const updateModal = document.getElementById('updateClassModal');
                const updateInput = document.getElementById('updateClassNameInput');
                const updateDescElem = document.querySelector('#updateClassModal .editor-textarea');

                if (updateInput) updateInput.value = classData.name || classData.tieu_de || '';
                if (updateDescElem) updateDescElem.value = classData.mo_ta || '';

                // Mỗi nơi mở hộp thoại tự gắn cách lưu của mình, vì nút Cập nhật
                // là nút dùng chung cho cả danh sách lẫn trang chi tiết lớp.
                ganLuuCapNhatLopTuDanhSach(classData, userId, storageKey, classList);

                if (updateModal) updateModal.style.display = 'flex';
            };
        });

        const deleteButtons = mainElement.querySelectorAll('.delete-class-item');
        deleteButtons.forEach(btn => {
            btn.onclick = async function () {
                if (await xacNhan('Bạn có chắc chắn muốn xóa lớp học này không?')) {
                    const idx = parseInt(this.getAttribute('data-index'));
                    const classData = classList[idx];

                    try {
                        const response = await fetch(`http://localhost:5000/api/lop-hoc/${classData.id}`, {
                            method: 'DELETE'
                        });

                        if (response.status !== 404 && !response.ok) {
                            const result = await response.json().catch(() => ({}));
                            if (!result.success) {
                                alert('Xóa lớp học trên CSDL thất bại!');
                                return;
                            }
                        }
                    } catch (error) {
                        console.error('Lỗi kết nối tới Server:', error);
                    }

                    classList.splice(idx, 1);
                    localStorage.setItem(storageKey, JSON.stringify(classList));

                    renderMainContent();
                    alert('Đã đồng bộ và xóa bỏ lớp học khỏi giao diện thành công!');
                }
            };
        });

        const rowItems = mainElement.querySelectorAll('.class-row-item');
        rowItems.forEach(row => {
            row.onclick = function (e) {
                if (e.target.closest('.action-icon-edit') || e.target.closest('.delete-class-item')) {
                    return;
                }
                const idx = parseInt(this.getAttribute('data-index'));
                renderClassDetail(classList[idx], userId, currentHoTen);
            };
        });

        const titleLinks = mainElement.querySelectorAll('.table-class-title');
        titleLinks.forEach(link => {
            link.onclick = function (e) {
                e.preventDefault();
                const idx = parseInt(this.getAttribute('data-index'));
                renderClassDetail(classList[idx], userId, currentHoTen);
            };
        });

    } else {
        mainElement.innerHTML = `
            <div class="empty-class" style="text-align: center; padding: 50px 20px;">
                <img src="../images/class.jpg" alt="Empty Classroom" class="empty-img" style="max-width: 200px; margin-bottom: 20px;">
                <h3>Bạn chưa tạo hoặc tham gia lớp học nào</h3>
                <div class="btn-group" style="margin: 20px 0; display: flex; justify-content: center; gap: 10px;">
                    <button class="create-btn" id="emptyCreateBtn" style="background: #1a73e8; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-plus"></i> Tạo lớp học mới</button>
                    <button class="join-btn" id="emptyJoinBtn" style="background: #fff; border: 1px solid #dadce0; color: #3c4043; padding: 10px 20px; border-radius: 4px; cursor: pointer;"><i class="fa fa-link"></i> Tham gia lớp học</button>
                </div>
                <p class="desc" style="color: #5f6368; max-width: 600px; margin: 0 auto;">
                    Lớp học (Classroom) giúp giảng viên, sinh viên gửi và nhận tài liệu (bài tập, khoá luận, tiểu luận...)
                    với chức năng kiểm tra trùng lặp văn bản
                </p>
            </div>
        `;

        const emptyCreateBtn = document.getElementById('emptyCreateBtn');
        if (emptyCreateBtn) {
            emptyCreateBtn.onclick = () => { if (createModal) createModal.style.display = 'flex'; };
        }

        const emptyJoinBtn = document.getElementById('emptyJoinBtn');
        if (emptyJoinBtn) {
            emptyJoinBtn.onclick = () => { if (joinModal) joinModal.style.display = 'flex'; };
        }
    }

    const tableCreateBtn = document.getElementById('tableCreateBtn');
    if (tableCreateBtn) {
        tableCreateBtn.onclick = () => { if (createModal) createModal.style.display = 'flex'; };
    }

    const tableJoinBtn = document.getElementById('tableJoinBtn');
    if (tableJoinBtn) {
        tableJoinBtn.onclick = () => { if (joinModal) joinModal.style.display = 'flex'; };
    }
}

if (submitCreateBtn) {
    submitCreateBtn.addEventListener('click', async function () {
        if (classNameInput.value.trim() === '') {
            alert('Hãy nhập tên lớp học!');
            return;
        }

        const className = classNameInput.value.trim();
        const classDescElem = document.getElementById('createDescInput') || createModal.querySelector('.editor-textarea, textarea');
        const classDesc = classDescElem ? classDescElem.value.trim() : '';

        const userId = getCurrentUserId();
        const randomClassCode = generateClassCode();

        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const timeString = `${hours}:${minutes} ${day}/${month}/${year}`;

        const payload = {
            id_nguoi_dung: userId,
            tieu_de: className,
            mo_ta: classDesc,
            ma_lop: randomClassCode
        };

        try {
            const response = await fetch('http://localhost:5000/api/lop-hoc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                alert('Lưu vào CSDL thất bại: ' + (result.message || 'Lỗi server'));
                return;
            }

            const serverClassId = result.data.id_lop_hoc;

            const storageKey = `user_classes_${userId}`;
            let classList = [];
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                try {
                    classList = JSON.parse(savedData);
                    if (!Array.isArray(classList)) classList = [classList];
                } catch (e) {
                    classList = [];
                }
            }

            // Mốc thời gian lấy từ chính bản ghi máy chủ vừa tạo, không lấy đồng
            // hồ máy người dùng.
            //
            // Hai lý do: đồng hồ hai máy có thể lệch nhau, và lớp mới tạo trước
            // đây không có trường ngay_cap_nhat nên dòng "cập nhật cuối vào"
            // hiện thẳng chữ undefined. Lớp chưa sửa lần nào thì thời gian cập
            // nhật đúng bằng thời gian tạo.
            const ngayTao = formatVNDate(result.data.ngay_tao) || timeString;
            const ngayCapNhat =
                formatVNDate(result.data.ngay_cap_nhat) || ngayTao;

            const classInfo = {
                id: serverClassId,
                id_nguoi_dung: userId,
                name: className,
                tieu_de: className,
                mo_ta: classDesc,
                ma_lop: randomClassCode,
                created_time: ngayTao,
                ngay_cap_nhat: ngayCapNhat,
                time: ngayCapNhat,
                classMembersList: [],
                classAdminsList: []
            };

            classList.push(classInfo);
            localStorage.setItem(storageKey, JSON.stringify(classList));

            createModal.style.display = 'none';
            classNameInput.value = '';
            if (classDescElem) classDescElem.value = '';

            const currentHoTen = localStorage.getItem('ho_ten') || 'Người dùng';
            renderClassDetail(classInfo, userId, currentHoTen);

        } catch (error) {
            console.error('Lỗi kết nối tới Server:', error);
            alert('Không thể kết nối đến server để tạo lớp học!');
        }
    });
}

const confirmJoinBtn = submitJoinBtn;

if (confirmJoinBtn) {
    confirmJoinBtn.addEventListener('click', async function () {
        const enteredCode = classCodeJoinInput ? classCodeJoinInput.value.trim() : '';
        if (!enteredCode) {
            alert('Vui lòng nhập mã lớp!');
            return;
        }

        const userId = getCurrentUserId();

        try {
            const response = await fetch('http://localhost:5000/api/lop-hoc/tham-gia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ma_lop: enteredCode,
                    id_nguoi_dung: userId
                })
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                alert(result.message || 'Không thể tham gia lớp học!');
                return;
            }

            const classDataFromServer = result.data;

            const storageKey = `user_classes_${userId}`;
            let classList = [];
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                try {
                    classList = JSON.parse(savedData);
                    if (!Array.isArray(classList)) classList = [classList];
                } catch (e) { classList = []; }
            }

            const existsInLocal = classList.some(c => c.ma_lop === enteredCode);
            let targetClass = classList.find(c => c.ma_lop === enteredCode);

            const now = new Date();
            const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;

            if (!existsInLocal) {
                targetClass = {
                    id: classDataFromServer.id_lop_hoc,
                    id_nguoi_dung: classDataFromServer.id_nguoi_dung,
                    name: classDataFromServer.tieu_de,
                    tieu_de: classDataFromServer.tieu_de,
                    mo_ta: classDataFromServer.mo_ta || '',
                    ma_lop: classDataFromServer.ma_lop,
                    time: timeString,
                    classMembersList: classDataFromServer.danh_sach_thanh_vien || [],
                    classAdminsList: classDataFromServer.danh_sach_quan_tri_vien || []
                };
                classList.push(targetClass);
                localStorage.setItem(storageKey, JSON.stringify(classList));
            }

            joinModal.style.display = 'none';
            if (classCodeJoinInput) classCodeJoinInput.value = '';

            const currentHoTen = localStorage.getItem('ho_ten') || 'Người dùng';
            renderClassDetail(targetClass, userId, currentHoTen);

            alert('Tham gia lớp học thành công!');
        } catch (error) {
            console.error('Lỗi khi tham gia lớp học:', error);
            alert('Có lỗi xảy ra khi kết nối tới server!');
        }
    });
}

[closeCreate, cancelCreate].forEach(el => {
    if (el) el.addEventListener('click', () => { createModal.style.display = 'none'; });
});

[closeJoin, cancelJoin].forEach(el => {
    if (el) el.addEventListener('click', () => {
        joinModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === createModal) createModal.style.display = 'none';
    if (e.target === joinModal) joinModal.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', async function () {
    const userId = getCurrentUserId();
    const storageKey = `user_classes_${userId}`;

    try {
        const response = await fetch(`http://localhost:5000/api/lop-hoc/nguoi-dung/${userId}`);
        const result = await response.json();

        if (response.ok && result.success) {
            const classesFromDB = result.data.map(cls => ({
                id: cls.id_lop_hoc,
                id_nguoi_dung: cls.id_nguoi_dung,
                name: cls.tieu_de,
                tieu_de: cls.tieu_de,
                mo_ta: cls.mo_ta || '',
                ma_lop: cls.ma_lop,
                chu_lop_ho_ten: cls.ho_ten_chu_lop || 'Chủ lớp',
                created_time: formatVNDate(cls.ngay_tao),
                ngay_cap_nhat: cls.ngay_cap_nhat ? formatVNDate(cls.ngay_cap_nhat) : formatVNDate(cls.ngay_tao),
                time: cls.ngay_cap_nhat ? formatVNDate(cls.ngay_cap_nhat) : formatVNDate(cls.ngay_tao),
                classMembersList: cls.danh_sach_thanh_vien || [],
                classAdminsList: cls.danh_sach_quan_tri_vien || []
            }));

            localStorage.setItem(storageKey, JSON.stringify(classesFromDB));
        }
    } catch (error) {
        console.error('Không thể kết nối lấy dữ liệu từ server, dùng tạm localStorage:', error);
    }

    if (typeof renderMainContent === 'function') {
        renderMainContent();
    }
});

document.addEventListener('click', function (e) {
    const editBtn = e.target.closest('.edit-class-item');
    if (editBtn) {
        e.stopPropagation();
        const index = editBtn.getAttribute('data-index');
        const classData = classList[index];

        const updateModal = document.getElementById('updateClassModal');
        const updateNameInput = document.getElementById('updateClassNameInput');
        const updateDescTextarea = document.querySelector('#updateClassModal .editor-textarea');

        if (updateNameInput) updateNameInput.value = classData.tieu_de || classData.name;
        if (updateDescTextarea) updateDescTextarea.value = Array.isArray(classData.mo_ta) ? classData.mo_ta[0] : (classData.mo_ta || '');

        updateModal.setAttribute('data-editing-id', classData.id);
        updateModal.style.display = 'flex';
    }
});

const closeUpdateBtn = document.getElementById('closeUpdate');
const cancelUpdateBtn = document.getElementById('cancelUpdate');
const updateModal = document.getElementById('updateClassModal');

if (closeUpdateBtn) closeUpdateBtn.onclick = () => updateModal.style.display = 'none';
if (cancelUpdateBtn) cancelUpdateBtn.onclick = (e) => { e.preventDefault(); updateModal.style.display = 'none'; };

const submitUpdateBtn = document.getElementById('submitUpdateBtn');
if (submitUpdateBtn) {
    submitUpdateBtn.onclick = async function () {
        const idLopHoc = updateModal.getAttribute('data-editing-id');
        const newTitle = updateClassNameInput ? updateClassNameInput.value.trim() : '';
        const newDesc = updateDescTextarea ? updateDescTextarea.value.trim() : '';

        if (!newTitle) {
            alert('Tên lớp học không được để trống!');
            return;
        }

        if (!idLopHoc) {
            alert('Không tìm thấy ID lớp học cần cập nhật!');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/lop-hoc/${idLopHoc}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tieu_de: newTitle, mo_ta: newDesc })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                updateModal.style.display = 'none';
                await thongBao('Cập nhật lớp học thành công!');

                // Vẽ lại danh sách tại chỗ thay vì location.reload(), để người
                // dùng ở nguyên màn hình đang làm việc.
                renderMainContent();
            } else {
                alert('Lỗi: ' + (result.message || 'Không thể cập nhật'));
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
            alert('Không thể kết nối đến server để cập nhật!');
        }
    };
}

function formatVNDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${hours}:${minutes} ${day}/${month}/${year}`;
}

const joinModalElem = document.getElementById('joinClassModal');
if (joinModalElem) {
    const classCodeInput = joinModalElem.querySelector('.form-input-large');
    const confirmJoinButton = joinModalElem.querySelector('.btn-submit-large');

    if (classCodeInput && confirmJoinButton) {
        confirmJoinButton.disabled = true;

        classCodeInput.addEventListener('input', function () {
            if (this.value.trim() === '') {
                confirmJoinButton.disabled = true;
            } else {
                confirmJoinButton.disabled = false;
            }
        });
    }
}

const createModalElem = document.getElementById('createClassModal');

if (createModalElem) {
    const classNameInput = createModalElem.querySelector('.form-input-large');
    const createSubmitButton = createModalElem.querySelector('.modal-footer-large .btn-submit-large');

    if (classNameInput && createSubmitButton) {
        createSubmitButton.disabled = true;

        classNameInput.addEventListener('input', function () {
            if (this.value.trim() === '') {
                createSubmitButton.disabled = true;
            } else {
                createSubmitButton.disabled = false;
            }
        });
    }
}

const updateClassNameInput = document.getElementById('updateClassNameInput');
const updateDescTextarea = updateModal ? updateModal.querySelector('.editor-textarea') : null;

document.querySelectorAll('.btn-open-update').forEach(btn => {
    btn.addEventListener('click', function () {
        const row = this.closest('tr');
        if (row && updateModal) {
            const titleCell = row.querySelector('td:nth-child(2)');
            let className = '';
            if (titleCell) {
                const linkElem = titleCell.querySelector('a');
                className = linkElem ? linkElem.innerText.trim() : titleCell.innerText.trim();
            }

            if (updateClassNameInput) updateClassNameInput.value = className;
            if (updateDescTextarea) updateDescTextarea.value = "";

            if (submitUpdateBtn && updateClassNameInput) {
                submitUpdateBtn.disabled = (updateClassNameInput.value.trim() === '');
            }

            updateModal.style.display = 'flex';
        }
    });
});

document.querySelectorAll('.btn-open-update-detail').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        if (updateModal) {
            updateModal.setAttribute('data-editing-id', classData.id_lop_hoc);
            updateModal.style.display = 'flex';
            if (submitUpdateBtn && updateClassNameInput) {
                submitUpdateBtn.disabled = (updateClassNameInput.value.trim() === '');
            }
        }
    });
});

[closeUpdateBtn, cancelUpdateBtn].forEach(btn => {
    if (btn) {
        btn.addEventListener('click', function () {
            if (updateModal) updateModal.style.display = 'none';
        });
    }
});

if (updateClassNameInput && submitUpdateBtn) {
    updateClassNameInput.addEventListener('input', function () {
        if (this.value.trim() === '') {
            submitUpdateBtn.disabled = true;
        } else {
            submitUpdateBtn.disabled = false;
        }
    });
}

const observer = new MutationObserver(function (mutations) {
    const pageText = document.body.innerText || '';
    if (pageText.includes("(Bạn là thành viên)")) {
        const buttons = document.querySelectorAll('button, .btn-delete-member');
        buttons.forEach(btn => {
            if (btn.textContent.trim() === 'Xóa') {
                btn.remove();
            }
        });
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

/**
 * Người đang đăng nhập có phải chủ lớp đang mở hay không.
 *
 * Trước đây chỗ này xét quyền bằng cách dò chữ "(Bạn là thành viên)" trong nội
 * dung trang. Hễ chuỗi đó xuất hiện ở bất kỳ đâu — kể cả ở dòng của một lớp
 * khác trong danh sách — là nút Thêm bài tập bị khoá. Vì vậy vừa tạo lớp xong,
 * bấm thêm bài tập cho chính lớp mình tạo vẫn bị báo không có quyền.
 *
 * Nay xét theo dữ liệu: so mã chủ lớp của lớp đang mở với mã người đăng nhập.
 */
function laChuLopDangMo() {
    const lop = window.currentClassData || window.classData;
    if (!lop) return true;   // chưa mở lớp nào thì không khoá gì cả

    const toi = localStorage.getItem('id_nguoi_dung')
        || localStorage.getItem('userId') || '';

    return String(lop.id_nguoi_dung) === String(toi);
}

const observerRestrictMember = new MutationObserver(function () {
    if (laChuLopDangMo()) return;

    const buttons = document.querySelectorAll('button, a');

    buttons.forEach(btn => {
        const text = btn.textContent.trim();

        if (text.includes('Thêm thành viên') || text.includes('Thêm bài tập')) {
            btn.style.cursor = 'not-allowed';
            btn.style.opacity = '0.6';

            btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                thongBao('Bạn là thành viên nên không có quyền thực hiện chức năng này!');
                return false;
            };
        }
    });
});

observerRestrictMember.observe(document.body, {
    childList: true,
    subtree: true
});

const observerJoinTab = new MutationObserver(function () {
    const contentAreas = document.querySelectorAll('div, p, span');
    contentAreas.forEach(el => {
        if (el.textContent.trim() === 'Không có yêu cầu tham gia nào.') {
            // Mã lớp trước đây bị ghi cứng nên lớp nào cũng ra cùng một liên kết.
            // Lấy theo lớp đang mở; chưa xác định được thì không dựng liên kết.
            const duLieuLop = window.currentClassData || window.classData;
            const maLopHienTai = duLieuLop && duLieuLop.ma_lop;
            if (!maLopHienTai) return;

            const shareLink =
                `${window.location.origin}/classrooms/join?code=${maLopHienTai}`;

            el.innerHTML = `
                <div style="margin-top: -90px; margin-left: 0; text-align: left; max-width: 600px;">
                    <div style="font-size: 14px; color: #333; margin-top: -40px; margin-bottom: 10px; font-weight: 500;">
                        Chia sẻ liên kết để các thành viên tự đăng ký tham gia vào lớp
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" readonly value="${shareLink}" id="inputShareLinkCustom" style="flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; background: #f9f9f9; color: #333; font-size: 14px;" />
                        <button onclick="
                            const btn = this;
                            const input = document.getElementById('inputShareLinkCustom');
                            input.select();
                            input.setSelectionRange(0, 99999);
                            navigator.clipboard.writeText(input.value);
                            
                            btn.innerText = 'Đã sao chép!';
                            btn.style.color = '#1a73e8';
                            btn.style.borderColor = '#1a73e8';
                            
                            setTimeout(() => {
                                btn.innerText = 'Sao chép đường dẫn';
                                btn.style.color = '#3c4043';
                                btn.style.borderColor = '#dadce0';
                            }, 1500);
                        " style="background: #f1f3f4; border: 1px solid #dadce0; color: #3c4043; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500; white-space: nowrap; transition: all 0.2s;">
                            Sao chép đường dẫn
                        </button>
                    </div>
                </div>
            `;
        }
    });
});

observerJoinTab.observe(document.body, {
    childList: true,
    subtree: true
});

renderMainContent();