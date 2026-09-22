const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const LopHoc = require('../models/lop_hoc');
const {
    bangTraMaSinhVien,
    maSinhVienCua,
    dungThanhVien,
    laCungNguoi,
    boSungMaTaiKhoan
} = require('../utils/thanh_vien_lop');

// Tệp Excel mẫu để nhập danh sách thành viên lớp
const TEP_EXCEL_MAU = path.resolve(__dirname, '..', 'file_excel_mau.xlsx');

// =========================================================================
// API GET /api/lop-hoc/file-excel-mau
//
// Trả tệp Excel mẫu cho nút "Tải file excel mẫu".
//
// Trước đây giao diện trỏ thẳng vào đường dẫn tương đối '../../file_excel_mau.xlsx',
// tức là phải leo ra ngoài thư mục giao diện. Đường dẫn đó chỉ chạy được khi
// máy chủ tĩnh lấy cả thư mục dự án làm gốc; đổi gốc một cái là tải hỏng ngay.
// Cho máy chủ trả tệp thì không còn phụ thuộc vào cách bày thư mục nữa.
// =========================================================================
router.get('/file-excel-mau', (req, res) => {
    if (!fs.existsSync(TEP_EXCEL_MAU)) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy tệp Excel mẫu trên máy chủ!'
        });
    }

    return res.download(TEP_EXCEL_MAU, 'file_excel_mau.xlsx');
});

// API POST: Tạo lớp học mới và lưu vào MongoDB (collection 'lop_hoc')
router.post('/', async (req, res) => {
    console.log("Dữ liệu nhận từ frontend để tạo lớp học:", req.body);
    try {
        const { id_nguoi_dung, tieu_de, mo_ta, ma_lop, danh_sach_email_nhap } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!tieu_de || !id_nguoi_dung) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin tiêu đề lớp học hoặc người dùng!' 
            });
        }

        // 1. Tự động tính toán id_lop_hoc số tự tăng (Lớn nhất hiện tại + 1, nếu chưa có thì là 1)
        const lastClass = await LopHoc.findOne().sort({ id_lop_hoc: -1 });
        const newIdLopHoc = lastClass && lastClass.id_lop_hoc ? lastClass.id_lop_hoc + 1 : 1;

        // 2. Xử lý danh_sach_thanh_vien: Lọc email hợp lệ từ collection nguoi_dung
        const NguoiDung = require('../models/nguoi_dung');
        let thanhVienHopLe = [];
        
        if (Array.isArray(danh_sach_email_nhap) && danh_sach_email_nhap.length > 0) {
            const usersFound = await NguoiDung.find({ email: { $in: danh_sach_email_nhap } });

            const bangMa = await bangTraMaSinhVien(
                usersFound.map(u => u.id_nguoi_dung));

            thanhVienHopLe = usersFound.map(
                u => dungThanhVien(u, bangMa.get(u.id_nguoi_dung)));
        }

        // Đảm bảo chủ lớp luôn có trong danh sách thành viên
        const owner = await NguoiDung.findOne({ id_nguoi_dung: id_nguoi_dung });

        if (owner) {
            const maChuLop = await maSinhVienCua(id_nguoi_dung);

            const daCo = thanhVienHopLe.some(
                tv => laCungNguoi(tv, {
                    idSinhVien: maChuLop,
                    idNguoiDung: id_nguoi_dung
                }));

            if (!daCo) {
                thanhVienHopLe.unshift(dungThanhVien(
                    { ho_ten: owner.ho_ten || 'Chủ lớp', email: owner.email },
                    maChuLop));
            }
        }

        const currentTime = new Date();

        // Tạo bản ghi mới khớp hoàn toàn với cấu trúc schema
        const lopHocMoi = new LopHoc({
            id_lop_hoc: newIdLopHoc,
            id_nguoi_dung,
            tieu_de,
            mo_ta: Array.isArray(mo_ta) ? mo_ta : (mo_ta ? [mo_ta] : []),
            ma_lop: ma_lop || Math.random().toString(36).substring(2, 8).toUpperCase(),
            ngay_tao: currentTime,
            ngay_cap_nhat: currentTime,
            danh_sach_thanh_vien: thanhVienHopLe
        });

        // Lưu vào cơ sở dữ liệu MongoDB
        await lopHocMoi.save();
        console.log("Đã lưu thành công vào collection 'lop_hoc' với ID:", newIdLopHoc);

        res.status(201).json({ 
            success: true, 
            message: 'Tạo lớp học và lưu CSDL thành công!', 
            data: lopHocMoi 
        });
    } catch (error) {
        console.error('Lỗi khi lưu lớp học vào MongoDB:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lưu CSDL', 
            error: error.message 
        });
    }
});

// API GET: Kiểm tra mã lớp tồn tại trong CSDL
router.get('/kiem-tra-ma-lop/:maLop', async (req, res) => {
    try {
        const maLop = req.params.maLop;
        const lopHoc = await LopHoc.findOne({ ma_lop: maLop });

        if (lopHoc) {
            const duLieu = lopHoc.toObject ? lopHoc.toObject() : lopHoc;

            // Gắn kèm mã tài khoản cho từng thành viên — xem ghi chú ở API
            // lấy lớp theo người dùng bên dưới.
            duLieu.danh_sach_thanh_vien =
                await boSungMaTaiKhoan(duLieu.danh_sach_thanh_vien);

            return res.json({
                success: true,
                message: 'Tìm thấy lớp học!',
                data: duLieu
            });
        } else {
            return res.json({ 
                success: false, 
                message: 'Mã lớp không tồn tại!' 
            });
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra mã lớp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi kiểm tra mã lớp', 
            error: error.message 
        });
    }
});

// API PUT: Cập nhật thông tin lớp học (hỗ trợ cập nhật mo_ta dạng Array)
router.put('/:id', async (req, res) => {
    try {
        const { tieu_de, mo_ta } = req.body;
        const updatedLop = await LopHoc.findOneAndUpdate(
            { id_lop_hoc: req.params.id }, 
            { 
                tieu_de: tieu_de, 
                mo_ta: Array.isArray(mo_ta) ? mo_ta : (mo_ta ? [mo_ta] : []), 
                ngay_cap_nhat: new Date() 
            },
            { returnDocument: 'after' }
        );

        if (!updatedLop) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });

        res.json({ success: true, message: 'Cập nhật thành công', data: updatedLop });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// API DELETE: Xóa lớp học
router.delete('/:id', async (req, res) => {
    try {
        const deletedLop = await LopHoc.findOneAndDelete({ id_lop_hoc: req.params.id });
        
        if (!deletedLop) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học để xóa' });

        res.json({ success: true, message: 'Đã xóa lớp học thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa', error: error.message });
    }
});

// API POST: Tham gia lớp học bằng mã lớp (Có kiểm tra tài khoản tồn tại và tự động lấy thông tin)
router.post('/tham-gia', async (req, res) => {
    try {
        const { ma_lop, id_nguoi_dung } = req.body;

        if (!ma_lop || !id_nguoi_dung) {
            return res.status(400).json({ success: false, message: 'Thiếu mã lớp hoặc thông tin người dùng!' });
        }

        // 1. Kiểm tra xem người dùng có thực sự tồn tại trong bảng nguoi_dung không
        const NguoiDung = require('../models/nguoi_dung');
        const LopHoc = require('../models/lop_hoc');
        const nguoiDung = await NguoiDung.findOne({ id_nguoi_dung: id_nguoi_dung });
        if (!nguoiDung) {
            return res.status(404).json({ success: false, message: 'Tài khoản người dùng không tồn tại trong hệ thống!' });
        }

        // 2. Tìm lớp học theo mã lớp
        const lopHoc = await LopHoc.findOne({ ma_lop: ma_lop.trim() });
        if (!lopHoc) {
            return res.status(404).json({ success: false, message: 'Mã lớp không tồn tại!' });
        }

        // 3. Kiểm tra nếu là chủ lớp thì không cho tham gia như học viên
        if (lopHoc.id_nguoi_dung === id_nguoi_dung) {
            return res.status(400).json({ success: false, message: 'Bạn là chủ lớp học này rồi!' });
        }

        // 4. Kiểm tra xem thành viên đã có trong danh sách chưa
        const maSinhVien = await maSinhVienCua(id_nguoi_dung);

        const daThamGia = lopHoc.danh_sach_thanh_vien.some(
            tv => laCungNguoi(tv, {
                idSinhVien: maSinhVien,
                idNguoiDung: id_nguoi_dung
            }));

        if (daThamGia) {
            return res.status(400).json({ success: false, message: 'Bạn đã tham gia lớp học này trước đó rồi!' });
        }

        // 5. Thêm thông tin chuẩn từ bảng nguoi_dung vào mảng danh_sach_thanh_vien
        lopHoc.danh_sach_thanh_vien.push(
            dungThanhVien(nguoiDung, maSinhVien));
        lopHoc.ngay_cap_nhat = new Date();
        await lopHoc.save();
        res.status(200).json({ success: true, message: 'Tham gia lớp học thành công!', data: lopHoc });
    } catch (error) {
        console.error('Lỗi khi tham gia lớp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tham gia lớp', error: error.message });
    }
});

// API DELETE: Xóa thành viên khỏi danh sách lớp học
router.delete('/:idLop/thanh-vien/:idUser', async (req, res) => {
    try {
        const { idLop, idUser } = req.params;

        const lopHoc = await LopHoc.findOne({ id_lop_hoc: idLop });
        if (!lopHoc) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học!' });
        }

        // Người tạo lớp không được rời khỏi chính lớp mình tạo. Chặn ngay ở đây
        // chứ không chỉ ẩn nút bên giao diện, vì gọi thẳng API vẫn xoá được.
        if (String(lopHoc.id_nguoi_dung) === String(idUser)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xoá người tạo lớp ra khỏi lớp học!'
            });
        }

        // Giao diện vẫn gọi API này theo mã tài khoản, còn danh sách thành viên
        // đã chuyển sang mã sinh viên, nên phải tra sang trước khi lọc.
        const maSinhVienCanXoa = await maSinhVienCua(idUser);

        lopHoc.danh_sach_thanh_vien = lopHoc.danh_sach_thanh_vien.filter(
            tv => !laCungNguoi(tv, {
                idSinhVien: maSinhVienCanXoa,
                idNguoiDung: idUser
            }));


        await lopHoc.save();
        res.json({ success: true, message: 'Đã xóa thành viên thành công khỏi CSDL', data: lopHoc });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa thành viên', error: error.message });
    }
});
// API kiểm tra email trong collection nguoi_dung (Đã sửa chuẩn)
router.get('/kiem-tra-email', async (req, res) => {
    try {
        const emailToCheck = req.query.email;
        const NguoiDung = require('../models/nguoi_dung'); // <-- Phải require model ở đây
        const user = await NguoiDung.findOne({ email: emailToCheck });

        if (user) {
            return res.json({ exists: true }); // Đã có trong CSDL -> Không bôi đỏ
        } else {
            return res.json({ exists: false }); // Không có -> Bôi đỏ
        }
    } catch (error) {
        console.error('Lỗi khi check email:', error);
        res.status(500).json({ exists: false, error: error.message });
    }
});
// API PUT: Cập nhật danh sách thành viên của lớp học
router.put('/:id/thanh-vien', async (routerReq, routerRes) => {
    try {
        const { id } = routerReq.params; // id_lop_hoc
        const { danh_sach_thanh_vien } = routerReq.body; // Mảng chứa các object { ho_ten, email } từ client gửi lên

        const NguoiDung = require('../models/nguoi_dung'); // Model bảng người dùng của bạn (đổi tên biến cho khớp với dự án)
        const LopHoc = require('../models/lop_hoc');

        // Giao diện chỉ gửi lên email, nên tra sang tài khoản rồi tra tiếp sang
        // hồ sơ sinh viên để lấy mã sinh viên — thứ mà danh sách thành viên lưu.
        const danhSachEmail = danh_sach_thanh_vien.map(m => m.email);

        const dsTaiKhoan = await NguoiDung
            .find({ email: { $in: danhSachEmail } })
            .select('id_nguoi_dung ho_ten email')
            .lean();

        const taiKhoanTheoEmail = new Map(dsTaiKhoan.map(u => [u.email, u]));

        const bangMa = await bangTraMaSinhVien(
            dsTaiKhoan.map(u => u.id_nguoi_dung));

        const processedMembers = danh_sach_thanh_vien.map(member => {
            const userInDb = taiKhoanTheoEmail.get(member.email);

            return dungThanhVien(
                {
                    ho_ten: userInDb
                        ? userInDb.ho_ten
                        : (member.ho_ten || 'Thành viên'),
                    email: member.email
                },
                userInDb ? bangMa.get(userInDb.id_nguoi_dung) : ''
            );
        });

        // Cập nhật vào bảng lop_hoc
        const updatedClass = await LopHoc.findOneAndUpdate(
            { id_lop_hoc: id },
            { 
                $set: { 
                    danh_sach_thanh_vien: processedMembers,
                    ngay_cap_nhat: new Date()
                } 
            },
            { returnDocument: 'after' }
        );

        if (!updatedClass) {
            return routerRes.status(404).json({ success: false, message: 'Không tìm thấy lớp học trong CSDL!' });
        }

        routerRes.status(200).json({ 
            success: true, 
            message: 'Đã cập nhật danh sách thành viên và liên kết ID thành công!', 
            data: updatedClass 
        });
    } catch (error) {
        console.error('Lỗi cập nhật thành viên:', error);
        routerRes.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});
// API GET: Lấy danh sách lớp học của một người dùng
router.get('/nguoi-dung/:id_nguoi_dung', async (req, res) => {
    try {
        const { id_nguoi_dung } = req.params;
        const LopHoc = require('../models/lop_hoc');
        const NguoiDung = require('../models/nguoi_dung');

        // Danh sách thành viên nhận diện người học bằng mã sinh viên, nhưng
        // đường dẫn này vẫn nhận mã tài khoản. Tìm theo cả hai để những lớp
        // chưa kịp chuyển đổi dữ liệu cũng vẫn hiện ra.
        const maSinhVien = await maSinhVienCua(id_nguoi_dung);

        const dieuKien = [
            { id_nguoi_dung: id_nguoi_dung },
            { "danh_sach_thanh_vien.id_nguoi_dung": id_nguoi_dung }
        ];

        // Lop tao tu truoc dot chuyen doi con luu ma tai khoan, nen van tim
        // theo ca hai. Khong co ho so sinh vien thi bo qua dieu kien nay.
        if (maSinhVien) {
            dieuKien.push({ "danh_sach_thanh_vien.id_sinh_vien": maSinhVien });
        }

        const listClasses = await LopHoc.find({ $or: dieuKien }).lean();

        // Lấy tên chính xác của người tạo lớp dựa vào id_nguoi_dung gốc
        const enrichedClasses = await Promise.all(listClasses.map(async (lop) => {
            const chuLop = await NguoiDung.findOne({ id_nguoi_dung: lop.id_nguoi_dung }).lean();

            // Cơ sở dữ liệu lưu thành viên theo mã sinh viên, còn màn hình lớp
            // học vẫn đối chiếu người tạo lớp theo mã tài khoản. Gắn kèm mã tài
            // khoản vào bản trả về để giao diện không phải tra thêm lần nữa;
            // bản ghi trong cơ sở dữ liệu vẫn chỉ giữ mã sinh viên.
            const thanhVien = await boSungMaTaiKhoan(lop.danh_sach_thanh_vien);

            return {
                ...lop,
                danh_sach_thanh_vien: thanhVien,
                ho_ten_chu_lop: chuLop ? chuLop.ho_ten : 'Chủ lớp' // Tên của người tạo lớp
            };
        }));

        res.status(200).json({
            success: true,
            data: enrichedClasses
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách lớp học:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});
module.exports = router;