/**
 * Enterprise Identity Validation Middleware
 * 
 * Provides permission-based access control using the Enterprise Identity system.
 * This middleware works alongside the existing role middleware and provides
 * granular permission checks while maintaining backward compatibility.
 */

import { 
  canPerformAction, 
  canManageRole,
  validateRoleAssignment,
  getPermissionsForRole,
  getRoleDisplayInfo,
  normalizeRole,
  hasHigherOrEqualPrivilege
} from '../config/identityConfig.js';

/**
 * Check if user has specific permission
 * Usage: router.get('/api/resource', requirePermission('power.update'), controller)
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    
    if (canPerformAction(userRole, permission)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Permission '${permission}' required`,
      code: 'PERMISSION_DENIED',
      required: permission,
      userRole: userRole
    });
  };
};

/**
 * Check if user has any of the specified permissions
 * Usage: router.get('/api/resource', requireAnyPermission(['power.view', 'power.update']), controller)
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const hasPermission = permissions.some(permission => 
      canPerformAction(userRole, permission)
    );

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({ 
      message: `One of the following permissions required: ${permissions.join(', ')}`,
      code: 'PERMISSION_DENIED',
      required: permissions,
      userRole: userRole
    });
  };
};

/**
 * Check if user has all of the specified permissions
 * Usage: router.get('/api/resource', requireAllPermissions(['power.view', 'power.update']), controller)
 */
export const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const hasAllPermissions = permissions.every(permission => 
      canPerformAction(userRole, permission)
    );

    if (hasAllPermissions) {
      return next();
    }

    return res.status(403).json({ 
      message: `All of the following permissions required: ${permissions.join(', ')}`,
      code: 'PERMISSION_DENIED',
      required: permissions,
      userRole: userRole
    });
  };
};

/**
 * Check if user can manage a target role
 * Usage: router.put('/api/users/:id/role', canManageRole('target-role-param'), controller)
 */
export const canManageRoleMiddleware = (targetRoleParam = 'targetRole') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const managerRole = req.user.role;
    const targetRole = req.body[targetRoleParam] || req.params[targetRoleParam];

    if (!targetRole) {
      return res.status(400).json({ 
        message: 'Target role not specified',
        code: 'MISSING_TARGET_ROLE'
      });
    }

    if (canManageRole(managerRole, targetRole)) {
      // Attach normalized target role to request for use in controller
      req.targetRole = normalizeRole(targetRole);
      return next();
    }

    return res.status(403).json({ 
      message: `Insufficient privilege to manage role '${targetRole}'`,
      code: 'INSUFFICIENT_PRIVILEGE',
      managerRole: managerRole,
      targetRole: targetRole
    });
  };
};

/**
 * Validate role assignment
 * Usage: router.post('/api/users/:id/role', validateRoleAssignmentMiddleware, controller)
 */
export const validateRoleAssignmentMiddleware = (targetRoleParam = 'role') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const assignerRole = req.user.role;
    const targetRole = req.body[targetRoleParam] || req.params[targetRoleParam];

    if (!targetRole) {
      return res.status(400).json({ 
        message: 'Target role not specified',
        code: 'MISSING_TARGET_ROLE'
      });
    }

    const validation = validateRoleAssignment(assignerRole, targetRole);

    if (validation.valid) {
      // Attach normalized target role to request for use in controller
      req.targetRole = normalizeRole(targetRole);
      return next();
    }

    return res.status(403).json({ 
      message: validation.reason,
      code: 'ROLE_ASSIGNMENT_INVALID',
      assignerRole: assignerRole,
      targetRole: targetRole
    });
  };
};

/**
 * Check if user has minimum role level
 * Usage: router.get('/api/resource', requireMinimumRole('admin'), controller)
 */
export const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;

    if (hasHigherOrEqualPrivilege(userRole, minimumRole)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Role '${minimumRole}' or higher required`,
      code: 'INSUFFICIENT_ROLE_LEVEL',
      required: minimumRole,
      userRole: userRole
    });
  };
};

/**
 * Attach user permissions to request object
 * Usage: router.use(attachUserPermissions)
 */
export const attachUserPermissions = (req, res, next) => {
  if (req.user) {
    const userRole = req.user.role;
    req.userPermissions = getPermissionsForRole(userRole);
    req.roleInfo = getRoleDisplayInfo(userRole);
  }
  next();
};

/**
 * Check if user has platform-level access
 * Usage: router.get('/api/platform/*', requirePlatformAccess, controller)
 */
export const requirePlatformAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = normalizeRole(req.user.role);

  if (userRole === 'platform-owner') {
    return next();
  }

  return res.status(403).json({ 
    message: 'Platform-level access required',
    code: 'PLATFORM_ACCESS_REQUIRED',
    userRole: req.user.role
  });
};

/**
 * Check if user has company-level access
 * Usage: router.get('/api/company/*', requireCompanyAccess, controller)
 */
export const requireCompanyAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = normalizeRole(req.user.role);
  const platformRoles = ['platform-owner'];
  const companyRoles = ['company-super-admin', 'regional-admin', 'admin'];

  if (platformRoles.includes(userRole) || companyRoles.includes(userRole)) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Company-level access required',
    code: 'COMPANY_ACCESS_REQUIRED',
    userRole: req.user.role
  });
};

/**
 * Backward compatibility wrapper for existing authorize middleware
 * This allows gradual migration from role-based to permission-based access control
 */
export const authorizeWithPermissions = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const normalizedUserRole = normalizeRole(userRole);

    if (normalizedUserRole === 'platform-owner') {
      return next();
    }

    const normalizedRoles = roles.map(role => normalizeRole(role));

    if (normalizedRoles.includes(normalizedUserRole)) {
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

/**
 * Enhanced role middleware that includes permission information
 * This is a drop-in replacement for the existing authorize middleware
 */
export const authorizeEnhanced = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const normalizedUserRole = normalizeRole(userRole);

    if (normalizedUserRole === 'platform-owner') {
      req.roleInfo = getRoleDisplayInfo(userRole);
      req.userPermissions = getPermissionsForRole(userRole);
      return next();
    }

    const normalizedRoles = roles.map(role => normalizeRole(role));

    if (normalizedRoles.includes(normalizedUserRole)) {
      // Attach role information for use in controllers
      req.roleInfo = getRoleDisplayInfo(userRole);
      req.userPermissions = getPermissionsForRole(userRole);
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
