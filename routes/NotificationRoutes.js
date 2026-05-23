const express = require('express');
const { getSummary } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/summary', verifyToken, getSummary);

module.exports = router;
