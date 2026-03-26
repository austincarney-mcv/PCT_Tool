const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/designChanges.controller');

router.get('/', auth, c.list);
router.get('/fee-summary', auth, c.feeSummary);
router.post('/', auth, c.create);
router.put('/:dcid', auth, c.update);
router.delete('/:dcid', auth, c.remove);

module.exports = router;
