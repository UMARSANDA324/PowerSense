/**
 * Platform Owner Provisioner
 * 
 * Responsible for provisioning the initial Platform Owner account.
 * The Platform Owner is the root account of the Litha Platform.
 * This provisioner should only be called by the Bootstrap Service.
 */

import User from '../models/UserModel.js';
import bcrypt from 'bcryptjs';

class PlatformOwnerProvisioner {
  constructor() {
    // Environment variables are read at validation time, not construction time
    this.requiredEnvVars = {};
  }

  /**
   * Validate required environment variables
   * @returns {Object} Validation result
   */
  validateEnvironmentVariables() {
    // Read environment variables at validation time (after dotenv is loaded)
    const envVars = {
      PLATFORM_OWNER_NAME: process.env.PLATFORM_OWNER_NAME,
      PLATFORM_OWNER_EMAIL: process.env.PLATFORM_OWNER_EMAIL,
      PLATFORM_OWNER_PASSWORD: process.env.PLATFORM_OWNER_PASSWORD
    };

    const missing = [];
    const empty = [];

    for (const [key, value] of Object.entries(envVars)) {
      if (value === undefined || value === null) {
        missing.push(key);
      } else if (value.trim() === '') {
        empty.push(key);
      }
    }

    if (missing.length > 0 || empty.length > 0) {
      let message = 'Missing required environment variables for Platform Owner bootstrap.';
      if (missing.length > 0) {
        message += ` Missing: ${missing.join(', ')}.`;
      }
      if (empty.length > 0) {
        message += ` Empty: ${empty.join(', ')}.`;
      }
      
      return {
        valid: false,
        message,
        missing,
        empty
      };
    }

    return {
      valid: true,
      message: 'All required environment variables present'
    };
  }

  /**
   * Provision a new Platform Owner
   * @returns {Promise<User>} The provisioned platform owner
   */
  async provision() {
    // Validate environment variables first
    const envValidation = this.validateEnvironmentVariables();
    if (!envValidation.valid) {
      throw new Error(envValidation.message);
    }

    // Read environment variables at provision time
    const envVars = {
      PLATFORM_OWNER_NAME: process.env.PLATFORM_OWNER_NAME,
      PLATFORM_OWNER_EMAIL: process.env.PLATFORM_OWNER_EMAIL,
      PLATFORM_OWNER_PASSWORD: process.env.PLATFORM_OWNER_PASSWORD
    };

    // Check if Platform Owner already exists
    const existing = await User.findOne({ role: 'platform-owner' });
    if (existing) {
      throw new Error('Platform Owner already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(envVars.PLATFORM_OWNER_PASSWORD, salt);

    // Create Platform Owner
    const platformOwner = await User.create({
      fullName: envVars.PLATFORM_OWNER_NAME,
      email: envVars.PLATFORM_OWNER_EMAIL,
      password: hashedPassword,
      role: 'platform-owner',
      phone: '',
      // Platform Owner does NOT require these assignments
      assignedFeeders: [],
      assignedInjectionSubstations: [],
      assignedWards: [],
      band: null,
      companyId: null, // Platform Owner belongs to Platform, not any company
      isPlatformOwner: true, // Platform metadata
      platformMetadata: {
        provisionedAt: new Date(),
        provisionedBy: 'bootstrap-service',
        globalAccess: true,
        globalPermissions: true
      }
    });

    console.log('[PlatformOwnerProvisioner] Platform Owner created:', {
      email: platformOwner.email,
      fullName: platformOwner.fullName,
      role: platformOwner.role
    });

    return platformOwner;
  }

  /**
   * Validate Platform Owner email format
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  validateEmail(email) {
    return email && email.includes('@') && email.includes('.');
  }

  /**
   * Validate Platform Owner password strength
   * @param {string} password - Password to validate
   * @returns {boolean} Whether password is valid
   */
  validatePassword(password) {
    return password && password.length >= 8;
  }

  /**
   * Check if a user is a Platform Owner
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user is platform owner
   */
  async isPlatformOwner(userId) {
    const user = await User.findById(userId);
    return user && user.role === 'platform-owner';
  }

  /**
   * Get Platform Owner by email
   * @param {string} email - Email address
   * @returns {Promise<User|null>} Platform owner or null
   */
  async getPlatformOwnerByEmail(email) {
    return await User.findOne({ 
      email, 
      role: 'platform-owner' 
    });
  }

  /**
   * Ensure Platform Owner cannot be downgraded
   * @param {string} userId - User ID
   * @param {string} newRole - New role to assign
   * @returns {boolean} Whether downgrade is prevented
   */
  async preventDowngrade(userId, newRole) {
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    if (user.role === 'platform-owner' && newRole !== 'platform-owner') {
      throw new Error('Cannot downgrade Platform Owner');
    }

    return true;
  }

  /**
   * Ensure Platform Owner cannot be deleted
   * @param {string} userId - User ID
   * @returns {boolean} Whether deletion is prevented
   */
  async preventDeletion(userId) {
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    if (user.role === 'platform-owner') {
      throw new Error('Cannot delete Platform Owner');
    }

    return true;
  }
}

// Global platform owner provisioner instance
const globalPlatformOwnerProvisioner = new PlatformOwnerProvisioner();

/**
 * Get global platform owner provisioner
 * @returns {PlatformOwnerProvisioner} The global provisioner
 */
export function getPlatformOwnerProvisioner() {
  return globalPlatformOwnerProvisioner;
}

export const platformOwnerProvisioner = globalPlatformOwnerProvisioner;

export default PlatformOwnerProvisioner;
