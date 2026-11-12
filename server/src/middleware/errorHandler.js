const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars -- Express error handlers require 4 parameters
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
  if (statusCode >= 500 && statusCode !== 503) {
    // The id is what a user can quote from the client, so the log line carries it with the error.
    // The format argument stays a constant (user values never sit in Node's format position) and
    // JSON.stringify escapes newlines and control characters, so log entries can't be forged.
    console.error('[error]', JSON.stringify({
      time: new Date().toISOString(),
      level: 'error',
      requestId: req.id || null,
      method: req.method,
      path: req.path,
      status: statusCode,
    }), err);
  }
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong on our side' : err.message,
    ...(statusCode >= 500 && req.id ? { requestId: req.id } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
};

const notFound = (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFound, asyncHandler };
