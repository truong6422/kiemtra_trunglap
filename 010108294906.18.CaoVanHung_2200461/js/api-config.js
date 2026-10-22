const IS_LOCAL =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

window.API = IS_LOCAL
    ? "http://127.0.0.1:5000"
    : "http://itf.viu.edu.vn:20109";