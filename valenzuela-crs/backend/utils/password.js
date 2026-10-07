const bcrypt = require('bcryptjs');

const ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

/** At least 8 chars, one letter and one number. */
const isStrongPassword = (value) =>
  typeof value === 'string' && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

module.exports = { hashPassword, verifyPassword, isStrongPassword };
