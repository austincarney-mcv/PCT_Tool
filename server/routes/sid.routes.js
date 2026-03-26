const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/sid.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:hid', auth, c.update);
router.delete('/:hid', auth, c.remove);

module.exports = router;
