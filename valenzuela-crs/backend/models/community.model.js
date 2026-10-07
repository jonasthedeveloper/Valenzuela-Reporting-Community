const { query, queryOne } = require('../config/db');

/* Community feed — resident-driven posts, kept separate from official
   announcements. Every row stores the REAL user_id; is_anonymous only changes
   the public display name. */

const POST_SELECT = (viewerId) => `
  SELECT p.id, p.user_id, p.body, p.image_path, p.category, p.is_anonymous, p.created_at,
         CASE WHEN p.is_anonymous = 1 THEN 'Anonymous'
              ELSE CONCAT(u.first_name, ' ', u.last_name) END AS author_name,
         CONCAT(u.first_name, ' ', u.last_name) AS author_real_name,
         u.role AS author_role,
         (SELECT COUNT(*) FROM community_likes l WHERE l.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM community_comments c
           WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
         ${viewerId ? `(SELECT COUNT(*) FROM community_likes l2
              WHERE l2.post_id = p.id AND l2.user_id = ?)` : '0'} AS liked_by_me
    FROM community_posts p
    JOIN users u ON u.id = p.user_id`;

const COMMENT_SELECT = `
  SELECT c.id, c.post_id, c.parent_id, c.body, c.created_at, c.user_id, c.is_anonymous,
         CASE WHEN c.is_anonymous = 1 THEN 'Anonymous'
              ELSE CONCAT(u.first_name, ' ', u.last_name) END AS author_name,
         CONCAT(u.first_name, ' ', u.last_name) AS author_real_name,
         u.role AS author_role
    FROM community_comments c
    JOIN users u ON u.id = c.user_id`;

/** Newest first, paged. viewerId powers the "liked by me" flag. */
const listPosts = async ({ viewerId, category = 'all', page = 1, limit = 10 }) => {
  const params = [];
  if (viewerId) params.push(viewerId);

  const where = ['p.deleted_at IS NULL'];
  if (category && category !== 'all') { where.push('p.category = ?'); params.push(category); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);

  const rows = await query(
    `${POST_SELECT(viewerId)} ${clause} ORDER BY p.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const countParams = viewerId ? params.slice(1) : params;
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM community_posts p ${clause}`,
    countParams
  );
  return { rows, total };
};

const findById = async (id, viewerId = null) => {
  const params = viewerId ? [viewerId, id] : [id];
  return queryOne(`${POST_SELECT(viewerId)} WHERE p.id = ? AND p.deleted_at IS NULL`, params);
};

const create = async ({ userId, body, category, imagePath, isAnonymous }) => {
  const rows = await query(
    `INSERT INTO community_posts (user_id, body, category, image_path, is_anonymous)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, body, category || 'general', imagePath || null, isAnonymous ? 1 : 0]
  );
  return findById(rows.insertId, userId);
};

const softDelete = (id) =>
  query('UPDATE community_posts SET deleted_at = NOW() WHERE id = ?', [id]);

/** Like / unlike — the UNIQUE key makes duplicates impossible. */
const toggleLike = async (postId, userId) => {
  const existing = await queryOne(
    'SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );
  if (existing) {
    await query('DELETE FROM community_likes WHERE id = ?', [existing.id]);
  } else {
    await query('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }
  const [{ like_count: likeCount }] = await query(
    'SELECT COUNT(*) AS like_count FROM community_likes WHERE post_id = ?',
    [postId]
  );
  return { liked: !existing, likeCount: Number(likeCount) };
};

/** All comments + replies for a post (flat; the client nests via parent_id). */
const comments = (postId) =>
  query(
    `${COMMENT_SELECT}
      WHERE c.post_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
    [postId]
  );

const addComment = async ({ postId, userId, body, isAnonymous, parentId = null }) => {
  const rows = await query(
    `INSERT INTO community_comments (post_id, user_id, parent_id, body, is_anonymous)
     VALUES (?, ?, ?, ?, ?)`,
    [postId, userId, parentId, body, isAnonymous ? 1 : 0]
  );
  return queryOne(`${COMMENT_SELECT} WHERE c.id = ?`, [rows.insertId]);
};

const findComment = (id) => queryOne('SELECT * FROM community_comments WHERE id = ?', [id]);

const deleteComment = (id) =>
  query('UPDATE community_comments SET deleted_at = NOW() WHERE id = ?', [id]);

module.exports = {
  listPosts, findById, create, softDelete, toggleLike,
  comments, addComment, findComment, deleteComment,
};
