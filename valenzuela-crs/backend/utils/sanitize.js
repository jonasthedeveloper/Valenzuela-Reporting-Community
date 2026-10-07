const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Strips angle brackets from user supplied strings.
 *
 * The frontend renders every string through React, which escapes on output —
 * so escaping quotes/ampersands here would only make text display as
 * "it&#39;s". Angle brackets are removed server-side as defence in depth
 * (no stored string can ever be parsed as HTML markup).
 */
const escapeHtml = (value) =>
  typeof value === 'string' ? value.replace(/[<>]/g, (c) => MAP[c]) : value;

/** Recursively escapes every string in req.body. */
const sanitizeBody = (req, _res, next) => {
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      Object.keys(node).forEach((key) => { node[key] = walk(node[key]); });
      return node;
    }
    return typeof node === 'string' ? escapeHtml(node.trim()) : node;
  };
  if (req.body && typeof req.body === 'object') walk(req.body);
  next();
};

module.exports = { escapeHtml, sanitizeBody };
