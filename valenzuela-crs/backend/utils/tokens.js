const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, ver: user.token_version ?? 0 },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );

const signRefreshToken = (user, days) =>
  jwt.sign(
    { sub: user.id, ver: user.token_version ?? 0 },
    env.jwt.refreshSecret,
    { expiresIn: `${days}d` }
  );

const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

module.exports = {
  signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, sha256, randomToken,
};
