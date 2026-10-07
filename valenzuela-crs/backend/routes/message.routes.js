const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/message.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/thread', ctrl.getThread);
router.post('/thread',
  [body('body').trim().isLength({ min: 1, max: 2000 }).withMessage('Type a message first.')],
  validate,
  ctrl.sendMessage);

module.exports = router;
