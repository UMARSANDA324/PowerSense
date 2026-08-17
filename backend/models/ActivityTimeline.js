/**
 * Activity Timeline Model
 * 
 * Generic activity timeline model for chronological event tracking.
 * Reusable across all modules for activity feeds and dashboards.
 */

import mongoose from 'mongoose';
import { tenantScopedSchema } from '../utils/tenantScope.js';

const activityTimelineSchema = new mongoose.Schema({
  // Basic identification
  activityType: {
    type: String,
    required: true,
    enum: [
      'power-on', 'power-off', 'maintenance-scheduled', 'maintenance-completed',
      'admin-assigned', 'admin-updated', 'admin-deleted',
      'feeder-linked', 'ward-linked', 'substation-linked',
      'notification-sent', 'notification-broadcast',
      'company-created', 'company-updated',
      'infrastructure-changed',
      'approval-requested', 'approval-granted', 'approval-rejected',
      'workflow-started', 'workflow-completed', 'workflow-cancelled',
      'custom'
    ],
    index: true
  },
  activityId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Company context
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // User context
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userRole: {
    type: String,
    required: true
  },

  // Activity details
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },

  // Target resource
  resourceType: {
    type: String,
    required: true,
    enum: ['feeder', 'substation', 'ward', 'lga', 'state', 'company', 'user', 'notification', 'workflow', 'approval', 'custom']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  resourceName: {
    type: String
  },

  // Activity data (flexible for different activity types)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Visibility
  visibility: {
    type: String,
    enum: ['public', 'internal', 'private'],
    default: 'internal'
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // References to related records
  auditId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Audit'
  },
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Approval'
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Activity timeline has its own timestamp field
});

// Indexes for common queries
activityTimelineSchema.index({ companyId: 1, timestamp: -1 });
activityTimelineSchema.index({ performedBy: 1, timestamp: -1 });
activityTimelineSchema.index({ activityType: 1, timestamp: -1 });
activityTimelineSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
activityTimelineSchema.index({ timestamp: -1 }); // For timeline queries
activityTimelineSchema.index({ visibility: 1, timestamp: -1 });
activityTimelineSchema.plugin(tenantScopedSchema);

// Static method to create activity
activityTimelineSchema.statics.createActivity = function(activityData) {
  const activity = new this({
    activityId: generateActivityId(),
    timestamp: new Date(),
    ...activityData
  });
  return activity.save();
};

// Static method to find timeline by company
activityTimelineSchema.statics.findByCompany = function(companyId, options = {}) {
  const { limit = 50, skip = 0, activityType, resourceType, visibility, startDate, endDate } = options;

  const query = { companyId };

  if (activityType) {
    query.activityType = activityType;
  }

  if (resourceType) {
    query.resourceType = resourceType;
  }

  if (visibility) {
    query.visibility = visibility;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'fullName email');
};

// Static method to find timeline by user
activityTimelineSchema.statics.findByUser = function(userId, options = {}) {
  const { limit = 50, skip = 0, activityType, startDate, endDate } = options;

  const query = { performedBy: userId };

  if (activityType) {
    query.activityType = activityType;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'fullName email');
};

// Static method to find timeline by resource
activityTimelineSchema.statics.findByResource = function(resourceType, resourceId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    resourceType,
    resourceId
  })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'fullName email');
};

// Static method to get recent activities for dashboard
activityTimelineSchema.statics.getRecentActivities = function(companyId, limit = 20) {
  return this.find({
    companyId,
    visibility: { $in: ['public', 'internal'] }
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('performedBy', 'fullName email');
};

// Static method to get activity statistics
activityTimelineSchema.statics.getStatistics = function(companyId, startDate, endDate) {
  const matchStage = {
    companyId,
    timestamp: {}
  };

  if (startDate) {
    matchStage.timestamp.$gte = new Date(startDate);
  }

  if (endDate) {
    matchStage.timestamp.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Helper function to generate activity ID
function generateActivityId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ACT-${timestamp}-${random}`.toUpperCase();
}

const ActivityTimeline = mongoose.model('ActivityTimeline', activityTimelineSchema);

export default ActivityTimeline;
