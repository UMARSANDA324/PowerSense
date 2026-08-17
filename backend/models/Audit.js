/**
 * Audit Model
 * 
 * Generic audit model for tracking sensitive actions.
 * Immutable records for security and compliance.
 */

import mongoose from 'mongoose';
import { tenantScopedSchema } from '../utils/tenantScope.js';

const auditSchema = new mongoose.Schema({
  // Basic identification
  actionType: {
    type: String,
    required: true,
    enum: [
      'power-on', 'power-off', 'maintenance',
      'create-admin', 'delete-admin', 'update-admin',
      'assign-feeder', 'assign-ward', 'unassign-feeder',
      'company-create', 'company-update', 'company-delete',
      'governance-owner-assigned', 'governance-owner-removed', 'governance-owner-transferred',
      'governance-lifecycle-changed', 'governance-brand-updated', 'governance-settings-updated',
      'company-super-admin-provisioned',
      'security-login', 'security-logout', 'security-lockout', 'security-password-reset', 'security-account-disabled', 'security-account-enabled',
      'security-policy-updated', 'security-risk-detected', 'security-session-terminated', 'security-session-terminated-all',
      'infrastructure-create', 'infrastructure-update', 'infrastructure-delete',
      'notification-send', 'notification-broadcast',
      'approval-request', 'approval-granted', 'approval-rejected',
      'workflow-create', 'workflow-update', 'workflow-cancel',
      'custom'
    ],
    index: true
  },
  auditId: {
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

  // Action details
  action: {
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

  // Action result
  result: {
    type: String,
    required: true,
    enum: ['success', 'failure', 'partial']
  },
  errorMessage: {
    type: String
  },
  errorCode: {
    type: String
  },

  // Additional context
  reason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Changes made (before/after)
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // Source information
  sourceIP: {
    type: String
  },
  userAgent: {
    type: String
  },
  device: {
    type: String
  },
  target: {
    type: String
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },

  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Audit records have their own timestamp field
});

// Indexes for common queries
auditSchema.index({ companyId: 1, timestamp: -1 });
auditSchema.index({ performedBy: 1, timestamp: -1 });
auditSchema.index({ actionType: 1, timestamp: -1 });
auditSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditSchema.index({ timestamp: -1 }); // For timeline queries
auditSchema.plugin(tenantScopedSchema);

// Static method to create audit record
auditSchema.statics.createAudit = function(auditData) {
  const audit = new this({
    auditId: generateAuditId(),
    timestamp: new Date(),
    ...auditData
  });
  return audit.save();
};

// Static method to find audits by company
auditSchema.statics.findByCompany = function(companyId, options = {}) {
  const { limit = 100, skip = 0, actionType, resourceType, startDate, endDate } = options;

  const query = { companyId };

  if (actionType) {
    query.actionType = actionType;
  }

  if (resourceType) {
    query.resourceType = resourceType;
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

// Static method to find audits by user
auditSchema.statics.findByUser = function(userId, options = {}) {
  const { limit = 100, skip = 0, actionType, startDate, endDate } = options;

  const query = { performedBy: userId };

  if (actionType) {
    query.actionType = actionType;
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

// Static method to find audits by resource
auditSchema.statics.findByResource = function(resourceType, resourceId, options = {}) {
  const { limit = 100, skip = 0 } = options;

  return this.find({
    resourceType,
    resourceId
  })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'fullName email');
};

// Static method to get audit statistics
auditSchema.statics.getStatistics = function(companyId, startDate, endDate) {
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
        _id: '$actionType',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Helper function to generate audit ID
function generateAuditId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AUD-${timestamp}-${random}`.toUpperCase();
}

const Audit = mongoose.model('Audit', auditSchema);

export default Audit;
