
// Basic protect middleware
export const protect = (req, res, next) => {
    // Example: check if user is authenticated
    if (req.user) {
        return next();
    }
    return res.status(401).json({ message: 'Authentication required' });
};

// Basic admin middleware
export const admin = (req, res, next) => {
    // Example: check if user has admin role
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Admin access required' });
};
