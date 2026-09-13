/**
 * ============================================================================
 * THUẬT TOÁN WINNOWING (WORD-LEVEL FINGERPRINTING) - BẢN TỐI ƯU TOÀN DIỆN
 * Tối ưu độ phức tạp Thời gian & Không gian, bảo toàn chuẩn thuật toán Winnowing[cite: 12].
 * ============================================================================
 */

/**
 * Hàm băm chuỗi đa thức (Polynomial Rolling Hash)
 * @param {string} chuoi 
 * @returns {number}
 */
function tinhMahaHash(chuoi) {
    let hashValue = 0;
    const base = 31;
    const modulus = 1000000007;

    for (let i = 0; i < chuoi.length; i++) {
        const maAscii = chuoi.charCodeAt(i);
        hashValue = (hashValue * base + maAscii) % modulus;
    }

    return hashValue;
}

/**
 * Cắt K-Grams theo TỪ (Word-level), giữ lại dấu gạch dưới (_) cho từ ghép tiếng Việt.
 * @param {string} vanBan 
 * @param {number} k 
 * @returns {string[]}
 */
function taoKGramsWordLevel(vanBan, k = 5) {

    if (!vanBan || typeof vanBan !== 'string') {
        return [];
    }

    const mangTu = vanBan.toLowerCase()
        .replace(/[^\p{L}\p{N}\s_]/gu, "")
        .split(/\s+/)
        .filter(t => t.length > 0);

    const danhSachKGrams = [];

    // CÂU NGẮN VẪN TẠO 1 K-GRAM
    if (mangTu.length < k) {

        return [
            mangTu.join(' ')
        ];
    }

    const doDai =
        mangTu.length - k + 1;

    for (let i = 0; i < doDai; i++) {

        danhSachKGrams.push(
            mangTu
                .slice(i, i + k)
                .join(' ')
        );
    }

    return danhSachKGrams;
}

/**
 * Tính giá trị hash cho danh sách K-Grams.
 * @param {string[]} danhSachKGrams 
 * @returns {number[]}
 */
function tinhHashDanhSachKGrams(danhSachKGrams) {
    const danhSachHash = [];
    for (let i = 0; i < danhSachKGrams.length; i++) {
        danhSachHash.push(tinhMahaHash(danhSachKGrams[i]));
    }
    return danhSachHash;
}

/**
 * Tạo danh sách Fingerprints từ danh sách mã hash dựa trên cửa sổ trượt kích thước w.
 * @param {number[]} danhSachHash 
 * @param {number} w 
 * @returns {number[]}
 */
function taoFingerprints(danhSachHash, w = 4) {
    const fingerprints = [];
    if (!danhSachHash || danhSachHash.length === 0) return fingerprints;

    if (danhSachHash.length < w) {
        let minHash = danhSachHash[0];
        for (let i = 1; i < danhSachHash.length; i++) {
            if (danhSachHash[i] < minHash) {
                minHash = danhSachHash[i];
            }
        }
        fingerprints.push(minHash);
        return fingerprints;
    }

    let viTriMinCu = -1;

    for (let i = 0; i <= danhSachHash.length - w; i++) {
        let minGiaTri = danhSachHash[i];
        let minViTri = i;

        for (let j = 1; j < w; j++) {
            const viTriHienTai = i + j;
            if (danhSachHash[viTriHienTai] <= minGiaTri) {
                minGiaTri = danhSachHash[viTriHienTai];
                minViTri = viTriHienTai;
            }
        }

        if (minViTri !== viTriMinCu) {
            fingerprints.push(minGiaTri);
            viTriMinCu = minViTri;
        }
    }

    return fingerprints;
}

/**
 * Tính độ tương đồng giữa hai tập Fingerprints tối ưu bằng Set (Độ phức tạp O(F1 + F2)).
 * Công thức: Tỷ lệ giao / hợp của tập Fingerprints.
 * @param {number[]} fingerprints1 
 * @param {number[]} fingerprints2 
 * @returns {number}
 */
function tinhDoTuongDongWinnowing(fingerprints1, fingerprints2) {
    if (!fingerprints1 || !fingerprints2 || fingerprints1.length === 0 || fingerprints2.length === 0) return 0;

    const set1 = new Set(fingerprints1);
    const set2 = new Set(fingerprints2);

    let soHashGiao = 0;
    for (const hash of set1) {
        if (set2.has(hash)) {
            soHashGiao++;
        }
    }

    const tongSoHashHop = set1.size + set2.size - soHashGiao;
    if (tongSoHashHop === 0) return 0;

    return soHashGiao / tongSoHashHop;
}

/**
 * Hàm điều phối chính kiểm tra Winnowing giữa hai văn bản.
 * @param {string} vanBan1 
 * @param {string} vanBan2 
 * @param {number} k 
 * @param {number} w 
 * @returns {number}
 */
function kiemTraWinnowing(vanBan1, vanBan2, k = 5, w = 4) {
    const kGrams1 = taoKGramsWordLevel(vanBan1, k);
    const kGrams2 = taoKGramsWordLevel(vanBan2, k);

    const hashes1 = tinhHashDanhSachKGrams(kGrams1);
    const hashes2 = tinhHashDanhSachKGrams(kGrams2);

    const fingerprints1 = taoFingerprints(hashes1, w);
    const fingerprints2 = taoFingerprints(hashes2, w);

    return tinhDoTuongDongWinnowing(fingerprints1, fingerprints2);
}
function getFingerprints(vanBan, k = 5, w = 4) {

    const kGrams =
        taoKGramsWordLevel(
            vanBan,
            k
        );

    const hashes =
        tinhHashDanhSachKGrams(
            kGrams
        );

    return taoFingerprints(
        hashes,
        w
    );
}
module.exports = {
    tinhMahaHash,
    taoKGramsWordLevel,
    tinhHashDanhSachKGrams,
    taoFingerprints,
    tinhDoTuongDongWinnowing,
    kiemTraWinnowing,
    getFingerprints
};