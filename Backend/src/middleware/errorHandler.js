/**
 * Error Handler Middleware
 * Centralized error handling for the API
 */

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error response
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific error types
    if (err.code === 'ER_DUP_ENTRY') {
        status = 409;
        message = 'Duplicate entry - resource already exists';
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        status = 400;
        message = 'Referenced resource does not exist';
    }

    if (err.name === 'ValidationError') {
        status = 400;
        message = err.message;
    }

    if (err.name === 'JsonWebTokenError') {
        status = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Token expired';
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
        message = 'Internal Server Error';
    }

    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};

