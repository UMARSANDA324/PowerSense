/**
 * Workflow Engine
 * 
 * Generic workflow service for lifecycle management.
 * Reusable across all modules for state transitions and workflow orchestration.
 */

import Workflow from '../models/Workflow.js';
import { getRuntimeContext } from './runtimeContext.js';

/**
 * Workflow Engine class
 * Provides methods for creating, managing, and transitioning workflows
 */
class WorkflowEngine {
  /**
   * Create a new workflow
   * @param {Object} workflowData - Workflow data
   * @returns {Promise<Workflow>} Created workflow
   */
  async createWorkflow(workflowData) {
    const context = getRuntimeContext();
    const user = context.getUser();
    const company = context.getCompany();

    const workflow = new Workflow({
      workflowId: this.generateWorkflowId(workflowData.workflowType),
      companyId: company._id,
      createdBy: user._id,
      ...workflowData
    });

    // Initialize status history
    workflow.statusHistory.push({
      status: workflowData.status || 'draft',
      changedAt: new Date(),
      changedBy: user._id,
      reason: 'Workflow created',
      metadata: {}
    });

    return await workflow.save();
  }

  /**
   * Get workflow by ID
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Workflow|null>} Workflow or null
   */
  async getWorkflow(workflowId) {
    return await Workflow.findOne({ workflowId });
  }

  /**
   * Get workflow by MongoDB ID
   * @param {string} id - MongoDB ID
   * @returns {Promise<Workflow|null>} Workflow or null
   */
  async getWorkflowById(id) {
    return await Workflow.findById(id);
  }

  /**
   * Update workflow status
   * @param {string} workflowId - Workflow ID
   * @param {string} newStatus - New status
   * @param {string} reason - Reason for status change
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Workflow>} Updated workflow
   */
  async updateStatus(workflowId, newStatus, reason = '', metadata = {}) {
    const context = getRuntimeContext();
    const user = context.getUser();
    
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.transitionStatus(newStatus, user._id, reason, metadata);
    return await workflow.save();
  }

  /**
   * Update workflow progress
   * @param {string} workflowId - Workflow ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Workflow>} Updated workflow
   */
  async updateProgress(workflowId, progress, metadata = {}) {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.updateProgress(progress, metadata);
    return await workflow.save();
  }

  /**
   * Set workflow error
   * @param {string} workflowId - Workflow ID
   * @param {string} error - Error message
   * @param {string} code - Error code
   * @param {Object} details - Error details
   * @returns {Promise<Workflow>} Updated workflow
   */
  async setError(workflowId, error, code = null, details = {}) {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.setError(error, code, details);
    return await workflow.save();
  }

  /**
   * Assign workflow to user
   * @param {string} workflowId - Workflow ID
   * @param {string} userId - User ID to assign to
   * @returns {Promise<Workflow>} Updated workflow
   */
  async assignWorkflow(workflowId, userId) {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.assignedTo = userId;
    return await workflow.save();
  }

  /**
   * Link workflow to approval
   * @param {string} workflowId - Workflow ID
   * @param {string} approvalId - Approval ID
   * @returns {Promise<Workflow>} Updated workflow
   */
  async linkApproval(workflowId, approvalId) {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.approvalId = approvalId;
    return await workflow.save();
  }

  /**
   * Get active workflows for company
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} Array of active workflows
   */
  async getActiveWorkflows(companyId) {
    return await Workflow.findActive(companyId);
  }

  /**
   * Get workflows by type
   * @param {string} companyId - Company ID
   * @param {string} workflowType - Workflow type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of workflows
   */
  async getWorkflowsByType(companyId, workflowType, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = {
      companyId,
      workflowType
    };

    if (status) {
      query.status = status;
    }

    return await Workflow.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email');
  }

  /**
   * Get workflows for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of workflows
   */
  async getWorkflowsForUser(userId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    return await Workflow.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName email')
      .populate('assignedTo', 'fullName email');
  }

  /**
   * Get overdue workflows
   * @returns {Promise<Array>} Array of overdue workflows
   */
  async getOverdueWorkflows() {
    return await Workflow.findOverdue();
  }

  /**
   * Get workflow statistics
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Workflow statistics
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

    return await Workflow.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            workflowType: '$workflowType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.workflowType': 1, '_id.status': 1 } }
    ]);
  }

  /**
   * Generate workflow ID
   * @param {string} workflowType - Workflow type
   * @returns {string} Generated workflow ID
   */
  generateWorkflowId(workflowType) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const typeCode = workflowType.substring(0, 3).toUpperCase();
    return `WF-${typeCode}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Check if workflow can transition to status
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} Whether transition is valid
   */
  canTransition(currentStatus, newStatus) {
    const validTransitions = {
      'draft': ['scheduled', 'cancelled'],
      'scheduled': ['running', 'cancelled', 'expired'],
      'running': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [],
      'expired': []
    };

    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Get valid transitions for status
   * @param {string} currentStatus - Current status
   * @returns {Array} Array of valid transitions
   */
  getValidTransitions(currentStatus) {
    const validTransitions = {
      'draft': ['scheduled', 'cancelled'],
      'scheduled': ['running', 'cancelled', 'expired'],
      'running': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [],
      'expired': []
    };

    return validTransitions[currentStatus] || [];
  }
}

// Global workflow engine instance
const globalWorkflowEngine = new WorkflowEngine();

/**
 * Get global workflow engine
 * @returns {WorkflowEngine} The global workflow engine
 */
export function getWorkflowEngine() {
  return globalWorkflowEngine;
}

/**
 * Create new workflow engine instance
 * @returns {WorkflowEngine} A new workflow engine instance
 */
export function createWorkflowEngine() {
  return new WorkflowEngine();
}

export default WorkflowEngine;
