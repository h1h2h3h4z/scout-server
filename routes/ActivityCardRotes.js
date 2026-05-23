const express = require('express');
const {
  AddActivityCard,
  AddActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivityCards,
} = require('../controllers/ActivityCardController');
const { verifyToken, optionalVerifyToken, requireRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

const staffOrLeader = requireRoles('superadmin', 'moderator', 'leader');

router.post('/addactivitycard', verifyToken, staffOrLeader, AddActivityCard);
router.post('/addactivity', verifyToken, staffOrLeader, upload.array('photos', 10), AddActivity);
router.get('/getactivities', optionalVerifyToken, getActivities);
router.get('/getactivity/:id', optionalVerifyToken, getActivityById);
router.put('/updateactivity/:id', verifyToken, staffOrLeader, updateActivity);
router.delete('/deleteactivity/:id', verifyToken, requireRoles('superadmin', 'moderator'), deleteActivity);
router.get('/getactivitycards', verifyToken, staffOrLeader, getActivityCards);

module.exports = router;
