const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/lostfound.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { lostFoundUpload } = require('../middleware/upload');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

router.post('/',
  lostFoundUpload.single('photo'),
  [
    body('type').isIn(['lost', 'found']).withMessage('Choose lost or found.'),
    body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Name the item.'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Describe the item.'),
    body('itemDate').isISO8601().withMessage('Pick the date it was lost or found.'),
    body('location').trim().isLength({ min: 3, max: 255 }).withMessage('Where was it lost or found?'),
  ],
  validate,
  ctrl.create);

router.post('/:id/claim', ctrl.claim);
router.delete('/:id', ctrl.remove);

module.exports = router;
