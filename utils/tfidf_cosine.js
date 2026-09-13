/**
 * ============================================================================
 * THUẬT TOÁN ĐỐI SÁNH VĂN BẢN KIỂM TRA TRÙNG LẶP (TF-IDF & COSINE SIMILARITY)
 * Tối ưu hóa độ phức tạp Thời gian O(V * M) và Không gian bộ nhớ.
 * ============================================================================
 */

/**
 * Tách từ và chuẩn hóa văn bản, giữ lại dấu gạch dưới (_) cho từ ghép tiếng Việt.
 * @param {string} vanBan 
 * @returns {string[]}
 */
function tachTu(vanBan) {
    if (!vanBan || typeof vanBan !== 'string') {
        return [];
    }
    return vanBan.toLowerCase()
                 .replace(/[^\p{L}\p{N}\s_]/gu, "")
                 .split(/\s+/)
                 // Lọc bỏ từ rỗng và loại bỏ các từ chỉ toàn là số (để tránh nhiễu mã số, ngày tháng)
                 .filter(tu => tu.length > 0 && !/^\d+$/.test(tu));
}

/**
 * Tạo tập từ vựng chung duy nhất từ danh sách các mảng từ bằng Set (Độ phức tạp O(Tổng số từ)).
 * @param {string[][]} danhSachCacMangTu 
 * @returns {string[]}
 */
function taoTapTuVungChung(danhSachCacMangTu) {
    const tapTuVungSet = new Set();
    for (let i = 0; i < danhSachCacMangTu.length; i++) {
        const mangTu = danhSachCacMangTu[i];
        for (let j = 0; j < mangTu.length; j++) {
            tapTuVungSet.add(mangTu[j]);
        }
    }
    return Array.from(tapTuVungSet);
}

/**
 * Đếm tần suất xuất hiện của một từ trong mảng từ bằng Map tối ưu O(1).
 * @param {string} danhSachTu 
 * @returns {Map<string, number>}
 */
function taoBangTanSuat(danhSachTu) {
    const bangTanSuat = new Map();
    for (let i = 0; i < danhSachTu.length; i++) {
        const tu = danhSachTu[i];
        bangTanSuat.set(tu, (bangTanSuat.get(tu) || 0) + 1);
    }
    return bangTanSuat;
}

/**
 * Tính vector TF theo công thức chuẩn hóa tần suất tối đa (Max Term Frequency):
 * TF(t, d) = f(t, d) / max{f(w, d) : w in d}
 * @param {string[]} danhSachTu 
 * @param {string[]} tapTuVung 
 * @returns {number[]}
 */
function tinhVectorTF(danhSachTu, tapTuVung) {
    const bangTanSuat = taoBangTanSuat(danhSachTu);
    let tanSuatMax = 0;

    // Tìm tần suất xuất hiện lớn nhất trong văn bản
    for (const count of bangTanSuat.values()) {
        if (count > tanSuatMax) {
            tanSuatMax = count;
        }
    }

    const vectorTF = [];
    for (let i = 0; i < tapTuVung.length; i++) {
        const tu = tapTuVung[i];
        const count = bangTanSuat.get(tu) || 0;
        const giatriTF = tanSuatMax === 0 ? 0 : count / tanSuatMax;
        vectorTF.push(giatriTF);
    }

    return vectorTF;
}

/**
 * Tính vector IDF theo công thức chuẩn:
 * IDF(t) = log10( N / df(t) )
 * (Áp dụng làm mượt df = 1 nếu từ không xuất hiện để tránh lỗi chia cho 0)
 * @param {string[][]} danhSachCacMangTu 
 * @param {string[]} tapTuVung 
 * @returns {number[]}
 */
function tinhVectorIDF(danhSachCacMangTu, tapTuVung) {
    const tongSoVanBan = danhSachCacMangTu.length;
    
    // Tiền tính toán Document Frequency (DF) cho toàn bộ từ vựng
    const mapDF = new Map();
    for (let i = 0; i < danhSachCacMangTu.length; i++) {
        const setTuDoc = new Set(danhSachCacMangTu[i]);
        for (const tu of setTuDoc) {
            mapDF.set(tu, (mapDF.get(tu) || 0) + 1);
        }
    }

    const vectorIDF = [];
    for (let i = 0; i < tapTuVung.length; i++) {
        const tu = tapTuVung[i];
        const soVanBanChuaTu = mapDF.get(tu) || 0;
        
        // Làm mượt: Nếu số văn bản chứa từ bằng 0 thì gán bằng 1 để tránh lỗi toán học
        const mauSo = soVanBanChuaTu === 0 ? 1 : soVanBanChuaTu;
        const giatriIDF = Math.log10(tongSoVanBan / mauSo);

        vectorIDF.push(giatriIDF < 0 ? 0 : giatriIDF);
    }

    return vectorIDF;
}

/**
 * Tính vector trọng số TF-IDF theo công thức tích:
 * TF-IDF = TF * IDF
 * @param {number[]} vectorTF 
 * @param {number[]} vectorIDF 
 * @returns {number[]}
 */
function tinhVectorTFIDF(vectorTF, vectorIDF) {
    const vectorTFIDF = [];
    for (let i = 0; i < vectorTF.length; i++) {
        vectorTFIDF.push(vectorTF[i] * vectorIDF[i]);
    }
    return vectorTFIDF;
}

/**
 * Tính độ tương đồng Cosine giữa hai vector theo công thức chuẩn:
 * Cosine(A, B) = (A . B) / (||A|| * ||B||)
 * @param {number[]} vectorA 
 * @param {number[]} vectorB 
 * @returns {number}
 */
function tinhCosineSimilarity(vectorA, vectorB) {
    let tichVoHuong = 0;
    let tongBinhPhuongA = 0;
    let tongBinhPhuongB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        const a = vectorA[i];
        const b = vectorB[i];
        tichVoHuong += a * b;
        tongBinhPhuongA += a * a;
        tongBinhPhuongB += b * b;
    }

    const doDaiA = Math.sqrt(tongBinhPhuongA);
    const doDaiB = Math.sqrt(tongBinhPhuongB);

    if (doDaiA === 0 || doDaiB === 0) {
        return 0;
    }

    return tichVoHuong / (doDaiA * doDaiB);
}

module.exports = {
    tachTu,
    taoTapTuVungChung,
    tinhVectorTF,
    tinhVectorIDF,
    tinhVectorTFIDF,
    tinhCosineSimilarity
};