const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/approvals.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:aid', auth, c.update);
router.delete('/:aid', auth, c.remove);
router.patch('/:aid/complete', auth, c.toggleComplete);

module.exports = router;
