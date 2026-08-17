/**
 * Enterprise Role Registry
 * 
 * Defines the complete role hierarchy for the LITHA platform.
 * This registry maintains the role hierarchy and provides role metadata.
 * 
 * Hierarchy:
 * Platform Owner
 *   ↓
 * Company Super Admin
 *   ↓
 * Regional Admin
 *   ↓
 * Operator/Admin
 *   ↓
 * User
 */

const ROLE_HIERARCHY = {
  PLATFORM_OWNER: 'platform-owner',
  COMPANY_SUPER_ADMIN: 'company-super-admin',
  REGIONAL_ADMIN: 'regional-admin',
  ADMIN: 'admin',
  USER: 'user'
};

/**
 * Role hierarchy levels (higher number = higher privilege)
 */
const ROLE_LEVELS = {
  [ROLE_HIERARCHY.PLATFORM_OWNER]: 100,
  [ROLE_HIERARCHY.COMPANY_SUPER_ADMIN]: 80,
  [ROLE_HIERARCHY.REGIONAL_ADMIN]: 60,
  [ROLE_HIERARCHY.ADMIN]: 40,
  [ROLE_HIERARCHY.USER]: 20
};

/**
 * Role metadata for display and validation
 */
const ROLE_METADATA = {
  [ROLE_HIERARCHY.PLATFORM_OWNER]: {
    name: 'Platform Owner',
    description: 'Platform-level role with full access to all companies and platform settings',
    level: 100,
    isPlatformRole: true,
    canManageCompanies: true,
    canAccessAllCompanies: true,
    canConfigurePlatform: true
  },
  [ROLE_HIERARCHY.COMPANY_SUPER_ADMIN]: {
    name: 'Company Super Admin',
    description: 'Highest administrative role within a specific distribution company',
    level: 80,
    isPlatformRole: false,
    canManageCompanies: false,
    canAccessAllCompanies: false,
    canConfigurePlatform: false
  },
  [ROLE_HIERARCHY.REGIONAL_ADMIN]: {
    name: 'Regional Admin',
    description: 'Administrative role for managing geographic regions within a company',
    level: 60,
    isPlatformRole: false,
    canManageCompanies: false,
    canAccessAllCompanies: false,
    canConfigurePlatform: false
  },
  [ROLE_HIERARCHY.ADMIN]: {
    name: 'Admin',
    description: 'Operational role with access to specific feeders and geographic areas',
    level: 40,
    isPlatformRole: false,
    canManageCompanies: false,
    canAccessAllCompanies: false,
    canConfigurePlatform: false
  },
  [ROLE_HIERARCHY.USER]: {
    name: 'User',
    description: 'End-user role for electricity customers',
    level: 20,
    isPlatformRole: false,
    canManageCompanies: false,
    canAccessAllCompanies: false,
    canConfigurePlatform: false
  }
};

/**
 * Legacy role mapping for backward compatibility
 * Maps old role names to new role names
 */
const LEGACY_ROLE_MAPPING = {
  'super-admin': ROLE_HIERARCHY.COMPANY_SUPER_ADMIN,
  'admin': ROLE_HIERARCHY.ADMIN,
  'user': ROLE_HIERARCHY.USER
};

/**
 * All valid roles (including legacy for backward compatibility)
 */
const VALID_ROLES = [
  ROLE_HIERARCHY.PLATFORM_OWNER,
  ROLE_HIERARCHY.COMPANY_SUPER_ADMIN,
  ROLE_HIERARCHY.REGIONAL_ADMIN,
  ROLE_HIERARCHY.ADMIN,
  ROLE_HIERARCHY.USER,
  // Legacy roles for backward compatibility
  'super-admin',
  'admin',
  'user'
];

/**
 * Check if a role is valid
 */
const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};

/**
 * Normalize role name (convert legacy to new)
 */
const normalizeRole = (role) => {
  if (LEGACY_ROLE_MAPPING[role]) {
    return LEGACY_ROLE_MAPPING[role];
  }
  return role;
};

/**
 * Get role level
 */
const getRoleLevel = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_LEVELS[normalizedRole] || 0;
};

/**
 * Check if role1 has higher or equal privilege than role2
 */
const hasHigherOrEqualPrivilege = (role1, role2) => {
  const level1 = getRoleLevel(role1);
  const level2 = getRoleLevel(role2);
  return level1 >= level2;
};

/**
 * Check if role1 has strictly higher privilege than role2
 */
const hasHigherPrivilege = (role1, role2) => {
  const level1 = getRoleLevel(role1);
  const level2 = getRoleLevel(role2);
  return level1 > level2;
};

/**
 * Get role metadata
 */
const getRoleMetadata = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_METADATA[normalizedRole] || null;
};

/**
 * Check if role is a platform-level role
 */
const isPlatformRole = (role) => {
  const metadata = getRoleMetadata(role);
  return metadata ? metadata.isPlatformRole : false;
};

/**
 * Get all roles in hierarchy order (highest to lowest)
 */
const getRolesInHierarchy = () => {
  return Object.values(ROLE_HIERARCHY).sort((a, b) => {
    return ROLE_LEVELS[b] - ROLE_LEVELS[a];
  });
};

/**
 * Get roles that can be managed by the given role
 * A role can manage roles with lower privilege level
 */
const getManageableRoles = (role) => {
  const roleLevel = getRoleLevel(role);
  return Object.values(ROLE_HIERARCHY).filter(r => ROLE_LEVELS[r] < roleLevel);
};

export {
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
};
