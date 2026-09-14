document.addEventListener('DOMContentLoaded', function () {

    // 1. Lấy thông tin ID người dùng từ LocalStorage
    const userId = localStorage.getItem('id_nguoi_dung') || 'ND001';
    const API_BASE_URL = 'http://localhost:5000/api/auth';

    let originalData = {};

    // 2. Chuyển Tab Sidebar (Thông tin cá nhân <-> Đổi mật khẩu)
    const menuItems = document.querySelectorAll('main .sidebar .menu-item');
    const tabContents = document.querySelectorAll('main .content .tab-content');

    menuItems.forEach((item) => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            const tabTarget = item.getAttribute('data-tab');

            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));

            const targetContent = document.getElementById(`tab-${tabTarget}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // 3. Tải thông tin cá nhân từ CSDL
    function getProfileInputs() {
        return {
            fullname: document.getElementById('fullname'),
            email: document.getElementById('email'),
            studentId: document.getElementById('student-id'),
            className: document.getElementById('class-name'),
            course: document.getElementById('course'),
            reportNumber: document.getElementById('report-count')
        };
    }

    function renderDataToForm(data) {
        if (!data) return;

        const fields = getProfileInputs();

        if (fields.fullname) fields.fullname.value = data.ho_ten || data.fullname || '';
        if (fields.email) fields.email.value = data.email || '';
        if (fields.studentId) fields.studentId.value = data.ma_sinh_vien || data.student_id || '';
        if (fields.className) fields.className.value = data.lop || data.class_name || '';
        if (fields.course) fields.course.value = data.khoa_hoc || data.course || '';
        // Số báo cáo là số đếm do hệ thống tự tính, không phải ô người dùng nhập,
        // nên chỉ đổ tạm giá trị cũ rồi để demSoBaoCao() ghi đè bằng số thật.
        if (fields.reportNumber) {
            fields.reportNumber.value = data.so_luong_bao_cao !== undefined
                ? data.so_luong_bao_cao : (data.report_number || 0);
            fields.reportNumber.readOnly = true;
        }

        const navUserName = document.getElementById('navUserName');
        if (navUserName) {
            const displayName = data.ho_ten || data.fullname;
            if (displayName) navUserName.innerText = displayName;
        }
    }

    /**
     * Đếm số báo cáo người dùng đã tải lên rồi đổ vào ô "Số báo cáo".
     * Chưa tải lên bài nào thì để 0.
     */
    function demSoBaoCao() {
        const o = document.getElementById('report-count');
        if (!o || !userId) return;

        // API_BASE_URL đã trỏ sẵn vào nhánh /api/auth nên ở đây phải dùng gốc /api
        fetch(`http://localhost:5000/api/bao-cao/tai-lieu-nop/${encodeURIComponent(userId)}`)
            .then(r => r.json())
            .then(kq => {
                o.value = (kq.success && Array.isArray(kq.data)) ? kq.data.length : 0;
            })
            .catch(err => {
                console.error('Không đếm được số báo cáo:', err);
                o.value = 0;
            });
    }

    function loadUserProfile() {
        fetch(`${API_BASE_URL}/profile/${userId}`)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    originalData = result.data;
                    renderDataToForm(originalData);
                }
            })
            .catch(error => {
                console.error('Lỗi khi lấy thông tin cá nhân:', error);
            });
    }

    // Nút Hủy (Khôi phục lại dữ liệu ban đầu)
    const btnCancel = document.querySelector('#tab-profile .btn-secondary');
    if (btnCancel) {
        btnCancel.addEventListener('click', function (e) {
            e.preventDefault();
            renderDataToForm(originalData);
        });
    }

    // 4. Submit Cập nhật thông tin cá nhân (Tab 1)
    const profileForm = document.querySelector('#tab-profile form');
    if (profileForm) {
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const fields = getProfileInputs();

            const payload = {
                ho_ten: fields.fullname ? fields.fullname.value.trim() : '',
                email: fields.email ? fields.email.value.trim() : '',
                ma_sinh_vien: fields.studentId ? fields.studentId.value.trim() : '',
                lop: fields.className ? fields.className.value.trim() : '',
                khoa_hoc: fields.course ? fields.course.value.trim() : ''
            };
            // Không gửi so_luong_bao_cao lên máy chủ: đây là số hệ thống tự đếm
            // từ các báo cáo đã tải lên, người dùng không được sửa.

            fetch(`${API_BASE_URL}/profile/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        originalData = (result.data && Object.keys(result.data).length > 0) ? result.data : payload;
                        renderDataToForm(originalData);

                        const updatedName = originalData.ho_ten || payload.ho_ten;
                        if (updatedName) {
                            localStorage.setItem('ho_ten', updatedName);
                            localStorage.setItem('username', updatedName);
                        }

                        showAlert('Cập nhật thông tin cá nhân thành công!');
                    } else {
                        showAlert('Lỗi cập nhật: ' + (result.message || 'Không thể lưu thông tin'));
                    }
                })
                .catch(error => {
                    console.error('Lỗi:', error);
                    showAlert('Có lỗi kết nối mạng xảy ra khi lưu thông tin!');
                });
        });
    }

    // 5. Submit Đổi mật khẩu (Tab 2)
    const passwordForm = document.querySelector('#tab-password form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const currentPasswordInput = document.getElementById('current-password');
            const newPasswordInput = document.getElementById('new-password');
            const confirmPasswordInput = document.getElementById('confirm-password');

            const currentPassword = currentPasswordInput ? currentPasswordInput.value.trim() : '';
            const newPassword = newPasswordInput ? newPasswordInput.value.trim() : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';

            // Kiểm tra thông tin đầu vào
            if (!currentPassword || !newPassword || !confirmPassword) {
                showAlert('Vui lòng nhập đầy đủ tất cả các trường thông tin!');
                return;
            }

            // Bước 1: Kiểm tra 2 mật khẩu mới khớp nhau
            if (newPassword !== confirmPassword) {
                showAlert('Mật khẩu bạn nhập chưa trùng khớp! Vui lòng kiểm tra lại!');
                return;
            }

            // Bước 2: Gửi dữ liệu đổi mật khẩu
            try {
                const response = await fetch(`${API_BASE_URL}/change-password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        currentPassword: currentPassword,
                        newPassword: newPassword
                    })
                });

                const data = await response.json();

                // Kiểm tra nếu response lỗi hoặc success === false
                if (!response.ok || !data.success) {
                    // Nếu backend trả về thông báo cụ thể hoặc phát hiện lỗi mật khẩu sai
                    if (data.message) {
                        showAlert(data.message);
                    } else {
                        showAlert('Mật khẩu hiện tại bạn nhập đang bị sai! Vui lòng nhập lại!');
                    }
                    return;
                }

                // Bước 3: Đổi mật khẩu thành công
                showAlert('Cập nhật mật khẩu thành công!');
                passwordForm.reset();

            } catch (error) {
                console.error('Lỗi khi gửi request:', error);
                // Trường hợp nếu backend trả về HTTP status error (ví dụ 400/401) nhưng vẫn vào catch
                showAlert('Mật khẩu hiện tại bạn nhập đang bị sai! Vui lòng nhập lại!');
            }
        });
    }

    // Tải dữ liệu người dùng khi vào trang
    loadUserProfile();
    demSoBaoCao();
});

// ==============================
// XỬ LÝ ALERT MODAL HỆ THỐNG
// ==============================
function showAlert(message) {
    document.getElementById('alertTitle').innerText = 'Thông báo hệ thống!';
    document.getElementById('alertMessage').innerText = message;
    document.getElementById('systemAlert').style.display = 'block';
}

function closeAlert() {
    document.getElementById('systemAlert').style.display = 'none';
}