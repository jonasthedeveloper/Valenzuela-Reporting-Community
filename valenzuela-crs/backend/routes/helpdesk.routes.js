const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/helpdesk.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { helpdeskLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Every Help Desk route is scoped to the authenticated user (req.user.id).
// No route accepts a user_id or conversation_id from the client.
router.use(requireAuth);

router.get('/conversation', ctrl.conversation);
router.get('/messages', ctrl.messagesList);

router.post('/chat',
  helpdeskLimiter,
  [
    body('message')
      .trim()
      .notEmpty().withMessage('Type a message first.')
      .isLength({ max: 2000 }).withMessage('Keep your message under 2000 characters.'),
  ],
  validate,
  ctrl.chat
);

module.exports = router;
