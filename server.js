const express = require('express');
const cors = require('cors');
const http = require('http');                 
const { Server } = require('socket.io');      
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const kiemTraRoutes = require('./routes/kiemtra'); 
const baoCaoRoutes = require('./routes/baocao');   
const cauHinhRoutes = require('./routes/cauhinh'); 
const lopHocRoutes = require('./routes/lophoc');   
const baiTapRoutes = require('./routes/baitap');   
const chiTietNopBaiRoutes = require('./routes/chitietnopbai');
const thongKeRoutes = require('./routes/thongke');
const { batLichDon } = require('./utils/don_bao_cao_qua_han');
const { chayChuyenDoi } = require('./utils/chuyen_doi_du_lieu');
const { dongBoVaiTroTatCa } = require('./utils/dong_bo_vai_tro');

require('dotenv').config();

const app = express();

// Tạo HTTP Server từ Express app
const server = http.createServer(app);

// Khởi tạo Socket.io (nếu sau này cần dùng tới)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Middleware
// Cho trình duyệt đọc tên tệp máy chủ gửi kèm khi tải xuống. Không khai báo
// thì tệp tải về bị đặt tên mặc định thay vì tên gốc của tài liệu.
app.use(cors({ exposedHeaders: ['Content-Disposition'] }));            
app.use(express.json());    

// Phục vụ các file tĩnh
app.use('/uploads', express.static('uploads'));
app.use('/upload2', express.static('upload2'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kiem-tra', kiemTraRoutes); 
app.use('/api/bao-cao', baoCaoRoutes);   
app.use('/api/cau-hinh', cauHinhRoutes); 
app.use('/api/lop-hoc', lopHocRoutes);   
app.use('/api/bai-tap', baiTapRoutes);   
app.use('/api/chi-tiet-nop-bai', chiTietNopBaiRoutes);
app.use('/api/thong-ke', thongKeRoutes);

const path = require('path');
app.use('/upload2', express.static(path.join(__dirname, 'upload2')));

// Route kiểm tra nhanh
app.get('/', (req, res) => {
  res.send('Server đã kết nối MongoDB thành công!');
});

io.on('connection', (socket) => {
    console.log('🔗 Một client đã kết nối Socket ID:', socket.id);
});

const PORT = process.env.PORT || 5000;

/**
 * Khởi động máy chủ theo đúng thứ tự.
 *
 * Cơ sở dữ liệu phải nối xong và chuyển đổi xong mới được mở cổng. Nếu mở cổng
 * trước rồi mới chuyển đổi thì trong vài giây đầu đã có yêu cầu đọc trúng bản
 * ghi cấu trúc cũ, trả về dữ liệu sai hoặc rỗng. Thứ tự này cũng là lý do người
 * kéo mã nguồn về máy khác chỉ cần chạy `npm start`: dữ liệu tự khớp, không
 * phải nhớ chạy thêm lệnh nào.
 */
async function khoiDong() {
  await connectDB();

  // Đưa hồ sơ của mọi tài khoản về đúng collection theo vai_tro.
  //
  // Phải chạy trước phần chuyển đổi, vì các bước chuyển đổi dựa vào bảng
  // sinh_vien để tra mã sinh viên — tài khoản chưa có hồ sơ thì tra ra rỗng.
  try {
    const ds = await dongBoVaiTroTatCa();

    if (ds.length) {
      console.log(`👤 Đã đưa ${ds.length} hồ sơ về đúng collection theo vai trò:`);
      ds.forEach(x => console.log(
        `   ${x.id}: ${x.vaiTro}` +
        (x.daTao ? ` — thêm vào ${x.daTao}` : '') +
        (x.daXoa ? `, gỡ khỏi ${x.daXoa}` : '')));
    }
  } catch (e) {
    console.error('Không đồng bộ được vai trò:', e.message);
  }

  // Đưa dữ liệu về đúng cấu trúc mà mã nguồn hiện tại đang đọc
  await chayChuyenDoi();

  server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);

    // Tự động dọn báo cáo quá hạn lưu trữ: chạy sau khi máy chủ lên một phút,
    // rồi lặp lại mỗi ngày. Số ngày lưu lấy từ cau_hinh_he_thong.
    batLichDon();
  });
}

khoiDong().catch(e => {
  console.error('❌ Không khởi động được máy chủ:', e);
  process.exit(1);
});