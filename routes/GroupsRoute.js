const express = require('express');
const router = express.Router();
const { getGroups, getGroupMembers} = require('../controllers/GroupsController');
router.get('/', getGroups);
router.get('/:id', getGroupMembers);

module.exports = router; 