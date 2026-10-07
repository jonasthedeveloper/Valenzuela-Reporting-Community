const asyncHandler = require('../utils/asyncHandler');
const model = require('../models/notification.model');
const { getPagination, meta } = require('../utils/pagination');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 15);
  const { rows, total } = await model.listForUser(req.user.id, {
    filter: req.query.filter || 'all', page, limit,
  });
  const unread = await model.unreadCount(req.user.id);
  res.json({ success: true, data: rows, meta: { ...meta(total, page, limit), unread } });
});

const unreadCount = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { unread: await model.unreadCount(req.user.id) } });
});

const markRead = asyncHandler(async (req, res) => {
  await model.markRead(req.params.id, req.user.id);
  res.json({ success: true, data: { unread: await model.unreadCount(req.user.id) } });
});

const markAllRead = asyncHandler(async (req, res) => {
  await model.markAllRead(req.user.id);
  res.json({ success: true, message: 'All notifications marked as read.', data: { unread: 0 } });
});

module.exports = { list, unreadCount, markRead, markAllRead };
