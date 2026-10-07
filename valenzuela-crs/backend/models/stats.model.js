const { query, queryOne } = require('../config/db');

const residentStats = async (userId) =>
  queryOne(
    `SELECT COUNT(*) AS total,
            SUM(status = 'pending') AS pending,
            SUM(status IN ('verified','assigned','in_progress')) AS ongoing,
            SUM(status IN ('resolved','closed')) AS resolved
       FROM reports WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );

const adminStats = async () => {
  const counts = await queryOne(
    `SELECT COUNT(*) AS total,
            SUM(status = 'pending') AS pending,
            SUM(status IN ('assigned','in_progress')) AS assigned,
            SUM(status IN ('resolved','closed')) AS resolved,
            SUM(priority = 'critical' AND status NOT IN ('resolved','closed')) AS critical_open,
            ROUND(AVG(CASE WHEN resolved_at IS NOT NULL
                 THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) END), 1) AS avg_resolution_hours
       FROM reports WHERE deleted_at IS NULL`
  );
  const users = await queryOne(
    `SELECT SUM(role = 'resident' AND is_active = 1) AS active_residents,
            SUM(role = 'staff' AND is_active = 1) AS staff_count,
            SUM(is_active = 1) AS active_users
       FROM users WHERE deleted_at IS NULL`
  );
  return { ...counts, ...users };
};

const staffStats = async (staffId) =>
  queryOne(
    `SELECT COUNT(*) AS total,
            SUM(status IN ('assigned','verified')) AS to_start,
            SUM(status = 'in_progress') AS in_progress,
            SUM(status IN ('resolved','closed')) AS completed,
            ROUND(AVG(CASE WHEN resolved_at IS NOT NULL
                 THEN TIMESTAMPDIFF(HOUR, assigned_at, resolved_at) END), 1) AS avg_hours
       FROM reports WHERE assigned_to = ? AND deleted_at IS NULL`,
    [staffId]
  );

/** Report counts per month for the last N months. */
const monthlyVolume = (months = 6) =>
  query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS period,
            DATE_FORMAT(created_at, '%b') AS label,
            COUNT(*) AS total,
            SUM(status IN ('resolved','closed')) AS resolved
       FROM reports
      WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${Number(months)} MONTH)
      GROUP BY period, label ORDER BY period ASC`
  );

/** Daily volume for the last N days — trend chart. */
const dailyVolume = (days = 14) =>
  query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS total
       FROM reports
      WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${Number(days)} DAY)
      GROUP BY day ORDER BY day ASC`
  );

const categoryBreakdown = () =>
  query(
    `SELECT c.name, COUNT(r.id) AS total
       FROM report_categories c
       LEFT JOIN reports r ON r.category_id = c.id AND r.deleted_at IS NULL
      GROUP BY c.id, c.name HAVING total > 0 ORDER BY total DESC LIMIT 8`
  );

module.exports = { residentStats, adminStats, staffStats, monthlyVolume, dailyVolume, categoryBreakdown };
