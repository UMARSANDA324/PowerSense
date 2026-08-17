
/**
 * Custom error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Catch malformed JSON body errors from body-parser
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(`[Error] Malformed JSON payload on ${req.method} ${req.url}:`, err.message);
        return res.status(400).json({
            success: false,
            message: "Malformed JSON payload in request body",
            error: err.message
        });
    }

    // Catch Mongoose CastError (e.g. invalid ObjectId format)
    if (err.name === 'CastError') {
        console.error(`[Error] CastError on ${req.method} ${req.url}:`, err.message);
        return res.status(400).json({
            success: false,
            message: `Invalid identifier format for field '${err.path}'`,
            error: err.message
        });
    }

    // Determine status code (default to 500 if it's 200 somehow)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Log error for developers
    console.error(`[Error] ${req.method} ${req.url}:`, err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
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
