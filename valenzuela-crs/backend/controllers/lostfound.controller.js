const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const model = require('../models/lostfound.model');
const notify = require('../services/notification.service');
const { getPagination, meta } = require('../utils/pagination');
const { publicPath } = require('../middleware/upload');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 12);
  const { rows, total } = await model.list({
    type: req.query.type || 'all',
    status: req.query.status || 'all',
    search: req.query.search?.trim() || '',
    page, limit,
  });
  res.json({ success: true, data: rows, meta: meta(total, page, limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const item = await model.findById(req.params.id);
  if (!item) throw ApiError.notFound('That post no longer exists.');
  res.json({ success: true, data: item });
});

const create = asyncHandler(async (req, res) => {
  const item = await model.create({
    userId: req.user.id,
    type: req.body.type,
    title: req.body.title,
    description: req.body.description,
    itemDate: req.body.itemDate,
    location: req.body.location,
    contact: req.body.contact || req.user.phone,
    photoPath: req.file ? publicPath('lostfound', req.file.filename) : null,
  });
  res.status(201).json({ success: true, message: 'Item posted.', data: item });
});

const claim = asyncHandler(async (req, res) => {
  const item = await model.findById(req.params.id);
  if (!item) throw ApiError.notFound('That post no longer exists.');
  if (item.status === 'claimed') throw ApiError.conflict('This item is already claimed.');
  if (item.user_id === req.user.id) throw ApiError.badRequest('You posted this item.');

  const updated = await model.claim(item.id, req.user.id);
  await notify.notifyClaim(item, `${req.user.first_name} ${req.user.last_name}`);
  res.json({ success: true, message: 'Claim sent. The poster has been notified.', data: updated });
});

const remove = asyncHandler(async (req, res) => {
  const item = await model.findById(req.params.id);
  if (!item) throw ApiError.notFound('That post no longer exists.');
  if (item.user_id !== req.user.id && req.user.role !== 'admin') throw ApiError.forbidden();
  await model.softDelete(item.id);
  res.json({ success: true, message: 'Post removed.' });
});

module.exports = { list, getOne, create, claim, remove };
