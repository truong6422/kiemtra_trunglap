const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const NguoiDung = require('../models/nguoi_dung');
const SinhVien = require("../models/sinh_vien");
const GiangVien = require("../models/giang_vien");
const { dongBoVaiTro } = require('../utils/dong_bo_vai_tro');

const router = express.Router();

// ==============================
// 1. ĐĂNG KÝ TÀI KHOẢN THƯỜNG
// ==============================
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    // 1. Kiểm tra Họ và tên
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa nhập Họ và tên! Vui lòng nhập Họ và tên!'
      });
    }

    // 2. Kiểm tra Email
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa nhập địa chỉ Email! Vui lòng nhập địa chỉ Email!'
      });
    }

    // 3. Kiểm tra Mật khẩu
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa nhập mật khẩu! Vui lòng nhập mật khẩu!'
      });
    }

    // 4. Kiểm tra Nhập lại mật khẩu
    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa nhập phần nhập lại mật khẩu! Vui lòng nhập phần nhập lại mật khẩu!'
      });
    }

    // 5. Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ Email bạn nhập không hợp lệ! Vui lòng kiểm tra lại!'
      });
    }

    // 6. Kiểm tra 2 mật khẩu
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu bạn nhập chưa trùng khớp! Vui lòng kiểm tra lại!'
      });
    }

    // 7. Kiểm tra email đã tồn tại
    const existingUser = await NguoiDung.findOne({
      email: email.trim().toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ Email này đã được đăng ký!'
      });
    }

    // 8. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 9. Tạo tài khoản với id_nguoi_dung tự động
    const lastUser = await NguoiDung.findOne().sort({ id_nguoi_dung: -1 });

    let nextId = "ND001";
    if (lastUser && lastUser.id_nguoi_dung) {
      const number = parseInt(lastUser.id_nguoi_dung.replace("ND", ""), 10);
      const newNumber = (number + 1).toString().padStart(3, "0");
      nextId = "ND" + newNumber;
    }

    const user = await NguoiDung.create({
      id_nguoi_dung: nextId,
      ten_dang_nhap: fullName.trim(),
      mat_khau: hashedPassword,
      ho_ten: fullName.trim(),
      email: email.trim().toLowerCase(),
      vai_tro: 'sinh_vien',
      trang_thai: true,
      ngay_tao: new Date(),
      ngay_cap_nhat: new Date(),
      hinh_anh: ""
    });

    // Tạo bản ghi cho Sinh Viên
    if (user.vai_tro === "sinh_vien") {
      const lastSV = await SinhVien.findOne().sort({ id_sinh_vien: -1 });
      let nextSVId = "SV001";
      if (lastSV && lastSV.id_sinh_vien) {
        const number = parseInt(lastSV.id_sinh_vien.replace("SV", ""), 10);
        const newNumber = (number + 1).toString().padStart(3, "0");
        nextSVId = "SV" + newNumber;
      }

      await SinhVien.create({
        id_sinh_vien: nextSVId,
        ma_sinh_vien: "",
        ho_ten: user.ho_ten,
        lop: "",
        khoa_hoc: "",
        email: user.email,
        so_bao_cao: 0,
        id_nguoi_dung: user.id_nguoi_dung
      });
    }

    // Tạo bản ghi cho Giảng Viên
    if (user.vai_tro === "giang_vien") {
      const lastGV = await GiangVien.findOne().sort({ id_giang_vien: -1 });
      let nextGVId = "GV001";
      if (lastGV && lastGV.id_giang_vien) {
        const number = parseInt(lastGV.id_giang_vien.replace("GV", ""), 10);
        const newNumber = (number + 1).toString().padStart(3, "0");
        nextGVId = "GV" + newNumber;
      }

      await GiangVien.create({
        id_giang_vien: nextGVId,
        ma_giang_vien: "",
        ho_ten: user.ho_ten,
        bo_mon: "",
        email: user.email,
        so_lan_kiem_tra: 0,
        id_nguoi_dung: user.id_nguoi_dung
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user: {
        id: user._id,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.vai_tro
      }
    });

  } catch (error) {
    console.error('❌ Lỗi đăng ký:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình đăng ký!'
    });
  }
});


// ==============================
// 2. ĐĂNG KÝ BẰNG GOOGLE
// ==============================
router.post('/register/google', async (req, res) => {
  try {
    const { googleId, fullName, email } = req.body;

    const existingUser = await NguoiDung.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký! Mời bạn nhập Email mới hoặc sang trang đăng nhập!'
      });
    }

    const lastUser = await NguoiDung.findOne().sort({ id_nguoi_dung: -1 });

    let nextId = "ND001";
    if (lastUser && lastUser.id_nguoi_dung) {
      const number = parseInt(lastUser.id_nguoi_dung.replace("ND", ""), 10);
      const newNumber = (number + 1).toString().padStart(3, "0");
      nextId = "ND" + newNumber;
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const user = await NguoiDung.create({
      id_nguoi_dung: nextId,
      ten_dang_nhap: fullName.trim(),
      mat_khau: hashedPassword,
      ho_ten: fullName.trim(),
      email: email.trim().toLowerCase(),
      vai_tro: 'sinh_vien',
      trang_thai: true,
      ngay_tao: new Date(),
      ngay_cap_nhat: new Date(),
      hinh_anh: ""
    });

    if (user.vai_tro === "sinh_vien") {
      const lastSV = await SinhVien.findOne().sort({ id_sinh_vien: -1 });
      let nextSVId = "SV001";
      if (lastSV && lastSV.id_sinh_vien) {
        const number = parseInt(lastSV.id_sinh_vien.replace("SV", ""), 10);
        const newNumber = (number + 1).toString().padStart(3, "0");
        nextSVId = "SV" + newNumber;
      }

      await SinhVien.create({
        id_sinh_vien: nextSVId,
        ma_sinh_vien: "",
        ho_ten: user.ho_ten,
        lop: "",
        khoa_hoc: "",
        email: user.email,
        so_bao_cao: 0,
        id_nguoi_dung: user.id_nguoi_dung
      });
    }

    if (user.vai_tro === "giang_vien") {
      const lastGV = await GiangVien.findOne().sort({ id_giang_vien: -1 });
      let nextGVId = "GV001";
      if (lastGV && lastGV.id_giang_vien) {
        const number = parseInt(lastGV.id_giang_vien.replace("GV", ""), 10);
        const newNumber = (number + 1).toString().padStart(3, "0");
        nextGVId = "GV" + newNumber;
      }

      await GiangVien.create({
        id_giang_vien: nextGVId,
        ma_giang_vien: "",
        ho_ten: user.ho_ten,
        bo_mon: "",
        email: user.email,
        so_lan_kiem_tra: 0,
        id_nguoi_dung: user.id_nguoi_dung
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Đăng ký bằng Google thành công!',
      user: {
        id: user._id,
        id_nguoi_dung: user.id_nguoi_dung,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.vai_tro
      }
    });

  } catch (error) {
    console.error('❌ Lỗi đăng ký Google:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình đăng ký!'
    });
  }
});


// ==============================
// 3. ĐĂNG NHẬP TÀI KHOẢN THƯỜNG
// ==============================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mời bạn nhập Email!'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Mời bạn nhập mật khẩu!'
      });
    }

    const user = await NguoiDung.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mật khẩu chưa đúng!'
      });
    }

    const isMatch = await bcrypt.compare(password, user.mat_khau);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mật khẩu chưa đúng!'
      });
    }

    // Đưa hồ sơ về đúng collection theo vai trò hiện tại. Cần thiết vì vai_tro
    // có thể được sửa thẳng trong cơ sở dữ liệu, khi đó không route nào của
    // hệ thống chạy qua để chuyển hồ sơ sang collection tương ứng.
    try {
      await dongBoVaiTro(user.id_nguoi_dung);
    } catch (e) {
      console.error('Không đồng bộ được hồ sơ theo vai trò:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập tài khoản thành công!',
      user: {
        id_nguoi_dung: user.id_nguoi_dung,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.vai_tro
      }
    });

  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình đăng nhập!'
    });
  }
});


// ==============================
// 3.1. ĐĂNG NHẬP BẰNG GOOGLE (Đã sửa lỗi app -> router)
// ==============================
router.post('/login/google', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Thiếu địa chỉ email!"
      });
    }

    // 1. Tìm user trong CSDL MongoDB bằng model NguoiDung
    const user = await NguoiDung.findOne({ email: email.trim().toLowerCase() }); 

    // 2. Nếu CHƯA CÓ tài khoản trong CSDL
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản này bạn chưa đăng ký! Vui lòng đăng ký rồi đăng nhập lại!"
      });
    }

    // 3. Nếu ĐÃ CÓ tài khoản trong CSDL
    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      user: {
        id_nguoi_dung: user.id_nguoi_dung,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.vai_tro
      }
    });

  } catch (error) {
    console.error("Lỗi Server đăng nhập Google:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống phía máy chủ!"
    });
  }
});


// ==============================
// 4. QUÊN MẬT KHẨU
// ==============================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Mời bạn nhập email!' });
    }

    const user = await NguoiDung.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy tài khoản!' });
    }

    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.mat_khau = hashedPassword;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Phần mềm phát hiện trùng lặp văn bản',
      text: `Chào ${user.ho_ten},\nMật khẩu mới để đăng nhập “Phần mềm phát hiện trùng lặp văn bản” là: ${newPassword}\nTrân trọng./.`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: 'Mật khẩu mới đã được gửi lại qua Email!'
    });

  } catch (error) {
    console.error('❌ Lỗi gửi email:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi gửi email!' });
  }
});


// ==============================
// 5. CẬP NHẬT THÔNG TIN NGƯỜI DÙNG (Cơ bản)
// ==============================
router.put('/update-user/:id', async (req, res) => {
  try {
    const { ho_ten, email } = req.body;

    const updatedUser = await NguoiDung.findOneAndUpdate(
      { id_nguoi_dung: req.params.id },
      { ho_ten, email, ngay_cap_nhat: new Date() },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng!'
      });
    }

    if (updatedUser.vai_tro === "sinh_vien") {
      await SinhVien.findOneAndUpdate(
        { id_nguoi_dung: updatedUser.id_nguoi_dung },
        { ho_ten: updatedUser.ho_ten, email: updatedUser.email },
        { returnDocument: 'after' }
      );
    }

    if (updatedUser.vai_tro === "giang_vien") {
      await GiangVien.findOneAndUpdate(
        { id_nguoi_dung: updatedUser.id_nguoi_dung },
        { ho_ten: updatedUser.ho_ten, email: updatedUser.email },
        { returnDocument: 'after' }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin người dùng thành công!',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Lỗi cập nhật người dùng:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình cập nhật!'
    });
  }
});


// ==============================
// 5b. ĐỔI VAI TRÒ NGƯỜI DÙNG (dành cho quản trị viên)
//
// Đổi vai_tro xong phải chuyển luôn hồ sơ sang đúng collection, nếu không
// người vừa được nâng lên giảng viên vẫn nằm trong sinh_vien và hệ thống vẫn
// đối xử như sinh viên.
// ==============================
router.put('/vai-tro/:id', async (req, res) => {
  try {
    const { vai_tro } = req.body;
    const HOP_LE = ['sinh_vien', 'giang_vien', 'quan_tri_vien'];

    if (!HOP_LE.includes(vai_tro)) {
      return res.status(400).json({
        success: false,
        message: `Vai trò không hợp lệ. Chỉ nhận: ${HOP_LE.join(', ')}`
      });
    }

    const nguoiDung = await NguoiDung.findOneAndUpdate(
      { id_nguoi_dung: req.params.id },
      { vai_tro, ngay_cap_nhat: new Date() },
      { returnDocument: 'after' }
    );

    if (!nguoiDung) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }

    const ketQua = await dongBoVaiTro(nguoiDung.id_nguoi_dung);

    return res.status(200).json({
      success: true,
      message: 'Đổi vai trò thành công!',
      user: {
        id_nguoi_dung: nguoiDung.id_nguoi_dung,
        ho_ten: nguoiDung.ho_ten,
        email: nguoiDung.email,
        vai_tro: nguoiDung.vai_tro
      },
      dong_bo: ketQua
    });

  } catch (error) {
    console.error('❌ Lỗi đổi vai trò:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// ==============================
// 6. GỬI LẠI EMAIL KÍCH HOẠT + ĐỔI MẬT KHẨU
// ==============================
router.post('/resend-activation', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email!' });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu!' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu bạn nhập chưa trùng khớp!' });
    }

    const user = await NguoiDung.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.mat_khau = hashedPassword;
    user.trang_thai = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Mật khẩu mới đã được cập nhật thành công!'
    });

  } catch (error) {
    console.error('❌ Lỗi gửi lại email kích hoạt:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý yêu cầu!'
    });
  }
});


// ==============================
// 7. LẤY THÔNG TIN CÁ NHÂN (GET /profile/:id)
// ==============================
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await NguoiDung.findOne({ id_nguoi_dung: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng!'
      });
    }

    const sinhVien = await SinhVien.findOne({ id_nguoi_dung: userId });

    return res.status(200).json({
      success: true,
      data: {
        fullname: user.ho_ten || '',
        email: user.email || '',
        student_id: sinhVien ? sinhVien.ma_sinh_vien : '',
        class_name: sinhVien ? sinhVien.lop : '',
        course: sinhVien ? sinhVien.khoa_hoc : '',
        report_number: sinhVien ? sinhVien.so_bao_cao : 0
      }
    });

  } catch (error) {
    console.error('❌ Lỗi lấy thông tin cá nhân:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy thông tin!'
    });
  }
});


// ==============================
// 8. CẬP NHẬT THÔNG TIN CÁ NHÂN (PUT /profile/:id)
// ==============================
router.put('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const body = req.body;

    const ho_ten = body.fullname || body.ho_ten;
    const email = body.email;
    const ma_sinh_vien = body.student_id || body.ma_sinh_vien || '';
    const lop = body.class_name || body.lop || '';
    const khoa_hoc = body.course || body.khoa_hoc || '';
    const so_bao_cao = Number(body.report_number || body.so_luong_bao_cao || 0);

    const updateObjUser = { ngay_cap_nhat: new Date() };
    if (ho_ten) updateObjUser.ho_ten = ho_ten;
    if (email) updateObjUser.email = email;

    const user = await NguoiDung.findOneAndUpdate(
      { id_nguoi_dung: userId },
      { $set: updateObjUser },
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng!'
      });
    }

    const updateObjSV = {
      ma_sinh_vien,
      lop,
      khoa_hoc,
      so_bao_cao
    };
    if (ho_ten) updateObjSV.ho_ten = ho_ten;
    if (email) updateObjSV.email = email;

    const sinhVien = await SinhVien.findOneAndUpdate(
      { id_nguoi_dung: userId },
      { $set: updateObjSV },
      { returnDocument: 'after', upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      data: {
        fullname: user.ho_ten,
        email: user.email,
        student_id: sinhVien.ma_sinh_vien,
        class_name: sinhVien.lop,
        course: sinhVien.khoa_hoc,
        report_number: sinhVien.so_bao_cao
      }
    });

  } catch (error) {
    console.error('❌ Lỗi cập nhật thông tin:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình cập nhật!'
    });
  }
});


// ==============================
// 9. KIỂM TRA EMAIL TỒN TẠI
// ==============================
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        exists: false,
        message: 'Mời bạn nhập Email!'
      });
    }

    const user = await NguoiDung.findOne({ email: email.trim().toLowerCase() });

    if (user) {
      return res.status(200).json({
        exists: true,
        message: 'Email tồn tại!'
      });
    } else {
      return res.status(200).json({
        exists: false,
        message: 'Không tìm thấy địa chỉ Email!'
      });
    }

  } catch (error) {
    console.error('❌ Lỗi kiểm tra email:', error);
    return res.status(500).json({
      exists: false,
      message: 'Có lỗi xảy ra khi kiểm tra email!'
    });
  }
});


// ==============================
// 10. ĐỔI MẬT KHẨU (PUT /change-password)
// ==============================
router.put('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin!'
      });
    }

    // 1. Tìm người dùng trong MongoDB theo id_nguoi_dung
    const user = await NguoiDung.findOne({ id_nguoi_dung: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại!'
      });
    }

    // 2. So sánh Mật khẩu hiện tại với Mật khẩu mã hóa trong CSDL (truy vấn vào trường mat_khau)
    const isMatch = await bcrypt.compare(currentPassword, user.mat_khau);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CURRENT_PASSWORD',
        message: 'Mật khẩu hiện tại bạn nhập đang bị sai! Vui lòng nhập lại!'
      });
    }

    // 3. Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Cập nhật mật khẩu mới và thời gian cập nhật
    user.mat_khau = hashedPassword;
    user.ngay_cap_nhat = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật mật khẩu thành công!'
    });

  } catch (error) {
    console.error('❌ Lỗi đổi mật khẩu backend:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống server!'
    });
  }
});

module.exports = router;