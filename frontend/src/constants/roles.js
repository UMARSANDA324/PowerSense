/**
 * Centralized Role Constants and Helpers for Nikola Enterprise
 */

export const ROLES = {
  PLATFORM_OWNER: "platform-owner",
  COMPANY_SUPER_ADMIN: "company-super-admin",
  REGIONAL_ADMIN: "regional-admin",
  SUPER_ADMIN: "super-admin", // Legacy super-admin
  ADMIN: "admin",             // Legacy admin / feeder admin
  USER: "user"                // Normal user
};

export const ROLE_DISPLAY_NAMES = {
  [ROLES.PLATFORM_OWNER]: "Platform Owner",
  [ROLES.COMPANY_SUPER_ADMIN]: "Company Super Admin",
  [ROLES.REGIONAL_ADMIN]: "Regional Admin",
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.USER]: "User"
};

/**
 * Checks if a given role is the Platform Owner.
 * @param {string} role 
 * @returns {boolean}
 */
export const isPlatformOwner = (role) => role === ROLES.PLATFORM_OWNER;

/**
 * Checks if a given role is a Super Admin (handles legacy and company-level).
 * @param {string} role 
 * @returns {boolean}
 */
export const isSuperAdmin = (role) => role === ROLES.SUPER_ADMIN || role === ROLES.COMPANY_SUPER_ADMIN;

/**
 * Checks if a given role is an Admin.
 * @param {string} role 
 * @returns {boolean}
 */
export const isAdmin = (role) => role === ROLES.ADMIN;

/**
 * Checks if a given role is a standard User.
 * @param {string} role 
 * @returns {boolean}
 */
export const isUser = (role) => role === ROLES.USER;

/**
 * Checks if a given role has staff/administrative privileges.
 * @param {string} role 
 * @returns {boolean}
 */
export const isStaff = (role) => {
  return [
    ROLES.PLATFORM_OWNER,
    ROLES.COMPANY_SUPER_ADMIN,
    ROLES.REGIONAL_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN
  ].includes(role);
};
