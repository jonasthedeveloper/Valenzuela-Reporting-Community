const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/community.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { communityUpload, uploadErrorHandler } = require('../middleware/upload');

const router = express.Router();
router.use(requireAuth); // identity always comes from the session — never the payload

const CATEGORIES = ['general', 'question', 'suggestion', 'lost-found', 'event', 'reminder'];

const commentRules = [
  body('body').trim().isLength({ min: 2, max: 1000 })
    .withMessage('Write a comment first (2–1000 characters).'),
];

router.get('/posts', ctrl.list);

router.post('/posts',
  communityUpload.single('image'),
  uploadErrorHandler,
  [
    body('body').trim().isLength({ min: 2, max: 2000 })
      .withMessage('Write something in your post (2–2000 characters).'),
    body('category').optional()
      .isIn(CATEGORIES).withMessage('Choose a valid category.'),
  ],
  validate,
  ctrl.create);

router.delete('/posts/:id', ctrl.remove);
router.post('/posts/:id/like', ctrl.like);
router.get('/posts/:id/comments', ctrl.listComments);
router.post('/posts/:id/comments', commentRules, validate, ctrl.addComment);
router.post('/comments/:id/replies', commentRules, validate, ctrl.addReply);
router.delete('/comments/:id', ctrl.removeComment);

module.exports = router;
