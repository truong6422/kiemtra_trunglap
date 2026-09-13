// Hàm đóng Modal đổi mật khẩu
function closeResetModal() {
  const modal = document.getElementById("resetPasswordModal");
  if (modal) modal.style.display = "none";
  const newPass = document.getElementById("newPassword");
  const confirmPass = document.getElementById("confirmNewPassword");
  if (newPass) newPass.value = "";
  if (confirmPass) confirmPass.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const resendBtn = document.getElementById("resendActivation");
  const alertBox = document.getElementById("systemAlert");
  const alertTitle = document.getElementById("alertTitle");
  const alertMessage = document.getElementById("alertMessage");

  // 1️⃣ Bấm vào "Gửi lại email kích hoạt"
  if (resendBtn) {
    resendBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const email = emailInput ? emailInput.value.trim() : "";
      
      // 🔹 Bước 1: Kiểm tra trống
      if (!email) {
        if (typeof showAlert === "function") {
          showAlert("Thông báo hệ thống!", "Vui lòng nhập địa chỉ email vào ô trên trước!");
        } else {
          alert("Vui lòng nhập địa chỉ email vào ô trên trước!");
        }
        return;
      }

      // 🔹 Bước 2: Kiểm tra định dạng Email hợp lệ
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (typeof showAlert === "function") {
          showAlert("Thông báo hệ thống!", "Email không hợp lệ! Vui lòng kiểm tra lại!");
        } else {
          alert("Email không hợp lệ! Vui lòng kiểm tra lại!");
        }
        return;
      }

      // 🔹 Bước 3: Gọi API kiểm tra email trong CSDL
      try {
        const checkRes = await fetch("http://localhost:5000/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        const checkData = await checkRes.json();

        // ❌ Nếu KHÔNG tìm thấy email trong CSDL
        if (!checkData.exists) {
          if (typeof showAlert === "function") {
            showAlert("Thông báo hệ thống!", "Không tìm thấy địa chỉ Email!");
          } else {
            alert("Không tìm thấy địa chỉ Email!");
          }
          return;
        }

        // ✅ Nếu TÌM THẤY email -> Tiến hành hiện popup "Đây là địa chỉ email bạn muốn kích hoạt lại!"
        if (alertTitle) alertTitle.textContent = "Thông báo hệ thống!";
        if (alertMessage) alertMessage.textContent = "Đây là địa chỉ email bạn muốn kích hoạt lại!";
        
        // Thay nút trong alert thành nút "Xác nhận"
        const alertContent = alertBox.querySelector(".alert-content");
        let oldBtn = alertContent.querySelector("button");
        if (oldBtn) oldBtn.remove(); // Xóa nút Đóng cũ

        // Cập nhật style cho nút Xác nhận
        const confirmBtn = document.createElement("button");
        confirmBtn.id = "tempConfirmBtn";
        confirmBtn.textContent = "Xác nhận";
        confirmBtn.style.padding = "8px 24px";
        confirmBtn.style.minWidth = "110px";
        confirmBtn.style.width = "auto";
        confirmBtn.style.whiteSpace = "nowrap";
        confirmBtn.style.backgroundColor = "#007bff";
        confirmBtn.style.color = "#fff";
        confirmBtn.style.border = "none";
        confirmBtn.style.borderRadius = "4px";
        confirmBtn.style.cursor = "pointer";
        confirmBtn.style.fontSize = "14px";
        confirmBtn.style.fontWeight = "bold";
        confirmBtn.style.marginTop = "10px";

        alertContent.appendChild(confirmBtn);
        alertBox.style.display = "flex";

        // 2️⃣ Bấm vào nút "Xác nhận" trên popup thông báo
        confirmBtn.onclick = () => {
          // Tắt popup thông báo
          alertBox.style.display = "none";
          
          // Trả lại nút "Đóng" mặc định cho alertBox
          confirmBtn.remove();
          const closeBtn = document.createElement("button");
          closeBtn.textContent = "Đóng";
          closeBtn.onclick = closeAlert;
          alertContent.appendChild(closeBtn);

          // Hiển thị Form Đặt lại mật khẩu
          const resetModal = document.getElementById("resetPasswordModal");
          if (resetModal) {
            resetModal.style.display = "flex";
          }
        };

      } catch (err) {
        console.error("Lỗi kiểm tra email:", err);
        if (typeof showAlert === "function") {
          showAlert("Thông báo hệ thống!", "Lỗi kết nối tới máy chủ!");
        } else {
          alert("Lỗi kết nối tới máy chủ!");
        }
      }
    });
  }

  // 3️⃣ Bấm nút "Xác nhận" ở Form đặt mật khẩu mới
  const btnConfirmReset = document.getElementById("btnConfirmReset");
  if (btnConfirmReset) {
    btnConfirmReset.addEventListener("click", async () => {
      const email = emailInput ? emailInput.value.trim() : "";
      const password = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmNewPassword").value;

      if (!password || !confirmPassword) {
        if (typeof showAlert === "function") {
          showAlert("Thông báo hệ thống!", "Vui lòng nhập đầy đủ mật khẩu!");
        }
        return;
      }

      // Kiểm tra 2 mật khẩu có trùng nhau không
      if (password !== confirmPassword) {
        if (typeof showAlert === "function") {
          showAlert("Thông báo hệ thống!", "Mật khẩu bạn nhập chưa trùng khớp!");
        } else {
          alert("Mật khẩu bạn nhập chưa trùng khớp!");
        }
        return;
      }

      try {
        // Gửi dữ liệu về Backend
        const res = await fetch("http://localhost:5000/api/auth/resend-activation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, confirmPassword })
        });

        const data = await res.json();

        if (data.success) {
          closeResetModal(); // Đóng form nhập mật khẩu
          if (typeof showAlert === "function") {
            showAlert("Thông báo hệ thống!", data.message);
          } else {
            alert(data.message);
          }
        } else {
          if (typeof showAlert === "function") {
            showAlert("Thông báo hệ thống!", data.message);
          } else {
            alert(data.message);
          }
        }
      } catch (err) {
        console.error("Lỗi:", err);
        if (typeof showAlert === "function") {
          showAlert("Thông báo hệ thống!", "Lỗi kết nối server!");
        }
      }
    });
  }
});