/**
 * Scope Utilities
 * 
 * Utility functions for working with operational scope throughout the application.
 * These helpers provide convenient methods for accessing and using operational scope
 * in controllers, services, and other modules.
 */

import { getOperationalScope } from '../services/operationalScope.js';
import { 
  validateFeederOperation,
  validatePowerControlOperation,
  validateResourceScope,
  getScopeErrorResponse
} from '../services/scopeValidation.js';

/**
 * Get operational scope
 * @returns {OperationalScope} The current operational scope
 */
export function getScope() {
  return getOperationalScope();
}

/**
 * Get scope level
 * @returns {string} The current scope level
 */
export function getScopeLevel() {
  const scope = getOperationalScope();
  return scope.getScopeLevel();
}

/**
 * Get accessible feeder IDs
 * @returns {Array} Array of accessible feeder IDs
 */
export function getAccessibleFeederIds() {
  const scope = getOperationalScope();
  return scope.getAccessibleFeederIds();
}

/**
 * Get accessible injection substation IDs
 * @returns {Array} Array of accessible injection substation IDs
 */
export function getAccessibleInjectionSubstationIds() {
  const scope = getOperationalScope();
  return scope.getAccessibleInjectionSubstationIds();
}

/**
 * Get accessible state IDs
 * @returns {Array} Array of accessible state IDs
 */
export function getAccessibleStateIds() {
  const scope = getOperationalScope();
  return scope.getAccessibleStateIds();
}

/**
 * Get accessible LGA IDs
 * @returns {Array} Array of accessible LGA IDs
 */
export function getAccessibleLGAIds() {
  const scope = getOperationalScope();
  return scope.getAccessibleLGAIds();
}

/**
 * Check if user can operate a specific feeder
 * @param {string|ObjectId} feederId - The feeder ID
 * @returns {boolean} Whether the user can operate the feeder
 */
export function canOperateFeeder(feederId) {
  const scope = getOperationalScope();
  return scope.canOperateFeeder(feederId);
}

/**
 * Check if user can operate a specific injection substation
 * @param {string|ObjectId} substationId - The injection substation ID
 * @returns {boolean} Whether the user can operate the substation
 */
export function canOperateInjectionSubstation(substationId) {
  const scope = getOperationalScope();
  return scope.canOperateInjectionSubstation(substationId);
}

/**
 * Check if user can operate in a specific state
 * @param {string|ObjectId} stateId - The state ID
 * @returns {boolean} Whether the user can operate in the state
 */
export function canOperateInState(stateId) {
  const scope = getOperationalScope();
  return scope.canOperateInState(stateId);
}

/**
 * Check if user can operate in a specific LGA
 * @param {string|ObjectId} lgaId - The LGA ID
 * @returns {boolean} Whether the user can operate in the LGA
 */
export function canOperateInLGA(lgaId) {
  const scope = getOperationalScope();
  return scope.canOperateInLGA(lgaId);
}

/**
 * Build operational filter for queries
 * @param {Object} baseFilter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Filtered query object
 */
export function buildOperationalFilter(baseFilter = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  return scope.buildOperationalFilter(baseFilter, feederField);
}

/**
 * Validate and filter feeder IDs to only include accessible ones
 * @param {Array} feederIds - Array of feeder IDs to filter
 * @returns {Array} Filtered array of feeder IDs
 */
export function filterAccessibleFeeders(feederIds) {
  const accessibleIds = getAccessibleFeederIds();
  return feederIds.filter(id => accessibleIds.includes(id.toString()));
}

/**
 * Get scope summary for logging/debugging
 * @returns {Object} Scope summary
 */
export function getScopeSummary() {
  const scope = getOperationalScope();
  return scope.getSummary();
}

/**
 * Log scope information for debugging
 * @param {string} message - Optional message to include in log
 */
export function logScope(message = 'Operational Scope') {
  const summary = getScopeSummary();
  console.log(`[${message}]`, JSON.stringify(summary, null, 2));
}

/**
 * Check if operational scope is initialized
 * @returns {boolean} Whether scope is initialized
 */
export function isScopeInitialized() {
  const scope = getOperationalScope();
  return scope.scopeLevel !== null;
}

/**
 * Require operational scope to be initialized
 * Throws error if scope is not initialized
 * @throws {Error} If scope is not initialized
 */
export function requireScope() {
  if (!isScopeInitialized()) {
    throw new Error('Operational scope not initialized. Ensure operationalScopeMiddleware is used.');
  }
}

/**
 * Validate feeder operation and return error response if invalid
 * @param {string|ObjectId} feederId - The feeder ID
 * @param {Object} res - Express response object
 * @returns {boolean} Whether validation passed
 */
export async function validateFeederOperationOrError(feederId, res) {
  const validation = await validateFeederOperation(feederId);
  
  if (!validation.valid) {
    res.status(403).json(getScopeErrorResponse(validation));
    return false;
  }
  
  return true;
}

/**
 * Validate power control operation and return error response if invalid
 * @param {string|ObjectId} feederId - The feeder ID
 * @param {string} operation - The operation type
 * @param {Object} res - Express response object
 * @returns {boolean} Whether validation passed
 */
export async function validatePowerControlOperationOrError(feederId, operation, res) {
  const validation = await validatePowerControlOperation(feederId, operation);
  
  if (!validation.valid) {
    res.status(403).json(getScopeErrorResponse(validation));
    return false;
  }
  
  return true;
}

/**
 * Validate resource scope and return error response if invalid
 * @param {Object} resource - The resource to validate
 * @param {string} feederField - Field name for feeder
 * @param {Object} res - Express response object
 * @returns {boolean} Whether validation passed
 */
export async function validateResourceScopeOrError(resource, feederField, res) {
  const validation = await validateResourceScope(resource, feederField);
  
  if (!validation.valid) {
    res.status(403).json(getScopeErrorResponse(validation));
    return false;
  }
  
  return true;
}

/**
 * Get user-friendly scope level name
 * @returns {string} User-friendly scope level name
 */
export function getScopeLevelDisplayName() {
  const scopeLevel = getScopeLevel();
  
  const displayNames = {
    'global': 'All Companies',
    'company': 'Company-wide',
    'regional': 'Regional',
    'feeder': 'Feeder-level',
    'user': 'User-specific'
  };
  
  return displayNames[scopeLevel] || 'Unknown';
}

/**
 * Get user-friendly scope description
 * @returns {string} User-friendly scope description
 */
export function getScopeDescription() {
  const scope = getOperationalScope();
  const summary = scope.getSummary();
  
  const descriptions = {
    'global': 'Can operate infrastructure across all companies',
    'company': `Can operate all ${summary.accessibleFeederCount} feeders in company`,
    'regional': `Can operate ${summary.accessibleFeederCount} feeders in assigned regions`,
    'feeder': `Can operate ${summary.accessibleFeederCount} assigned feeders`,
    'user': `Can operate 1 specific assigned feeder`
  };
  
  return descriptions[scope.getScopeLevel()] || 'Unknown scope';
}

/**
 * Check if user has global scope (platform owner)
 * @returns {boolean} Whether user has global scope
 */
export function hasGlobalScope() {
  return getScopeLevel() === 'global';
}

/**
 * Check if user has company scope (company super admin)
 * @returns {boolean} Whether user has company scope
 */
export function hasCompanyScope() {
  return getScopeLevel() === 'company';
}

/**
 * Check if user has regional scope
 * @returns {boolean} Whether user has regional scope
 */
export function hasRegionalScope() {
  return getScopeLevel() === 'regional';
}

/**
 * Check if user has feeder scope (admin/operator)
 * @returns {boolean} Whether user has feeder scope
 */
export function hasFeederScope() {
  return getScopeLevel() === 'feeder';
}

/**
 * Check if user has user scope
 * @returns {boolean} Whether user has user scope
 */
export function hasUserScope() {
  return getScopeLevel() === 'user';
}

/**
 * Get accessible resources count
 * @returns {Object} Object with counts of accessible resources
 */
export function getAccessibleResourcesCount() {
  const scope = getOperationalScope();
  const summary = scope.getSummary();
  
  return {
    feeders: summary.accessibleFeederCount,
    injectionSubstations: summary.accessibleInjectionSubstationCount,
    states: summary.accessibleStateCount,
    lgas: summary.accessibleLGACount
  };
}
