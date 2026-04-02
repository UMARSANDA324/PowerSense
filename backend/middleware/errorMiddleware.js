
/**
 * Custom error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Determine status code (default to 500 if it's 200 somehow)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Log error for developers
    console.error(`[Error] ${req.method} ${req.url}:`, err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        message: err.message,
        // Stack trace only in development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

/**
 * Handle 404 - Not Found
 */
const notFound = (req, res, next) => {
    console.warn(`[NotFound] ${req.method} ${req.url}`);
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export { errorHandler, notFound };
