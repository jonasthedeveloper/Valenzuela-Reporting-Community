const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const model = require('../models/announcement.model');
const notify = require('../services/notification.service');
const { getPagination, meta } = require('../utils/pagination');
const { publicPath } = require('../middleware/upload');
const { publicIdentity, publicIdentityList } = require('../utils/identity');

/** Multipart fields arrive as strings — normalise to a real boolean. */
const toBool = (value) => value === true || value === 'true' || value === '1' || value === 1;

/** Public: latest published announcements for the welcome page (no auth). */
const preview = asyncHandler(async (req, res) => {
  const rows = await model.preview(4);
  res.json({ success: true, data: rows });
});

const feed = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 10);
  const { rows, total } = await model.feed({
    viewerId: req.user.id,
    barangay: req.user.role === 'resident' ? req.user.barangay : null,
    type: req.query.type || 'all',
    page, limit,
  });
  // Public feed: strip the real author name (is_anonymous only affects display).
  const data = rows.map(({ author_real_name: _real, ...rest }) => rest);
  res.json({ success: true, data, meta: meta(total, page, limit) });
});

const listAll = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 10);
  const { rows, total } = await model.listAll({
    status: req.query.status || 'all',
    search: req.query.search?.trim() || '',
    page, limit,
  });
  res.json({ success: true, data: rows, meta: meta(total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const announcement = await model.create({
    ...req.body,
    authorId: req.user.id,
    isAnonymous: toBool(req.body.isAnonymous),
    imagePath: req.file ? publicPath('announcements', req.file.filename) : null,
  });
  res.status(201).json({
    success: true,
    message: req.body.status === 'published' ? 'Announcement published.' : 'Announcement saved.',
    data: announcement,
  });
});

const update = asyncHandler(async (req, res) => {
  const existing = await model.findById(req.params.id);
  if (!existing) throw ApiError.notFound('That announcement no longer exists.');

  // Keep the current image unless a new file arrived or removal was requested.
  let imagePath = existing.image_path;
  if (req.file) imagePath = publicPath('announcements', req.file.filename);
  else if (toBool(req.body.removeImage)) imagePath = null;

  const announcement = await model.update(req.params.id, {
    ...req.body,
    isAnonymous: toBool(req.body.isAnonymous),
    imagePath,
  });
  res.json({ success: true, message: 'Announcement updated.', data: announcement });
});

const remove = asyncHandler(async (req, res) => {
  const existing = await model.findById(req.params.id);
  if (!existing) throw ApiError.notFound('That announcement no longer exists.');
  await model.softDelete(req.params.id);
  res.json({ success: true, message: 'Announcement deleted.' });
});

const toggleLike = asyncHandler(async (req, res) => {
  const existing = await model.findById(req.params.id);
  if (!existing) throw ApiError.notFound('That announcement no longer exists.');
  const result = await model.toggleLike(req.params.id, req.user.id);
  res.json({ success: true, data: result });
});

const listComments = asyncHandler(async (req, res) => {
  const rows = await model.comments(req.params.id);
  res.json({ success: true, data: publicIdentityList(rows, req.user) });
});

const addComment = asyncHandler(async (req, res) => {
  const announcement = await model.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('That announcement no longer exists.');

  const isAnonymous = toBool(req.body.isAnonymous);
  const comment = await model.addComment(req.params.id, req.user.id, req.body.body, isAnonymous);
  await notify.notifyComment(
    { ...announcement, author_id: announcement.author_id },
    isAnonymous ? 'Anonymous' : `${req.user.first_name} ${req.user.last_name}`
  );
  res.status(201).json({ success: true, message: 'Comment posted.', data: publicIdentity(comment, req.user) });
});

const deleteComment = asyncHandler(async (req, res) => {
  const comment = await model.findComment(req.params.commentId);
  if (!comment || comment.deleted_at) throw ApiError.notFound('That comment no longer exists.');
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') throw ApiError.forbidden();
  await model.deleteComment(comment.id);
  res.json({ success: true, message: 'Comment deleted.' });
});

module.exports = {
  preview, feed, listAll, create, update, remove, toggleLike, listComments, addComment, deleteComment,
};
