const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const NguoiDung = require('../models/nguoi_dung');
const SinhVien = require("../models/sinh_vien");
const GiangVien = require("../models/giang_vien");
const { dongBoVaiTro } = require('../utils/dong_bo_vai_tro');
const {
  doiMaSinhVien,
  doiMaGiangVien,
  chuanHoaMa
} = require('../utils/doi_ma_sinh_vien');
const { ganAnhNeuThieu, chonAnhDaiDien } = require('../utils/anh_dai_dien');
const { capNhatSoBaoCao } = require('../utils/cap_nhat_so_bao_cao');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
      // Lấy ảnh Gravatar theo email, không có thì sinh ảnh chữ cái
      hinh_anh: await chonAnhDaiDien({
        email: email.trim().toLowerCase(),
        ho_ten: fullName.trim()
      })
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
      // Lấy ảnh Gravatar theo email, không có thì sinh ảnh chữ cái
      hinh_anh: await chonAnhDaiDien({
        email: email.trim().toLowerCase(),
        ho_ten: fullName.trim()
      })
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

    // Tài khoản chưa có ảnh đại diện thì gán ngay lúc này. Đặt ở bước đăng
    // nhập chứ không chỉ lúc đăng ký, để những tài khoản tạo từ trước khi có
    // tính năng này cũng có ảnh mà không phải làm gì thêm.
    let anhDaiDien = user.hinh_anh || '';
    try {
      anhDaiDien = await ganAnhNeuThieu(NguoiDung, user);
    } catch (e) {
      console.error('Không lấy được ảnh đại diện:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập tài khoản thành công!',
      user: {
        id_nguoi_dung: user.id_nguoi_dung,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.vai_tro,
        hinh_anh: anhDaiDien
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
    const giangVien = await GiangVien.findOne({ id_nguoi_dung: userId });

    // Tài khoản chưa có ảnh thì gán ngay tại đây.
    //
    // Đăng nhập cũng làm việc này, nhưng ai đang mở sẵn phiên từ trước khi cập
    // nhật thì chưa đăng nhập lại lần nào. Đặt thêm ở đây để chỉ cần mở trang
    // Tài khoản là thấy ảnh, không phải đăng xuất rồi vào lại.
    let anhDaiDien = user.hinh_anh || '';
    try {
      anhDaiDien = await ganAnhNeuThieu(NguoiDung, user);
    } catch (e) {
      console.error('Không lấy được ảnh đại diện:', e.message);
    }

    // Mã hiển thị trên trang Tài khoản chính là khoá hồ sơ: id_sinh_vien với
    // sinh viên, id_giang_vien với giảng viên. Không còn trường mã riêng nữa.
    let maDinhDanh = '';
    if (sinhVien) maDinhDanh = sinhVien.id_sinh_vien || '';
    else if (giangVien) maDinhDanh = giangVien.id_giang_vien || '';

    return res.status(200).json({
      success: true,
      data: {
        fullname: user.ho_ten || '',
        email: user.email || '',
        hinh_anh: anhDaiDien,
        vai_tro: user.vai_tro || '',
        student_id: maDinhDanh,
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
    const maNhapVao = chuanHoaMa(body.student_id || body.ma_dinh_danh || '');
    const lop = body.class_name || body.lop || '';
    const khoa_hoc = body.course || body.khoa_hoc || '';

    // Số báo cáo KHÔNG lấy từ thân yêu cầu. Đây là số hệ thống tự đếm từ các
    // tài liệu đã tải lên, trang Tài khoản để ô này chỉ đọc nên không bao giờ
    // gửi lên. Đoạn cũ ép về Number(... || 0) rồi ghi thẳng vào hồ sơ, nên mỗi
    // lần bấm Cập nhật là số báo cáo trong CSDL bị xoá trắng về 0.

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

    // Giảng viên: mã khai trong trang Tài khoản ghi thẳng vào id_giang_vien
    const giangVienHienTai = await GiangVien.findOne({ id_nguoi_dung: userId });

    if (giangVienHienTai) {
      if (maNhapVao) {
        const kq = await doiMaGiangVien(giangVienHienTai.id_giang_vien, maNhapVao);

        if (kq.trung_ma) {
          return res.status(409).json({ success: false, message: kq.ly_do });
        }
      }

      const daCapNhat = await GiangVien.findOneAndUpdate(
        { id_nguoi_dung: userId },
        {
          $set: {
            ...(ho_ten ? { ho_ten } : {}),
            ...(email ? { email } : {})
          }
        },
        { returnDocument: 'after' }
      );

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công!',
        data: {
          fullname: user.ho_ten,
          email: user.email,
          student_id: daCapNhat ? daCapNhat.id_giang_vien : '',
          class_name: '',
          course: '',
          report_number: daCapNhat ? daCapNhat.so_lan_kiem_tra : 0
        }
      });
    }

    // Sinh viên: mã khai trong trang Tài khoản ghi thẳng vào id_sinh_vien.
    //
    // Mã này đang được bài nộp, bảng thống kê và danh sách lớp trỏ tới, nên
    // phải đổi qua doiMaSinhVien để những chỗ đó được sửa theo — đổi trơ hồ sơ
    // gốc là bài đã nộp mất dấu người nộp ngay.
    const sinhVienHienTai = await SinhVien.findOne({ id_nguoi_dung: userId });

    if (sinhVienHienTai && maNhapVao) {
      const kq = await doiMaSinhVien(sinhVienHienTai.id_sinh_vien, maNhapVao);

      if (kq.trung_ma) {
        return res.status(409).json({ success: false, message: kq.ly_do });
      }
    }

    const updateObjSV = { lop, khoa_hoc };
    if (ho_ten) updateObjSV.ho_ten = ho_ten;
    if (email) updateObjSV.email = email;

    // Tài khoản chưa có hồ sơ sinh viên thì tạo mới, lấy luôn mã người dùng khai
    const sinhVien = await SinhVien.findOneAndUpdate(
      { id_nguoi_dung: userId },
      {
        $set: updateObjSV,
        $setOnInsert: {
          id_sinh_vien: maNhapVao || `SV_${userId}`
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    // Đếm lại số báo cáo để trả về đúng con số thật, thay vì giá trị vừa đọc
    // ra từ hồ sơ. Nhờ vậy trang Tài khoản hiển thị đúng ngay sau khi cập nhật,
    // không phải tải lại trang mới thấy số cũ.
    const soBaoCaoThat = await capNhatSoBaoCao(sinhVien.id_sinh_vien);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      data: {
        fullname: user.ho_ten,
        email: user.email,
        student_id: sinhVien.id_sinh_vien,
        class_name: sinhVien.lop,
        course: sinhVien.khoa_hoc,
        report_number: soBaoCaoThat !== null ? soBaoCaoThat : sinhVien.so_bao_cao
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


// ==============================
// ẢNH ĐẠI DIỆN
// ==============================

// Ảnh đại diện để riêng một thư mục, không lẫn với tài liệu người dùng nộp.
const THU_MUC_ANH = path.join(__dirname, '..', 'uploads', 'anh-dai-dien');

if (!fs.existsSync(THU_MUC_ANH)) {
  fs.mkdirSync(THU_MUC_ANH, { recursive: true });
}

const LOAI_ANH_CHO_PHEP = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const luuAnh = multer.diskStorage({
  destination: (req, file, cb) => cb(null, THU_MUC_ANH),

  // Đặt tên theo mã tài khoản nên mỗi người chỉ chiếm một tệp: đổi ảnh lần thứ
  // mười vẫn không để lại chín tệp rác trên ổ đĩa.
  filename: (req, file, cb) => {
    const duoi = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${req.params.id}${duoi}`);
  }
});

const nhanAnh = multer({
  storage: luuAnh,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (LOAI_ANH_CHO_PHEP.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.'));
  }
});

/**
 * Người dùng bấm vào ảnh đại diện rồi chọn ảnh mới.
 * Ảnh tải lên ghi đè ảnh Gravatar hoặc ảnh chữ cái đang dùng.
 */
router.post('/anh-dai-dien/:id', (req, res) => {
  nhanAnh.single('anh')(req, res, async loiTaiLen => {
    try {
      if (loiTaiLen) {
        return res.status(400).json({
          success: false,
          message: loiTaiLen.message === 'File too large'
            ? 'Ảnh vượt quá 5MB.'
            : loiTaiLen.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Chưa chọn ảnh nào.'
        });
      }

      // Đường dẫn công khai; server.js đã mở sẵn thư mục uploads dạng tĩnh
      const duongDan = `/uploads/anh-dai-dien/${req.file.filename}`;

      const user = await NguoiDung.findOneAndUpdate(
        { id_nguoi_dung: req.params.id },
        { $set: { hinh_anh: duongDan, ngay_cap_nhat: new Date() } },
        { returnDocument: 'after' }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản!'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã đổi ảnh đại diện.',
        hinh_anh: duongDan
      });

    } catch (error) {
      console.error('❌ Lỗi đổi ảnh đại diện:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lưu ảnh đại diện!'
      });
    }
  });
});

/**
 * Gỡ ảnh đang dùng, quay về ảnh tự sinh theo email.
 */
router.delete('/anh-dai-dien/:id', async (req, res) => {
  try {
    const user = await NguoiDung.findOne({ id_nguoi_dung: req.params.id });

    if (!user) {
      return res.status(404).json({
        success: false, message: 'Không tìm thấy tài khoản!'
      });
    }

    const anhMoi = await chonAnhDaiDien(user);

    await NguoiDung.updateOne(
      { id_nguoi_dung: req.params.id },
      { $set: { hinh_anh: anhMoi, ngay_cap_nhat: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'Đã đặt lại ảnh đại diện.',
      hinh_anh: anhMoi
    });

  } catch (error) {
    console.error('❌ Lỗi đặt lại ảnh đại diện:', error);
    return res.status(500).json({
      success: false, message: 'Lỗi hệ thống!'
    });
  }
});

module.exports = router;