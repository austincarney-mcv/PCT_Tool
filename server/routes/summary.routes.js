const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { getSummary } = require('../controllers/summary.controller');

router.get('/', auth, getSummary);

module.exports = router;
