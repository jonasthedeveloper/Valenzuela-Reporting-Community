const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const makeStorage = (folder) => multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', folder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ''}`;
    cb(null, safe);
  },
});

const fileFilter = (allowVideo) => (_req, file, cb) => {
  const allowed = allowVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES;
  if (!allowed.includes(file.mimetype)) {
    return cb(ApiError.badRequest(
      allowVideo
        ? 'Only JPG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos can be uploaded.'
        : 'Only JPG, PNG, WEBP and GIF images can be uploaded.'
    ));
  }
  return cb(null, true);
};

const createUploader = (folder, { allowVideo = false } = {}) =>
  multer({
    storage: makeStorage(folder),
    fileFilter: fileFilter(allowVideo),
    limits: {
      files: env.upload.maxFiles,
      fileSize: (allowVideo ? env.upload.maxVideoMb : env.upload.maxImageMb) * 1024 * 1024,
    },
  });

const reportUpload = createUploader('reports', { allowVideo: true });
const resolutionUpload = createUploader('resolutions');
const lostFoundUpload = createUploader('lostfound');
const announcementUpload = createUploader('announcements');
const communityUpload = createUploader('community');

const mediaTypeOf = (mime) => (VIDEO_TYPES.includes(mime) ? 'video' : 'image');
const publicPath = (folder, filename) => `/uploads/${folder}/${filename}`;

/**
 * Multer wraps every limit/validation failure in a plain Error, which would
 * surface as a 500. Turn the ones we recognise into friendly 400s.
 */
const uploadErrorHandler = (err, _req, _res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return next(ApiError.badRequest('That image is too large. Please choose one under 8 MB.'));
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return next(ApiError.badRequest('You can upload one image per post.'));
  }
  if (err.name === 'MulterError') {
    return next(ApiError.badRequest('The image could not be uploaded. Please try again.'));
  }
  return next(err);
};

module.exports = {
  reportUpload,
  resolutionUpload,
  lostFoundUpload,
  announcementUpload,
  communityUpload,
  uploadErrorHandler,
  mediaTypeOf,
  publicPath,
};
