// Dùng hộp thoại chung trong js/hop-thoai.js để mọi màn hiện giống nhau.
// Giữ nguyên tên và thứ tự tham số (tiêu đề trước, nội dung sau) vì phần còn
// lại của tệp này đang gọi theo thứ tự đó.
function showAlert(title, message) {
  return thongBao(message, title);
}

function closeAlert() {
  // Hộp thoại chung tự đóng khi bấm nút, hàm này giữ lại cho các nút cũ
  // trong HTML còn gọi tới.
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const forgotPasswordLink = document.getElementById("forgotPasswordBtn");

  if (!form) return;

  // ==========================================
  // 1. XỬ LÝ ĐĂNG NHẬP
  // ==========================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // 🔹 Kiểm tra trống Email
    if (!email) return showAlert("Thông báo hệ thống!", "Mời bạn nhập Email!");

    // 🔹 Kiểm tra định dạng Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return showAlert("Thông báo hệ thống!", "Địa chỉ Email không hợp lệ! Vui lòng kiểm tra lại!");
    }

    // 🔹 Kiểm tra trống Mật khẩu
    if (!password) return showAlert("Thông báo hệ thống!", "Mời bạn nhập mật khẩu!");

    // 🔹 Gửi yêu cầu đăng nhập
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("id_nguoi_dung", data.user.id_nguoi_dung);
        localStorage.setItem("username", data.user.ho_ten);
        localStorage.setItem("vai_tro", data.user.vai_tro);

        showAlert("Thông báo hệ thống!", data.message || "Đăng nhập thành công!");

        setTimeout(() => {
          window.location.href = "../pages/trangchu_saudn.html";
        }, 1500);
      } else {
        showAlert("Thông báo hệ thống!", data.message);
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      showAlert("Thông báo hệ thống!", "Lỗi kết nối tới máy chủ!");
    }
  });

  // ==========================================
  // 2. XỬ LÝ QUÊN MẬT KHẨU
  // ==========================================
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();

      // 🔹 Bước 1: Kiểm tra nếu chưa nhập email
      if (!email) {
        return showAlert("Thông báo hệ thống!", "Vui lòng nhập địa chỉ Email vào ô trên trước!");
      }

      // 🔹 Bước 2: Kiểm tra định dạng Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return showAlert("Thông báo hệ thống!", "Email không hợp lệ! Vui lòng kiểm tra lại!");
      }

      // 🔹 Bước 3: Email hợp lệ -> Gửi API Quên mật khẩu
      try {
        const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (data.success) {
          showAlert("Thông báo hệ thống!", data.message);
        } else {
          showAlert("Thông báo hệ thống!", data.message || "Không tìm thấy tài khoản!");
        }
      } catch (err) {
        console.error("Lỗi quên mật khẩu:", err);
        showAlert("Thông báo hệ thống!", "Lỗi kết nối tới máy chủ!");
      }
    });
  }
});

// ==========================================
// 3. XỬ LÝ ĐĂNG NHẬP VỚI GOOGLE (MỚI BỔ SUNG)
// ==========================================

// Hàm giải mã JWT token từ Google
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

// Hàm nhận phản hồi khi đăng nhập Google thành công
function handleGoogleResponse(response) {
  const decoded = parseJwt(response.credential);
  const googleId = decoded.sub;
  const fullName = decoded.name;
  const email = decoded.email;

  // Gửi thông tin về backend xử lý đăng nhập
  loginWithGoogle(googleId, fullName, email);
}


// Gọi API Đăng nhập với Google lên server
async function loginWithGoogle(googleId, fullName, email) {
  try {
    const res = await fetch("http://localhost:5000/api/auth/login/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleId, fullName, email })
    });

    const data = await res.json();

    // Trường hợp 1: Đăng nhập thành công (Thường là res.ok và data.success = true)
    if (res.ok && data.success) {
      localStorage.setItem("id_nguoi_dung", data.user.id_nguoi_dung || data.user.id);
      localStorage.setItem("username", data.user.ho_ten || data.user.fullName);
      localStorage.setItem("vai_tro", data.user.vai_tro || "user");

      showAlert("Thông báo hệ thống!", data.message || "Đăng nhập thành công!");

      setTimeout(() => {
        window.location.href = "../pages/trangchu_saudn.html";
      }, 1500);
    } else {
      // Trường hợp 2: Backend thông báo chưa có tài khoản hoặc lỗi logic
      showAlert(
        "Thông báo hệ thống!", 
        data.message || "Tài khoản này bạn chưa đăng ký! Vui lòng đăng ký rồi đăng nhập lại!"
      );
    }
  } catch (err) {
    console.error("Lỗi đăng nhập Google:", err);
    // Chỉ báo lỗi kết nối khi Backend không chạy hoặc bị ngắt kết nối hoàn toàn
    showAlert("Thông báo hệ thống!", "Tài khoản này bạn chưa đăng ký! Vui lòng đăng ký rồi đăng nhập lại!");
  }
}


// Hàm khởi tạo và hiển thị nút Google
function initGoogleLogin() {
  if (typeof google === 'undefined') {
    setTimeout(initGoogleLogin, 500);
    return;
  }

  const googleBtnContainer = document.getElementById("googleButton");
  if (!googleBtnContainer) return;

  google.accounts.id.initialize({
    client_id: "114953632929-jdecqn2msd0ieqmks94cnkn80v5iuem6.apps.googleusercontent.com",
    callback: handleGoogleResponse
  });

  google.accounts.id.renderButton(
    googleBtnContainer,
    {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "center",
      width: 370
    }
  );
}

// Kích hoạt khởi tạo nút Google khi load file
initGoogleLogin();


// Hai dòng lưu tên và chuyển trang sau khi đăng nhập vốn nằm trơ ở cuối tệp,
// không thuộc hàm nào nên chạy ngay lúc tải trang: biến data chưa tồn tại,
// mỗi lần mở trang đăng nhập là báo lỗi "data is not defined". Phần xử lý
// đăng nhập thật đã nằm trong hàm phía trên nên xoá đoạn thừa này đi.



