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

// Kết nối MongoDB
connectDB();

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

// Khởi động server bằng `server.listen`
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng ${PORT}`);

  // Tự động dọn báo cáo quá hạn lưu trữ: chạy sau khi máy chủ lên một phút,
  // rồi lặp lại mỗi ngày. Số ngày lưu lấy từ cau_hinh_he_thong.
  batLichDon();
});