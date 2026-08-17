/**
 * Activity Timeline Engine
 * 
 * Generic activity timeline service for chronological event tracking.
 * Reusable across all modules for activity feeds and dashboards.
 */

import ActivityTimeline from '../models/ActivityTimeline.js';
import { getRuntimeContext } from './runtimeContext.js';

/**
 * Activity Timeline Engine class
 * Provides methods for creating and querying activity timeline events
 */
class ActivityTimelineEngine {
  /**
   * Create an activity
   * @param {Object} activityData - Activity data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async createActivity(activityData) {
    const context = getRuntimeContext();
    const user = context.getUser();
    const company = context.getCompany();

    const activity = new ActivityTimeline({
      companyId: company._id,
      performedBy: user._id,
      userRole: context.getRole(),
      ...activityData
    });

    return await activity.save();
  }

  /**
   * Create activity asynchronously (non-blocking)
   * @param {Object} activityData - Activity data
   * @returns {Promise<void>}
   */
  async createActivityAsync(activityData) {
    // Create activity without awaiting
    this.createActivity(activityData).catch(error => {
      console.error('Failed to create activity:', error);
    });
  }

  /**
   * Get activity by ID
   * @param {string} activityId - Activity ID
   * @returns {Promise<ActivityTimeline|null>} Activity or null
   */
  async getActivity(activityId) {
    return await ActivityTimeline.findOne({ activityId });
  }

  /**
   * Get activity by MongoDB ID
   * @param {string} id - MongoDB ID
   * @returns {Promise<ActivityTimeline|null>} Activity or null
   */
  async getActivityById(id) {
    return await ActivityTimeline.findById(id);
  }

  /**
   * Get timeline by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of activities
   */
  async getTimelineByCompany(companyId, options = {}) {
    return await ActivityTimeline.findByCompany(companyId, options);
  }

  /**
   * Get timeline by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of activities
   */
  async getTimelineByUser(userId, options = {}) {
    return await ActivityTimeline.findByUser(userId, options);
  }

  /**
   * Get timeline by resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of activities
   */
  async getTimelineByResource(resourceType, resourceId, options = {}) {
    return await ActivityTimeline.findByResource(resourceType, resourceId, options);
  }

  /**
   * Get recent activities for dashboard
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Array of recent activities
   */
  async getRecentActivities(companyId, limit = 20) {
    return await ActivityTimeline.getRecentActivities(companyId, limit);
  }

  /**
   * Get activity statistics
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Activity statistics
   */
  async getStatistics(companyId, startDate, endDate) {
    return await ActivityTimeline.getStatistics(companyId, startDate, endDate);
  }

  /**
   * Log power control activity
   * @param {string} action - Action type (on/off/maintenance)
   * @param {string} feederId - Feeder ID
   * @param {string} feederName - Feeder name
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logPowerControl(action, feederId, feederName, data = {}) {
    const activityType = action === 'maintenance' ? 'maintenance-scheduled' : `power-${action}`;
    const title = `Feeder ${action === 'on' ? 'ON' : action === 'off' ? 'OFF' : 'Maintenance'}`;
    
    return await this.createActivity({
      activityType,
      title,
      description: `${title} for ${feederName}`,
      resourceType: 'feeder',
      resourceId: feederId,
      resourceName: feederName,
      data
    });
  }

  /**
   * Log admin activity
   * @param {string} actionType - Action type (assigned/updated/deleted)
   * @param {string} userId - Target user ID
   * @param {string} userName - Target user name
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logAdminActivity(actionType, userId, userName, data = {}) {
    return await this.createActivity({
      activityType: `admin-${actionType}`,
      title: `Admin ${actionType}`,
      description: `${actionType} admin: ${userName}`,
      resourceType: 'user',
      resourceId: userId,
      resourceName: userName,
      data
    });
  }

  /**
   * Log infrastructure activity
   * @param {string} actionType - Action type (linked/changed)
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {string} resourceName - Resource name
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logInfrastructureActivity(actionType, resourceType, resourceId, resourceName, data = {}) {
    return await this.createActivity({
      activityType: `${resourceType}-${actionType}`,
      title: `${resourceType} ${actionType}`,
      description: `${actionType} ${resourceType}: ${resourceName}`,
      resourceType,
      resourceId,
      resourceName,
      data
    });
  }

  /**
   * Log notification activity
   * @param {string} actionType - Action type (sent/broadcast)
   * @param {string} notificationId - Notification ID
   * @param {string} description - Description
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logNotificationActivity(actionType, notificationId, description, data = {}) {
    return await this.createActivity({
      activityType: `notification-${actionType}`,
      title: `Notification ${actionType}`,
      description,
      resourceType: 'notification',
      resourceId: notificationId,
      data
    });
  }

  /**
   * Log approval activity
   * @param {string} actionType - Action type (requested/granted/rejected)
   * @param {string} approvalId - Approval ID
   * @param {string} description - Description
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logApprovalActivity(actionType, approvalId, description, data = {}) {
    return await this.createActivity({
      activityType: `approval-${actionType}`,
      title: `Approval ${actionType}`,
      description,
      resourceType: 'approval',
      resourceId: approvalId,
      data
    });
  }

  /**
   * Log workflow activity
   * @param {string} actionType - Action type (started/completed/cancelled)
   * @param {string} workflowId - Workflow ID
   * @param {string} description - Description
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logWorkflowActivity(actionType, workflowId, description, data = {}) {
    return await this.createActivity({
      activityType: `workflow-${actionType}`,
      title: `Workflow ${actionType}`,
      description,
      resourceType: 'workflow',
      resourceId: workflowId,
      data
    });
  }

  /**
   * Log company activity
   * @param {string} actionType - Action type (created/updated)
   * @param {string} companyId - Company ID
   * @param {string} companyName - Company name
   * @param {Object} data - Additional data
   * @returns {Promise<ActivityTimeline>} Created activity
   */
  async logCompanyActivity(actionType, companyId, companyName, data = {}) {
    return await this.createActivity({
      activityType: `company-${actionType}`,
      title: `Company ${actionType}`,
      description: `${actionType} company: ${companyName}`,
      resourceType: 'company',
      resourceId: companyId,
      resourceName: companyName,
      data
    });
  }

  /**
   * Search activities by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of activities
   */
  async searchActivities(criteria, options = {}) {
    const { companyId, activityType, resourceType, performedBy, visibility, startDate, endDate } = criteria;
    const { limit = 50, skip = 0 } = options;

    const query = {};

    if (companyId) query.companyId = companyId;
    if (activityType) query.activityType = activityType;
    if (resourceType) query.resourceType = resourceType;
    if (performedBy) query.performedBy = performedBy;
    if (visibility) query.visibility = visibility;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return await ActivityTimeline.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'fullName email');
  }
}

// Global activity timeline engine instance
const globalActivityTimelineEngine = new ActivityTimelineEngine();

/**
 * Get global activity timeline engine
 * @returns {ActivityTimelineEngine} The global activity timeline engine
 */
export function getActivityTimelineEngine() {
  return globalActivityTimelineEngine;
}

/**
 * Create new activity timeline engine instance
 * @returns {ActivityTimelineEngine} A new activity timeline engine instance
 */
export function createActivityTimelineEngine() {
  return new ActivityTimelineEngine();
}

export default ActivityTimelineEngine;
