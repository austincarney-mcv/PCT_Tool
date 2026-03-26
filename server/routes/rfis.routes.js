const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const c = require('../controllers/rfis.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.put('/:rfid', auth, c.update);
router.delete('/:rfid', auth, c.remove);

module.exports = router;
