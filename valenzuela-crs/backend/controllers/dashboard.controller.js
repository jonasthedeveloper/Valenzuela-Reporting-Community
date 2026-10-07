const asyncHandler = require('../utils/asyncHandler');
const statsModel = require('../models/stats.model');
const reportModel = require('../models/report.model');
const announcementModel = require('../models/announcement.model');

const num = (value) => Number(value || 0);

const residentDashboard = asyncHandler(async (req, res) => {
  const [stats, reports, feed] = await Promise.all([
    statsModel.residentStats(req.user.id),
    reportModel.list({ userId: req.user.id }, { page: 1, limit: 5 }),
    announcementModel.feed({ viewerId: req.user.id, barangay: req.user.barangay, page: 1, limit: 3 }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        total: num(stats.total),
        pending: num(stats.pending),
        ongoing: num(stats.ongoing),
        resolved: num(stats.resolved),
      },
      recentReports: reports.rows,
      announcements: feed.rows,
    },
  });
});

const adminDashboard = asyncHandler(async (_req, res) => {
  const [stats, monthly, daily, categories, recent] = await Promise.all([
    statsModel.adminStats(),
    statsModel.monthlyVolume(6),
    statsModel.dailyVolume(14),
    statsModel.categoryBreakdown(),
    reportModel.list({}, { page: 1, limit: 6 }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        total: num(stats.total),
        pending: num(stats.pending),
        assigned: num(stats.assigned),
        resolved: num(stats.resolved),
        criticalOpen: num(stats.critical_open),
        avgResolutionHours: stats.avg_resolution_hours === null ? null : Number(stats.avg_resolution_hours),
        activeUsers: num(stats.active_users),
        activeResidents: num(stats.active_residents),
        staffCount: num(stats.staff_count),
      },
      monthly: monthly.map((m) => ({ label: m.label, total: num(m.total), resolved: num(m.resolved) })),
      daily: daily.map((d) => ({
        day: new Date(d.day).toISOString().slice(0, 10),
        total: num(d.total),
      })),
      categories: categories.map((c) => ({ name: c.name, total: num(c.total) })),
      recentReports: recent.rows,
    },
  });
});

const staffDashboard = asyncHandler(async (req, res) => {
  const [stats, queue] = await Promise.all([
    statsModel.staffStats(req.user.id),
    reportModel.list({ assignedTo: req.user.id, status: 'ongoing' }, { page: 1, limit: 5, sort: 'priority' }),
  ]);

  const completed = num(stats.completed);
  const total = num(stats.total);
  res.json({
    success: true,
    data: {
      stats: {
        total,
        toStart: num(stats.to_start),
        inProgress: num(stats.in_progress),
        completed,
        avgHours: stats.avg_hours === null ? null : Number(stats.avg_hours),
        performanceScore: total ? Math.round((completed / total) * 100) : 0,
      },
      queue: queue.rows,
    },
  });
});

module.exports = { residentDashboard, adminDashboard, staffDashboard };
