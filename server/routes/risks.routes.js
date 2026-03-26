const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/risks.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:rid', auth, c.update);
router.delete('/:rid', auth, c.remove);

module.exports = router;
