/**
 * Enterprise Permission Registry
 * 
 * Defines modular permissions for the LITHA platform.
 * Permissions are organized into functional groups for easier management.
 * 
 * Permission Groups:
 * - Power Control
 * - Reports
 * - Messaging
 * - AI Dashboard
 * - Infrastructure
 * - Users
 * - Notifications
 * - Analytics
 * - Company Management
 * - Platform Management
 */

const PERMISSION_GROUPS = {
  POWER_CONTROL: 'power_control',
  REPORTS: 'reports',
  MESSAGING: 'messaging',
  AI_DASHBOARD: 'ai_dashboard',
  INFRASTRUCTURE: 'infrastructure',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  COMPANY_MANAGEMENT: 'company_management',
  PLATFORM_MANAGEMENT: 'platform_management'
};

/**
 * Individual permissions
 */
const PERMISSIONS = {
  // Power Control Group
  POWER_VIEW: 'power.view',
  POWER_UPDATE: 'power.update',
  POWER_HISTORY: 'power.history',
  POWER_SCHEDULE: 'power.schedule',
  POWER_PREDICT: 'power.predict',
  POWER_ANALYTICS: 'power.analytics',

  // Reports Group
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_RESPOND: 'reports.respond',
  REPORTS_ASSIGN: 'reports.assign',
  REPORTS_ANALYTICS: 'reports.analytics',
  REPORTS_EXPORT: 'reports.export',

  // Messaging Group
  MESSAGING_VIEW: 'messaging.view',
  MESSAGING_CREATE: 'messaging.create',
  MESSAGING_BROADCAST: 'messaging.broadcast',
  MESSAGING_EMERGENCY: 'messaging.emergency',
  MESSAGING_TEMPLATES: 'messaging.templates',
  MESSAGING_ANALYTICS: 'messaging.analytics',

  // AI Dashboard Group
  AI_VIEW: 'ai.view',
  AI_PREDICTIONS: 'ai.predictions',
  AI_INSIGHTS: 'ai.insights',
  AI_CUSTOMIZE: 'ai.customize',
  AI_EXPORT: 'ai.export',

  // Infrastructure Group
  INFRASTRUCTURE_VIEW: 'infrastructure.view',
  INFRASTRUCTURE_CREATE: 'infrastructure.create',
  INFRASTRUCTURE_UPDATE: 'infrastructure.update',
  INFRASTRUCTURE_DELETE: 'infrastructure.delete',
  INFRASTRUCTURE_ASSIGN: 'infrastructure.assign',
  INFRASTRUCTURE_ANALYTICS: 'infrastructure.analytics',

  // Users Group
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_ASSIGN: 'users.assign',
  USERS_ACTIVATE: 'users.activate',
  USERS_ANALYTICS: 'users.analytics',

  // Notifications Group
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_CONFIGURE: 'notifications.configure',
  NOTIFICATIONS_SEND: 'notifications.send',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  NOTIFICATIONS_ANALYTICS: 'notifications.analytics',

  // Analytics Group
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_REPORTS: 'analytics.reports',
  ANALYTICS_EXPORT: 'analytics.export',
  ANALYTICS_CUSTOM: 'analytics.custom',
  ANALYTICS_PREDICTIVE: 'analytics.predictive',
  ANALYTICS_COMPANY: 'analytics.company',

  // Company Management Group
  COMPANY_VIEW: 'company.view',
  COMPANY_CONFIGURE: 'company.configure',
  COMPANY_BRANDING: 'company.branding',
  COMPANY_SUBSCRIPTION: 'company.subscription',
  COMPANY_INTEGRATIONS: 'company.integrations',
  COMPANY_ANALYTICS: 'company.analytics',

  // Platform Management Group
  PLATFORM_VIEW: 'platform.view',
  PLATFORM_CONFIGURE: 'platform.configure',
  PLATFORM_COMPANIES: 'platform.companies',
  PLATFORM_BILLING: 'platform.billing',
  PLATFORM_SECURITY: 'platform.security',
  PLATFORM_ANALYTICS: 'platform.analytics',
  PLATFORM_INTEGRATIONS: 'platform.integrations'
};

/**
 * Permission group definitions
 * Maps each group to its permissions
 */
const PERMISSION_GROUP_DEFINITIONS = {
  [PERMISSION_GROUPS.POWER_CONTROL]: [
    PERMISSIONS.POWER_VIEW,
    PERMISSIONS.POWER_UPDATE,
    PERMISSIONS.POWER_HISTORY,
    PERMISSIONS.POWER_SCHEDULE,
    PERMISSIONS.POWER_PREDICT,
    PERMISSIONS.POWER_ANALYTICS
  ],
  [PERMISSION_GROUPS.REPORTS]: [
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_RESPOND,
    PERMISSIONS.REPORTS_ASSIGN,
    PERMISSIONS.REPORTS_ANALYTICS,
    PERMISSIONS.REPORTS_EXPORT
  ],
  [PERMISSION_GROUPS.MESSAGING]: [
    PERMISSIONS.MESSAGING_VIEW,
    PERMISSIONS.MESSAGING_CREATE,
    PERMISSIONS.MESSAGING_BROADCAST,
    PERMISSIONS.MESSAGING_EMERGENCY,
    PERMISSIONS.MESSAGING_TEMPLATES,
    PERMISSIONS.MESSAGING_ANALYTICS
  ],
  [PERMISSION_GROUPS.AI_DASHBOARD]: [
    PERMISSIONS.AI_VIEW,
    PERMISSIONS.AI_PREDICTIONS,
    PERMISSIONS.AI_INSIGHTS,
    PERMISSIONS.AI_CUSTOMIZE,
    PERMISSIONS.AI_EXPORT
  ],
  [PERMISSION_GROUPS.INFRASTRUCTURE]: [
    PERMISSIONS.INFRASTRUCTURE_VIEW,
    PERMISSIONS.INFRASTRUCTURE_CREATE,
    PERMISSIONS.INFRASTRUCTURE_UPDATE,
    PERMISSIONS.INFRASTRUCTURE_DELETE,
    PERMISSIONS.INFRASTRUCTURE_ASSIGN,
    PERMISSIONS.INFRASTRUCTURE_ANALYTICS
  ],
  [PERMISSION_GROUPS.USERS]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ASSIGN,
    PERMISSIONS.USERS_ACTIVATE,
    PERMISSIONS.USERS_ANALYTICS
  ],
  [PERMISSION_GROUPS.NOTIFICATIONS]: [
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_CONFIGURE,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
    PERMISSIONS.NOTIFICATIONS_ANALYTICS
  ],
  [PERMISSION_GROUPS.ANALYTICS]: [
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_REPORTS,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.ANALYTICS_CUSTOM,
    PERMISSIONS.ANALYTICS_PREDICTIVE,
    PERMISSIONS.ANALYTICS_COMPANY
  ],
  [PERMISSION_GROUPS.COMPANY_MANAGEMENT]: [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_CONFIGURE,
    PERMISSIONS.COMPANY_BRANDING,
    PERMISSIONS.COMPANY_SUBSCRIPTION,
    PERMISSIONS.COMPANY_INTEGRATIONS,
    PERMISSIONS.COMPANY_ANALYTICS
  ],
  [PERMISSION_GROUPS.PLATFORM_MANAGEMENT]: [
    PERMISSIONS.PLATFORM_VIEW,
    PERMISSIONS.PLATFORM_CONFIGURE,
    PERMISSIONS.PLATFORM_COMPANIES,
    PERMISSIONS.PLATFORM_BILLING,
    PERMISSIONS.PLATFORM_SECURITY,
    PERMISSIONS.PLATFORM_ANALYTICS,
    PERMISSIONS.PLATFORM_INTEGRATIONS
  ]
};

/**
 * Role to permission groups mapping
 * Defines which permission groups each role has access to
 */
const ROLE_PERMISSION_GROUPS = {
  'platform-owner': [
    PERMISSION_GROUPS.POWER_CONTROL,
    PERMISSION_GROUPS.REPORTS,
    PERMISSION_GROUPS.MESSAGING,
    PERMISSION_GROUPS.AI_DASHBOARD,
    PERMISSION_GROUPS.INFRASTRUCTURE,
    PERMISSION_GROUPS.USERS,
    PERMISSION_GROUPS.NOTIFICATIONS,
    PERMISSION_GROUPS.ANALYTICS,
    PERMISSION_GROUPS.COMPANY_MANAGEMENT,
    PERMISSION_GROUPS.PLATFORM_MANAGEMENT
  ],
  'company-super-admin': [
    PERMISSION_GROUPS.POWER_CONTROL,
    PERMISSION_GROUPS.REPORTS,
    PERMISSION_GROUPS.MESSAGING,
    PERMISSION_GROUPS.AI_DASHBOARD,
    PERMISSION_GROUPS.INFRASTRUCTURE,
    PERMISSION_GROUPS.USERS,
    PERMISSION_GROUPS.NOTIFICATIONS,
    PERMISSION_GROUPS.ANALYTICS,
    PERMISSION_GROUPS.COMPANY_MANAGEMENT
  ],
  'regional-admin': [
    PERMISSION_GROUPS.POWER_CONTROL,
    PERMISSION_GROUPS.REPORTS,
    PERMISSION_GROUPS.MESSAGING,
    PERMISSION_GROUPS.AI_DASHBOARD,
    PERMISSION_GROUPS.INFRASTRUCTURE,
    PERMISSION_GROUPS.USERS,
    PERMISSION_GROUPS.NOTIFICATIONS,
    PERMISSION_GROUPS.ANALYTICS
  ],
  'admin': [
    PERMISSION_GROUPS.POWER_CONTROL,
    PERMISSION_GROUPS.REPORTS,
    PERMISSION_GROUPS.MESSAGING,
    PERMISSION_GROUPS.AI_DASHBOARD,
    PERMISSION_GROUPS.ANALYTICS
  ],
  'user': [
    PERMISSION_GROUPS.POWER_CONTROL,
    PERMISSION_GROUPS.REPORTS,
    PERMISSION_GROUPS.NOTIFICATIONS
  ]
};

/**
 * Legacy role mapping for backward compatibility
 */
const LEGACY_ROLE_PERMISSION_GROUPS = {
  'super-admin': ROLE_PERMISSION_GROUPS['company-super-admin'],
  'admin': ROLE_PERMISSION_GROUPS['admin'],
  'user': ROLE_PERMISSION_GROUPS['user']
};

/**
 * Get all permissions for a role
 */
const getRolePermissions = (role) => {
  const permissionGroups = ROLE_PERMISSION_GROUPS[role] || LEGACY_ROLE_PERMISSION_GROUPS[role] || [];
  const permissions = new Set();
  
  permissionGroups.forEach(group => {
    const groupPermissions = PERMISSION_GROUP_DEFINITIONS[group] || [];
    groupPermissions.forEach(permission => {
      permissions.add(permission);
    });
  });
  
  return Array.from(permissions);
};

/**
 * Check if a role has a specific permission
 */
const roleHasPermission = (role, permission) => {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
};

/**
 * Get all permissions in a group
 */
const getGroupPermissions = (group) => {
  return PERMISSION_GROUP_DEFINITIONS[group] || [];
};

/**
 * Check if a permission is valid
 */
const isValidPermission = (permission) => {
  return Object.values(PERMISSIONS).includes(permission);
};

/**
 * Check if a permission group is valid
 */
const isValidPermissionGroup = (group) => {
  return Object.values(PERMISSION_GROUPS).includes(group);
};

/**
 * Get all available permissions
 */
const getAllPermissions = () => {
  return Object.values(PERMISSIONS);
};

/**
 * Get all available permission groups
 */
const getAllPermissionGroups = () => {
  return Object.values(PERMISSION_GROUPS);
};

export {
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
