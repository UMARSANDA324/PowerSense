/**
 * Scope Repository
 * 
 * Repository functions for operational scope-aware database operations.
 * These functions help implement scope filtering in database queries and
 * ensure that operations never leak across feeders, substations, regions, or companies.
 */

import { getOperationalScope } from '../services/operationalScope.js';

/**
 * Apply operational scope filter to a Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Modified query with scope filter applied
 */
export function applyScopeFilter(query, feederField = 'feeder') {
  const scope = getOperationalScope();
  const filter = scope.buildOperationalFilter({}, feederField);
  
  if (filter[feederField]) {
    query.where(filter[feederField]);
  }
  
  return query;
}

/**
 * Create a scope-aware find query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeFind(model, filter = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.find(scopedFilter);
}

/**
 * Create a scope-aware findOne query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeFindOne(model, filter = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.findOne(scopedFilter);
}

/**
 * Create a scope-aware findById query
 * @param {Model} model - Mongoose model
 * @param {string|ObjectId} id - Document ID
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeFindById(model, id, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter({ _id: id }, feederField);
  return model.findOne(scopedFilter);
}

/**
 * Create a scope-aware count query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeCount(model, filter = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.countDocuments(scopedFilter);
}

/**
 * Create a scope-aware update query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {Object} update - Update object
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeUpdate(model, filter = {}, update = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.updateMany(scopedFilter, update);
}

/**
 * Create a scope-aware updateOne query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {Object} update - Update object
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeUpdateOne(model, filter = {}, update = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.updateOne(scopedFilter, update);
}

/**
 * Create a scope-aware delete query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeDelete(model, filter = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.deleteMany(scopedFilter);
}

/**
 * Create a scope-aware deleteOne query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Base query filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose query with scope filter applied
 */
export function scopeDeleteOne(model, filter = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter(filter, feederField);
  return model.deleteOne(scopedFilter);
}

/**
 * Create a scope-aware aggregate pipeline
 * @param {Model} model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Mongoose aggregate with scope filter applied
 */
export function scopeAggregate(model, pipeline = [], feederField = 'feeder') {
  const scope = getOperationalScope();
  const scopedFilter = scope.buildOperationalFilter({}, feederField);
  
  // Add scope filter as first stage in pipeline
  if (scopedFilter[feederField]) {
    const scopedPipeline = [{ $match: scopedFilter }, ...pipeline];
    return model.aggregate(scopedPipeline);
  }
  
  return model.aggregate(pipeline);
}

/**
 * Validate document tenancy before operation
 * @param {Object} document - Document to validate
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {boolean} Whether document is in scope
 */
export function validateDocumentScope(document, feederField = 'feeder') {
  const scope = getOperationalScope();
  
  if (!document) {
    return false;
  }
  
  const feederId = document[feederField];
  if (!feederId) {
    return false;
  }
  
  const feederIdStr = feederId._id ? feederId._id.toString() : feederId.toString();
  return scope.canOperateFeeder(feederIdStr);
}

/**
 * Get accessible feeders for current user
 * @returns {Promise<Array>} Array of accessible feeder objects
 */
export async function getAccessibleFeeders() {
  const scope = getOperationalScope();
  await scope.initialize();
  return scope.accessibleFeeders;
}

/**
 * Get accessible injection substations for current user
 * @returns {Promise<Array>} Array of accessible injection substation objects
 */
export async function getAccessibleInjectionSubstations() {
  const scope = getOperationalScope();
  await scope.initialize();
  return scope.accessibleInjectionSubstations;
}

/**
 * Filter documents by operational scope
 * @param {Array} documents - Array of documents to filter
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Array} Filtered array of documents
 */
export function filterDocumentsByScope(documents, feederField = 'feeder') {
  const scope = getOperationalScope();
  const accessibleIds = scope.getAccessibleFeederIds();
  
  return documents.filter(doc => {
    const feederId = doc[feederField];
    if (!feederId) return false;
    
    const feederIdStr = feederId._id ? feederId._id.toString() : feederId.toString();
    return accessibleIds.includes(feederIdStr);
  });
}

/**
 * Check if any document in an array is out of scope
 * @param {Array} documents - Array of documents to check
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Object} Object with hasOutOfScope flag and outOfScopeDocuments array
 */
export function checkDocumentsScope(documents, feederField = 'feeder') {
  const scope = getOperationalScope();
  const accessibleIds = scope.getAccessibleFeederIds();
  
  const outOfScopeDocuments = documents.filter(doc => {
    const feederId = doc[feederField];
    if (!feederId) return true; // Documents without feeder are considered out of scope
    
    const feederIdStr = feederId._id ? feederId._id.toString() : feederId.toString();
    return !accessibleIds.includes(feederIdStr);
  });
  
  return {
    hasOutOfScope: outOfScopeDocuments.length > 0,
    outOfScopeDocuments,
    outOfScopeCount: outOfScopeDocuments.length
  };
}

/**
 * Create a scope-aware create operation
 * @param {Model} model - Mongoose model
 * @param {Object} data - Data to create
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Promise<Object>} Created document
 */
export async function scopeCreate(model, data = {}, feederField = 'feeder') {
  const scope = getOperationalScope();
  
  // Validate that the feeder is in scope
  if (data[feederField]) {
    const feederIdStr = data[feederField]._id ? data[feederField]._id.toString() : data[feederField].toString();
    
    if (!scope.canOperateFeeder(feederIdStr)) {
      throw new Error('Feeder is outside operational scope');
    }
  }
  
  return await model.create(data);
}

/**
 * Create a scope-aware bulk create operation
 * @param {Model} model - Mongoose model
 * @param {Array} dataArray - Array of data objects to create
 * @param {string} feederField - Field name for feeder (default: 'feeder')
 * @returns {Promise<Array>} Array of created documents
 */
export async function scopeBulkCreate(model, dataArray = [], feederField = 'feeder') {
  const scope = getOperationalScope();
  
  // Validate all feeders are in scope
  for (const data of dataArray) {
    if (data[feederField]) {
      const feederIdStr = data[feederField]._id ? data[feederField]._id.toString() : data[feederField].toString();
      
      if (!scope.canOperateFeeder(feederIdStr)) {
        throw new Error('One or more feeders are outside operational scope');
      }
    }
  }
  
  return await model.create(dataArray);
}
