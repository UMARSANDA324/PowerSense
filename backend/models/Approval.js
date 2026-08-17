/**
 * Approval Model
 * 
 * Generic approval model for enterprise approval workflows.
 * Reusable across all modules for approval processes.
 */

import mongoose from 'mongoose';
import { tenantScopedSchema } from '../utils/tenantScope.js';

const approvalSchema = new mongoose.Schema({
  // Basic identification
  approvalType: {
    type: String,
    required: true,
    enum: ['power-schedule', 'maintenance', 'notification', 'infrastructure-change', 'admin-change', 'custom'],
    index: true
  },
  approvalId: {
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
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Approval status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Approval data (flexible for different approval types)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Approval decision
  decision: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decidedAt: {
      type: Date
    },
    reason: {
      type: String
    },
    comments: {
      type: String
    }
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

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Expiration
  expiresAt: {
    type: Date
  },

  // Reminders
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderCount: {
    type: Number,
    default: 0
  },

  // Workflow reference (if approval is part of a workflow)
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
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
approvalSchema.index({ companyId: 1, status: 1 });
approvalSchema.index({ requestedBy: 1, createdAt: -1 });
approvalSchema.index({ assignedTo: 1, status: 1 });
approvalSchema.index({ approvalType: 1, status: 1 });
approvalSchema.index({ expiresAt: 1, status: 1 });
approvalSchema.plugin(tenantScopedSchema);

// Method to approve
approvalSchema.methods.approve = function(approvedBy, reason = '', comments = '') {
  if (this.status !== 'pending') {
    throw new Error('Can only approve pending approvals');
  }

  this.status = 'approved';
  this.decision = {
    approvedBy,
    decidedAt: new Date(),
    reason,
    comments
  };

  this.statusHistory.push({
    status: 'approved',
    changedAt: new Date(),
    changedBy: approvedBy,
    reason,
    metadata: { comments }
  });
};

// Method to reject
approvalSchema.methods.reject = function(rejectedBy, reason = '', comments = '') {
  if (this.status !== 'pending') {
    throw new Error('Can only reject pending approvals');
  }

  this.status = 'rejected';
  this.decision = {
    approvedBy: rejectedBy,
    decidedAt: new Date(),
    reason,
    comments
  };

  this.statusHistory.push({
    status: 'rejected',
    changedAt: new Date(),
    changedBy: rejectedBy,
    reason,
    metadata: { comments }
  });
};

// Method to cancel
approvalSchema.methods.cancel = function(cancelledBy, reason = '') {
  if (this.status !== 'pending') {
    throw new Error('Can only cancel pending approvals');
  }

  this.status = 'cancelled';
  this.statusHistory.push({
    status: 'cancelled',
    changedAt: new Date(),
    changedBy: cancelledBy,
    reason
  });
};

// Method to reassign
approvalSchema.methods.reassign = function(newAssignee, reassignedBy, reason = '') {
  if (this.status !== 'pending') {
    throw new Error('Can only reassign pending approvals');
  }

  const oldAssignee = this.assignedTo;
  this.assignedTo = newAssignee;

  this.statusHistory.push({
    status: 'pending',
    changedAt: new Date(),
    changedBy: reassignedBy,
    reason: `Reassigned from ${oldAssignee} to ${newAssignee}. ${reason}`,
    metadata: { oldAssignee, newAssignee }
  });
};

// Method to send reminder
approvalSchema.methods.sendReminder = function() {
  if (this.status !== 'pending') {
    throw new Error('Can only send reminders for pending approvals');
  }

  this.reminderSent = true;
  this.reminderCount += 1;
};

// Static method to find pending approvals
approvalSchema.statics.findPending = function(companyId, assignedTo = null) {
  const query = {
    companyId,
    status: 'pending'
  };

  if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find expired approvals
approvalSchema.statics.findExpired = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  });
};

// Static method to find approvals by user
approvalSchema.statics.findByUser = function(userId, status = null) {
  const query = {
    $or: [
      { requestedBy: userId },
      { assignedTo: userId }
    ]
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ createdAt: -1 });
};

const Approval = mongoose.model('Approval', approvalSchema);

export default Approval;
