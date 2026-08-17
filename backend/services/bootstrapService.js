/**
 * Bootstrap Service
 * 
 * Responsible for bootstrapping the Litha Platform with the initial Platform Owner.
 * This service runs on application startup and ensures the Platform Owner exists.
 * The process is idempotent - running multiple times will never create duplicates.
 */

import Platform from '../models/Platform.js';
import User from '../models/UserModel.js';
import Company from '../models/Company.js';
import { platformOwnerProvisioner } from './platformOwnerProvisioner.js';
import bcrypt from 'bcryptjs';

class BootstrapService {
  constructor() {
    this._bootstrapped = false;
  }

  /**
   * Run the bootstrap process
   * @returns {Promise<Object>} Bootstrap result
   */
  async bootstrap() {
    if (this._bootstrapped) {
      return {
        success: true,
        message: 'Already bootstrapped',
        bootstrapped: true
      };
    }

    try {
      console.log('[Bootstrap] Starting platform bootstrap...');

      // Step 1: Ensure Platform exists
      const platform = await this.ensurePlatform();
      console.log('[Bootstrap] Platform ensured:', platform.platformId);

      // Step 2: Check for existing Platform Owner (database state is source of truth)
      const existingPlatformOwner = await this.findExistingPlatformOwner();
      if (existingPlatformOwner) {
        console.log('[Bootstrap] Existing Platform Owner found:', existingPlatformOwner.email);
        
        // Sync password if it doesn't match .env (self-healing)
        await this.syncPlatformOwnerPassword(existingPlatformOwner);
        
        // Reconcile platform state with database state
        await Platform.markBootstrapComplete(existingPlatformOwner._id);
        
        this._bootstrapped = true;
        return {
          success: true,
          message: 'Bootstrap complete with existing Platform Owner',
          bootstrapped: true,
          platformOwnerId: existingPlatformOwner._id,
          action: 'reconciled'
        };
      }

      // Step 3: Platform Owner does not exist - create it (self-healing)
      console.log('[Bootstrap] Platform Owner not found, provisioning from .env...');
      
      // Validate environment variables before provisioning
      const envValidation = platformOwnerProvisioner.validateEnvironmentVariables();
      if (!envValidation.valid) {
        console.error('[Bootstrap] Environment variable validation failed:', envValidation.message);
        return {
          success: false,
          message: envValidation.message,
          bootstrapped: false,
          error: 'MISSING_ENV_VARS'
        };
      }

      // Provision new Platform Owner
      const platformOwner = await platformOwnerProvisioner.provision();
      console.log('[Bootstrap] Platform Owner provisioned:', platformOwner.email);

      // Mark bootstrap as complete
      await Platform.markBootstrapComplete(platformOwner._id);
      console.log('[Bootstrap] Bootstrap marked as complete');

      this._bootstrapped = true;

      return {
        success: true,
        message: 'Bootstrap complete - Platform Owner created',
        bootstrapped: true,
        platformOwnerId: platformOwner._id,
        action: 'created'
      };

    } catch (error) {
      console.error('[Bootstrap] Bootstrap failed:', error);
      return {
        success: false,
        message: 'Bootstrap failed',
        error: error.message
      };
    }
  }

  /**
   * Ensure the Platform exists
   * @returns {Promise<Platform>} The platform
   */
  async ensurePlatform() {
    return await Platform.createInitialPlatform();
  }

  /**
   * Find existing Platform Owner
   * @returns {Promise<User|null>} Existing platform owner or null
   */
  async findExistingPlatformOwner() {
    return await User.findOne({ role: 'platform-owner' });
  }

  /**
   * Sync Platform Owner password with .env (self-healing)
   * @param {User} platformOwner - The platform owner user
   * @returns {Promise<void>}
   */
  async syncPlatformOwnerPassword(platformOwner) {
    try {
      const envPassword = process.env.PLATFORM_OWNER_PASSWORD;
      if (!envPassword) {
        return;
      }

      // Check if current password matches .env
      const isMatch = await bcrypt.compare(envPassword, platformOwner.password);
      
      if (isMatch) {
        return;
      }

      // Password doesn't match - update it using direct DB update to bypass pre-save hook
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(envPassword, salt);
      
      // Use direct update to bypass pre-save hook (which would double-hash)
      await User.findByIdAndUpdate(platformOwner._id, { password: hashedPassword });
    } catch (error) {
      console.error('[Bootstrap] Error syncing Platform Owner password:', error);
      // Don't fail bootstrap if password sync fails
    }
  }

  /**
   * Check if bootstrap is complete
   * @returns {Promise<boolean>} Whether bootstrap is complete
   */
  async isBootstrapComplete() {
    return await Platform.isBootstrapComplete();
  }

  /**
   * Get Platform Owner
   * @returns {Promise<User|null>} Platform owner or null
   */
  async getPlatformOwner() {
    const platform = await Platform.getPlatform();
    if (!platform || !platform.platformOwnerId) {
      return null;
    }
    return await User.findById(platform.platformOwnerId);
  }

  /**
   * Reset bootstrap (for testing only - should not be used in production)
   * @returns {Promise<boolean>} Whether reset was successful
   */
  async resetBootstrap() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset bootstrap in production');
    }

    const platform = await Platform.getPlatform();
    if (platform) {
      platform.bootstrapComplete = false;
      platform.bootstrapCompletedAt = null;
      platform.platformOwnerId = null;
      await platform.save();
      this._bootstrapped = false;
      return true;
    }
    return false;
  }
}

// Global bootstrap service instance
const globalBootstrapService = new BootstrapService();

/**
 * Get global bootstrap service
 * @returns {BootstrapService} The global bootstrap service
 */
export function getBootstrapService() {
  return globalBootstrapService;
}

/**
 * Run bootstrap
 * @returns {Promise<Object>} Bootstrap result
 */
export async function runBootstrap() {
  return await globalBootstrapService.bootstrap();
}

export default BootstrapService;
