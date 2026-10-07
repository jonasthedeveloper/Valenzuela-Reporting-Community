const rateLimit = require('express-rate-limit');

const message = (text) => ({ success: false, message: text });

/** Applied to the whole API. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests. Try again in a few minutes.'),
});

/** Stricter limit for login / register / refresh. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: message('Too many sign-in attempts. Wait 15 minutes and try again.'),
});

/** Very strict limit for password reset requests. */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many reset requests. Try again in an hour.'),
});

/** Conversational pace for the AI Help Desk. */
const helpdeskLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('You are sending messages too quickly. Wait a moment and try again.'),
});

module.exports = { apiLimiter, authLimiter, passwordResetLimiter, helpdeskLimiter };
