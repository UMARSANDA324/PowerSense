/**
 * Tenant Middleware
 * 
 * Middleware for tenant isolation and context management.
 * This middleware determines the active company for each request
 * and provides tenant filtering capabilities.
 * 
 * IMPORTANT: This middleware is designed to be non-breaking.
 * It quietly resolves tenant context without changing existing behavior.
 */

import { resolveTenantFromRequest, resolveTenantIdFromUser } from '../services/tenantResolver.js';
import { getTenantContext, initTenantContext } from '../services/tenantContext.js';

/**
 * Tenant middleware - resolves tenant context for each request
 * This middleware is non-breaking and maintains backward compatibility
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function tenantMiddleware(req, res, next) {
  try {
    // Initialize tenant context from request
    const tenantContext = await initTenantContext(req);
    
    // Attach tenant information to request for use in controllers
    // This is done quietly without changing existing behavior
    req.tenantContext = tenantContext;
    req.companyId = tenantContext.getCompanyId();
    req.company = tenantContext.getCompany();
    
    // Continue with the request
    next();
  } catch (error) {
    console.error('Error in tenant middleware:', error);
    // Continue even if tenant resolution fails to maintain backward compatibility
    next();
  }
}

/**
 * Require tenant middleware - ensures tenant context is available
 * This is optional and can be used where tenant isolation is explicitly needed
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function requireTenant(req, res, next) {
  try {
    const tenantContext = getTenantContext();
    
    if (!tenantContext.getCompanyId() && !tenantContext.isPlatformOwnerUser()) {
      return res.status(400).json({
        message: 'Tenant context not available',
        code: 'TENANT_NOT_RESOLVED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in require tenant middleware:', error);
    res.status(500).json({
      message: 'Error resolving tenant context',
      code: 'TENANT_RESOLUTION_ERROR'
    });
  }
}

/**
 * Tenant filter middleware - adds tenant filter to request
 * This can be used to automatically filter queries by tenant
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function tenantFilterMiddleware(req, res, next) {
  try {
    const tenantContext = getTenantContext();
    
    // Add tenant filter to request for use in controllers
    // This is non-breaking - controllers can choose to use it or not
    req.tenantFilter = tenantContext.getTenantFilter();
    
    next();
  } catch (error) {
    console.error('Error in tenant filter middleware:', error);
    // Continue with empty filter to maintain backward compatibility
    req.tenantFilter = {};
    next();
  }
}

/**
 * Platform owner middleware - checks if user is platform owner
 * This is for future use when platform owner features are implemented
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function platformOwnerMiddleware(req, res, next) {
  try {
    const tenantContext = getTenantContext();
    
    if (!tenantContext.isPlatformOwnerUser()) {
      return res.status(403).json({
        message: 'Platform owner access required',
        code: 'PLATFORM_OWNER_REQUIRED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in platform owner middleware:', error);
    res.status(500).json({
      message: 'Error checking platform owner status',
      code: 'PLATFORM_OWNER_CHECK_ERROR'
    });
  }
}

/**
 * Company access middleware - validates user has access to the requested company
 * This is for future use when multi-company operations are implemented
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function companyAccessMiddleware(req, res, next) {
  try {
    const tenantContext = getTenantContext();
    const requestedCompanyId = req.params.companyId || req.body.companyId;
    
    if (!requestedCompanyId) {
      return res.status(400).json({
        message: 'Company ID not specified',
        code: 'COMPANY_ID_REQUIRED'
      });
    }
    
    if (!tenantContext.canAccessCompany(requestedCompanyId)) {
      return res.status(403).json({
        message: 'Access denied to this company',
        code: 'COMPANY_ACCESS_DENIED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in company access middleware:', error);
    res.status(500).json({
      message: 'Error validating company access',
      code: 'COMPANY_ACCESS_ERROR'
    });
  }
}

/**
 * Soft tenant middleware - attempts to resolve tenant but doesn't fail if unsuccessful
 * This is the recommended middleware for backward compatibility
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function softTenantMiddleware(req, res, next) {
  try {
    // Attempt to resolve tenant context
    const tenantContext = await initTenantContext(req);
    
    // Attach tenant information if available
    if (tenantContext.getCompanyId()) {
      req.tenantContext = tenantContext;
      req.companyId = tenantContext.getCompanyId();
      req.company = tenantContext.getCompany();
    }
    
    // Always continue regardless of tenant resolution
    next();
  } catch (error) {
    console.error('Error in soft tenant middleware:', error);
    // Continue even if tenant resolution fails
    next();
  }
}

export default {
  tenantMiddleware,
  requireTenant,
  tenantFilterMiddleware,
  platformOwnerMiddleware,
  companyAccessMiddleware,
  softTenantMiddleware
};
