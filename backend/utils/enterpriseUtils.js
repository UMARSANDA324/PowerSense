/**
 * Enterprise Utilities
 * 
 * Unified utilities for all enterprise engines (Workflow, Approval, Audit, Activity Timeline).
 * Provides convenient access to enterprise infrastructure services.
 */

import { getWorkflowEngine } from '../services/workflowEngine.js';
import { getApprovalEngine } from '../services/approvalEngine.js';
import { getAuditEngine } from '../services/auditEngine.js';
import { getActivityTimelineEngine } from '../services/activityTimelineEngine.js';

// ============================================================================
// ENGINE ACCESSORS
// ============================================================================

/**
 * Get workflow engine
 * @returns {WorkflowEngine} The workflow engine
 */
export function getWorkflow() {
  return getWorkflowEngine();
}

/**
 * Get approval engine
 * @returns {ApprovalEngine} The approval engine
 */
export function getApproval() {
  return getApprovalEngine();
}

/**
 * Get audit engine
 * @returns {AuditEngine} The audit engine
 */
export function getAudit() {
  return getAuditEngine();
}

/**
 * Get activity timeline engine
 * @returns {ActivityTimelineEngine} The activity timeline engine
 */
export function getTimeline() {
  return getActivityTimelineEngine();
}

// ============================================================================
// WORKFLOW HELPERS
// ============================================================================

/**
 * Create a workflow with automatic context
 * @param {Object} workflowData - Workflow data
 * @returns {Promise<Workflow>} Created workflow
 */
export async function createWorkflow(workflowData) {
  const engine = getWorkflowEngine();
  return await engine.createWorkflow(workflowData);
}

/**
 * Update workflow status with automatic context
 * @param {string} workflowId - Workflow ID
 * @param {string} newStatus - New status
 * @param {string} reason - Reason for change
 * @returns {Promise<Workflow>} Updated workflow
 */
export async function updateWorkflowStatus(workflowId, newStatus, reason = '') {
  const engine = getWorkflowEngine();
  return await engine.updateStatus(workflowId, newStatus, reason);
}

/**
 * Get active workflows for current company
 * @returns {Promise<Array>} Array of active workflows
 */
export async function getActiveWorkflows() {
  const context = await import('../services/runtimeContext.js');
  const runtimeContext = context.getRuntimeContext();
  const company = runtimeContext.getCompany();
  
  const engine = getWorkflowEngine();
  return await engine.getActiveWorkflows(company._id);
}

// ============================================================================
// APPROVAL HELPERS
// ============================================================================

/**
 * Create an approval with automatic context
 * @param {Object} approvalData - Approval data
 * @returns {Promise<Approval>} Created approval
 */
export async function createApproval(approvalData) {
  const engine = getApprovalEngine();
  return await engine.createApproval(approvalData);
}

/**
 * Approve an approval with automatic context
 * @param {string} approvalId - Approval ID
 * @param {string} reason - Reason for approval
 * @returns {Promise<Approval>} Updated approval
 */
export async function approveApproval(approvalId, reason = '') {
  const engine = getApprovalEngine();
  return await engine.approve(approvalId, reason);
}

/**
 * Reject an approval with automatic context
 * @param {string} approvalId - Approval ID
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Approval>} Updated approval
 */
export async function rejectApproval(approvalId, reason = '') {
  const engine = getApprovalEngine();
  return await engine.reject(approvalId, reason);
}

/**
 * Get pending approvals for current user
 * @returns {Promise<Array>} Array of pending approvals
 */
export async function getMyPendingApprovals() {
  const context = await import('../services/runtimeContext.js');
  const runtimeContext = context.getRuntimeContext();
  const user = runtimeContext.getUser();
  
  const engine = getApprovalEngine();
  return await engine.getApprovalsForUser(user._id, { status: 'pending' });
}

// ============================================================================
// AUDIT HELPERS
// ============================================================================

/**
 * Log an audit record with automatic context
 * @param {Object} auditData - Audit data
 * @returns {Promise<Audit>} Created audit record
 */
export async function logAudit(auditData) {
  const engine = getAuditEngine();
  return await engine.createAudit(auditData);
}

/**
 * Log an audit record asynchronously (non-blocking)
 * @param {Object} auditData - Audit data
 */
export async function logAuditAsync(auditData) {
  const engine = getAuditEngine();
  await engine.createAuditAsync(auditData);
}

/**
 * Log power control action
 * @param {string} action - Action type (on/off/maintenance)
 * @param {string} feederId - Feeder ID
 * @param {string} result - Result (success/failure/partial)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Audit>} Created audit record
 */
export async function logPowerAudit(action, feederId, result, metadata = {}) {
  const engine = getAuditEngine();
  return await engine.logPowerControl(action, feederId, result, metadata);
}

/**
 * Log admin action
 * @param {string} actionType - Action type
 * @param {string} userId - Target user ID
 * @param {string} result - Result
 * @param {Object} changes - Changes made
 * @returns {Promise<Audit>} Created audit record
 */
export async function logAdminAudit(actionType, userId, result, changes = {}) {
  const engine = getAuditEngine();
  return await engine.logAdminAction(actionType, userId, result, changes);
}

/**
 * Get recent audits for current company
 * @param {number} limit - Number of audits to return
 * @returns {Promise<Array>} Array of recent audits
 */
export async function getRecentAudits(limit = 20) {
  const context = await import('../services/runtimeContext.js');
  const runtimeContext = context.getRuntimeContext();
  const company = runtimeContext.getCompany();
  
  const engine = getAuditEngine();
  return await engine.getRecentAudits(company._id, limit);
}

// ============================================================================
// ACTIVITY TIMELINE HELPERS
// ============================================================================

/**
 * Create an activity with automatic context
 * @param {Object} activityData - Activity data
 * @returns {Promise<ActivityTimeline>} Created activity
 */
export async function createActivity(activityData) {
  const engine = getTimeline();
  return await engine.createActivity(activityData);
}

/**
 * Create an activity asynchronously (non-blocking)
 * @param {Object} activityData - Activity data
 */
export async function createActivityAsync(activityData) {
  const engine = getTimeline();
  await engine.createActivityAsync(activityData);
}

/**
 * Log power control activity
 * @param {string} action - Action type (on/off/maintenance)
 * @param {string} feederId - Feeder ID
 * @param {string} feederName - Feeder name
 * @param {Object} data - Additional data
 * @returns {Promise<ActivityTimeline>} Created activity
 */
export async function logPowerActivity(action, feederId, feederName, data = {}) {
  const engine = getTimeline();
  return await engine.logPowerControl(action, feederId, feederName, data);
}

/**
 * Log admin activity
 * @param {string} actionType - Action type (assigned/updated/deleted)
 * @param {string} userId - Target user ID
 * @param {string} userName - Target user name
 * @param {Object} data - Additional data
 * @returns {Promise<ActivityTimeline>} Created activity
 */
export async function logAdminActivity(actionType, userId, userName, data = {}) {
  const engine = getTimeline();
  return await engine.logAdminActivity(actionType, userId, userName, data);
}

/**
 * Get recent activities for current company
 * @param {number} limit - Number of activities to return
 * @returns {Promise<Array>} Array of recent activities
 */
export async function getRecentActivities(limit = 20) {
  const context = await import('../services/runtimeContext.js');
  const runtimeContext = context.getRuntimeContext();
  const company = runtimeContext.getCompany();
  
  const engine = getTimeline();
  return await engine.getRecentActivities(company._id, limit);
}

// ============================================================================
// COMBINED HELPERS
// ============================================================================

/**
 * Log a complete enterprise event (audit + activity)
 * @param {Object} eventData - Event data
 * @param {string} eventType - Event type (power-control, admin, etc.)
 * @param {Object} auditData - Audit-specific data
 * @param {Object} activityData - Activity-specific data
 * @returns {Promise<Object>} Created audit and activity records
 */
export async function logEnterpriseEvent(eventType, auditData, activityData) {
  const audit = await logAudit(auditData);
  const activity = await createActivity(activityData);
  
  return { audit, activity };
}

/**
 * Log a complete enterprise event asynchronously (non-blocking)
 * @param {Object} eventData - Event data
 * @param {string} eventType - Event type (power-control, admin, etc.)
 * @param {Object} auditData - Audit-specific data
 * @param {Object} activityData - Activity-specific data */
export async function logEnterpriseEventAsync(eventType, auditData, activityData) {
  logAuditAsync(auditData);
  createActivityAsync(activityData);
}

/**
 * Create a workflow with approval and audit
 * @param {Object} workflowData - Workflow data
 * @param {Object} approvalData - Approval data
 * @param {Object} auditData - Audit data
 * @returns {Promise<Object>} Created workflow, approval, and audit records
 */
export async function createWorkflowWithApproval(workflowData, approvalData, auditData) {
  const workflow = await createWorkflow(workflowData);
  
  if (approvalData) {
    approvalData.workflowId = workflow._id;
    const approval = await createApproval(approvalData);
    workflow.approvalId = approval._id;
    await workflow.save();
    
    if (auditData) {
      await logAudit({
        ...auditData,
        resourceId: workflow._id,
        metadata: { ...auditData.metadata, workflowId: workflow._id, approvalId: approval._id }
      });
    }
    
    return { workflow, approval };
  }
  
  if (auditData) {
    await logAudit({
      ...auditData,
      resourceId: workflow._id,
      metadata: { ...auditData.metadata, workflowId: workflow._id }
    });
  }
  
  return { workflow };
}

/**
 * Get enterprise statistics for dashboard
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Enterprise statistics
 */
export async function getEnterpriseStatistics(startDate, endDate) {
  const context = await import('../services/runtimeContext.js');
  const runtimeContext = context.getRuntimeContext();
  const company = runtimeContext.getCompany();
  
  const workflowEngine = getWorkflowEngine();
  const approvalEngine = getApprovalEngine();
  const auditEngine = getAuditEngine();
  const timelineEngine = getTimeline();
  
  const [workflowStats, approvalStats, auditStats, activityStats] = await Promise.all([
    workflowEngine.getStatistics(company._id, startDate, endDate),
    approvalEngine.getStatistics(company._id, startDate, endDate),
    auditEngine.getStatistics(company._id, startDate, endDate),
    timelineEngine.getStatistics(company._id, startDate, endDate)
  ]);
  
  return {
    workflows: workflowStats,
    approvals: approvalStats,
    audits: auditStats,
    activities: activityStats
  };
}

// ============================================================================
// STATUS RESOLVERS
// ============================================================================

/**
 * Get workflow status display name
 * @param {string} status - Workflow status
 * @returns {string} Display name
 */
export function getWorkflowStatusDisplay(status) {
  const displayNames = {
    'draft': 'Draft',
    'scheduled': 'Scheduled',
    'running': 'Running',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'expired': 'Expired'
  };
  return displayNames[status] || status;
}

/**
 * Get approval status display name
 * @param {string} status - Approval status
 * @returns {string} Display name
 */
export function getApprovalStatusDisplay(status) {
  const displayNames = {
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'cancelled': 'Cancelled'
  };
  return displayNames[status] || status;
}

/**
 * Get audit result display name
 * @param {string} result - Audit result
 * @returns {string} Display name
 */
export function getAuditResultDisplay(result) {
  const displayNames = {
    'success': 'Success',
    'failure': 'Failure',
    'partial': 'Partial'
  };
  return displayNames[result] || result;
}
