/**
 * Tenant Repository Utilities
 * 
 * Utility functions for tenant-aware database operations.
 * These utilities help implement tenant isolation in database queries and operations.
 */

import { getTenantContext } from '../services/tenantContext.js';
import { validateQueryTenant, validateResourceTenant } from '../services/tenantValidation.js';

/**
 * Add tenant filter to a query
 * @param {Object} query - The original query
 * @param {ObjectId|string} userId - The user ID (optional, uses context if not provided)
 * @returns {Promise<Object>} The query with tenant filter applied
 */
export async function addTenantFilter(query, userId = null) {
  try {
    const tenantContext = getTenantContext();
    
    // If tenant isolation is not enabled, return query as-is
    if (!tenantContext.isIsolationEnabled()) {
      return query;
    }

    // If user is platform owner, return query as-is
    if (tenantContext.isPlatformOwnerUser()) {
      return query;
    }

    // Get company ID from context or user
    const companyId = userId 
      ? (await import('../services/tenantResolver.js')).then(m => m.resolveTenantIdFromUser(userId))
      : tenantContext.getCompanyId();

    if (!companyId) {
      return query; // No company ID, no filtering
    }

    // Add companyId filter to query
    return { ...query, companyId };
  } catch (error) {
    console.error('Error adding tenant filter:', error);
    return query; // Return original query on error
  }
}

/**
 * Apply tenant filter to a mongoose query
 * @param {Object} mongooseQuery - The mongoose query object
 * @param {ObjectId|string} userId - The user ID (optional)
 * @returns {Object} The mongoose query with tenant filter applied
 */
export async function applyTenantFilter(mongooseQuery, userId = null) {
  try {
    const tenantContext = getTenantContext();
    
    // If tenant isolation is not enabled, return query as-is
    if (!tenantContext.isIsolationEnabled()) {
      return mongooseQuery;
    }

    // If user is platform owner, return query as-is
    if (tenantContext.isPlatformOwnerUser()) {
      return mongooseQuery;
    }

    const companyId = userId 
      ? (await import('../services/tenantResolver.js')).then(m => m.resolveTenantIdFromUser(userId))
      : tenantContext.getCompanyId();

    if (!companyId) {
      return mongooseQuery;
    }

    // Apply companyId filter to mongoose query
    return mongooseQuery.where('companyId').equals(companyId);
  } catch (error) {
    console.error('Error applying tenant filter:', error);
    return mongooseQuery;
  }
}

/**
 * Create a tenant-aware find query
 * @param {Model} model - The mongoose model
 * @param {Object} filter - The query filter
 * @param {ObjectId|string} userId - The user ID (optional)
 * @returns {Object} The mongoose query with tenant filter applied
 */
export async function tenantFind(model, filter = {}, userId = null) {
  const query = model.find(filter);
  return await applyTenantFilter(query, userId);
}

/**
 * Create a tenant-aware findOne query
 * @param {Model} model - The mongoose model
 * @param {Object} filter - The query filter
 * @param {ObjectId|string} userId - The user ID (optional)
 * @returns {Object} The mongoose query with tenant filter applied
 */
export async function tenantFindOne(model, filter = {}, userId = null) {
  const query = model.findOne(filter);
  return await applyTenantFilter(query, userId);
}

/**
 * Create a tenant-aware count query
 * @param {Model} model - The mongoose model
 * @param {Object} filter - The query filter
 * @param {ObjectId|string} userId - The user ID (optional)
 * @returns {Object} The mongoose query with tenant filter applied
 */
export async function tenantCount(model, filter = {}, userId = null) {
  const query = model.countDocuments(filter);
  return await applyTenantFilter(query, userId);
}

/**
 * Validate a document belongs to the tenant before update
 * @param {Model} model - The mongoose model
 * @param {ObjectId|string} documentId - The document ID
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<boolean>} Whether the document belongs to the tenant
 */
export async function validateDocumentTenant(model, documentId, userId) {
  try {
    const document = await model.findById(documentId);
    if (!document) {
      return false;
    }

    return await validateResourceTenant(document, userId);
  } catch (error) {
    console.error('Error validating document tenant:', error);
    return false;
  }
}

/**
 * Create a document with tenant context
 * @param {Object} data - The document data
 * @param {ObjectId|string} companyId - The company ID (optional, uses context if not provided)
 * @returns {Object} The data with companyId added
 */
export function createWithTenant(data, companyId = null) {
  try {
    const tenantContext = getTenantContext();
    
    // If companyId is provided, use it
    if (companyId) {
      return { ...data, companyId };
    }

    // If tenant isolation is enabled and user has company, add companyId
    if (tenantContext.isIsolationEnabled() && tenantContext.getCompanyId()) {
      return { ...data, companyId: tenantContext.getCompanyId() };
    }

    // Return data as-is for backward compatibility
    return data;
  } catch (error) {
    console.error('Error creating with tenant:', error);
    return data;
  }
}

/**
 * Update a document with tenant validation
 * @param {Model} model - The mongoose model
 * @param {ObjectId|string} documentId - The document ID
 * @param {Object} updateData - The update data
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Object|null>} The updated document or null
 */
export async function updateWithTenantValidation(model, documentId, updateData, userId) {
  try {
    // Validate document belongs to tenant
    const isValid = await validateDocumentTenant(model, documentId, userId);
    if (!isValid) {
      throw new Error('Document does not belong to tenant');
    }

    // Perform update
    return await model.findByIdAndUpdate(documentId, updateData, { new: true });
  } catch (error) {
    console.error('Error updating with tenant validation:', error);
    throw error;
  }
}

/**
 * Delete a document with tenant validation
 * @param {Model} model - The mongoose model
 * @param {ObjectId|string} documentId - The document ID
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Object|null>} The deleted document or null
 */
export async function deleteWithTenantValidation(model, documentId, userId) {
  try {
    // Validate document belongs to tenant
    const isValid = await validateDocumentTenant(model, documentId, userId);
    if (!isValid) {
      throw new Error('Document does not belong to tenant');
    }

    // Perform delete
    return await model.findByIdAndDelete(documentId);
  } catch (error) {
    console.error('Error deleting with tenant validation:', error);
    throw error;
  }
}

/**
 * Aggregate with tenant filter
 * @param {Model} model - The mongoose model
 * @param {Array} pipeline - The aggregation pipeline
 * @param {ObjectId|string} userId - The user ID (optional)
 * @returns {Array} The aggregation pipeline with tenant filter
 */
export async function aggregateWithTenant(model, pipeline, userId = null) {
  try {
    const tenantContext = getTenantContext();
    
    // If tenant isolation is not enabled, return pipeline as-is
    if (!tenantContext.isIsolationEnabled()) {
      return model.aggregate(pipeline);
    }

    // If user is platform owner, return pipeline as-is
    if (tenantContext.isPlatformOwnerUser()) {
      return model.aggregate(pipeline);
    }

    const companyId = userId 
      ? (await import('../services/tenantResolver.js')).then(m => m.resolveTenantIdFromUser(userId))
      : tenantContext.getCompanyId();

    if (!companyId) {
      return model.aggregate(pipeline);
    }

    // Add companyId match to beginning of pipeline
    const tenantPipeline = [
      { $match: { companyId } },
      ...pipeline
    ];

    return model.aggregate(tenantPipeline);
  } catch (error) {
    console.error('Error aggregating with tenant:', error);
    return model.aggregate(pipeline);
  }
}

/**
 * Check if a model supports tenant isolation
 * @param {Model} model - The mongoose model
 * @returns {boolean} Whether the model supports tenant isolation
 */
export function modelSupportsTenant(model) {
  try {
    const schema = model.schema;
    return schema.paths && schema.paths.companyId !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Get tenant-aware options for queries
 * @param {Object} options - The original query options
 * @returns {Object} The options with tenant context
 */
export function getTenantOptions(options = {}) {
  try {
    const tenantContext = getTenantContext();
    
    return {
      ...options,
      tenantContext: {
        companyId: tenantContext.getCompanyId(),
        isPlatformOwner: tenantContext.isPlatformOwnerUser(),
        isolationEnabled: tenantContext.isIsolationEnabled()
      }
    };
  } catch (error) {
    return options;
  }
}
