const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const { BARANGAYS } = require('../config/constants');

const router = express.Router();

const passwordRule = (field = 'password') =>
  body(field)
    .isLength({ min: 8 }).withMessage('Use at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Include at least one letter.')
    .matches(/\d/).withMessage('Include at least one number.');

router.post('/register', authLimiter, [
  body('firstName').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your first name.'),
  body('lastName').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your last name.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').optional({ values: 'falsy' })
    .matches(/^(09|\+639)\d{9}$/).withMessage('Use a Philippine mobile number, e.g. 09171234567.'),
  body('barangay').isIn(BARANGAYS)
    .withMessage('This system covers Barangay Ugong and Barangay Gen. T. De Leon only.'),
  body('address').optional({ values: 'falsy' }).isLength({ max: 255 }),
  passwordRule(),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match.');
    return true;
  }),
], validate, ctrl.register);

router.post('/login', authLimiter, [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Enter your password.'),
], validate, ctrl.login);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

router.post('/forgot-password', passwordResetLimiter, [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
], validate, ctrl.forgotPassword);

router.post('/reset-password', passwordResetLimiter, [
  body('token').trim().notEmpty().withMessage('The reset link is incomplete.'),
  passwordRule(),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match.');
    return true;
  }),
], validate, ctrl.resetPassword);

router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Enter your current password.'),
  passwordRule('newPassword'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) throw new Error('Passwords do not match.');
    return true;
  }),
], validate, ctrl.changePassword);

router.post('/logout-all', requireAuth, ctrl.logoutAll);
router.post('/two-factor', requireAuth, [
  body('enabled').isBoolean().withMessage('Choose on or off.'),
], validate, ctrl.setTwoFactor);

module.exports = router;
