const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/valueLog.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:vid', auth, c.update);
router.delete('/:vid', auth, c.remove);

module.exports = router;
