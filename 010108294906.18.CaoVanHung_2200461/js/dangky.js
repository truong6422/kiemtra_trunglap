document.addEventListener('DOMContentLoaded', function () {

    const registerForm = document.getElementById('registerForm');

    registerForm.addEventListener('submit', function (event) {

        // Không cho trang web reload
        event.preventDefault();

        const fullName = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm').value;

        // 1. Chưa nhập Họ và tên
        if (!fullName) {
            showAlert('Bạn chưa nhập Họ và tên! Vui lòng nhập Họ và tên!');
            return;
        }

        // 2. Chưa nhập Email
        if (!email) {
            showAlert('Bạn chưa nhập địa chỉ Email! Vui lòng nhập địa chỉ Email!');
            return;
        }


        // 3. Kiểm tra Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            showAlert('Địa chỉ Email bạn nhập không hợp lệ! Vui lòng kiểm tra lại!');
            return;
        }

        // 4. Chưa nhập Mật khẩu
        if (!password) {
            showAlert('Bạn chưa nhập mật khẩu! Vui lòng nhập mật khẩu!');
            return;
        }

        // 5. Chưa nhập lại Mật khẩu
        if (!confirmPassword) {
            showAlert('Bạn chưa nhập phần nhập lại mật khẩu! Vui lòng nhập phần nhập lại mật khẩu!');
            return;
        }


        // 6. Kiểm tra hai mật khẩu
        if (password !== confirmPassword) {
            showAlert('Mật khẩu bạn nhập chưa trùng khớp! Vui lòng kiểm tra lại!');
            return;
        }


        // 7. Tất cả đều hợp lệ → gửi dữ liệu lên backend
        fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showAlert(data.message); // "Đăng ký tài khoản thành công!"
                    document.querySelector('form').reset();
                } else {
                    showAlert(data.message); // Thông báo lỗi từ backend
                }
            })
            .catch(error => {
                console.error('Lỗi:', error);
                showAlert('Có lỗi xảy ra khi đăng ký!');
            });


    });

});


function showAlert(message) {
  document.getElementById('alertTitle').innerText = 'Thông báo hệ thống!';
  document.getElementById('alertMessage').innerText = message;
  document.getElementById('systemAlert').style.display = 'block';
}

function closeAlert() {
  document.getElementById('systemAlert').style.display = 'none';
}


// ==============================
// CÁCH 2: ĐĂNG KÝ VỚI GOOGLE
// ==============================

// ==============================
// Xử lý phản hồi từ Google
// ==============================
function handleGoogleResponse(response) {
  console.log('Google Credential:', response.credential);

  // Giải mã thông tin người dùng từ Google token
  const decoded = parseJwt(response.credential);

  // Lấy thông tin cần thiết
  const googleId = decoded.sub; // ID duy nhất của Google
  const fullName = decoded.name;
  const email = decoded.email;

  // Gọi API backend để đăng ký
  registerWithGoogle(googleId, fullName, email);
}

// Hàm giải mã JWT từ Google Credential
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}


function initGoogle() {

    if (typeof google === 'undefined') {
        setTimeout(initGoogle, 500);
        return;
    }

    google.accounts.id.initialize({
        client_id: '114953632929-jdecqn2msd0ieqmks94cnkn80v5iuem6.apps.googleusercontent.com',
        callback: handleGoogleResponse
    });

    google.accounts.id.renderButton(
        document.getElementById('googleButton'),
        {
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width: 600
        }
    );
}


// ==============================
// Xử lý đăng ký bằng Google
// ==============================

// Hàm gọi API đăng ký Google
async function registerWithGoogle(googleId, fullName, email) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/register/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleId, fullName, email })
    });

    const data = await response.json();
    console.log('📩 Phản hồi từ server:', data);

    if (!response.ok || data.success === false) {
      showAlert(data.message || 'Đăng ký bằng Google thất bại!');
      return;
    }

    showAlert('Đăng ký bằng Google thành công!');
    console.log('🆕 User Google:', data.user);

  } catch (error) {
    console.error('❌ Lỗi gọi API:', error);
    showAlert('Có lỗi xảy ra khi đăng ký bằng Google!');
  }
}


initGoogle();