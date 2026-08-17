/**
 * Runtime Context Utilities
 * 
 * Utility functions for working with runtime context throughout the application.
 * These helpers provide convenient methods for accessing and using runtime context
 * in controllers, services, and other modules.
 */

import { getRuntimeContext } from '../services/runtimeContext.js';

/**
 * Get current user from runtime context
 * @returns {Object|null} The current user
 */
export function getCurrentUser() {
  const context = getRuntimeContext();
  return context.getUser();
}

/**
 * Get current company from runtime context
 * @returns {Object|null} The current company
 */
export function getCurrentCompany() {
  const context = getRuntimeContext();
  return context.getCompany();
}

/**
 * Get current role from runtime context
 * @returns {string} The current role
 */
export function getCurrentRole() {
  const context = getRuntimeContext();
  return context.getRole();
}

/**
 * Get current permissions from runtime context
 * @returns {Array} Array of permissions
 */
export function getCurrentPermissions() {
  const context = getRuntimeContext();
  return context.getPermissions();
}

/**
 * Check if current user has a specific permission
 * @param {string} permission - The permission to check
 * @returns {boolean} Whether the user has the permission
 */
export function hasPermission(permission) {
  const context = getRuntimeContext();
  return context.hasPermission(permission);
}

/**
 * Get assigned feeders from runtime context
 * @returns {Array} Array of assigned feeders
 */
export function getAssignedFeeders() {
  const context = getRuntimeContext();
  return context.getAssignedFeeders();
}

/**
 * Get assigned feeder IDs from runtime context
 * @returns {Array} Array of feeder IDs
 */
export function getAssignedFeederIds() {
  const context = getRuntimeContext();
  return context.getAssignedFeederIds();
}

/**
 * Get current band from runtime context
 * @returns {string|null} The current band
 */
export function getCurrentBand() {
  const context = getRuntimeContext();
  return context.getBand();
}

/**
 * Get operational scope from runtime context
 * @returns {string} The operational scope
 */
export function getOperationalScope() {
  const context = getRuntimeContext();
  return context.getOperationalScope();
}

/**
 * Check if current user is platform owner
 * @returns {boolean} Whether user is platform owner
 */
export function isPlatformOwner() {
  const context = getRuntimeContext();
  return context.isPlatformOwnerUser();
}

/**
 * Check if current user is company super admin
 * @returns {boolean} Whether user is company super admin
 */
export function isCompanySuperAdmin() {
  const context = getRuntimeContext();
  return context.isCompanySuperAdminUser();
}

/**
 * Check if current user is regional admin
 * @returns {boolean} Whether user is regional admin
 */
export function isRegionalAdmin() {
  const context = getRuntimeContext();
  return context.isRegionalAdminUser();
}

/**
 * Check if current user is admin
 * @returns {boolean} Whether user is admin
 */
export function isAdmin() {
  const context = getRuntimeContext();
  return context.isAdminUser();
}

/**
 * Check if current user is regular user
 * @returns {boolean} Whether user is regular user
 */
export function isRegularUser() {
  const context = getRuntimeContext();
  return context.isRegularUser();
}

/**
 * Check if current user can access a specific feeder
 * @param {ObjectId|string} feederId - The feeder ID
 * @returns {boolean} Whether user can access the feeder
 */
export function canAccessFeeder(feederId) {
  const context = getRuntimeContext();
  return context.canAccessFeeder(feederId);
}

/**
 * Check if current user can access a specific company
 * @param {ObjectId|string} companyId - The company ID
 * @returns {boolean} Whether user can access the company
 */
export function canAccessCompany(companyId) {
  const context = getRuntimeContext();
  return context.canAccessCompany(companyId);
}

/**
 * Check if current user has higher or equal privilege than a role
 * @param {string} targetRole - The target role to compare
 * @returns {boolean} Whether user has higher or equal privilege
 */
export function hasHigherOrEqualPrivilege(targetRole) {
  const context = getRuntimeContext();
  return context.hasHigherOrEqualPrivilegeThan(targetRole);
}

/**
 * Get context summary for logging/debugging
 * @returns {Object} Context summary
 */
export function getContextSummary() {
  const context = getRuntimeContext();
  return context.getSummary();
}

/**
 * Build a query filter based on operational scope
 * This helps controllers automatically filter queries based on user's access level
 * @param {Object} baseFilter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @param {string} companyField - Field name for company (default: 'companyId')
 * @returns {Object} Filtered query object
 */
export function buildScopeFilter(baseFilter = {}, feederField = 'feeder', companyField = 'companyId') {
  const context = getRuntimeContext();
  const filter = { ...baseFilter };

  // Platform owners see all data
  if (context.isPlatformOwnerUser()) {
    return filter;
  }

  // Add company filter for non-platform owners
  const company = context.getCompany();
  if (company && !filter[companyField]) {
    filter[companyField] = company._id;
  }

  // Add feeder filter based on role
  const feederIds = context.getAssignedFeederIds();
  if (feederIds.length > 0 && !filter[feederField]) {
    filter[feederField] = { $in: feederIds };
  }

  return filter;
}

/**
 * Check if a user can perform an action on a resource
 * @param {string} action - The action to check (e.g., 'read', 'write', 'delete')
 * @param {string} resourceType - The type of resource (e.g., 'feeder', 'report')
 * @param {Object} resource - The resource object
 * @returns {boolean} Whether the user can perform the action
 */
export function canPerformAction(action, resourceType, resource = null) {
  const context = getRuntimeContext();

  // Platform owners can do anything
  if (context.isPlatformOwnerUser()) {
    return true;
  }

  // Check specific permissions
  const permission = `${resourceType}.${action}`;
  if (context.hasPermission(permission)) {
    return true;
  }

  // Check resource ownership if resource is provided
  if (resource) {
    const company = context.getCompany();
    if (company && resource.companyId) {
      return resource.companyId.toString() === company._id.toString();
    }
  }

  return false;
}

/**
 * Get accessible feeder IDs for the current user
 * Returns all feeder IDs for platform owners, assigned feeders for others
 * @returns {Array} Array of feeder IDs
 */
export function getAccessibleFeederIds() {
  const context = getRuntimeContext();

  // Platform owners can access all feeders (return empty to not filter)
  if (context.isPlatformOwnerUser()) {
    return [];
  }

  // Return assigned feeder IDs
  return context.getAssignedFeederIds();
}

/**
 * Get accessible company IDs for the current user
 * Returns all company IDs for platform owners, own company for others
 * @returns {Array} Array of company IDs
 */
export function getAccessibleCompanyIds() {
  const context = getRuntimeContext();

  // Platform owners can access all companies (return empty to not filter)
  if (context.isPlatformOwnerUser()) {
    return [];
  }

  // Return own company ID
  const company = context.getCompany();
  return company ? [company._id] : [];
}

/**
 * Log context information for debugging
 * @param {string} message - Optional message to include in log
 */
export function logContext(message = 'Runtime Context') {
  const summary = getContextSummary();
  console.log(`[${message}]`, JSON.stringify(summary, null, 2));
}

/**
 * Validate that a resource belongs to the current user's scope
 * @param {Object} resource - The resource to validate
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @param {string} companyField - Field name for company (default: 'companyId')
 * @returns {boolean} Whether the resource is accessible
 */
export function validateResourceAccess(resource, feederField = 'feeder', companyField = 'companyId') {
  const context = getRuntimeContext();

  // Platform owners can access any resource
  if (context.isPlatformOwnerUser()) {
    return true;
  }

  // Check company access
  const company = context.getCompany();
  if (company && resource[companyField]) {
    if (resource[companyField].toString() !== company._id.toString()) {
      return false;
    }
  }

  // Check feeder access
  const feederIds = context.getAssignedFeederIds();
  if (feederIds.length > 0 && resource[feederField]) {
    const resourceFeederId = resource[feederField]._id || resource[feederField];
    if (!feederIds.includes(resourceFeederId.toString())) {
      return false;
    }
  }

  return true;
}

/**
 * Get user-friendly role name
 * @returns {string} User-friendly role name
 */
export function getRoleDisplayName() {
  const context = getRuntimeContext();
  const roleInfo = context.getRoleInfo();
  return roleInfo?.name || context.getRole();
}

/**
 * Get user-friendly scope description
 * @returns {string} User-friendly scope description
 */
export function getScopeDescription() {
  const context = getRuntimeContext();
  const scope = context.getOperationalScope();

  const descriptions = {
    'global': 'All Companies',
    'company': 'Company-wide',
    'regional': 'Regional',
    'feeder': 'Feeder-level',
    'feeder_ward': 'Feeder + Ward',
    'none': 'No Access'
  };

  return descriptions[scope] || 'Unknown';
}

/**
 * Check if runtime context is initialized
 * @returns {boolean} Whether context is initialized
 */
export function isContextInitialized() {
  const context = getRuntimeContext();
  return context.getUser() !== null;
}

/**
 * Require runtime context to be initialized
 * Throws error if context is not initialized
 * @throws {Error} If context is not initialized
 */
export function requireContext() {
  if (!isContextInitialized()) {
    throw new Error('Runtime context not initialized. Ensure runtimeContextMiddleware is used.');
  }
}
