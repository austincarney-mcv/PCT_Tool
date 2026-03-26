const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/criticalItems.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:cid', auth, c.update);
router.delete('/:cid', auth, c.remove);
router.patch('/:cid/status', auth, c.toggleStatus);

module.exports = router;
