const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/drawings.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/reorder', auth, c.reorder);
router.put('/:did', auth, c.update);
router.delete('/:did', auth, c.remove);

module.exports = router;
