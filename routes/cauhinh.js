const express = require('express');
const router = express.Router();
const CauHinhHeThong = require('../models/cau_hinh_he_thong');

// API lấy thông tin cấu hình hệ thống
router.get('/', async (req, res) => {
    try {
        const cauHinh = await CauHinhHeThong.findOne();
        res.json({ success: true, data: cauHinh });
    } catch (error) {
        console.error('Lỗi khi lấy cấu hình:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;