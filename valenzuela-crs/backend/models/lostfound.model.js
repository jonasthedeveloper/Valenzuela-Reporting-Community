const { query, queryOne } = require('../config/db');

const SELECT = `
  SELECT i.id, i.type, i.title, i.description, i.item_date, i.location, i.photo_path,
         i.contact, i.status, i.claimed_at, i.created_at, i.user_id,
         CONCAT(u.first_name, ' ', u.last_name) AS poster_name, u.barangay AS poster_barangay,
         u.phone AS poster_phone, u.email AS poster_email,
         CASE WHEN cl.id IS NULL THEN NULL ELSE CONCAT(cl.first_name,' ',cl.last_name) END AS claimer_name
    FROM lost_found_items i
    JOIN users u ON u.id = i.user_id
    LEFT JOIN users cl ON cl.id = i.claimed_by`;

const list = async ({ type = 'all', status = 'all', search = '', page = 1, limit = 12 }) => {
  const where = ['i.deleted_at IS NULL'];
  const params = [];
  if (type !== 'all') { where.push('i.type = ?'); params.push(type); }
  if (status !== 'all') { where.push('i.status = ?'); params.push(status); }
  if (search) {
    where.push('(i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);
  const rows = await query(
    `${SELECT} ${clause} ORDER BY i.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM lost_found_items i ${clause}`, params
  );
  return { rows, total };
};

const findById = (id) => queryOne(`${SELECT} WHERE i.id = ? AND i.deleted_at IS NULL`, [id]);

const create = async (data) => {
  const rows = await query(
    `INSERT INTO lost_found_items (user_id, type, title, description, item_date, location, photo_path, contact)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.userId, data.type, data.title, data.description, data.itemDate, data.location,
      data.photoPath || null, data.contact || null]
  );
  return findById(rows.insertId);
};

const claim = async (id, userId) => {
  await query(
    `UPDATE lost_found_items SET status = 'claimed', claimed_by = ?, claimed_at = NOW()
      WHERE id = ? AND status = 'open' AND deleted_at IS NULL`,
    [userId, id]
  );
  return findById(id);
};

const softDelete = (id) => query('UPDATE lost_found_items SET deleted_at = NOW() WHERE id = ?', [id]);

module.exports = { list, findById, create, claim, softDelete };
