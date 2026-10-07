const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/** Turns express-validator errors into a field -> message object. */
const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = {};
  result.array().forEach((err) => {
    const field = err.path || err.param;
    if (!details[field]) details[field] = err.msg;
  });
  return next(ApiError.badRequest('Please correct the highlighted fields.', details));
};

module.exports = validate;
