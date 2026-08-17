/**
 * Tenant Context Service
 * 
 * Manages tenant context throughout the request lifecycle.
 * Provides a centralized way to access and manage tenant information.
 */

import { resolveTenantFromRequest, resolveTenantIdFromUser, getDefaultCompany } from './tenantResolver.js';

/**
 * Tenant context class
 */
class TenantContext {
  constructor() {
    this.companyId = null;
    this.company = null;
    this.userId = null;
    this.isPlatformOwner = false;
    this.isCompanySuperAdmin = false;
    this.tenantIsolationEnabled = false;
  }

  /**
   * Initialize tenant context from request
   * @param {Object} req - Express request object
   */
  async initializeFromRequest(req) {
    try {
      this.userId = req.user?._id;
      
      // CRITICAL: Tenant isolation is ALWAYS enabled for multi-tenant security
      // This prevents cross-tenant data leakage
      this.tenantIsolationEnabled = true;

      // Resolve tenant
      const company = await resolveTenantFromRequest(req);
      if (company) {
        this.companyId = company._id;
        this.company = company;
      }

      // Check user role for platform access
      if (req.user) {
        this.isPlatformOwner = req.user.role === 'platform-owner';
        this.isCompanySuperAdmin = req.user.role === 'company-super-admin' || req.user.role === 'super-admin';
      }
    } catch (error) {
      console.error('Error initializing tenant context:', error);
    }
  }

  /**
   * Initialize tenant context from user ID
   * @param {ObjectId|string} userId - The user ID
   */
  async initializeFromUser(userId) {
    try {
      this.userId = userId;
      // CRITICAL: Tenant isolation is ALWAYS enabled for multi-tenant security
      this.tenantIsolationEnabled = true;

      const companyId = await resolveTenantIdFromUser(userId);
      if (companyId) {
        this.companyId = companyId;
        const defaultCompany = await getDefaultCompany();
        if (defaultCompany && defaultCompany._id.toString() === companyId.toString()) {
          this.company = defaultCompany;
        }
      }

      const user = await User.findById(userId).select('role');
      if (user) {
        this.isPlatformOwner = user.role === 'platform-owner' || user.role === 'super-admin';
        this.isCompanySuperAdmin = user.role === 'company-super-admin' || user.role === 'super-admin';
      }
    } catch (error) {
      console.error('Error initializing tenant context from user:', error);
    }
  }

  /**
   * Get current company ID
   * @returns {ObjectId|null} The company ID
   */
  getCompanyId() {
    return this.companyId;
  }

  /**
   * Get current company
   * @returns {Object|null} The company object
   */
  getCompany() {
    return this.company;
  }

  /**
   * Check if tenant isolation is enabled
   * @returns {boolean} Whether tenant isolation is enabled
   */
  isIsolationEnabled() {
    return this.tenantIsolationEnabled;
  }

  /**
   * Check if user is platform owner
   * @returns {boolean} Whether user is platform owner
   */
  isPlatformOwnerUser() {
    return this.isPlatformOwner;
  }

  /**
   * Check if user is company super admin
   * @returns {boolean} Whether user is company super admin
   */
  isCompanySuperAdminUser() {
    return this.isCompanySuperAdmin;
  }

  /**
   * Check if user can access a specific company
   * @param {ObjectId|string} companyId - The company ID to check
   * @returns {boolean} Whether user can access the company
   */
  canAccessCompany(companyId) {
    // Platform owners can access any company
    if (this.isPlatformOwner) {
      return true;
    }

    // Users can only access their own company
    return this.companyId && this.companyId.toString() === companyId.toString();
  }

  /**
   * Get tenant filter for database queries
   * @returns {Object} MongoDB filter object
   */
  getTenantFilter() {
    if (!this.tenantIsolationEnabled) {
      return {}; // No filtering when isolation is disabled
    }

    if (this.isPlatformOwner) {
      return {}; // Platform owners see all data
    }

    if (this.companyId) {
      return { companyId: this.companyId };
    }

    return {}; // No company ID, no filtering
  }

  /**
   * Clear tenant context
   */
  clear() {
    this.companyId = null;
    this.company = null;
    this.userId = null;
    this.isPlatformOwner = false;
    this.isCompanySuperAdmin = false;
  }
}

// Global tenant context instance
const globalTenantContext = new TenantContext();

/**
 * Get global tenant context
 * @returns {TenantContext} The global tenant context
 */
export function getTenantContext() {
  return globalTenantContext;
}

/**
 * Create new tenant context instance
 * @returns {TenantContext} A new tenant context instance
 */
export function createTenantContext() {
  return new TenantContext();
}

/**
 * Initialize tenant context from request
 * @param {Object} req - Express request object
 * @returns {Promise<TenantContext>} The initialized tenant context
 */
export async function initTenantContext(req) {
  await globalTenantContext.initializeFromRequest(req);
  return globalTenantContext;
}

/**
 * Middleware to initialize tenant context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function tenantContextMiddleware(req, res, next) {
  try {
    await initTenantContext(req);
    
    // Attach tenant context to request for use in controllers
    req.tenantContext = globalTenantContext;
    req.companyId = globalTenantContext.getCompanyId();
    req.company = globalTenantContext.getCompany();
    
    next();
  } catch (error) {
    console.error('Error in tenant context middleware:', error);
    next(); // Continue even if context initialization fails
  }
}

export default TenantContext;
