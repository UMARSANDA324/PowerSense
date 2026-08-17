/**
 * Audit Engine
 * 
 * Generic audit service for tracking sensitive actions.
 * Provides immutable audit records for security and compliance.
 */

import Audit from '../models/Audit.js';
import { getRuntimeContext } from './runtimeContext.js';

/**
 * Audit Engine class
 * Provides methods for creating and querying audit records
 */
class AuditEngine {
  /**
   * Create an audit record
   * @param {Object} auditData - Audit data
   * @returns {Promise<Audit>} Created audit record
   */
  async createAudit(auditData) {
    const context = getRuntimeContext();
    const user = context.getUser();
    const company = context.getCompany();

    const audit = new Audit({
      companyId: company._id,
      performedBy: user._id,
      userRole: context.getRole(),
      ...auditData
    });

    return await audit.save();
  }

  /**
   * Create audit record asynchronously (non-blocking)
   * @param {Object} auditData - Audit data
   * @returns {Promise<void>}
   */
  async createAuditAsync(auditData) {
    // Create audit without awaiting
    this.createAudit(auditData).catch(error => {
      console.error('Failed to create audit record:', error);
    });
  }

  /**
   * Get audit by ID
   * @param {string} auditId - Audit ID
   * @returns {Promise<Audit|null>} Audit or null
   */
  async getAudit(auditId) {
    return await Audit.findOne({ auditId });
  }

  /**
   * Get audit by MongoDB ID
   * @param {string} id - MongoDB ID
   * @returns {Promise<Audit|null>} Audit or null
   */
  async getAuditById(id) {
    return await Audit.findById(id);
  }

  /**
   * Get audits by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audits
   */
  async getAuditsByCompany(companyId, options = {}) {
    return await Audit.findByCompany(companyId, options);
  }

  /**
   * Get audits by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audits
   */
  async getAuditsByUser(userId, options = {}) {
    return await Audit.findByUser(userId, options);
  }

  /**
   * Get audits by resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audits
   */
  async getAuditsByResource(resourceType, resourceId, options = {}) {
    return await Audit.findByResource(resourceType, resourceId, options);
  }

  /**
   * Get audit statistics
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Audit statistics
   */
  async getStatistics(companyId, startDate, endDate) {
    return await Audit.getStatistics(companyId, startDate, endDate);
  }

  /**
   * Log power control action
   * @param {string} action - Action type (on/off/maintenance)
   * @param {string} feederId - Feeder ID
   * @param {string} result - Result (success/failure/partial)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Audit>} Created audit record
   */
  async logPowerControl(action, feederId, result, metadata = {}) {
    return await this.createAudit({
      actionType: action === 'maintenance' ? 'maintenance' : `power-${action}`,
      action: `${action.toUpperCase()} power for feeder`,
      description: `Power ${action} operation on feeder`,
      resourceType: 'feeder',
      resourceId: feederId,
      result,
      metadata
    });
  }

  /**
   * Log admin action
   * @param {string} actionType - Action type
   * @param {string} userId - Target user ID
   * @param {string} result - Result
   * @param {Object} changes - Changes made
   * @returns {Promise<Audit>} Created audit record
   */
  async logAdminAction(actionType, userId, result, changes = {}) {
    return await this.createAudit({
      actionType,
      action: `${actionType} admin`,
      description: `${actionType} operation on admin user`,
      resourceType: 'user',
      resourceId: userId,
      result,
      changes,
      metadata: { changes }
    });
  }

  /**
   * Log infrastructure action
   * @param {string} actionType - Action type
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {string} result - Result
   * @param {Object} changes - Changes made
   * @returns {Promise<Audit>} Created audit record
   */
  async logInfrastructureAction(actionType, resourceType, resourceId, result, changes = {}) {
    return await this.createAudit({
      actionType: `infrastructure-${actionType}`,
      action: `${actionType} infrastructure`,
      description: `${actionType} operation on ${resourceType}`,
      resourceType,
      resourceId,
      result,
      changes,
      metadata: { changes }
    });
  }

  /**
   * Log notification action
   * @param {string} actionType - Action type (send/broadcast)
   * @param {string} notificationId - Notification ID
   * @param {string} result - Result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Audit>} Created audit record
   */
  async logNotificationAction(actionType, notificationId, result, metadata = {}) {
    return await this.createAudit({
      actionType: `notification-${actionType}`,
      action: `${actionType} notification`,
      description: `${actionType} notification operation`,
      resourceType: 'notification',
      resourceId: notificationId,
      result,
      metadata
    });
  }

  /**
   * Log approval action
   * @param {string} actionType - Action type (request/granted/rejected)
   * @param {string} approvalId - Approval ID
   * @param {string} result - Result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Audit>} Created audit record
   */
  async logApprovalAction(actionType, approvalId, result, metadata = {}) {
    return await this.createAudit({
      actionType: `approval-${actionType}`,
      action: `${actionType} approval`,
      description: `${actionType} approval operation`,
      resourceType: 'approval',
      resourceId: approvalId,
      result,
      metadata
    });
  }

  /**
   * Log workflow action
   * @param {string} actionType - Action type (create/update/cancel)
   * @param {string} workflowId - Workflow ID
   * @param {string} result - Result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Audit>} Created audit record
   */
  async logWorkflowAction(actionType, workflowId, result, metadata = {}) {
    return await this.createAudit({
      actionType: `workflow-${actionType}`,
      action: `${actionType} workflow`,
      description: `${actionType} workflow operation`,
      resourceType: 'workflow',
      resourceId: workflowId,
      result,
      metadata
    });
  }

  /**
   * Log company action
   * @param {string} actionType - Action type (create/update/delete)
   * @param {string} companyId - Company ID
   * @param {string} result - Result
   * @param {Object} changes - Changes made
   * @returns {Promise<Audit>} Created audit record
   */
  async logCompanyAction(actionType, companyId, result, changes = {}) {
    return await this.createAudit({
      actionType: `company-${actionType}`,
      action: `${actionType} company`,
      description: `${actionType} company operation`,
      resourceType: 'company',
      resourceId: companyId,
      result,
      changes,
      metadata: { changes }
    });
  }

  /**
   * Get recent audits for dashboard
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of audits to return
   * @returns {Promise<Array>} Array of recent audits
   */
  async getRecentAudits(companyId, limit = 20) {
    return await Audit.findByCompany(companyId, { limit })
      .populate('performedBy', 'fullName email');
  }

  /**
   * Search audits by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audits
   */
  async searchAudits(criteria, options = {}) {
    const { companyId, actionType, resourceType, performedBy, startDate, endDate } = criteria;
    const { limit = 50, skip = 0 } = options;

    const query = {};

    if (companyId) query.companyId = companyId;
    if (actionType) query.actionType = actionType;
    if (resourceType) query.resourceType = resourceType;
    if (performedBy) query.performedBy = performedBy;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return await Audit.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'fullName email');
  }
}

// Global audit engine instance
const globalAuditEngine = new AuditEngine();

/**
 * Get global audit engine
 * @returns {AuditEngine} The global audit engine
 */
export function getAuditEngine() {
  return globalAuditEngine;
}

/**
 * Create new audit engine instance
 * @returns {AuditEngine} A new audit engine instance
 */
export function createAuditEngine() {
  return new AuditEngine();
}

export default AuditEngine;
