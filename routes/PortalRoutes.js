const express = require('express');
const { getPortal } = require('../controllers/PortalController');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/me',
  verifyToken,
  requireRoles('leader', 'member'),
  getPortal
);

module.exports = router;
