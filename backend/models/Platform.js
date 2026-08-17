/**
 * Platform Model
 * 
 * Represents the Nikola Platform itself.
 * The Platform is the root entity above all companies.
 * Platform Owner belongs to the Platform, not to any company.
 */

import mongoose from 'mongoose';

const platformSchema = new mongoose.Schema({
  // Platform identification
  platformId: {
    type: String,
    required: true,
    unique: true,
    default: 'LITHA_PLATFORM'
  },
  name: {
    type: String,
    required: true,
    default: 'Nikola Platform'
  },

  // Platform configuration
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },

  // Platform status
  status: {
    type: String,
    required: true,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },

  // Bootstrap status
  bootstrapComplete: {
    type: Boolean,
    default: false
  },
  bootstrapCompletedAt: {
    type: Date
  },

  // Platform owner reference
  platformOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Platform settings
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
platformSchema.index({ platformOwnerId: 1 });
platformSchema.index({ status: 1 });

// Static method to get the platform (supports legacy LITHA_PLATFORM and NIKOLA_PLATFORM)
platformSchema.statics.getPlatform = async function() {
  return await this.findOne({ platformId: { $in: ['NIKOLA_PLATFORM', 'LITHA_PLATFORM'] } });
};

// Static method to check if bootstrap is complete
platformSchema.statics.isBootstrapComplete = async function() {
  const platform = await this.getPlatform();
  return platform ? platform.bootstrapComplete : false;
};

// Static method to mark bootstrap as complete
platformSchema.statics.markBootstrapComplete = async function(platformOwnerId) {
  const platform = await this.getPlatform();
  if (platform) {
    platform.bootstrapComplete = true;
    platform.bootstrapCompletedAt = new Date();
    platform.platformOwnerId = platformOwnerId;
    return await platform.save();
  }
  return null;
};

// Static method to create initial platform
platformSchema.statics.createInitialPlatform = async function() {
  const existing = await this.getPlatform();
  if (existing) {
    return existing;
  }

  return await this.create({
    platformId: 'LITHA_PLATFORM',
    name: 'Nikola Platform',
    version: '1.0.0',
    status: 'active',
    bootstrapComplete: false
  });
};

const Platform = mongoose.model('Platform', platformSchema);

export default Platform;
