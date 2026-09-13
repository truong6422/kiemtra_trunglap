document.addEventListener("DOMContentLoaded", () => {
  // 1. KHAI BÁO CÁC PHẦN TỬ GIAO DIỆN
  const welcomeText = document.getElementById("welcomeText");
  const uploadBtn = document.getElementById("uploadBtn");
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  const userContainer = document.querySelector(".user-dropdown-container");
  const logoutBtn = document.getElementById("logoutBtn");
  const avatarImg = document.getElementById("userAvatarImg");
  const navUserName = document.getElementById("navUserName");

  // Các phần tử Menu điều hướng
  const navLopHoc = document.getElementById("navLopHoc");
  const navHuongDan = document.getElementById("navHuongDan");

  // Lấy ID người dùng từ LocalStorage (mặc định 'ND001' nếu chưa có)
  const userId = localStorage.getItem("id_nguoi_dung") || "ND001";

  // 2. HÀM CẬP NHẬT TÊN VÀ LỜI CHÀO LÊN GIAO DIỆN
  function updateUI(name) {
    if (!name) return;
    if (navUserName) navUserName.textContent = name;
    if (welcomeText) {
      welcomeText.innerHTML = `Chào <strong>${name}</strong>, chào mừng bạn đến với <strong>Phần mềm kiểm tra trùng lặp văn bản</strong>`;
    }
  }

  // 3. HÀM CẬP NHẬT MENU DỰA TRÊN VAI TRÒ
  function updateNavByRole(role) {
    if (!role) return;

    if (role === "quan_tri_vien") {
      // Quản trị viên: Đổi cả 2 menu
      if (navLopHoc) {
        navLopHoc.textContent = "Quản lý cấu hình";
        navLopHoc.href = "../pages/quanlycauhinh.html";
      }
      if (navHuongDan) {
        navHuongDan.textContent = "Thống kê báo cáo";
        navHuongDan.href = "../pages/thongkebaocao.html";
      }
    } else if (role === "giang_vien" || role === "giaovien") {
      // Giảng viên / Giáo viên: Chỉ đổi menu Hướng dẫn chi tiết -> Thống kê báo cáo
      if (navLopHoc) {
        navLopHoc.textContent = "Quản lý lớp học";
        navLopHoc.href = "../pages/quanlylophoc.html";
      }
      if (navHuongDan) {
        navHuongDan.textContent = "Thống kê báo cáo";
        navHuongDan.href = "../pages/thongkebaocao.html";
      }
    }
  }

  // 4. TẢI VÀ ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG TỪ CSDL
  async function loadUserProfile() {
    // Đọc vai trò hiện tại lưu trong localStorage để áp dụng ngay giao diện
    const localRole = localStorage.getItem("userRole") || localStorage.getItem("vai_tro");
    if (localRole) {
      updateNavByRole(localRole);
    }

    if (!userId) return;

    try {
      // Gọi API lấy dữ liệu mới nhất trực tiếp từ CSDL MongoDB
      const res = await fetch(`http://localhost:5000/api/auth/profile/${userId}`);
      const result = await res.json();

      if (result.success && result.data) {
        const user = result.data;

        // Backend trả về field 'fullname' hoặc 'ho_ten'
        const freshName = user.fullname || user.ho_ten || user.ten_dang_nhap;

        if (freshName) {
          // Cập nhật giao diện theo đúng dữ liệu trong CSDL
          updateUI(freshName);

          // Cập nhật lại localStorage để đồng bộ đúng với CSDL
          localStorage.setItem("ho_ten", freshName);
          localStorage.setItem("username", freshName);
        }

        // Cập nhật vai trò từ CSDL (nếu Backend có trả về trường role/vai_tro)
        const freshRole = user.role || user.vai_tro;
        if (freshRole) {
          localStorage.setItem("userRole", freshRole);
          updateNavByRole(freshRole);
        }

        // Cập nhật avatar nếu có
        if (user.hinh_anh && avatarImg) {
          avatarImg.src = user.hinh_anh;
        }
      } else {
        // Dự phòng: Nếu API không trả về dữ liệu mới dùng localStorage
        const storedName = localStorage.getItem("ho_ten") || localStorage.getItem("username");
        if (storedName) updateUI(storedName);
      }
    } catch (err) {
      console.error("Lỗi khi đồng bộ thông tin từ CSDL:", err);
      // Dự phòng khi mất kết nối Server
      const storedName = localStorage.getItem("ho_ten") || localStorage.getItem("username");
      if (storedName) updateUI(storedName);
    }
  }

  // Gọi hàm tải dữ liệu ngay khi mở trang
  loadUserProfile();

  // 5. XỬ LÝ NÚT TẢI TÀI LIỆU LÊN
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      window.location.href = "../pages/quanlytailieu.html";
    });
  }

  // 6. XỬ LÝ MENU DROPDOWN TÀI KHOẢN
  if (userMenuBtn && userDropdownMenu) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      if (userContainer) userContainer.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (userContainer && !userContainer.contains(e.target)) {
        userDropdownMenu.classList.remove("show");
        if (userContainer) userContainer.classList.remove("active");
      }
    });
  }

  // 7. XỬ LÝ ĐĂNG XUẤT
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Xóa toàn bộ dữ liệu phiên đăng nhập
      localStorage.clear();
      // Chuyển về trang đăng nhập
      window.location.href = "../pages/dangnhap.html";
    });
  }
});