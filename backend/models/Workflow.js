/**
 * Workflow Model
 * 
 * Generic workflow model for lifecycle management.
 * Reusable across all modules for state transitions.
 */

import mongoose from 'mongoose';
import { tenantScopedSchema } from '../utils/tenantScope.js';

const workflowSchema = new mongoose.Schema({
  // Basic identification
  workflowType: {
    type: String,
    required: true,
    enum: ['power-schedule', 'maintenance', 'notification', 'infrastructure-change', 'admin-change', 'custom'],
    index: true
  },
  workflowId: {
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Workflow status
  status: {
    type: String,
    required: true,
    enum: ['draft', 'scheduled', 'running', 'completed', 'cancelled', 'expired'],
    default: 'draft',
    index: true
  },

  // Workflow data (flexible for different workflow types)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Scheduling
  scheduledAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },

  // Status history (immutable)
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],

  // Approval reference (if workflow requires approval)
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Approval'
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Progress tracking
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Error handling
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed,
    occurredAt: Date
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Source IP for audit
  sourceIP: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for common queries
workflowSchema.index({ companyId: 1, status: 1 });
workflowSchema.index({ createdBy: 1, createdAt: -1 });
workflowSchema.index({ workflowType: 1, status: 1 });
workflowSchema.index({ scheduledAt: 1, status: 1 });
workflowSchema.plugin(tenantScopedSchema);

// Method to transition status
workflowSchema.methods.transitionStatus = function(newStatus, changedBy, reason = '', metadata = {}) {
  // Validate status transition
  const validTransitions = {
    'draft': ['scheduled', 'cancelled'],
    'scheduled': ['running', 'cancelled', 'expired'],
    'running': ['completed', 'cancelled'],
    'completed': [], // Terminal state
    'cancelled': [], // Terminal state
    'expired': [] // Terminal state
  };

  const allowedTransitions = validTransitions[this.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }

  // Add to history
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy,
    reason,
    metadata
  });

  // Update status
  this.status = newStatus;

  // Update timestamps based on status
  const now = new Date();
  switch (newStatus) {
    case 'scheduled':
      this.scheduledAt = now;
      break;
    case 'running':
      this.startedAt = now;
      break;
    case 'completed':
      this.completedAt = now;
      this.progress = 100;
      break;
    case 'cancelled':
      this.cancelledAt = now;
      break;
    case 'expired':
      this.expiresAt = now;
      break;
  }
};

// Method to update progress
workflowSchema.methods.updateProgress = function(progress, metadata = {}) {
  this.progress = Math.min(100, Math.max(0, progress));
  
  if (this.progress === 100 && this.status === 'running') {
    this.transitionStatus('completed', this.createdBy, 'Progress reached 100%', metadata);
  }
};

// Method to set error
workflowSchema.methods.setError = function(error, code = null, details = {}) {
  this.error = {
    message: error,
    code,
    details,
    occurredAt: new Date()
  };
};

// Static method to find active workflows
workflowSchema.statics.findActive = function(companyId) {
  return this.find({
    companyId,
    status: { $in: ['draft', 'scheduled', 'running'] }
  }).sort({ createdAt: -1 });
};

// Static method to find overdue workflows
workflowSchema.statics.findOverdue = function() {
  return this.find({
    status: 'scheduled',
    scheduledAt: { $lt: new Date() }
  });
};

const Workflow = mongoose.model('Workflow', workflowSchema);

export default Workflow;
