/**
 * Tenant Validation Service
 * 
 * Provides validation functions for tenant-related operations.
 * Ensures data integrity and proper tenant isolation.
 */

import { resolveTenantIdFromUser, validateTenantAccess } from './tenantResolver.js';
import Company from '../models/Company.js';
import User from '../models/UserModel.js';

/**
 * Validate that a resource belongs to the user's tenant
 * @param {Object} resource - The resource to validate
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<boolean>} Whether the resource belongs to the user's tenant
 */
export async function validateResourceTenant(resource, userId) {
  try {
    const userCompanyId = await resolveTenantIdFromUser(userId);
    
    if (!userCompanyId) {
      // If user has no company, allow access for backward compatibility
      return true;
    }

    if (!resource || !resource.companyId) {
      // If resource has no companyId, allow access for backward compatibility
      return true;
    }

    return resource.companyId.toString() === userCompanyId.toString();
  } catch (error) {
    console.error('Error validating resource tenant:', error);
    return false;
  }
}

/**
 * Validate that a user can access a specific company
 * @param {ObjectId|string} userId - The user ID
 * @param {ObjectId|string} companyId - The company ID
 * @returns {Promise<Object>} Validation result with valid flag and message
 */
export async function validateUserCompanyAccess(userId, companyId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { valid: false, message: 'User not found' };
    }

    // Platform owners can access any company
    if (user.role === 'platform-owner') {
      return { valid: true, message: 'Platform owner access granted' };
    }

    // Check if user has companyId
    if (!user.companyId) {
      return { valid: false, message: 'User not assigned to a company' };
    }

    // Check if user's company matches requested company
    if (user.companyId.toString() !== companyId.toString()) {
      return { valid: false, message: 'User can only access their own company' };
    }

    return { valid: true, message: 'Access granted' };
  } catch (error) {
    console.error('Error validating user company access:', error);
    return { valid: false, message: 'Validation error' };
  }
}

/**
 * Validate company exists and is active
 * @param {ObjectId|string} companyId - The company ID
 * @returns {Promise<Object>} Validation result with valid flag and message
 */
export async function validateCompany(companyId) {
  try {
    const company = await Company.findById(companyId);
    
    if (!company) {
      return { valid: false, message: 'Company not found' };
    }

    if (company.status !== 'active') {
      return { valid: false, message: 'Company is not active' };
    }

    return { valid: true, message: 'Company is valid', company };
  } catch (error) {
    console.error('Error validating company:', error);
    return { valid: false, message: 'Validation error' };
  }
}

/**
 * Validate that a user can be assigned to a company
 * @param {ObjectId|string} userId - The user ID
 * @param {ObjectId|string} companyId - The company ID
 * @param {ObjectId|string} assignerId - The ID of the user making the assignment
 * @returns {Promise<Object>} Validation result with valid flag and message
 */
export async function validateCompanyAssignment(userId, companyId, assignerId) {
  try {
    // Validate company exists
    const companyValidation = await validateCompany(companyId);
    if (!companyValidation.valid) {
      return companyValidation;
    }

    // Validate assigner has permission
    const assignerAccess = await validateUserCompanyAccess(assignerId, companyId);
    if (!assignerAccess.valid) {
      return { valid: false, message: 'Assigner does not have permission to assign users to this company' };
    }

    // Check if user is platform owner (cannot be assigned to a company)
    const user = await User.findById(userId);
    if (user && user.role === 'platform-owner') {
      return { valid: false, message: 'Platform owners cannot be assigned to a company' };
    }

    return { valid: true, message: 'Assignment valid' };
  } catch (error) {
    console.error('Error validating company assignment:', error);
    return { valid: false, message: 'Validation error' };
  }
}

/**
 * Validate tenant isolation for a query
 * @param {Object} query - The MongoDB query
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Object>} Validation result with valid flag and updated query
 */
export async function validateQueryTenant(query, userId) {
  try {
    const userCompanyId = await resolveTenantIdFromUser(userId);
    const user = await User.findById(userId).select('role');

    // Platform owners can query all data
    if (user && user.role === 'platform-owner') {
      return { valid: true, query };
    }

    // If user has no company, return query as-is for backward compatibility
    if (!userCompanyId) {
      return { valid: true, query };
    }

    // Add companyId filter to query
    const updatedQuery = { ...query };
    if (!updatedQuery.companyId) {
      updatedQuery.companyId = userCompanyId;
    }

    return { valid: true, query: updatedQuery };
  } catch (error) {
    console.error('Error validating query tenant:', error);
    return { valid: false, query };
  }
}

/**
 * Validate bulk operation tenant isolation
 * @param {Array} operations - Array of operations to validate
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Object>} Validation result with valid flag and message
 */
export async function validateBulkOperationTenant(operations, userId) {
  try {
    const userCompanyId = await resolveTenantIdFromUser(userId);
    const user = await User.findById(userId).select('role');

    // Platform owners can perform bulk operations on all data
    if (user && user.role === 'platform-owner') {
      return { valid: true, message: 'Platform owner access granted' };
    }

    // If user has no company, allow for backward compatibility
    if (!userCompanyId) {
      return { valid: true, message: 'No company assigned, allowing operation' };
    }

    // Validate all operations target the user's company
    for (const operation of operations) {
      if (operation.companyId && operation.companyId.toString() !== userCompanyId.toString()) {
        return { valid: false, message: 'Operation targets different company' };
      }
    }

    return { valid: true, message: 'Bulk operation valid' };
  } catch (error) {
    console.error('Error validating bulk operation tenant:', error);
    return { valid: false, message: 'Validation error' };
  }
}

/**
 * Validate cross-tenant operation
 * @param {ObjectId|string} sourceCompanyId - Source company ID
 * @param {ObjectId|string} targetCompanyId - Target company ID
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Object>} Validation result with valid flag and message
 */
export async function validateCrossTenantOperation(sourceCompanyId, targetCompanyId, userId) {
  try {
    const user = await User.findById(userId).select('role');

    // Only platform owners can perform cross-tenant operations
    if (!user || user.role !== 'platform-owner') {
      return { valid: false, message: 'Cross-tenant operations require platform owner access' };
    }

    // Validate both companies exist
    const sourceValidation = await validateCompany(sourceCompanyId);
    if (!sourceValidation.valid) {
      return { valid: false, message: 'Source company invalid' };
    }

    const targetValidation = await validateCompany(targetCompanyId);
    if (!targetValidation.valid) {
      return { valid: false, message: 'Target company invalid' };
    }

    return { valid: true, message: 'Cross-tenant operation valid' };
  } catch (error) {
    console.error('Error validating cross-tenant operation:', error);
    return { valid: false, message: 'Validation error' };
  }
}
