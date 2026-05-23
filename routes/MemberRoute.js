const express = require('express');
const router = express.Router();
const {
  AddMember,
  getMembers,
  deleteMember,
  updateMember,
  getMyProfile,
  updateMyProfile,
  getMemberById,
} = require('../controllers/MembersControll');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');
const multer = require("multer");
const path = require("path");

// إعداد التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'), // relative path
  filename: (req, file, cb) => {
    cb(null,file.originalname);
  }
});

// إعداد multer
const upload = multer({ storage });

// الراوتس
router.get('/me/profile', verifyToken, getMyProfile);
router.put(
  '/me/profile',
  verifyToken,
  requireRoles('member', 'leader'),
  upload.single('file'),
  updateMyProfile
);
router.get(
  '/:id',
  verifyToken,
  requireRoles('superadmin', 'moderator', 'leader'),
  getMemberById
);
router.get('/', getMembers);
router.post(
  '/addmember',
  verifyToken,
  requireRoles('superadmin', 'moderator', 'leader'),
  upload.single('file'),
  AddMember
);
router.put(
  '/:id',
  verifyToken,
  requireRoles('superadmin', 'moderator', 'leader'),
  upload.single('file'),
  updateMember
);
router.delete(
  '/:id',
  verifyToken,
  requireRoles('superadmin', 'moderator', 'leader'),
  deleteMember
);
module.exports = router;
