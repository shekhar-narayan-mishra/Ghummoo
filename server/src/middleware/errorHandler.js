const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `That ${field} is already in use` });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image must be smaller than 5 MB' });
  }
  // Other upload errors (wrong field name, more than one file) are the client's mistake, not a 500.
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: 'Upload one image in the "image" field' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request is too large' });
  }
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500 && statusCode !== 503) console.error('[error]', err);
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong on our side' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
};

const notFound = (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFound, asyncHandler };
