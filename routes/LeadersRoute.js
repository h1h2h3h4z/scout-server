const express = require('express');
const router = express.Router();
const { AddLeader, deleteLeader, getLeaders } = require('../controllers/MembersControll');
const multer = require("multer");
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

// إعداد التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'), // relative path
  filename: (req, file, cb) => {
    cb(null,Date.now()+file.originalname);
  }
});

// إعداد multer
const upload = multer({ storage });

// الراوتس
router.get('/', getLeaders);
router.post(
  '/deleteleader/:id',
  verifyToken,
  requireRoles('superadmin'),
  deleteLeader
);
router.post(
  '/addleaders',
  verifyToken,
  requireRoles('superadmin'),
  upload.single('file'),
  AddLeader
);
module.exports = router;
