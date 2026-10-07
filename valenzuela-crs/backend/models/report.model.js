const { query, queryOne, transaction } = require('../config/db');
const { buildReferenceNo } = require('../utils/reference');

const BASE_SELECT = `
  SELECT r.id, r.reference_no, r.title, r.description, r.address, r.barangay, r.priority,
         r.status, r.is_anonymous, r.resolution_note, r.assigned_at, r.resolved_at,
         r.closed_at, r.created_at, r.updated_at, r.user_id, r.assigned_to,
         c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
         CONCAT(u.first_name, ' ', u.last_name) AS reporter_name,
         u.email AS reporter_email, u.phone AS reporter_phone,
         CASE WHEN s.id IS NULL THEN NULL
              ELSE CONCAT(s.first_name, ' ', s.last_name) END AS staff_name,
         s.position AS staff_position,
         (SELECT COUNT(*) FROM report_media m WHERE m.report_id = r.id) AS media_count
    FROM reports r
    JOIN report_categories c ON c.id = r.category_id
    JOIN users u ON u.id = r.user_id
    LEFT JOIN users s ON s.id = r.assigned_to`;

const SORTABLE = {
  created_at: 'r.created_at',
  priority: `FIELD(r.priority,'low','medium','high','critical')`,
  status: `FIELD(r.status,'pending','verified','assigned','in_progress','resolved','closed')`,
  category: 'c.name',
  reference_no: 'r.reference_no',
};

/** Hides the reporter's identity on anonymous reports for non-staff viewers. */
const maskAnonymous = (row, viewerRole) => {
  if (!row) return row;
  if (row.is_anonymous && viewerRole === 'resident') {
    return { ...row, reporter_name: 'Anonymous resident', reporter_email: null, reporter_phone: null };
  }
  return row;
};

const buildFilters = (filters = {}) => {
  const where = ['r.deleted_at IS NULL'];
  const params = [];

  if (filters.userId) { where.push('r.user_id = ?'); params.push(filters.userId); }
  if (filters.assignedTo) { where.push('r.assigned_to = ?'); params.push(filters.assignedTo); }
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'ongoing') where.push(`r.status IN ('verified','assigned','in_progress')`);
    else { where.push('r.status = ?'); params.push(filters.status); }
  }
  if (filters.priority && filters.priority !== 'all') { where.push('r.priority = ?'); params.push(filters.priority); }
  if (filters.categoryId) { where.push('r.category_id = ?'); params.push(filters.categoryId); }
  if (filters.barangay && filters.barangay !== 'all') { where.push('r.barangay = ?'); params.push(filters.barangay); }
  if (filters.search) {
    where.push(`(r.reference_no LIKE ? OR r.title LIKE ? OR r.address LIKE ?
                 OR CONCAT(u.first_name,' ',u.last_name) LIKE ?)`);
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }
  if (filters.dateFrom) { where.push('r.created_at >= ?'); params.push(`${filters.dateFrom} 00:00:00`); }
  if (filters.dateTo) { where.push('r.created_at <= ?'); params.push(`${filters.dateTo} 23:59:59`); }

  return { clause: `WHERE ${where.join(' AND ')}`, params };
};

const list = async (filters = {}, { page = 1, limit = 10, sort = 'created_at', dir = 'desc' } = {}) => {
  const { clause, params } = buildFilters(filters);
  const orderBy = SORTABLE[sort] || SORTABLE.created_at;
  const direction = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(limit);

  const rows = await query(
    `${BASE_SELECT} ${clause} ORDER BY ${orderBy} ${direction}, r.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM reports r JOIN users u ON u.id = r.user_id ${clause}`,
    params
  );
  return { rows, total };
};

const listAll = async (filters = {}) => {
  const { clause, params } = buildFilters(filters);
  return query(`${BASE_SELECT} ${clause} ORDER BY r.created_at DESC`, params);
};

const findById = (id) => queryOne(`${BASE_SELECT} WHERE r.id = ? AND r.deleted_at IS NULL`, [id]);

const findLatestForUser = (userId) =>
  queryOne(
    `${BASE_SELECT} WHERE r.user_id = ? AND r.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT 1`,
    [userId]
  );

const findByReference = (reference) =>
  queryOne(`${BASE_SELECT} WHERE r.reference_no = ? AND r.deleted_at IS NULL`, [reference]);

const getMedia = (reportId) =>
  query(
    `SELECT id, file_path, file_name, media_type, kind, mime_type, file_size, created_at
       FROM report_media WHERE report_id = ? ORDER BY kind, id`,
    [reportId]
  );

const getTimeline = (reportId) =>
  query(
    `SELECT t.id, t.status, t.note, t.created_at,
            CASE WHEN a.id IS NULL THEN NULL ELSE CONCAT(a.first_name,' ',a.last_name) END AS actor_name,
            a.role AS actor_role
       FROM report_timeline t
       LEFT JOIN users a ON a.id = t.actor_id
      WHERE t.report_id = ? ORDER BY t.created_at ASC, t.id ASC`,
    [reportId]
  );

const create = ({ userId, categoryId, title, description, address, barangay, priority, isAnonymous, media }) =>
  transaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO reports (reference_no, user_id, category_id, title, description, address,
                            barangay, priority, status, is_anonymous)
       VALUES ('PENDING', ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [userId, categoryId, title, description, address, barangay, priority, isAnonymous ? 1 : 0]
    );
    const id = result.insertId;
    const reference = buildReferenceNo(id);
    await conn.execute('UPDATE reports SET reference_no = ? WHERE id = ?', [reference, id]);

    for (const file of media) {
      await conn.execute(
        `INSERT INTO report_media (report_id, file_path, file_name, mime_type, file_size, media_type, kind, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, 'evidence', ?)`,
        [id, file.path, file.name, file.mime, file.size, file.type, userId]
      );
    }

    await conn.execute(
      `INSERT INTO report_timeline (report_id, status, note, actor_id)
       VALUES (?, 'pending', 'Report submitted.', ?)`,
      [id, userId]
    );
    return id;
  });

const addTimelineEntry = (reportId, status, note, actorId) =>
  query('INSERT INTO report_timeline (report_id, status, note, actor_id) VALUES (?, ?, ?, ?)', [
    reportId, status, note ? note.slice(0, 500) : null, actorId || null,
  ]);

const updateStatus = async (id, status, { note, actorId, resolutionNote } = {}) => {
  const sets = ['status = ?'];
  const params = [status];

  if (status === 'resolved') sets.push('resolved_at = NOW()');
  if (status === 'closed') sets.push('closed_at = NOW()');
  if (resolutionNote !== undefined) { sets.push('resolution_note = ?'); params.push(resolutionNote); }

  params.push(id);
  await query(`UPDATE reports SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
  await addTimelineEntry(id, status, note, actorId);
  return findById(id);
};

const assign = async (id, staffId, actorId, note) => {
  await query(
    `UPDATE reports SET assigned_to = ?, assigned_at = NOW(),
            status = CASE WHEN status IN ('pending','verified') THEN 'assigned' ELSE status END
      WHERE id = ? AND deleted_at IS NULL`,
    [staffId, id]
  );
  const report = await findById(id);
  await addTimelineEntry(id, report.status, note || `Assigned to ${report.staff_name}.`, actorId);
  return report;
};

const addMedia = (reportId, files, kind, uploadedBy) => {
  const tasks = files.map((file) =>
    query(
      `INSERT INTO report_media (report_id, file_path, file_name, mime_type, file_size, media_type, kind, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportId, file.path, file.name, file.mime, file.size, file.type, kind, uploadedBy]
    )
  );
  return Promise.all(tasks);
};

const softDelete = (id) => query('UPDATE reports SET deleted_at = NOW() WHERE id = ?', [id]);

const categories = () =>
  query('SELECT id, name, slug, icon FROM report_categories WHERE is_active = 1 ORDER BY sort_order');

module.exports = {
  list, listAll, findById, findByReference, findLatestForUser, getMedia, getTimeline,
  create, updateStatus, assign, addMedia, addTimelineEntry, softDelete, categories, maskAnonymous,
};
