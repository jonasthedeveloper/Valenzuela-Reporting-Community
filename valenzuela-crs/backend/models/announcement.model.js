const { query, queryOne } = require('../config/db');

const FEED_SELECT = (viewerId) => `
  SELECT a.id, a.title, a.body, a.type, a.status, a.barangay, a.publish_at, a.created_at,
         a.image_path, a.is_anonymous,
         CASE WHEN a.is_anonymous = 1 THEN 'Anonymous'
              WHEN au.id IS NULL THEN 'Barangay office'
              ELSE CONCAT(au.first_name, ' ', au.last_name) END AS author_name,
         CASE WHEN au.id IS NULL THEN 'Barangay office'
              ELSE CONCAT(au.first_name, ' ', au.last_name) END AS author_real_name,
         (SELECT COUNT(*) FROM announcement_likes l WHERE l.announcement_id = a.id) AS like_count,
         (SELECT COUNT(*) FROM announcement_comments cm
           WHERE cm.announcement_id = a.id AND cm.deleted_at IS NULL) AS comment_count,
         ${viewerId ? `(SELECT COUNT(*) FROM announcement_likes l2
              WHERE l2.announcement_id = a.id AND l2.user_id = ?)` : '0'} AS liked_by_me
    FROM announcements a
    LEFT JOIN users au ON au.id = a.author_id`;

/** Published (or scheduled and already due) announcements for a resident's barangay. */
const feed = async ({ viewerId, barangay, type = 'all', page = 1, limit = 10 }) => {
  const params = [];
  if (viewerId) params.push(viewerId);

  const where = [
    'a.deleted_at IS NULL',
    `(a.status = 'published' OR (a.status = 'scheduled' AND a.publish_at <= NOW()))`,
  ];
  if (barangay) { where.push('(a.barangay IS NULL OR a.barangay = ?)'); params.push(barangay); }
  if (type !== 'all') { where.push('a.type = ?'); params.push(type); }

  const clause = `WHERE ${where.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);

  const rows = await query(
    `${FEED_SELECT(viewerId)} ${clause} ORDER BY COALESCE(a.publish_at, a.created_at) DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const countParams = viewerId ? params.slice(1) : params;
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM announcements a ${clause}`, countParams);
  return { rows, total };
};

/** Every announcement including drafts — admin view. */
const listAll = async ({ status = 'all', search = '', page = 1, limit = 10 }) => {
  const where = ['a.deleted_at IS NULL'];
  const params = [];
  if (status !== 'all') { where.push('a.status = ?'); params.push(status); }
  if (search) { where.push('(a.title LIKE ? OR a.body LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const clause = `WHERE ${where.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);
  const rows = await query(
    `${FEED_SELECT(null)} ${clause} ORDER BY a.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM announcements a ${clause}`, params);
  return { rows, total };
};

const findById = (id, viewerId = null) => {
  const params = viewerId ? [viewerId, id] : [id];
  return queryOne(`${FEED_SELECT(viewerId)} WHERE a.id = ? AND a.deleted_at IS NULL`, params);
};

const create = async (data) => {
  const rows = await query(
    `INSERT INTO announcements (author_id, title, body, type, status, barangay, publish_at, image_path, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.authorId, data.title, data.body, data.type, data.status, data.barangay || null,
     data.publishAt || null, data.imagePath || null, data.isAnonymous ? 1 : 0]
  );
  return findById(rows.insertId);
};

const update = async (id, data) => {
  await query(
    `UPDATE announcements SET title = ?, body = ?, type = ?, status = ?, barangay = ?, publish_at = ?,
                             image_path = ?, is_anonymous = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [data.title, data.body, data.type, data.status, data.barangay || null, data.publishAt || null,
     data.imagePath || null, data.isAnonymous ? 1 : 0, id]
  );
  return findById(id);
};

/** Latest published announcements for the public welcome page (no viewer). */
const preview = (limit = 4) => query(
  `SELECT a.id, a.title, a.body, a.type, a.barangay, a.publish_at, a.created_at,
          a.image_path, a.is_anonymous,
          CASE WHEN a.is_anonymous = 1 THEN 'Anonymous'
               WHEN au.id IS NULL THEN 'Barangay office'
               ELSE CONCAT(au.first_name, ' ', au.last_name) END AS author_name
     FROM announcements a
     LEFT JOIN users au ON au.id = a.author_id
    WHERE a.deleted_at IS NULL
      AND (a.status = 'published' OR (a.status = 'scheduled' AND a.publish_at <= NOW()))
    ORDER BY COALESCE(a.publish_at, a.created_at) DESC
    LIMIT ${Number(limit)}`
);

const softDelete = (id) => query('UPDATE announcements SET deleted_at = NOW() WHERE id = ?', [id]);

const toggleLike = async (announcementId, userId) => {
  const existing = await queryOne(
    'SELECT id FROM announcement_likes WHERE announcement_id = ? AND user_id = ?',
    [announcementId, userId]
  );
  if (existing) {
    await query('DELETE FROM announcement_likes WHERE id = ?', [existing.id]);
  } else {
    await query('INSERT INTO announcement_likes (announcement_id, user_id) VALUES (?, ?)', [
      announcementId, userId,
    ]);
  }
  const [{ like_count: likeCount }] = await query(
    'SELECT COUNT(*) AS like_count FROM announcement_likes WHERE announcement_id = ?',
    [announcementId]
  );
  return { liked: !existing, likeCount: Number(likeCount) };
};

const COMMENT_SELECT = `
  SELECT c.id, c.body, c.created_at, c.user_id, c.is_anonymous,
         CASE WHEN c.is_anonymous = 1 THEN 'Anonymous'
              ELSE CONCAT(u.first_name, ' ', u.last_name) END AS author_name,
         CONCAT(u.first_name, ' ', u.last_name) AS author_real_name,
         u.role AS author_role
    FROM announcement_comments c
    JOIN users u ON u.id = c.user_id`;

const comments = (announcementId) =>
  query(
    `${COMMENT_SELECT}
      WHERE c.announcement_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
    [announcementId]
  );

const addComment = async (announcementId, userId, body, isAnonymous = false) => {
  const rows = await query(
    'INSERT INTO announcement_comments (announcement_id, user_id, body, is_anonymous) VALUES (?, ?, ?, ?)',
    [announcementId, userId, body, isAnonymous ? 1 : 0]
  );
  return queryOne(`${COMMENT_SELECT} WHERE c.id = ?`, [rows.insertId]);
};

const deleteComment = (id) =>
  query('UPDATE announcement_comments SET deleted_at = NOW() WHERE id = ?', [id]);

const findComment = (id) => queryOne('SELECT * FROM announcement_comments WHERE id = ?', [id]);

module.exports = {
  feed, listAll, findById, create, update, softDelete, toggleLike, preview,
  comments, addComment, deleteComment, findComment,
};
