const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/projects.controller');

router.get('/', auth, c.list);
router.post('/', auth, c.create);
router.get('/:id', auth, c.get);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);

module.exports = router;
