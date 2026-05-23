const express = require('express')
const router = express.Router();
const {exportexcel, exportAllGroupsExcel } =require('../controllers/excelController');
router.get('/',exportAllGroupsExcel);
router.get('/:id',exportexcel);
module.exports = router