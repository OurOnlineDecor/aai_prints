/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Express 5 Compatible NoSQL Injection Sanitizer
 * Mutates objects in-place to strip MongoDB operator keys ($ / .)
 * ─────────────────────────────────────────────────────────────
 */

function sanitizeInPlace(obj) {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeInPlace(obj[key]);
    }
  }
}

const mongoSanitizer = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') sanitizeInPlace(req.body);
    if (req.params && typeof req.params === 'object') sanitizeInPlace(req.params);
    if (req.query && typeof req.query === 'object') sanitizeInPlace(req.query);
  } catch (err) {
    console.warn('[Sanitize Error]:', err.message);
  }
  next();
};

module.exports = mongoSanitizer;
