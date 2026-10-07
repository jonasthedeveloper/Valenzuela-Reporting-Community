const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/tokens');
const { ACCESS_COOKIE } = require('../utils/cookies');
const userModel = require('../models/user.model');

/** Requires a valid access token cookie and loads the user onto req.user. */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Your session expired. Sign in again.');
  }

  const user = await userModel.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists.');
  if (!user.is_active) throw ApiError.forbidden('This account is deactivated. Contact the barangay office.');
  if (Number(user.token_version) !== Number(payload.ver)) {
    throw ApiError.unauthorized('Your session ended. Sign in again.');
  }

  req.user = user;
  next();
});

/** Restricts a route to one or more roles. */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};

module.exports = { requireAuth, requireRole };
