const { query, queryOne } = require('../config/db');

const create = ({ userId, type = 'general', title, body, link = null }) =>
  query('INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)', [
    userId, type, title.slice(0, 160), body.slice(0, 500), link,
  ]);

const listForUser = async (userId, { filter = 'all', page = 1, limit = 15 }) => {
  const where = ['user_id = ?'];
  const params = [userId];
  if (filter === 'unread') where.push('is_read = 0');
  const clause = `WHERE ${where.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);

  const rows = await query(
    `SELECT * FROM notifications ${clause} ORDER BY created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM notifications ${clause}`, params);
  return { rows, total };
};

const unreadCount = async (userId) => {
  const row = await queryOne(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]
  );
  return Number(row.count);
};

const markRead = (id, userId) =>
  query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);

const markAllRead = (userId) =>
  query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);

module.exports = { create, listForUser, unreadCount, markRead, markAllRead };
