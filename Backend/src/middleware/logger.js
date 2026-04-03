/**
 * Request Logger Middleware
 * Logs all incoming requests
 */

/**
 * Request logger
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    
    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? '⚠️' : '✅';
        console.log(`${logLevel} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
};

module.exports = {
    requestLogger
};

