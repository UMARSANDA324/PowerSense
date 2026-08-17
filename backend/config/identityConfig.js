/**
 * Enterprise Identity Configuration
 * 
 * Central configuration for the Enterprise Identity & Role Management system.
 * This file consolidates role and permission configurations and provides
 * a unified interface for identity-related operations.
 */

import { 
  ROLE_HIERARCHY, 
  ROLE_LEVELS, 
  ROLE_METADATA,
  LEGACY_ROLE_MAPPING,
  VALID_ROLES,
  isValidRole,
  normalizeRole,
  getRoleLevel,
  hasHigherOrEqualPrivilege,
  hasHigherPrivilege,
  getRoleMetadata,
  isPlatformRole,
  getRolesInHierarchy,
  getManageableRoles
} from './roleRegistry.js';

import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  PERMISSION_GROUP_DEFINITIONS,
  ROLE_PERMISSION_GROUPS,
  LEGACY_ROLE_PERMISSION_GROUPS,
  getRolePermissions,
  roleHasPermission,
  getGroupPermissions,
  isValidPermission,
  isValidPermissionGroup,
  getAllPermissions,
  getAllPermissionGroups
} from './permissionRegistry.js';

/**
 * Identity configuration object
 */
const IDENTITY_CONFIG = {
  // Role configuration
  roles: {
    hierarchy: ROLE_HIERARCHY,
    levels: ROLE_LEVELS,
    metadata: ROLE_METADATA,
    legacyMapping: LEGACY_ROLE_MAPPING,
    validRoles: VALID_ROLES
  },
  
  // Permission configuration
  permissions: {
    groups: PERMISSION_GROUPS,
    definitions: PERMISSION_GROUP_DEFINITIONS,
    roleGroups: ROLE_PERMISSION_GROUPS,
    legacyRoleGroups: LEGACY_ROLE_PERMISSION_GROUPS
  },
  
  // Feature flags for identity system
  features: {
    enablePlatformOwner: true,
    enableCompanySuperAdmin: true,
    enableRegionalAdmin: true,
    enablePermissionChecks: true,
    enableRoleHierarchy: true,
    enableLegacySupport: true
  }
};

/**
 * Get complete identity configuration
 */
const getIdentityConfig = () => {
  return IDENTITY_CONFIG;
};

/**
 * Check if a role can perform an action based on permission
 */
const canPerformAction = (role, permission) => {
  if (!IDENTITY_CONFIG.features.enablePermissionChecks) {
    // If permission checks are disabled, allow all authenticated users
    return true;
  }
  return roleHasPermission(role, permission);
};

/**
 * Check if a role can manage another role
 */
const canManageRole = (managerRole, targetRole) => {
  if (!IDENTITY_CONFIG.features.enableRoleHierarchy) {
    return false;
  }
  return hasHigherPrivilege(managerRole, targetRole);
};

/**
 * Get all permissions for a role (with legacy support)
 */
const getPermissionsForRole = (role) => {
  return getRolePermissions(role);
};

/**
 * Validate role assignment
 * Checks if a role can be assigned to a user based on the assigner's role
 */
const validateRoleAssignment = (assignerRole, targetRole) => {
  if (!isValidRole(targetRole)) {
    return {
      valid: false,
      reason: 'Invalid role'
    };
  }
  
  if (!canManageRole(assignerRole, targetRole)) {
    return {
      valid: false,
      reason: 'Insufficient privilege to assign this role'
    };
  }
  
  return {
    valid: true,
    reason: null
  };
};

/**
 * Get role display information
 */
const getRoleDisplayInfo = (role) => {
  const metadata = getRoleMetadata(role);
  const normalizedRole = normalizeRole(role);
  
  return {
    role: normalizedRole,
    originalRole: role,
    name: metadata?.name || role,
    description: metadata?.description || '',
    level: getRoleLevel(role),
    isPlatformRole: isPlatformRole(role),
    isLegacy: LEGACY_ROLE_MAPPING[role] !== undefined
  };
};

/**
 * Get permission display information
 */
const getPermissionDisplayInfo = (permission) => {
  if (!isValidPermission(permission)) {
    return null;
  }
  
  const [group, action] = permission.split('.');
  
  return {
    permission,
    group,
    action,
    groupName: group.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    actionName: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  };
};

/**
 * Check if legacy role support is enabled
 */
const isLegacySupportEnabled = () => {
  return IDENTITY_CONFIG.features.enableLegacySupport;
};

/**
 * Get backward compatible role enum for database schema
 * This includes both new and legacy roles for smooth migration
 */
const getBackwardCompatibleRoleEnum = () => {
  return [
    ...Object.values(ROLE_HIERARCHY),
    ...Object.keys(LEGACY_ROLE_MAPPING)
  ];
};

/**
 * Migrate legacy role to new role
 */
const migrateRole = (legacyRole) => {
  if (!isLegacySupportEnabled()) {
    return legacyRole;
  }
  return normalizeRole(legacyRole);
};

export {
  IDENTITY_CONFIG,
  getIdentityConfig,
  canPerformAction,
  canManageRole,
  getPermissionsForRole,
  validateRoleAssignment,
  getRoleDisplayInfo,
  getPermissionDisplayInfo,
  isLegacySupportEnabled,
  getBackwardCompatibleRoleEnum,
  migrateRole,
  
  // Re-export role registry functions
  ROLE_HIERARCHY,
  ROLE_LEVELS,
  ROLE_METADATA,
  LEGACY_ROLE_MAPPING,
  VALID_ROLES,
  isValidRole,
  normalizeRole,
  getRoleLevel,
  hasHigherOrEqualPrivilege,
  hasHigherPrivilege,
  getRoleMetadata,
  isPlatformRole,
  getRolesInHierarchy,
  getManageableRoles,
  
  // Re-export permission registry functions
  PERMISSION_GROUPS,
  PERMISSIONS,
  PERMISSION_GROUP_DEFINITIONS,
  ROLE_PERMISSION_GROUPS,
  LEGACY_ROLE_PERMISSION_GROUPS,
  getRolePermissions,
  roleHasPermission,
  getGroupPermissions,
  isValidPermission,
  isValidPermissionGroup,
  getAllPermissions,
  getAllPermissionGroups
};
