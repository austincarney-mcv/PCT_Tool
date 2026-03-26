const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const multer = require('multer');
const c = require('../controllers/excel.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/export', auth, c.exportProject);
router.post('/import', auth, upload.single('file'), c.importProject);

module.exports = router;
