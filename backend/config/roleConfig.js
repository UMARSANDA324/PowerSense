/**
 * Enterprise Role Configuration
 * Defines the complete role hierarchy and role registry for Litha Enterprise
 */

/**
 * Role Hierarchy (from highest to lowest authority)
 * Platform Owner > Company Super Admin > Regional Admin > Admin > User
 */
export const ROLE_HIERARCHY = {
    PLATFORM_OWNER: 5,
    COMPANY_SUPER_ADMIN: 4,
    REGIONAL_ADMIN: 3,
    ADMIN: 2,
    USER: 1
};

/**
 * Role Registry - All supported roles in the system
 */
export const ROLES = {
    // Enterprise Roles
    PLATFORM_OWNER: "platform-owner",
    COMPANY_SUPER_ADMIN: "company-super-admin",
    REGIONAL_ADMIN: "regional-admin",
    
    // Current Roles (maintained for backward compatibility)
    SUPER_ADMIN: "super-admin",
    ADMIN: "admin",
    USER: "user"
};

/**
 * Role Display Names
 */
export const ROLE_DISPLAY_NAMES = {
    [ROLES.PLATFORM_OWNER]: "Platform Owner",
    [ROLES.COMPANY_SUPER_ADMIN]: "Company Super Admin",
    [ROLES.REGIONAL_ADMIN]: "Regional Admin",
    [ROLES.SUPER_ADMIN]: "Super Admin",
    [ROLES.ADMIN]: "Admin",
    [ROLES.USER]: "User"
};

/**
 * Role Descriptions
 */
export const ROLE_DESCRIPTIONS = {
    [ROLES.PLATFORM_OWNER]: "Platform-level administrator with full access to all companies and system configuration",
    [ROLES.COMPANY_SUPER_ADMIN]: "Company-level administrator with full access to their assigned company",
    [ROLES.REGIONAL_ADMIN]: "Regional administrator managing specific geographic regions within a company",
    [ROLES.SUPER_ADMIN]: "Legacy super administrator role (maintained for backward compatibility)",
    [ROLES.ADMIN]: "Administrator managing feeders and operations within assigned scope",
    [ROLES.USER]: "Standard user with limited access to view and report power status"
};

/**
 * Role Capabilities - What each role can do
 */
export const ROLE_CAPABILITIES = {
    [ROLES.PLATFORM_OWNER]: {
        canManageCompanies: true,
        canCreateCompanies: true,
        canSuspendCompanies: true,
        canDeleteCompanies: true,
        canAssignCompanySuperAdmins: true,
        canViewGlobalAnalytics: true,
        canConfigureEnterpriseSettings: true,
        canManageAllUsers: true,
        canViewAllData: true
    },
    [ROLES.COMPANY_SUPER_ADMIN]: {
        canManageCompany: true,
        canManageCompanyUsers: true,
        canManageCompanyAdmins: true,
        canManageCompanyFeeders: true,
        canManageCompanyInfrastructure: true,
        canViewCompanyAnalytics: true,
        canConfigureCompanySettings: true,
        canAssignRegionalAdmins: true,
        canViewCompanyData: true
    },
    [ROLES.REGIONAL_ADMIN]: {
        canManageRegion: true,
        canManageRegionalUsers: true,
        canManageRegionalFeeders: true,
        canViewRegionalAnalytics: true,
        canAssignRegionalAdmins: false,
        canViewRegionalData: true
    },
    [ROLES.SUPER_ADMIN]: {
        canManageAllUsers: true,
        canManageAllFeeders: true,
        canViewAllData: true,
        canManageInfrastructure: true,
        canViewAnalytics: true
    },
    [ROLES.ADMIN]: {
        canManageAssignedFeeders: true,
        canViewAssignedFeeders: true,
        canManageReports: true,
        canViewAnalytics: true,
        canManageUsers: false
    },
    [ROLES.USER]: {
        canViewFeeders: true,
        canReportOutages: true,
        canViewStatus: true,
        canManageFeeders: false
    }
};

/**
 * Role Scope - Geographic/organizational scope for each role
 */
export const ROLE_SCOPE = {
    [ROLES.PLATFORM_OWNER]: "global",
    [ROLES.COMPANY_SUPER_ADMIN]: "company",
    [ROLES.REGIONAL_ADMIN]: "region",
    [ROLES.SUPER_ADMIN]: "global",
    [ROLES.ADMIN]: "feeder",
    [ROLES.USER]: "feeder"
};

/**
 * Backward Compatibility Mapping
 * Maps legacy roles to new enterprise roles
 */
export const LEGACY_ROLE_MAPPING = {
    [ROLES.SUPER_ADMIN]: ROLES.COMPANY_SUPER_ADMIN, // Will be migrated in future
    [ROLES.ADMIN]: ROLES.ADMIN, // Remains the same
    [ROLES.USER]: ROLES.USER // Remains the same
};

/**
 * Valid Role Transitions
 * Defines which roles can be promoted/demoted to which other roles
 */
export const VALID_ROLE_TRANSITIONS = {
    [ROLES.PLATFORM_OWNER]: [ROLES.COMPANY_SUPER_ADMIN, ROLES.REGIONAL_ADMIN, ROLES.ADMIN, ROLES.USER],
    [ROLES.COMPANY_SUPER_ADMIN]: [ROLES.REGIONAL_ADMIN, ROLES.ADMIN, ROLES.USER],
    [ROLES.REGIONAL_ADMIN]: [ROLES.ADMIN, ROLES.USER],
    [ROLES.ADMIN]: [ROLES.USER],
    [ROLES.USER]: [],
    [ROLES.SUPER_ADMIN]: [ROLES.COMPANY_SUPER_ADMIN, ROLES.REGIONAL_ADMIN, ROLES.ADMIN, ROLES.USER]
};

/**
 * Role Validation Rules
 */
export const ROLE_VALIDATION_RULES = {
    minLength: 3,
    maxLength: 50,
    allowedCharacters: /^[a-z0-9-]+$/,
    mustBeLowercase: true
};

/**
 * Check if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
    return Object.values(ROLES).includes(role);
};

/**
 * Check if a role has higher authority than another role
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean}
 */
export const hasHigherAuthority = (role1, role2) => {
    const level1 = ROLE_HIERARCHY[role1.toUpperCase().replace(/-/g, '_')] || 0;
    const level2 = ROLE_HIERARCHY[role2.toUpperCase().replace(/-/g, '_')] || 0;
    return level1 > level2;
};

/**
 * Check if a role can perform a specific action
 * @param {string} role - Role to check
 * @param {string} capability - Capability to check
 * @returns {boolean}
 */
export const roleHasCapability = (role, capability) => {
    const capabilities = ROLE_CAPABILITIES[role];
    return capabilities ? capabilities[capability] === true : false;
};

/**
 * Get all roles that can be assigned by a given role
 * @param {string} role - Role that wants to assign
 * @returns {Array<string>} - List of assignable roles
 */
export const getAssignableRoles = (role) => {
    return VALID_ROLE_TRANSITIONS[role] || [];
};

/**
 * Get role display name
 * @param {string} role - Role code
 * @returns {string} - Display name
 */
export const getRoleDisplayName = (role) => {
    return ROLE_DISPLAY_NAMES[role] || role;
};
