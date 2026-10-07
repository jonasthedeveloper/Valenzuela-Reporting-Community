/**
 * Public API rows must never reveal the real author of an anonymous
 * post/comment to other residents — is_anonymous is a DISPLAY choice, but the
 * real user_id lives in the database for moderation and audit.
 *
 *  • everyone receives `is_mine` so the UI can show delete controls,
 *  • only administrators receive `user_id` + `author_real_name`.
 */
const publicIdentity = (row, viewer) => {
  if (!row || typeof row !== 'object') return row;
  const { user_id: userId, author_real_name: realName, ...rest } = row;
  const out = { ...rest, is_mine: Boolean(viewer && userId != null && userId === viewer.id) };
  if (viewer && viewer.role === 'admin') {
    if (userId !== undefined) out.user_id = userId;
    if (realName !== undefined) out.author_real_name = realName;
  }
  return out;
};

const publicIdentityList = (rows, viewer) => (rows || []).map((row) => publicIdentity(row, viewer));

module.exports = { publicIdentity, publicIdentityList };
