const IS_LOCAL =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

// Trên server, backend phục vụ luôn giao diện nên gọi API về đúng địa chỉ đang mở
// (itf.viu.edu.vn:20109 hay IP 27.72.146.128:20109 đều chạy)
window.API = IS_LOCAL
    ? "http://127.0.0.1:5000"
    : location.origin;
