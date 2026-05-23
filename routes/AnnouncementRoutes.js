const express = require('express');
const {
  getMyAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} = require('../controllers/AnnouncementController');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/my',
  verifyToken,
  requireRoles('member', 'leader'),
  getMyAnnouncements
);
router.post(
  '/',
  verifyToken,
  requireRoles('leader'),
  createAnnouncement
);
router.delete(
  '/:id',
  verifyToken,
  requireRoles('leader'),
  deleteAnnouncement
);

module.exports = router;
