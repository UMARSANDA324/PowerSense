/**
 * Scope Validation Service
 * 
 * Provides validation functions for operational scope checks.
 * This ensures that operations never leak across feeders, substations,
 * regions, or companies.
 * 
 * This service is the security layer that validates all operational
 * actions before they are executed.
 */

import { getOperationalScope } from './operationalScope.js';

/**
 * Validate that a user can operate a specific feeder
 * @param {string|ObjectId} feederId - The feeder ID to validate
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateFeederOperation(feederId) {
  const scope = getOperationalScope();
  
  if (!scope.canOperateFeeder(feederId)) {
    return {
      valid: false,
      message: 'You do not have permission to operate this feeder',
      code: 'FEEDER_OUT_OF_SCOPE'
    };
  }

  return {
    valid: true,
    message: 'Feeder operation authorized',
    code: 'FEEDER_OPERATION_AUTHORIZED'
  };
}

/**
 * Validate that a user can operate a specific injection substation
 * @param {string|ObjectId} substationId - The injection substation ID to validate
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateInjectionSubstationOperation(substationId) {
  const scope = getOperationalScope();
  
  if (!scope.canOperateInjectionSubstation(substationId)) {
    return {
      valid: false,
      message: 'You do not have permission to operate this injection substation',
      code: 'SUBSTATION_OUT_OF_SCOPE'
    };
  }

  return {
    valid: true,
    message: 'Injection substation operation authorized',
    code: 'SUBSTATION_OPERATION_AUTHORIZED'
  };
}

/**
 * Validate that a user can operate in a specific state
 * @param {string|ObjectId} stateId - The state ID to validate
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateStateOperation(stateId) {
  const scope = getOperationalScope();
  
  if (!scope.canOperateInState(stateId)) {
    return {
      valid: false,
      message: 'You do not have permission to operate in this state',
      code: 'STATE_OUT_OF_SCOPE'
    };
  }

  return {
    valid: true,
    message: 'State operation authorized',
    code: 'STATE_OPERATION_AUTHORIZED'
  };
}

/**
 * Validate that a user can operate in a specific LGA
 * @param {string|ObjectId} lgaId - The LGA ID to validate
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateLGAOperation(lgaId) {
  const scope = getOperationalScope();
  
  if (!scope.canOperateInLGA(lgaId)) {
    return {
      valid: false,
      message: 'You do not have permission to operate in this LGA',
      code: 'LGA_OUT_OF_SCOPE'
    };
  }

  return {
    valid: true,
    message: 'LGA operation authorized',
    code: 'LGA_OPERATION_AUTHORIZED'
  };
}

/**
 * Validate a power control operation (ON/OFF/Maintenance)
 * @param {string|ObjectId} feederId - The feeder ID to operate on
 * @param {string} operation - The operation type (on, off, maintenance)
 * @returns {Object} Validation result with valid flag and message
 */
export async function validatePowerControlOperation(feederId, operation) {
  // First validate feeder access
  const feederValidation = await validateFeederOperation(feederId);
  if (!feederValidation.valid) {
    return feederValidation;
  }

  // Validate operation type
  const validOperations = ['on', 'off', 'maintenance'];
  if (!validOperations.includes(operation.toLowerCase())) {
    return {
      valid: false,
      message: `Invalid operation type: ${operation}`,
      code: 'INVALID_OPERATION'
    };
  }

  return {
    valid: true,
    message: `Power control '${operation}' authorized for feeder`,
    code: 'POWER_CONTROL_AUTHORIZED'
  };
}

/**
 * Validate a scheduling operation
 * @param {string|ObjectId} feederId - The feeder ID to schedule for
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateSchedulingOperation(feederId) {
  return await validateFeederOperation(feederId);
}

/**
 * Validate a notification operation
 * @param {string|ObjectId} feederId - The feeder ID for notification
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateNotificationOperation(feederId) {
  return await validateFeederOperation(feederId);
}

/**
 * Validate a report operation
 * @param {string|ObjectId} feederId - The feeder ID for report
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateReportOperation(feederId) {
  return await validateFeederOperation(feederId);
}

/**
 * Validate a history operation
 * @param {string|ObjectId} feederId - The feeder ID for history
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateHistoryOperation(feederId) {
  return await validateFeederOperation(feederId);
}

/**
 * Validate a bulk operation on multiple feeders
 * @param {Array} feederIds - Array of feeder IDs
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateBulkFeederOperation(feederIds) {
  const scope = getOperationalScope();
  const accessibleIds = scope.getAccessibleFeederIds();
  
  // Check if all feeders are in scope
  const outOfScopeFeeders = feederIds.filter(
    id => !accessibleIds.includes(id.toString())
  );

  if (outOfScopeFeeders.length > 0) {
    return {
      valid: false,
      message: `${outOfScopeFeeders.length} feeders are out of your operational scope`,
      code: 'BULK_OPERATION_PARTIALLY_OUT_OF_SCOPE',
      outOfScopeFeeders
    };
  }

  return {
    valid: true,
    message: 'Bulk operation authorized for all feeders',
    code: 'BULK_OPERATION_AUTHORIZED'
  };
}

/**
 * Validate that a resource belongs to the user's operational scope
 * @param {Object} resource - The resource to validate
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateResourceScope(resource, feederField = 'feeder') {
  const scope = getOperationalScope();
  
  if (!resource) {
    return {
      valid: false,
      message: 'Resource not provided',
      code: 'RESOURCE_NOT_PROVIDED'
    };
  }

  const feederId = resource[feederField];
  if (!feederId) {
    return {
      valid: false,
      message: 'Resource does not have a feeder reference',
      code: 'RESOURCE_NO_FEEDER'
    };
  }

  const feederIdStr = feederId._id ? feederId._id.toString() : feederId.toString();
  
  if (!scope.canOperateFeeder(feederIdStr)) {
    return {
      valid: false,
      message: 'Resource is outside your operational scope',
      code: 'RESOURCE_OUT_OF_SCOPE'
    };
  }

  return {
    valid: true,
    message: 'Resource is within operational scope',
    code: 'RESOURCE_IN_SCOPE'
  };
}

/**
 * Validate cross-scope operation (for platform owners only)
 * @param {string} targetScope - The target scope level
 * @returns {Object} Validation result with valid flag and message
 */
export async function validateCrossScopeOperation(targetScope) {
  const scope = getOperationalScope();
  
  if (scope.getScopeLevel() !== 'global') {
    return {
      valid: false,
      message: 'Cross-scope operations require platform owner privileges',
      code: 'INSUFFICIENT_PRIVILEGES_FOR_CROSS_SCOPE'
    };
  }

  return {
    valid: true,
    message: 'Cross-scope operation authorized',
    code: 'CROSS_SCOPE_AUTHORIZED'
  };
}

/**
 * Get operational scope validation error response
 * @param {Object} validation - Validation result
 * @returns {Object} Error response object
 */
export function getScopeErrorResponse(validation) {
  return {
    success: false,
    message: validation.message,
    code: validation.code
  };
}

/**
 * Middleware to validate feeder operation
 * @param {string} feederParam - Request parameter name for feeder ID
 * @returns {Function} Express middleware function
 */
export function validateFeederOperationMiddleware(feederParam = 'feederId') {
  return async (req, res, next) => {
    try {
      const feederId = req.params[feederParam] || req.body[feederParam];
      
      if (!feederId) {
        return res.status(400).json({
          success: false,
          message: 'Feeder ID not provided',
          code: 'FEEDER_ID_MISSING'
        });
      }

      const validation = await validateFeederOperation(feederId);
      
      if (!validation.valid) {
        return res.status(403).json(getScopeErrorResponse(validation));
      }

      next();
    } catch (error) {
      console.error('Error in feeder operation validation middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR'
      });
    }
  };
}

/**
 * Middleware to validate power control operation
 * @returns {Function} Express middleware function
 */
export function validatePowerControlMiddleware() {
  return async (req, res, next) => {
    try {
      const feederId = req.params.feederId || req.body.feederId;
      const operation = req.body.operation || req.params.operation;
      
      if (!feederId) {
        return res.status(400).json({
          success: false,
          message: 'Feeder ID not provided',
          code: 'FEEDER_ID_MISSING'
        });
      }

      if (!operation) {
        return res.status(400).json({
          success: false,
          message: 'Operation type not provided',
          code: 'OPERATION_MISSING'
        });
      }

      const validation = await validatePowerControlOperation(feederId, operation);
      
      if (!validation.valid) {
        return res.status(403).json(getScopeErrorResponse(validation));
      }

      next();
    } catch (error) {
      console.error('Error in power control validation middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR'
      });
    }
  };
}
