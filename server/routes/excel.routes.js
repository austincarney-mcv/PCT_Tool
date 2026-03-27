const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const multer = require('multer');
const c = require('../controllers/excel.controller');

router.get('/export', auth, c.exportProject);

module.exports = router;
