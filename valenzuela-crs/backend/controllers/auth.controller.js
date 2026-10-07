const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const userModel = require('../models/user.model');
const tokenModel = require('../models/token.model');
const { hashPassword, verifyPassword } = require('../utils/password');
const {
  signAccessToken, signRefreshToken, verifyRefreshToken, sha256, randomToken,
} = require('../utils/tokens');
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } = require('../utils/cookies');

const publicUser = (user) => ({
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
  fullName: `${user.first_name} ${user.last_name}`,
  email: user.email,
  phone: user.phone,
  role: user.role,
  barangay: user.barangay,
  address: user.address,
  position: user.position,
  twoFactorEnabled: Boolean(user.two_factor_enabled),
  isActive: Boolean(user.is_active),
  createdAt: user.created_at,
});

const daysFromNow = (days) => new Date(Date.now() + days * 86400000);

async function issueSession(res, req, user, rememberMe) {
  const days = rememberMe ? env.jwt.rememberTtlDays : env.jwt.refreshTtlDays;
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, days);

  await tokenModel.saveRefreshToken({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    userAgent: req.get('user-agent'),
    expiresAt: daysFromNow(days),
  });

  setAuthCookies(res, { accessToken, refreshToken, refreshDays: days });
}

const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, barangay, address } = req.body;

  if (await userModel.emailExists(email)) {
    throw ApiError.conflict('That email is already registered. Sign in instead.');
  }

  const user = await userModel.create({
    firstName, lastName, email: email.toLowerCase(), phone, barangay, address,
    passwordHash: await hashPassword(password),
    role: 'resident',
  });

  await issueSession(res, req, user, false);
  await userModel.touchLogin(user.id);

  res.status(201).json({
    success: true,
    message: 'Account created. Welcome to the Valenzuela Community Reporting System.',
    data: { user: publicUser(user) },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const user = await userModel.findByEmail(String(email).toLowerCase());

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw ApiError.unauthorized('Email or password is incorrect.');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('This account is deactivated. Contact the barangay office.');
  }

  await issueSession(res, req, user, Boolean(rememberMe));
  await userModel.touchLogin(user.id);

  res.json({ success: true, message: 'Signed in.', data: { user: publicUser(user) } });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No active session.');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Your session expired. Sign in again.');
  }

  const hash = sha256(token);
  const stored = await tokenModel.findRefreshToken(hash);
  if (!stored) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Your session is no longer valid. Sign in again.');
  }

  const user = await userModel.findById(payload.sub);
  if (!user || !user.is_active || Number(user.token_version) !== Number(payload.ver)) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Your session ended. Sign in again.');
  }

  await tokenModel.revokeRefreshToken(hash);
  const remainingDays = Math.max(
    1,
    Math.ceil((new Date(stored.expires_at).getTime() - Date.now()) / 86400000)
  );

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, remainingDays);
  await tokenModel.saveRefreshToken({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    userAgent: req.get('user-agent'),
    expiresAt: daysFromNow(remainingDays),
  });
  setAuthCookies(res, { accessToken, refreshToken, refreshDays: remainingDays });

  res.json({ success: true, data: { user: publicUser(user) } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await tokenModel.revokeRefreshToken(sha256(token));
  clearAuthCookies(res);
  res.json({ success: true, message: 'Signed out.' });
});

const logoutAll = asyncHandler(async (req, res) => {
  await tokenModel.revokeAllForUser(req.user.id);
  await userModel.bumpTokenVersion(req.user.id);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Signed out of every device.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase();
  const user = await userModel.findByEmail(email);

  const response = {
    success: true,
    message: 'If that email is registered, a reset link has been created.',
    data: {},
  };

  if (user && user.is_active) {
    await tokenModel.invalidateUserResets(user.id);
    const raw = randomToken();
    await tokenModel.savePasswordReset({
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + env.resetTokenTtlMinutes * 60000),
    });
    // No email service is configured for this deployment, so the link is returned
    // to the client and shown on screen. Swap this for a mailer in production.
    response.data.resetToken = raw;
    response.data.resetUrl = `${env.clientUrl}/reset-password?token=${raw}`;
    response.data.expiresInMinutes = env.resetTokenTtlMinutes;
  }

  res.json(response);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await tokenModel.findPasswordReset(sha256(token));
  if (!record) throw ApiError.badRequest('That reset link is invalid or has expired. Request a new one.');

  await userModel.updatePassword(record.user_id, await hashPassword(password));
  await tokenModel.consumePasswordReset(record.id);
  await tokenModel.revokeAllForUser(record.user_id);
  await userModel.bumpTokenVersion(record.user_id);
  clearAuthCookies(res);

  res.json({ success: true, message: 'Password changed. Sign in with your new password.' });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await userModel.findWithPassword(req.user.id);

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw ApiError.badRequest('Your current password is incorrect.', {
      currentPassword: 'Your current password is incorrect.',
    });
  }
  await userModel.updatePassword(user.id, await hashPassword(newPassword));
  res.json({ success: true, message: 'Password changed.' });
});

const setTwoFactor = asyncHandler(async (req, res) => {
  const enabled = Boolean(req.body.enabled);
  const user = await userModel.setTwoFactor(req.user.id, enabled);
  res.json({
    success: true,
    message: enabled
      ? 'Two-factor authentication is on. You will confirm your password on new devices.'
      : 'Two-factor authentication is off.',
    data: { user: publicUser(user) },
  });
});

module.exports = {
  register, login, refresh, me, logout, logoutAll,
  forgotPassword, resetPassword, changePassword, setTwoFactor, publicUser,
};
