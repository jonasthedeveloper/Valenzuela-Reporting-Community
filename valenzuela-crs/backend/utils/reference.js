/** VCRS-YYYY-000123 */
const buildReferenceNo = (id, date = new Date()) =>
  `VCRS-${date.getFullYear()}-${String(id).padStart(6, '0')}`;

module.exports = { buildReferenceNo };
