const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/announcement.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { announcementUpload, uploadErrorHandler } = require('../middleware/upload');
const { BARANGAYS } = require('../config/constants');

const router = express.Router();

// Public: latest published announcements shown on the welcome page.
router.get('/preview', ctrl.preview);

router.use(requireAuth);

const rules = [
  body('title').trim().isLength({ min: 6, max: 180 }).withMessage('Give the announcement a title.'),
  body('body').trim().isLength({ min: 20, max: 5000 }).withMessage('Write at least 20 characters.'),
  body('type').isIn(['announcement', 'event', 'advisory']).withMessage('Choose a post type.'),
  body('status').isIn(['draft', 'published', 'scheduled']).withMessage('Choose draft, published or scheduled.'),
  body('barangay').optional({ values: 'null' }).custom((value) => {
    if (value === null || value === '' || BARANGAYS.includes(value)) return true;
    throw new Error('Choose Ugong, Gen. T. De Leon, or leave it for both.');
  }),
  body('publishAt').custom((value, { req }) => {
    if (req.body.status === 'scheduled' && !value) throw new Error('Pick the date and time to publish.');
    return true;
  }),
];

router.get('/', ctrl.feed);
router.get('/manage', requireRole('admin'), ctrl.listAll);
router.post('/',
  requireRole('admin'),
  announcementUpload.single('image'),
  uploadErrorHandler,
  rules,
  validate,
  ctrl.create);
router.put('/:id',
  requireRole('admin'),
  announcementUpload.single('image'),
  uploadErrorHandler,
  rules,
  validate,
  ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

router.post('/:id/like', ctrl.toggleLike);
router.get('/:id/comments', ctrl.listComments);
router.post('/:id/comments',
  [body('body').trim().isLength({ min: 1, max: 1000 }).withMessage('Write a comment first.')],
  validate,
  ctrl.addComment);
router.delete('/:id/comments/:commentId', ctrl.deleteComment);

module.exports = router;
