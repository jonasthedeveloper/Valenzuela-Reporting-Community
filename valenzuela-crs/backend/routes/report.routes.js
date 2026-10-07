const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/report.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { reportUpload, resolutionUpload } = require('../middleware/upload');
const { PRIORITIES } = require('../config/constants');

const router = express.Router();
router.use(requireAuth);

router.get('/categories', ctrl.listCategories);
router.get('/', ctrl.listReports);
router.get('/:id', ctrl.getReport);

router.post('/',
  requireRole('resident'),
  reportUpload.array('media', 6),
  [
    body('categoryId').isInt({ min: 1 }).withMessage('Choose a category.'),
    body('title').trim().isLength({ min: 6, max: 160 }).withMessage('Give the report a short title (6-160 characters).'),
    body('description').trim().isLength({ min: 20, max: 4000 })
      .withMessage('Describe what happened in at least 20 characters.'),
    body('address').trim().isLength({ min: 5, max: 255 }).withMessage('Enter the street address or a landmark.'),
    body('priority').isIn(PRIORITIES).withMessage('Choose a priority level.'),
  ],
  validate,
  ctrl.createReport);

router.patch('/:id/status',
  requireRole('staff', 'admin'),
  [body('status').notEmpty().withMessage('Choose a status.')],
  validate,
  ctrl.updateStatus);

router.patch('/:id/assign',
  requireRole('admin'),
  [body('staffId').isInt({ min: 1 }).withMessage('Choose a staff member.')],
  validate,
  ctrl.assignStaff);

router.post('/:id/resolution',
  requireRole('staff', 'admin'),
  resolutionUpload.array('photos', 6),
  ctrl.uploadResolution);

router.delete('/:id', requireRole('admin'), ctrl.deleteReport);

module.exports = router;
