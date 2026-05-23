const express = require('express');
const { getDashboardStats } = require('../controllers/DashboardController');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', verifyToken, requireRoles('superadmin', 'moderator'), getDashboardStats);

module.exports = router;
