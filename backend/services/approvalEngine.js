/**
 * Approval Engine
 * 
 * Generic approval service for enterprise approval workflows.
 * Reusable across all modules for approval processes.
 */

import Approval from '../models/Approval.js';
import { getRuntimeContext } from './runtimeContext.js';

/**
 * Approval Engine class
 * Provides methods for creating, managing, and processing approvals
 */
class ApprovalEngine {
  /**
   * Create a new approval
   * @param {Object} approvalData - Approval data
   * @returns {Promise<Approval>} Created approval
   */
  async createApproval(approvalData) {
    const context = getRuntimeContext();
    const user = context.getUser();
    const company = context.getCompany();

    const approval = new Approval({
      approvalId: this.generateApprovalId(approvalData.approvalType),
      companyId: company._id,
      requestedBy: user._id,
      ...approvalData
    });

    // Initialize status history
    approval.statusHistory.push({
      status: 'pending',
      changedAt: new Date(),
      changedBy: user._id,
      reason: 'Approval requested',
      metadata: {}
    });

    return await approval.save();
  }

  /**
   * Get approval by ID
   * @param {string} approvalId - Approval ID
   * @returns {Promise<Approval|null>} Approval or null
   */
  async getApproval(approvalId) {
    return await Approval.findOne({ approvalId });
  }

  /**
   * Get approval by MongoDB ID
   * @param {string} id - MongoDB ID
   * @returns {Promise<Approval|null>} Approval or null
   */
  async getApprovalById(id) {
    return await Approval.findById(id);
  }

  /**
   * Approve an approval
   * @param {string} approvalId - Approval ID
   * @param {string} reason - Reason for approval
   * @param {string} comments - Additional comments
   * @returns {Promise<Approval>} Updated approval
   */
  async approve(approvalId, reason = '', comments = '') {
    const context = getRuntimeContext();
    const user = context.getUser();
    
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.approve(user._id, reason, comments);
    return await approval.save();
  }

  /**
   * Reject an approval
   * @param {string} approvalId - Approval ID
   * @param {string} reason - Reason for rejection
   * @param {string} comments - Additional comments
   * @returns {Promise<Approval>} Updated approval
   */
  async reject(approvalId, reason = '', comments = '') {
    const context = getRuntimeContext();
    const user = context.getUser();
    
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.reject(user._id, reason, comments);
    return await approval.save();
  }

  /**
   * Cancel an approval
   * @param {string} approvalId - Approval ID
   * @param {string} reason - Reason for cancellation
   * @returns {Promise<Approval>} Updated approval
   */
  async cancel(approvalId, reason = '') {
    const context = getRuntimeContext();
    const user = context.getUser();
    
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.cancel(user._id, reason);
    return await approval.save();
  }

  /**
   * Reassign approval to different user
   * @param {string} approvalId - Approval ID
   * @param {string} newAssigneeId - New assignee user ID
   * @param {string} reason - Reason for reassignment
   * @returns {Promise<Approval>} Updated approval
   */
  async reassign(approvalId, newAssigneeId, reason = '') {
    const context = getRuntimeContext();
    const user = context.getUser();
    
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.reassign(newAssigneeId, user._id, reason);
    return await approval.save();
  }

  /**
   * Send reminder for approval
   * @param {string} approvalId - Approval ID
   * @returns {Promise<Approval>} Updated approval
   */
  async sendReminder(approvalId) {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.sendReminder();
    return await approval.save();
  }

  /**
   * Link approval to workflow
   * @param {string} approvalId - Approval ID
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Approval>} Updated approval
   */
  async linkWorkflow(approvalId, workflowId) {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.workflowId = workflowId;
    return await approval.save();
  }

  /**
   * Get pending approvals for company
   * @param {string} companyId - Company ID
   * @param {string} assignedTo - Optional assigned user ID
   * @returns {Promise<Array>} Array of pending approvals
   */
  async getPendingApprovals(companyId, assignedTo = null) {
    return await Approval.findPending(companyId, assignedTo);
  }

  /**
   * Get approvals by type
   * @param {string} companyId - Company ID
   * @param {string} approvalType - Approval type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of approvals
   */
  async getApprovalsByType(companyId, approvalType, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = {
      companyId,
      approvalType
    };

    if (status) {
      query.status = status;
    }

    return await Approval.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('requestedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('decision.approvedBy', 'fullName email');
  }

  /**
   * Get approvals for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of approvals
   */
  async getApprovalsForUser(userId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    return await Approval.findByUser(userId, { limit, skip, status })
      .populate('requestedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('decision.approvedBy', 'fullName email');
  }

  /**
   * Get expired approvals
   * @returns {Promise<Array>} Array of expired approvals
   */
  async getExpiredApprovals() {
    return await Approval.findExpired();
  }

  /**
   * Get approval statistics
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Approval statistics
   */
  async getStatistics(companyId, startDate, endDate) {
    const matchStage = {
      companyId
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    return await Approval.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            approvalType: '$approvalType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.approvalType': 1, '_id.status': 1 } }
    ]);
  }

  /**
   * Generate approval ID
   * @param {string} approvalType - Approval type
   * @returns {string} Generated approval ID
   */
  generateApprovalId(approvalType) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const typeCode = approvalType.substring(0, 3).toUpperCase();
    return `APR-${typeCode}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Check if approval can be acted upon
   * @param {string} status - Current status
   * @returns {boolean} Whether approval can be acted upon
   */
  canActOn(status) {
    return status === 'pending';
  }

  /**
   * Get pending approvals count for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of pending approvals
   */
  async getPendingCountForUser(userId) {
    return await Approval.countDocuments({
      assignedTo: userId,
      status: 'pending'
    });
  }

  /**
   * Get pending approvals count for company
   * @param {string} companyId - Company ID
   * @returns {Promise<number>} Count of pending approvals
   */
  async getPendingCountForCompany(companyId) {
    return await Approval.countDocuments({
      companyId,
      status: 'pending'
    });
  }
}

// Global approval engine instance
const globalApprovalEngine = new ApprovalEngine();

/**
 * Get global approval engine
 * @returns {ApprovalEngine} The global approval engine
 */
export function getApprovalEngine() {
  return globalApprovalEngine;
}

/**
 * Create new approval engine instance
 * @returns {ApprovalEngine} A new approval engine instance
 */
export function createApprovalEngine() {
  return new ApprovalEngine();
}

export default ApprovalEngine;
