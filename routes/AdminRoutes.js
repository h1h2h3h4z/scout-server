const express = require('express');
const { createAdmin } = require('../controllers/SuperAdminContoller');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');
const router = express.Router();
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'), // relative path
  filename: (req, file, cb) => {
    cb(null,file.originalname);
  }
});
const upload = multer({ storage });

router.post(
  '/',
  verifyToken,
  requireRoles('superadmin'),
  upload.single('file'),
  createAdmin
);
module.exports= router