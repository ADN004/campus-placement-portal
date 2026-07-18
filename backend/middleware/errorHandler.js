// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('❌ Error:', err);

  // PostgreSQL duplicate key error
  if (err.code === '23505') {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    const message = 'Referenced record does not exist';
    error = { message, statusCode: 400 };
  }

  // PostgreSQL validation error
  if (err.code === '23514') {
    const message = 'Invalid field value';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Fall back to the original error's status before defaulting to 500.
  //
  // `error` above is a spread copy, and spreading only copies own *enumerable*
  // properties. Libraries built on http-errors (body-parser among them) define
  // status/statusCode as non-enumerable, so the copy silently loses them and
  // every such error was reported as 500 — telling the client the server broke
  // when the request was simply too large, malformed, or unsupported.
  //
  // The branches above still win, since they set error.statusCode explicitly.
  const statusCode = error.statusCode || err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// Not found middleware
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
