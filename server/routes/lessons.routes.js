const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/lessons.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:lid', auth, c.update);
router.delete('/:lid', auth, c.remove);

module.exports = router;
