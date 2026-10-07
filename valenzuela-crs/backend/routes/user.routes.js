const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { BARANGAYS } = require('../config/constants');

const router = express.Router();
router.use(requireAuth);

router.get('/me', ctrl.getProfile);
router.put('/me', [
  body('firstName').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your first name.'),
  body('lastName').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your last name.'),
  body('phone').optional({ values: 'falsy' })
    .matches(/^(09|\+639)\d{9}$/).withMessage('Use a Philippine mobile number, e.g. 09171234567.'),
  body('address').optional({ values: 'falsy' }).isLength({ max: 255 }),
], validate, ctrl.updateProfile);

router.get('/residents', requireRole('admin'), ctrl.listResidents);
router.patch('/:id/status', requireRole('admin'), [
  body('isActive').isBoolean().withMessage('Choose active or inactive.'),
], validate, ctrl.setActive);

router.get('/staff', requireRole('admin'), ctrl.listStaff);
router.get('/staff/active', requireRole('admin'), ctrl.activeStaff);
router.post('/staff', requireRole('admin'), [
  body('firstName').trim().isLength({ min: 2, max: 60 }).withMessage('Enter a first name.'),
  body('lastName').trim().isLength({ min: 2, max: 60 }).withMessage('Enter a last name.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').optional({ values: 'falsy' })
    .matches(/^(09|\+639)\d{9}$/).withMessage('Use a Philippine mobile number.'),
  body('barangay').isIn(BARANGAYS).withMessage('Choose Ugong or Gen. T. De Leon.'),
  body('position').optional({ values: 'falsy' }).isLength({ max: 80 }),
  body('password').isLength({ min: 8 }).withMessage('Use at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Include at least one letter.')
    .matches(/\d/).withMessage('Include at least one number.'),
], validate, ctrl.createStaff);

module.exports = router;
