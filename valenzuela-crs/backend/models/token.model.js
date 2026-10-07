const { query, queryOne } = require('../config/db');

const saveRefreshToken = ({ userId, tokenHash, userAgent, expiresAt }) =>
  query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, expires_at) VALUES (?, ?, ?, ?)`,
    [userId, tokenHash, (userAgent || '').slice(0, 255), expiresAt]
  );

const findRefreshToken = (tokenHash) =>
  queryOne(
    `SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );

const revokeRefreshToken = (tokenHash) =>
  query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [tokenHash]);

const revokeAllForUser = (userId) =>
  query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId]);

const savePasswordReset = ({ userId, tokenHash, expiresAt }) =>
  query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [
    userId, tokenHash, expiresAt,
  ]);

const findPasswordReset = (tokenHash) =>
  queryOne(
    `SELECT * FROM password_resets
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );

const consumePasswordReset = (id) =>
  query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [id]);

const invalidateUserResets = (userId) =>
  query('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [userId]);

module.exports = {
  saveRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllForUser,
  savePasswordReset, findPasswordReset, consumePasswordReset, invalidateUserResets,
};
