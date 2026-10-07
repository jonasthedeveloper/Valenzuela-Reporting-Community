/** Normalises ?page & ?limit into safe integers (limit capped at 100). */
const getPagination = (query, defaultLimit = 10) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
};

const meta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { getPagination, meta };
