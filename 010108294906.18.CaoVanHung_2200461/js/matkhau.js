document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy thông tin người dùng từ LocalStorage
    const userId = localStorage.getItem('id_nguoi_dung') || 'ND001';
    const API_BASE_URL = 'http://localhost:5000/api/auth';

    let originalData = {};

    // --- CÁC HÀM TIỆN ÍCH (CUSTOM ALERT MODAL) ---
    // Dùng hộp thoại chung trong js/hop-thoai.js. Ở tệp này thứ tự tham số là
    // nội dung trước, tiêu đề sau — ngược với dangnhap.js — nên vẫn giữ nguyên
    // chữ ký cũ để không phải sửa lại mọi lời gọi bên dưới.
    function showAlert(message, title = 'Thông báo hệ thống') {
        return thongBao(message, title);
    }

    window.closeAlert = function () {
        // Hộp thoại chung tự đóng khi bấm nút.
    };

    // --- CÁC HÀM XỬ LÝ PROFILE (TAB THÔNG TIN CÁ NHÂN) ---
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
        const fields = getProfileInputs();

        if (fields.fullname) fields.fullname.value = data.fullname || '';
        if (fields.email) fields.email.value = data.email || '';
        if (fields.studentId) fields.studentId.value = data.student_id || '';
        if (fields.className) fields.className.value = data.class_name || '';
        if (fields.course) fields.course.value = data.course || '';
        if (fields.reportNumber) fields.reportNumber.value = data.report_number !== undefined ? data.report_number : '';

        // Cập nhật tên hiển thị ở Navbar
        const navUserName = document.getElementById('navUserName');
        if (navUserName && data.fullname) {
            navUserName.textContent = data.fullname;
        }
    }

    async function loadUserProfile() {
        try {
            const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
            const result = await res.json();

            if (result.success) {
                originalData = result.data;
                renderDataToForm(originalData);
            } else {
                console.error('❌ Lỗi lấy dữ liệu:', result.message);
            }
        } catch (err) {
            console.error('❌ Lỗi kết nối API lấy dữ liệu cá nhân:', err);
        }
    }

    // Xử lý nút HỦY (Tab Profile)
    const btnCancelProfile = document.querySelector('#tab-profile .btn-secondary');
    if (btnCancelProfile) {
        btnCancelProfile.addEventListener('click', (e) => {
            e.preventDefault();
            renderDataToForm(originalData);
        });
    }

    // Xử lý nút CẬP NHẬT (Tab Profile)
    const profileForm = document.querySelector('#tab-profile form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fields = getProfileInputs();

            const payload = {
                fullname: fields.fullname ? fields.fullname.value.trim() : '',
                student_id: fields.studentId ? fields.studentId.value.trim() : '',
                class_name: fields.className ? fields.className.value.trim() : '',
                course: fields.course ? fields.course.value.trim() : '',
                report_number: fields.reportNumber ? fields.reportNumber.value.trim() : ''
            };

            try {
                const res = await fetch(`${API_BASE_URL}/profile/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (result.success) {
                    showAlert('Cập nhật thông tin cá nhân thành công!');
                    originalData = result.data;
                    renderDataToForm(originalData);
                } else {
                    showAlert('Lỗi: ' + result.message);
                }
            } catch (err) {
                console.error('❌ Lỗi cập nhật profile:', err);
                showAlert('Có lỗi xảy ra khi cập nhật thông tin!');
            }
        });
    }


    // --- CÁC HÀM XỬ LÝ ĐỔI MẬT KHẨU (TAB MẬT KHẨU) ---
    const passwordForm = document.querySelector('#tab-password form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Kiểm tra mật khẩu trống
            if (!currentPassword || !newPassword || !confirmPassword) {
                showAlert('Vui lòng nhập đầy đủ thông tin!');
                return;
            }

            // Kiểm tra khớp mật khẩu
            if (newPassword !== confirmPassword) {
                showAlert('Mật khẩu mới và Nhập lại mật khẩu không trùng khớp!');
                return;
            }

            // Đã bỏ kiểm tra độ dài 6 ký tự tại đây -> Cho phép mật khẩu từ 1 ký tự

            try {
                const res = await fetch(`${API_BASE_URL}/change-password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        currentPassword: currentPassword,
                        newPassword: newPassword
                    })
                });

                const result = await res.json();

                if (result.success) {
                    showAlert('Đổi mật khẩu thành công!');
                    passwordForm.reset();
                } else {
                    showAlert(result.message || 'Mật khẩu hiện tại không chính xác!');
                }
            } catch (err) {
                console.error('❌ Lỗi đổi mật khẩu:', err);
                showAlert('Có lỗi xảy ra khi đổi mật khẩu!');
            }
        });
    }


    // --- CHUYỂN TAB (PROFILE <-> PASSWORD) ---
    function switchTab(tabName) {
        // 1. Reset trạng thái active ở Sidebar
        document.querySelectorAll('.sidebar .menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // 2. Reset trạng thái active ở Tab Nội dung
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 3. Kích hoạt Sidebar item được chọn
        const targetSidebarItem = document.querySelector(`.sidebar .menu-item[data-tab="${tabName}"]`);
        if (targetSidebarItem) {
            targetSidebarItem.classList.add('active');
        }

        // 4. Kích hoạt Nội dung tab tương ứng
        const targetTabContent = document.getElementById(`tab-${tabName}`);
        if (targetTabContent) {
            targetTabContent.classList.add('active');
        }

        // Tải lại dữ liệu nếu chuyển sang tab Profile
        if (tabName === 'profile') {
            loadUserProfile();
        }
    }

    // Đăng ký sự kiện Click cho Sidebar
    document.querySelectorAll('.sidebar .menu-item').forEach(item => {
        item.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Toggle Menu Dropdown góc phải trên Header
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    if (userMenuBtn && userDropdownMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            userDropdownMenu.classList.remove('active');
        });
    }

    // --- KHỞI TẠO BAN ĐẦU ---
    loadUserProfile(); // Nạp thông tin cá nhân ngầm
    switchTab('password'); // Mặc định mở tab "Đổi mật khẩu"
});