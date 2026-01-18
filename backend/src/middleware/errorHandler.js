import logger from './logger.js';

/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        refId: req.params?.refId || req.body?.ref_id
    });

    // Determine status code
    let statusCode = 500;

    if (err.message.includes('not found')) {
        statusCode = 404;
    } else if (err.message.includes('Invalid') ||
        err.message.includes('required') ||
        err.message.includes('must be')) {
        statusCode = 400;
    } else if (err.message.includes('Cannot cancel') ||
        err.message.includes('Invalid state transition')) {
        statusCode = 409; // Conflict
    } else if (err.message.includes('Concurrent update')) {
        statusCode = 409; // Conflict
    }

    res.status(statusCode).json({
        success: false,
        error: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
}
