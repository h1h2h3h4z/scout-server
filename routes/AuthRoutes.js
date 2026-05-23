const express = require('express');
const Login = require('../controllers/AuthController');
const { forgotPassword, resetPassword } = require('../controllers/AuthPasswordController');
const router = express.Router();
router.post('/login', Login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
module.exports = router;
