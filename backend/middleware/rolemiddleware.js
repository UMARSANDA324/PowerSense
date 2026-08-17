import { normalizeRole, hasHigherOrEqualPrivilege } from "../config/identityConfig.js";

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const normalizedUserRole = normalizeRole(userRole);

    // Platform Owner holds top-level global authority and bypasses individual route role lists
    if (normalizedUserRole === "platform-owner") {
      return next();
    }

    const normalizedRoles = roles.map(role => normalizeRole(role));

    // Check if user's normalized role is in the allowed normalized roles
    if (normalizedRoles.includes(normalizedUserRole)) {
      return next();
    }

    // Also check legacy role for backward compatibility
    if (roles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: `User role ${userRole} is not authorized to access this route`,
      code: 'ROLE_NOT_AUTHORIZED',
      userRole: userRole,
      requiredRoles: roles
    });
  };
};
