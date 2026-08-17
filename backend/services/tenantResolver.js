/**
 * Tenant Resolver
 * 
 * Resolves the tenant (Company) for a given request or user.
 * This service determines which company a user or request belongs to.
 */

import Company from '../models/Company.js';
import User from '../models/UserModel.js';

/**
 * Resolve tenant from user
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Object|null>} The company object or null
 */
export async function resolveTenantFromUser(userId) {
  try {
    const user = await User.findById(userId).select('companyId');
    if (!user) {
      return null;
    }

    // CRITICAL: Only resolve user's actual companyId
    // Do NOT fall back to default company - this causes cross-tenant data leakage
    if (user.companyId) {
      return await Company.findById(user.companyId);
    }

    // If user has no companyId, they don't belong to any company
    // This is expected for platform owners
    return null;
  } catch (error) {
    console.error('Error resolving tenant from user:', error);
    return null;
  }
}

/**
 * Resolve tenant from request
 * @param {Object} req - Express request object
 * @returns {Promise<Object|null>} The company object or null
 */
export async function resolveTenantFromRequest(req) {
  try {
    // If request has user, resolve from user
    if (req.user && req.user._id) {
      return await resolveTenantFromUser(req.user._id);
    }

    // If request has companyId in headers (for API calls)
    if (req.headers['x-company-id']) {
      return await Company.findById(req.headers['x-company-id']);
    }

    // CRITICAL: Do NOT fall back to default company
    // This prevents cross-tenant data leakage
    return null;
  } catch (error) {
    console.error('Error resolving tenant from request:', error);
    return null;
  }
}

/**
 * Get default company
 * @returns {Promise<Object|null>} The default company or null
 */
export async function getDefaultCompany() {
  try {
    // Try to find a company marked as default
    let defaultCompany = await Company.findOne({ isDefault: true });

    // If no default company exists, get the first active company
    if (!defaultCompany) {
      defaultCompany = await Company.findOne({ status: 'active' }).sort({ createdAt: 1 });
    }

    return defaultCompany;
  } catch (error) {
    console.error('Error getting default company:', error);
    return null;
  }
}

/**
 * Resolve tenant ID from user
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<ObjectId|null>} The company ID or null
 */
export async function resolveTenantIdFromUser(userId) {
  try {
    const user = await User.findById(userId).select('companyId');
    if (!user) {
      return null;
    }

    // CRITICAL: Only return user's actual companyId
    // Do NOT fall back to default company - this causes cross-tenant data leakage
    if (user.companyId) {
      return user.companyId;
    }

    // If user has no companyId, return null
    // This is expected for platform owners
    return null;
  } catch (error) {
    console.error('Error resolving tenant ID from user:', error);
    return null;
  }
}

/**
 * Validate tenant access
 * @param {ObjectId|string} userId - The user ID
 * @param {ObjectId|string} companyId - The company ID to check access to
 * @returns {Promise<boolean>} Whether the user has access to the company
 */
export async function validateTenantAccess(userId, companyId) {
  try {
    const userCompanyId = await resolveTenantIdFromUser(userId);
    
    // Platform owners can access any company
    const user = await User.findById(userId).select('role');
    if (user && user.role === 'platform-owner') {
      return true;
    }

    // Users can only access their own company
    return userCompanyId && userCompanyId.toString() === companyId.toString();
  } catch (error) {
    console.error('Error validating tenant access:', error);
    return false;
  }
}

/**
 * Get all companies for platform owner
 * @param {ObjectId|string} userId - The user ID
 * @returns {Promise<Array>} Array of companies
 */
export async function getAccessibleCompanies(userId) {
  try {
    const user = await User.findById(userId).select('role companyId');
    if (!user) {
      return [];
    }

    // Platform owners can access all companies
    if (user.role === 'platform-owner') {
      return await Company.find({ status: 'active' });
    }

    // Other users can only access their own company
    if (user.companyId) {
      const company = await Company.findById(user.companyId);
      return company ? [company] : [];
    }

    // Default to default company
    const defaultCompany = await getDefaultCompany();
    return defaultCompany ? [defaultCompany] : [];
  } catch (error) {
    console.error('Error getting accessible companies:', error);
    return [];
  }
}
