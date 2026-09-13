/* 
============================================================================
UTILS: THUẬT TOÁN ĐO ĐỘ TƯƠNG ĐỒNG JACCARD (utils/jaccard.js)
Tối ưu hóa độ phức tạp Thời gian O(N + M) & Không gian O(N + M)
Công thức chuẩn: Jaccard Similarity(A, B) = |A ∩ B| / |A ∪ B|
============================================================================
*/
function tinhDoTuongDongJaccard(vanBanA, vanBanB) {
    // 1. Kiểm tra an toàn đầu vào (O(1))
    if (!vanBanA || !vanBanB || typeof vanBanA !== 'string' || typeof vanBanB !== 'string') {
        return {
            tyLePhanTram: 0,
            doTuongDong: 0,
            tuChung: [],
            soLuongGiao: 0,
            soLuongHop: 0
        };
    }

    // 2. Chuẩn hóa và chuyển đổi văn bản thành Set độc lập (O(N + M))
    // Giữ lại chữ cái, số, khoảng trắng và dấu gạch dưới (_) của từ ghép tiếng Việt
    const setA = new Set(
        vanBanA.toLowerCase()
               .replace(/[^\p{L}\p{N}\s_]/gu, "")
               .split(/\s+/)
               .filter(Boolean)
    );
    const setB = new Set(
        vanBanB.toLowerCase()
               .replace(/[^\p{L}\p{N}\s_]/gu, "")
               .split(/\s+/)
               .filter(Boolean)
    );

    if (setA.size === 0 || setB.size === 0) {
        return {
            tyLePhanTram: 0,
            doTuongDong: 0,
            tuChung: [],
            soLuongGiao: 0,
            soLuongHop: 0
        };
    }

    // 3. Tối ưu tìm phần giao (|A ∩ B|) bằng cách duyệt tập hợp có kích thước nhỏ hơn
    const [smallerSet, largerSet] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
    const tuChung = [];
    
    for (const tu of smallerSet) {
        if (largerSet.has(tu)) {
            tuChung.push(tu);
        }
    }

    const soLuongGiao = tuChung.length;

    // 4. Tính số lượng hợp (|A ∪ B|) bằng Nguyên lý bù trừ tập hợp:
    // |A ∪ B| = |A| + |B| - |A ∩ B|
    // Giúp loại bỏ hoàn toàn thao tác tạo Set hợp tốn kém bộ nhớ và thời gian.
    const soLuongHop = setA.size + setB.size - soLuongGiao;

    // 5. Tính toán chính xác giá trị tương đồng theo công thức toán học
    const doTuongDong = soLuongHop === 0 ? 0 : soLuongGiao / soLuongHop;
    
    // Quy đổi tỷ lệ phần trăm, làm tròn chính xác 2 chữ số thập phân
    const tyLePhanTram = parseFloat((doTuongDong * 100).toFixed(2));

    return {
        tyLePhanTram: tyLePhanTram,
        doTuongDong: doTuongDong,
        tuChung: tuChung,
        soLuongGiao: soLuongGiao,
        soLuongHop: soLuongHop
    };
}

module.exports = {
    tinhDoTuongDongJaccard
};