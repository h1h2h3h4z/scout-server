const express = require('express');
const {
  submitContact,
  getContactRequests,
  updateContactStatus,
  linkContactToMember,
} = require('../controllers/ContactController');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', submitContact);
router.get('/', verifyToken, requireRoles('superadmin', 'moderator'), getContactRequests);
router.patch(
  '/:id/status',
  verifyToken,
  requireRoles('superadmin', 'moderator'),
  updateContactStatus
);
router.patch(
  '/:id/link-member',
  verifyToken,
  requireRoles('superadmin', 'moderator'),
  linkContactToMember
);

module.exports = router;
