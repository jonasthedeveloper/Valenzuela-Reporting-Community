const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const notFound = (req, _res, next) =>
  next(ApiError.notFound(`No API route matches ${req.method} ${req.originalUrl}`));

/* eslint-disable no-unused-vars */
const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong on our end.';
  let details = err.details || null;

  if (err instanceof multer.MulterError) {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'That file is too large. Images up to 8 MB, videos up to 40 MB.';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files. Upload up to 6 per report.';
    else message = 'That upload could not be accepted.';
  }

  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'That record already exists.';
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    message = 'A referenced record does not exist.';
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    status = 503;
    message = 'The database is not reachable. Start MySQL in XAMPP and try again.';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(env.isProd ? {} : { stack: status >= 500 ? err.stack : undefined }),
  });
};

module.exports = { notFound, errorHandler };
