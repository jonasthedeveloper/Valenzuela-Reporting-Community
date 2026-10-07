const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const model = require('../models/community.model');
const notify = require('../services/notification.service');
const { getPagination, meta } = require('../utils/pagination');
const { publicPath } = require('../middleware/upload');
const { publicIdentity, publicIdentityList } = require('../utils/identity');

/** Multipart fields arrive as strings — normalise to a real boolean. */
const toBool = (value) => value === true || value === 'true' || value === '1' || value === 1;

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 10);
  const { rows, total } = await model.listPosts({
    viewerId: req.user.id,
    category: req.query.category || 'all',
    page, limit,
  });
  res.json({ success: true, data: publicIdentityList(rows, req.user), meta: meta(total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const post = await model.create({
    userId: req.user.id, // backend decides identity — never the client
    body: req.body.body,
    category: req.body.category || 'general',
    isAnonymous: toBool(req.body.isAnonymous),
    imagePath: req.file ? publicPath('community', req.file.filename) : null,
  });
  res.status(201).json({
    success: true,
    message: 'Post shared with the community.',
    data: publicIdentity(post, req.user),
  });
});

const remove = asyncHandler(async (req, res) => {
  const post = await model.findById(req.params.id);
  if (!post) throw ApiError.notFound('That post no longer exists.');
  if (post.user_id !== req.user.id && req.user.role !== 'admin') throw ApiError.forbidden();
  await model.softDelete(post.id);
  res.json({ success: true, message: 'Post removed.' });
});

const like = asyncHandler(async (req, res) => {
  const post = await model.findById(req.params.id);
  if (!post) throw ApiError.notFound('That post no longer exists.');
  const result = await model.toggleLike(post.id, req.user.id);
  res.json({ success: true, data: result });
});

const listComments = asyncHandler(async (req, res) => {
  const post = await model.findById(req.params.id);
  if (!post) throw ApiError.notFound('That post no longer exists.');
  res.json({ success: true, data: publicIdentityList(await model.comments(post.id), req.user) });
});

const addComment = asyncHandler(async (req, res) => {
  const post = await model.findById(req.params.id);
  if (!post) throw ApiError.notFound('That post no longer exists.');

  const isAnonymous = toBool(req.body.isAnonymous);
  const comment = await model.addComment({
    postId: post.id,
    userId: req.user.id,
    body: req.body.body,
    isAnonymous,
  });

  if (post.user_id !== req.user.id) {
    await notify.notifyCommunityComment(
      post,
      isAnonymous ? 'Anonymous' : `${req.user.first_name} ${req.user.last_name}`
    );
  }
  res.status(201).json({ success: true, message: 'Comment posted.', data: publicIdentity(comment, req.user) });
});

const addReply = asyncHandler(async (req, res) => {
  const parent = await model.findComment(req.params.id);
  if (!parent || parent.deleted_at) throw ApiError.notFound('That comment no longer exists.');

  const post = await model.findById(parent.post_id);
  if (!post) throw ApiError.notFound('That post no longer exists.');

  const isAnonymous = toBool(req.body.isAnonymous);
  // Replying to a reply still nests under the top-level comment (one level).
  const parentId = parent.parent_id || parent.id;
  const reply = await model.addComment({
    postId: post.id,
    userId: req.user.id,
    body: req.body.body,
    isAnonymous,
    parentId,
  });

  if (parent.user_id !== req.user.id) {
    await notify.notifyCommunityComment(
      post,
      isAnonymous ? 'Anonymous' : `${req.user.first_name} ${req.user.last_name}`
    );
  }
  res.status(201).json({ success: true, message: 'Reply posted.', data: publicIdentity(reply, req.user) });
});

const removeComment = asyncHandler(async (req, res) => {
  const comment = await model.findComment(req.params.id);
  if (!comment || comment.deleted_at) throw ApiError.notFound('That comment no longer exists.');
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') throw ApiError.forbidden();
  await model.deleteComment(comment.id);
  res.json({ success: true, message: 'Comment deleted.' });
});

module.exports = {
  list, create, remove, like, listComments, addComment, addReply, removeComment,
};
