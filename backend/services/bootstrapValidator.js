/**
 * Bootstrap Validator
 * 
 * Validates the Platform Owner bootstrap process and ensures integrity.
 * Prevents unauthorized creation or modification of Platform Owner accounts.
 */

import Platform from '../models/Platform.js';
import User from '../models/UserModel.js';
import { platformOwnerProvisioner } from './platformOwnerProvisioner.js';

class BootstrapValidator {
  /**
   * Validate that Platform Owner can be created
   * @returns {Promise<Object>} Validation result
   */
  async validateCanCreatePlatformOwner() {
    // Check if Platform Owner already exists
    const existing = await User.findOne({ role: 'platform-owner' });
    if (existing) {
      return {
        valid: false,
        message: 'Platform Owner already exists',
        code: 'PLATFORM_OWNER_EXISTS'
      };
    }

    // Check if bootstrap is complete
    const platform = await Platform.getPlatform();
    if (platform && platform.bootstrapComplete) {
      return {
        valid: false,
        message: 'Bootstrap already complete',
        code: 'BOOTSTRAP_COMPLETE'
      };
    }

    return {
      valid: true,
      message: 'Platform Owner can be created',
      code: 'CAN_CREATE'
    };
  }

  /**
   * Validate that Platform Owner can be modified
   * @param {string} userId - User ID attempting to modify
   * @param {string} targetUserId - Target Platform Owner ID
   * @returns {Promise<Object>} Validation result
   */
  async validateCanModifyPlatformOwner(userId, targetUserId) {
    // Only bootstrap service should be able to modify Platform Owner
    // This is a security measure to prevent unauthorized changes
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return {
        valid: false,
        message: 'Target user not found',
        code: 'USER_NOT_FOUND'
      };
    }

    if (targetUser.role !== 'platform-owner') {
      return {
        valid: true,
        message: 'Target is not Platform Owner, modification allowed',
        code: 'NOT_PLATFORM_OWNER'
      };
    }

    // Platform Owner cannot be modified by anyone
    return {
      valid: false,
      message: 'Platform Owner cannot be modified',
      code: 'CANNOT_MODIFY_PLATFORM_OWNER'
    };
  }

  /**
   * Validate that Platform Owner can be deleted
   * @param {string} userId - User ID attempting to delete
   * @param {string} targetUserId - Target Platform Owner ID
   * @returns {Promise<Object>} Validation result
   */
  async validateCanDeletePlatformOwner(userId, targetUserId) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return {
        valid: false,
        message: 'Target user not found',
        code: 'USER_NOT_FOUND'
      };
    }

    if (targetUser.role !== 'platform-owner') {
      return {
        valid: true,
        message: 'Target is not Platform Owner, deletion allowed',
        code: 'NOT_PLATFORM_OWNER'
      };
    }

    // Platform Owner cannot be deleted
    return {
      valid: false,
      message: 'Platform Owner cannot be deleted',
      code: 'CANNOT_DELETE_PLATFORM_OWNER'
    };
  }

  /**
   * Validate that Platform Owner can be downgraded
   * @param {string} userId - User ID attempting to downgrade
   * @param {string} targetUserId - Target Platform Owner ID
   * @param {string} newRole - New role to assign
   * @returns {Promise<Object>} Validation result
   */
  async validateCanDowngradePlatformOwner(userId, targetUserId, newRole) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return {
        valid: false,
        message: 'Target user not found',
        code: 'USER_NOT_FOUND'
      };
    }

    if (targetUser.role !== 'platform-owner') {
      return {
        valid: true,
        message: 'Target is not Platform Owner, downgrade allowed',
        code: 'NOT_PLATFORM_OWNER'
      };
    }

    if (newRole === 'platform-owner') {
      return {
        valid: true,
        message: 'Same role, no downgrade',
        code: 'SAME_ROLE'
      };
    }

    // Platform Owner cannot be downgraded
    return {
      valid: false,
      message: 'Platform Owner cannot be downgraded',
      code: 'CANNOT_DOWNGRADE_PLATFORM_OWNER'
    };
  }

  /**
   * Validate Platform Owner integrity
   * @returns {Promise<Object>} Validation result
   */
  async validatePlatformOwnerIntegrity() {
    const platform = await Platform.getPlatform();
    
    if (!platform) {
      return {
        valid: false,
        message: 'Platform not found',
        code: 'PLATFORM_NOT_FOUND'
      };
    }

    const platformOwner = await User.findOne({ role: 'platform-owner' });

    if (platform.bootstrapComplete && !platformOwner) {
      return {
        valid: false,
        message: 'Bootstrap marked complete but no Platform Owner found',
        code: 'INTEGRITY_VIOLATION'
      };
    }

    if (!platform.bootstrapComplete && platformOwner) {
      return {
        valid: false,
        message: 'Platform Owner exists but bootstrap not marked complete',
        code: 'INTEGRITY_VIOLATION'
      };
    }

    if (platform.platformOwnerId && platformOwner) {
      if (platform.platformOwnerId.toString() !== platformOwner._id.toString()) {
        return {
          valid: false,
          message: 'Platform Owner ID mismatch',
          code: 'INTEGRITY_VIOLATION'
        };
      }
    }

    return {
      valid: true,
      message: 'Platform Owner integrity valid',
      code: 'INTEGRITY_VALID'
    };
  }

  /**
   * Validate Platform Owner credentials
   * @param {Object} credentials - Credentials to validate
   * @returns {Object} Validation result
   */
  validateCredentials(credentials) {
    return platformOwnerProvisioner.validateCredentials(credentials);
  }

  /**
   * Check if user is Platform Owner
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user is platform owner
   */
  async isPlatformOwner(userId) {
    return await platformOwnerProvisioner.isPlatformOwner(userId);
  }

  /**
   * Get Platform Owner validation summary
   * @returns {Promise<Object>} Validation summary
   */
  async getValidationSummary() {
    const platform = await Platform.getPlatform();
    const platformOwner = await User.findOne({ role: 'platform-owner' });
    const integrity = await this.validatePlatformOwnerIntegrity();

    return {
      platformExists: !!platform,
      bootstrapComplete: platform ? platform.bootstrapComplete : false,
      platformOwnerExists: !!platformOwner,
      platformOwnerId: platformOwner ? platformOwner._id : null,
      platformOwnerEmail: platformOwner ? platformOwner.email : null,
      integrityValid: integrity.valid,
      integrityMessage: integrity.message
    };
  }
}

// Global bootstrap validator instance
const globalBootstrapValidator = new BootstrapValidator();

/**
 * Get global bootstrap validator
 * @returns {BootstrapValidator} The global validator
 */
export function getBootstrapValidator() {
  return globalBootstrapValidator;
}

export default BootstrapValidator;
