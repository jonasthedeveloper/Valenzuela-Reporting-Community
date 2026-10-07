const { query, queryOne } = require('../config/db');

const PUBLIC_FIELDS = `id, first_name, last_name, email, phone, role, barangay, address,
  position, is_active, two_factor_enabled, token_version, last_login_at, created_at`;

const findById = (id) =>
  queryOne(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ? AND deleted_at IS NULL`, [id]);

const findByEmail = (email) =>
  queryOne(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE email = ? AND deleted_at IS NULL`,
    [email]
  );

const findWithPassword = (id) =>
  queryOne(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

const emailExists = async (email) => {
  const row = await queryOne('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
  return Boolean(row);
};

const create = async (data) => {
  const rows = await query(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, barangay, address, position, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      data.firstName, data.lastName, data.email, data.phone || null, data.passwordHash,
      data.role || 'resident', data.barangay, data.address || null, data.position || null,
    ]
  );
  return findById(rows.insertId);
};

const updateProfile = async (id, { firstName, lastName, phone, address }) => {
  await query(
    `UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ? WHERE id = ? AND deleted_at IS NULL`,
    [firstName, lastName, phone || null, address || null, id]
  );
  return findById(id);
};

const updatePassword = (id, passwordHash) =>
  query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

const setActive = async (id, isActive) => {
  await query('UPDATE users SET is_active = ? WHERE id = ? AND deleted_at IS NULL', [isActive ? 1 : 0, id]);
  return findById(id);
};

const setTwoFactor = async (id, enabled) => {
  await query('UPDATE users SET two_factor_enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  return findById(id);
};

const bumpTokenVersion = (id) =>
  query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [id]);

const touchLogin = (id) => query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);

const listByRole = async (role, { search = '', status = 'all', page = 1, limit = 10 }) => {
  const where = ['deleted_at IS NULL', 'role = ?'];
  const params = [role];

  if (search) {
    where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (status === 'active') where.push('is_active = 1');
  if (status === 'inactive') where.push('is_active = 0');

  const clause = `WHERE ${where.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);

  const rows = await query(
    `SELECT ${PUBLIC_FIELDS},
            (SELECT COUNT(*) FROM reports r WHERE r.user_id = users.id AND r.deleted_at IS NULL) AS report_count
       FROM users ${clause}
      ORDER BY created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM users ${clause}`, params);
  return { rows, total };
};

const listStaffWithStats = async ({ search = '' } = {}) => {
  const params = [];
  let clause = `WHERE u.deleted_at IS NULL AND u.role = 'staff'`;
  if (search) {
    clause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.position LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  return query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.barangay, u.position,
            u.is_active, u.created_at,
            COALESCE(SUM(CASE WHEN r.status IN ('assigned','in_progress') THEN 1 ELSE 0 END), 0) AS active_cases,
            COALESCE(SUM(CASE WHEN r.status IN ('resolved','closed') THEN 1 ELSE 0 END), 0) AS completed_cases,
            COUNT(r.id) AS total_cases,
            ROUND(AVG(CASE WHEN r.resolved_at IS NOT NULL
                           THEN TIMESTAMPDIFF(HOUR, r.assigned_at, r.resolved_at) END), 1) AS avg_hours
       FROM users u
       LEFT JOIN reports r ON r.assigned_to = u.id AND r.deleted_at IS NULL
       ${clause}
      GROUP BY u.id
      ORDER BY completed_cases DESC, u.first_name ASC`,
    params
  );
};

const activeStaff = () =>
  query(
    `SELECT id, first_name, last_name, position, barangay,
            (SELECT COUNT(*) FROM reports r WHERE r.assigned_to = users.id
              AND r.status IN ('assigned','in_progress') AND r.deleted_at IS NULL) AS active_cases
       FROM users
      WHERE role = 'staff' AND is_active = 1 AND deleted_at IS NULL
      ORDER BY first_name`
  );

module.exports = {
  findById, findByEmail, findWithPassword, emailExists, create, updateProfile, updatePassword,
  setActive, setTwoFactor, bumpTokenVersion, touchLogin, listByRole, listStaffWithStats, activeStaff,
};
