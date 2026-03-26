const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/briefCompliance.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:bcid', auth, c.update);
router.delete('/:bcid', auth, c.remove);

module.exports = router;
