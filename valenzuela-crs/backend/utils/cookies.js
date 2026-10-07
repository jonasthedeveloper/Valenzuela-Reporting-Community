const env = require('../config/env');

const ACCESS_COOKIE = 'vcrs_access';
const REFRESH_COOKIE = 'vcrs_refresh';

const base = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  path: '/',
};

const setAuthCookies = (res, { accessToken, refreshToken, refreshDays }) => {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: 1000 * 60 * 60 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 1000 * 60 * 60 * 24 * refreshDays });
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
};

module.exports = { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies, clearAuthCookies };
