const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { putObject, deleteObject } = require('../services/storage.service');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

// Same name scheme for both drivers: "<timestamp>-<random>.<ext>".
const safeFilename = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ''}`;
};

const makeDiskStorage = (folder) => multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', folder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    cb(null, safeFilename(file));
  },
});

/**
 * Cloud mode (STORAGE_DRIVER=s3): keep the stream in memory — multer still
 * enforces the size/type limits with the same friendly errors — then push the
 * bytes to the bucket. `req.file.filename` is unchanged, so controllers keep
 * building the same publicPath("/uploads/…") values and no database row or
 * frontend call has to change.
 */
const makeCloudStorage = (folder) => ({
  _handleFile(_req, file, cb) {
    const chunks = [];
    file.stream.on('error', cb);
    file.stream.on('data', (chunk) => chunks.push(chunk));
    file.stream.on('end', () => {
      if (file.stream.truncated) return cb(Object.assign(new Error('File too large'), { code: 'LIMIT_FILE_SIZE' }));
      const buffer = Buffer.concat(chunks);
      const filename = safeFilename(file);
      putObject(`${folder}/${filename}`, buffer, file.mimetype)
        .then(() => cb(null, { filename, size: buffer.length, mimetype: file.mimetype }))
        .catch(cb);
    });
  },
  _removeFile(_req, file, cb) {
    // Rollback when another file in the same request failed — never fail the
    // response over cleanup (matches local mode, which also leaves nothing behind).
    deleteObject(`${folder}/${file.filename}`).then(() => cb(null), () => cb(null));
  },
});

const storageFor = (folder) => (env.storage.driver === 's3' ? makeCloudStorage(folder) : makeDiskStorage(folder));

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
    storage: storageFor(folder),
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
    return next(ApiError.badRequest(`That image is too large. Please choose one under ${env.upload.maxImageMb} MB.`));
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
