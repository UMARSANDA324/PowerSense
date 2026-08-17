/**
 * Runtime Context Service
 * 
 * Central service for managing runtime context throughout the request lifecycle.
 * This service provides a unified interface for accessing current user, company,
 * role, permissions, and operational scope information.
 * 
 * The context is resolved once per request and reused, eliminating duplicated
 * lookup logic and improving performance.
 */

import { resolveTenantFromUser, getDefaultCompany } from './tenantResolver.js';
import { getPermissionsForRole, getRoleDisplayInfo, hasHigherOrEqualPrivilege } from '../config/identityConfig.js';
import User from '../models/UserModel.js';
import Company from '../models/Company.js';
import Feeder from '../models/Location/Feeder.js';
import InjectionSubstation from '../models/Location/InjectionSubstation.js';
import Ward from '../models/Location/Ward.js';
import State from '../models/Location/State.js';
import { tenantScopeStorage } from '../utils/tenantScope.js';
import { isValidObjectId, toObjectId, parseResourceRef } from '../utils/objectIdUtils.js';

/**
 * Runtime Context class
 * Encapsulates all context information for the current request
 */
class RuntimeContext {
  constructor() {
    this.user = null;
    this.company = null;
    this.role = null;
    this.roleInfo = null;
    this.permissions = [];
    this.assignedFeeders = [];
    this.assignedInjectionSubstations = [];
    this.assignedWards = [];
    this.coverageStates = [];
    this.coverageStateNames = [];
    this.coverageStateIds = [];
    this.band = null;
    this.operationalScope = null;
    this.isPlatformOwner = false;
    this.isCompanySuperAdmin = false;
    this.isRegionalAdmin = false;
    this.isAdmin = false;
    this.isUser = false;
    this._resolved = false;
    this._resolutionPromise = null;
  }

  /**
   * Initialize runtime context from request
   * @param {Object} req - Express request object
   * @returns {Promise<RuntimeContext>} This context instance
   */
  async initializeFromRequest(req) {
    if (this._resolved) {
      return this;
    }

    if (this._resolutionPromise) {
      return this._resolutionPromise;
    }

    this._resolutionPromise = this._doInitialize(req);
    await this._resolutionPromise;
    return this;
  }

  /**
   * Internal initialization logic
   * @private
   */
  async _doInitialize(req) {
    try {
      // Resolve user
      this.user = req.user || null;

      if (!this.user) {
        this._resolved = true;
        return;
      }

      // Resolve role
      this.role = this.user.role || 'user';
      this.roleInfo = getRoleDisplayInfo(this.role);
      this.permissions = getPermissionsForRole(this.role);

      // Determine role flags
      this.isPlatformOwner = this.role === 'platform-owner';
      this.isCompanySuperAdmin = this.role === 'company-super-admin' || this.role === 'super-admin';
      this.isRegionalAdmin = this.role === 'regional-admin';
      this.isAdmin = this.role === 'admin';
      this.isUser = this.role === 'user';

      // Resolve company (Platform Owner does not belong to any company)
      if (this.isPlatformOwner) {
        this.company = null;
        this.coverageStates = [];
        this.coverageStateNames = [];
        this.coverageStateIds = [];
      } else if (this.user.companyId && isValidObjectId(this.user.companyId)) {
        this.company = await Company.findById(toObjectId(this.user.companyId));
        await this._resolveCoverageStates();
      } else {
        this.company = null;
        this.coverageStates = [];
        this.coverageStateNames = [];
        this.coverageStateIds = [];
      }

      // Resolve assigned resources (skip for Platform Owner)
      if (!this.isPlatformOwner) {
        await this._resolveAssignedResources();
      } else {
        // Platform Owner has global access, no assigned resources needed
        this.assignedFeeders = [];
        this.assignedInjectionSubstations = [];
        this.assignedWards = [];
        this.band = null;
      }

      // Resolve operational scope
      this._resolveOperationalScope();

      this._resolved = true;
    } catch (error) {
      console.error('Error initializing runtime context:', error);
      this._resolved = true; // Mark as resolved even on error to prevent infinite loops
    }
  }

  /**
   * Resolve company coverage states into State documents, names, and IDs
   * @private
   */
  async _resolveCoverageStates() {
    if (!this.company || !Array.isArray(this.company.coverageStates) || this.company.coverageStates.length === 0) {
      this.coverageStates = [];
      this.coverageStateNames = [];
      this.coverageStateIds = [];
      return;
    }

    const stateItems = this.company.coverageStates.map(st => {
      if (!st) return "";
      if (typeof st === "string") return st.trim();
      if (st.name) return String(st.name).trim();
      return String(st).trim();
    }).filter(Boolean);

    const objectIds = stateItems.filter(st => isValidObjectId(st)).map(st => toObjectId(st));
    const names = stateItems.filter(st => !isValidObjectId(st));

    const queries = [];
    if (objectIds.length > 0) queries.push({ _id: { $in: objectIds } });
    if (names.length > 0) {
      queries.push({ name: { $in: names } });
      const regexList = names.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
      queries.push({ name: { $in: regexList } });
    }

    if (queries.length > 0) {
      const stateDocs = await State.find({ $or: queries }).select('_id name country countryName isActive status').lean();
      this.coverageStates = stateDocs;
      this.coverageStateNames = stateDocs.map(s => s.name);
      this.coverageStateIds = stateDocs.map(s => s._id);
    } else {
      this.coverageStates = [];
      this.coverageStateNames = [];
      this.coverageStateIds = [];
    }
  }

  /**
   * Resolve assigned resources (feeders, substations, wards) safely using ObjectIds or names
   * @private
   */
  async _resolveAssignedResources() {
    if (!this.user) {
      return;
    }

    const companyFilter = (this.user.companyId && isValidObjectId(this.user.companyId))
      ? { companyId: toObjectId(this.user.companyId) }
      : {};

    // --- 1. RESOLVE ASSIGNED FEEDERS ---
    const rawFeeders = [];
    if (Array.isArray(this.user.assignedFeeders)) {
      rawFeeders.push(...this.user.assignedFeeders);
    }
    if (this.user.feeder) {
      rawFeeders.push(this.user.feeder);
    }

    const feederObjectIds = [];
    const feederNames = [];

    for (const item of rawFeeders) {
      const ref = parseResourceRef(item);
      if (ref.isObjectId && ref.id) {
        feederObjectIds.push(ref.id);
      } else if (ref.name) {
        feederNames.push(ref.name);
      }
    }

    const feederQueries = [];
    if (feederObjectIds.length > 0) {
      feederQueries.push({ _id: { $in: feederObjectIds } });
    }
    if (feederNames.length > 0) {
      feederQueries.push({ name: { $in: feederNames } });
    }

    if (feederQueries.length > 0) {
      const query = feederQueries.length === 1 ? feederQueries[0] : { $or: feederQueries };
      this.assignedFeeders = await Feeder.find({
        ...query,
        ...companyFilter
      }).select('name band voltageLevel isActive companyId');
    } else {
      this.assignedFeeders = [];
    }

    // --- 2. RESOLVE ASSIGNED WARDS ---
    const rawWards = [];
    if (this.user.ward) {
      rawWards.push(this.user.ward);
    }
    if (Array.isArray(this.user.assignedWards)) {
      rawWards.push(...this.user.assignedWards);
    }

    const wardObjectIds = [];
    const wardNames = [];

    for (const item of rawWards) {
      const ref = parseResourceRef(item);
      if (ref.isObjectId && ref.id) {
        wardObjectIds.push(ref.id);
      } else if (ref.name) {
        wardNames.push(ref.name);
      }
    }

    const wardQueries = [];
    if (wardObjectIds.length > 0) {
      wardQueries.push({ _id: { $in: wardObjectIds } });
    }
    if (wardNames.length > 0) {
      wardQueries.push({
        $or: [
          { name: { $in: wardNames } },
          { wardName: { $in: wardNames } },
          { id: { $in: wardNames } }
        ]
      });
    }

    if (wardQueries.length > 0) {
      const query = wardQueries.length === 1 ? wardQueries[0] : { $or: wardQueries };
      this.assignedWards = await Ward.find({
        ...query,
        ...companyFilter
      }).select('name wardName lga state companyId');
    } else {
      this.assignedWards = [];
    }

    // --- 3. RESOLVE BAND ---
    if (this.assignedFeeders.length > 0) {
      const bands = new Set(this.assignedFeeders.map(f => f.band).filter(Boolean));
      this.band = bands.size === 1 ? Array.from(bands)[0] : Array.from(bands);
    } else {
      this.band = null;
    }
  }

  /**
   * Resolve operational scope based on role and assignments
   * @private
   */
  _resolveOperationalScope() {
    if (!this.role) {
      this.operationalScope = 'none';
      return;
    }

    // Platform owners have global scope
    if (this.isPlatformOwner) {
      this.operationalScope = 'global';
      return;
    }

    // Company super admins have company-wide scope
    if (this.isCompanySuperAdmin) {
      this.operationalScope = 'company';
      return;
    }

    // Regional admins have regional scope
    if (this.isRegionalAdmin) {
      this.operationalScope = 'regional';
      return;
    }

    // Admins have feeder-level scope
    if (this.isAdmin) {
      this.operationalScope = this.assignedFeeders.length > 0 ? 'feeder' : 'none';
      return;
    }

    // Regular users have feeder + ward scope
    if (this.isUser) {
      this.operationalScope = (this.assignedFeeders.length > 0 && this.assignedWards) ? 'feeder_ward' : 'none';
      return;
    }

    this.operationalScope = 'none';
  }

  /**
   * Get current user
   * @returns {Object|null} The current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get current company
   * @returns {Object|null} The current company
   */
  getCompany() {
    return this.company;
  }

  /**
   * Get current role
   * @returns {string} The current role
   */
  getRole() {
    return this.role;
  }

  /**
   * Get current role info
   * @returns {Object} Role metadata
   */
  getRoleInfo() {
    return this.roleInfo;
  }

  /**
   * Get current permissions
   * @returns {Array} Array of permissions
   */
  getPermissions() {
    return this.permissions;
  }

  /**
   * Check if user has a specific permission
   * @param {string} permission - The permission to check
   * @returns {boolean} Whether the user has the permission
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * Get assigned feeders
   * @returns {Array} Array of assigned feeders
   */
  getAssignedFeeders() {
    return this.assignedFeeders;
  }

  /**
   * Get assigned feeder IDs
   * @returns {Array} Array of feeder IDs
   */
  getAssignedFeederIds() {
    return this.assignedFeeders.map(f => f._id);
  }

  /**
   * Get assigned injection substations
   * @returns {Array} Array of assigned injection substations
   */
  getAssignedInjectionSubstations() {
    return this.assignedInjectionSubstations;
  }

  /**
   * Get assigned wards
   * @returns {Array} Array of assigned wards
   */
  getAssignedWards() {
    return this.assignedWards;
  }

  /**
   * Get coverage states
   * @returns {Array} Array of coverage state documents
   */
  getCoverageStates() {
    return this.coverageStates;
  }

  /**
   * Get coverage state names
   * @returns {Array} Array of coverage state names
   */
  getCoverageStateNames() {
    return this.coverageStateNames;
  }

  /**
   * Get coverage state IDs
   * @returns {Array} Array of coverage state IDs
   */
  getCoverageStateIds() {
    return this.coverageStateIds;
  }

  /**
   * Check if state is allowed for this context
   * @param {string|ObjectId} stateNameOrId
   * @returns {boolean}
   */
  isStateAllowed(stateNameOrId) {
    if (this.isPlatformOwner) return true;
    if (!stateNameOrId) return false;
    const target = String(stateNameOrId).trim();
    if (this.coverageStateNames.includes(target)) return true;
    return this.coverageStateIds.some(id => id.toString() === target);
  }

  /**
   * Get current band
   * @returns {string|null} The current band
   */
  getBand() {
    return this.band;
  }

  /**
   * Get operational scope
   * @returns {string} The operational scope
   */
  getOperationalScope() {
    return this.operationalScope;
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
   * Check if user is regional admin
   * @returns {boolean} Whether user is regional admin
   */
  isRegionalAdminUser() {
    return this.isRegionalAdmin;
  }

  /**
   * Check if user is admin
   * @returns {boolean} Whether user is admin
   */
  isAdminUser() {
    return this.isAdmin;
  }

  /**
   * Check if user is regular user
   * @returns {boolean} Whether user is regular user
   */
  isRegularUser() {
    return this.isUser;
  }

  /**
   * Check if user can access a specific feeder
   * @param {ObjectId|string} feederId - The feeder ID
   * @returns {boolean} Whether user can access the feeder
   */
  canAccessFeeder(feederId) {
    // Platform owners can access all feeders
    if (this.isPlatformOwner) {
      return true;
    }

    // Check if feeder is in assigned feeders
    const feederIds = this.getAssignedFeederIds();
    return feederIds.some(id => id.toString() === feederId.toString());
  }

  /**
   * Check if user can access a specific company
   * @param {ObjectId|string} companyId - The company ID
   * @returns {boolean} Whether user can access the company
   */
  canAccessCompany(companyId) {
    // Platform owners can access all companies
    if (this.isPlatformOwner) {
      return true;
    }

    // Users can only access their own company
    if (!this.company) {
      return false;
    }

    return this.company._id.toString() === companyId.toString();
  }

  /**
   * Check if user has higher or equal privilege than a role
   * @param {string} targetRole - The target role to compare
   * @returns {boolean} Whether user has higher or equal privilege
   */
  hasHigherOrEqualPrivilegeThan(targetRole) {
    return hasHigherOrEqualPrivilege(this.role, targetRole);
  }

  /**
   * Get context summary for logging/debugging
   * @returns {Object} Context summary
   */
  getSummary() {
    return {
      userId: this.user?._id,
      userEmail: this.user?.email,
      companyId: this.company?._id,
      companyName: this.company?.name,
      role: this.role,
      operationalScope: this.operationalScope,
      assignedFeederCount: this.assignedFeeders.length,
      coverageStateCount: this.coverageStates.length,
      band: this.band,
      permissionCount: this.permissions.length
    };
  }

  /**
   * Clear context (for testing or request cleanup)
   */
  clear() {
    this.user = null;
    this.company = null;
    this.role = null;
    this.roleInfo = null;
    this.permissions = [];
    this.assignedFeeders = [];
    this.assignedInjectionSubstations = [];
    this.assignedWards = [];
    this.coverageStates = [];
    this.coverageStateNames = [];
    this.coverageStateIds = [];
    this.band = null;
    this.operationalScope = null;
    this.isPlatformOwner = false;
    this.isCompanySuperAdmin = false;
    this.isRegionalAdmin = false;
    this.isAdmin = false;
    this.isUser = false;
    this._resolved = false;
    this._resolutionPromise = null;
  }
}

// Global runtime context instance
const globalRuntimeContext = new RuntimeContext();

/**
 * Get global runtime context
 * @returns {RuntimeContext} The global runtime context
 */
export function getRuntimeContext() {
  return tenantScopeStorage.getStore()?.runtimeContext || globalRuntimeContext;
}

/**
 * Create new runtime context instance
 * @returns {RuntimeContext} A new runtime context instance
 */
export function createRuntimeContext() {
  return new RuntimeContext();
}

/**
 * Initialize runtime context from request
 * @param {Object} req - Express request object
 * @returns {Promise<RuntimeContext>} The initialized runtime context
 */
export async function initRuntimeContext(req) {
  const context = createRuntimeContext();
  await context.initializeFromRequest(req);
  return context;
}

/**
 * Middleware to initialize runtime context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function runtimeContextMiddleware(req, res, next) {
  try {
    const context = await initRuntimeContext(req);
    
    // Attach runtime context to request for use in controllers
    req.runtimeContext = context;
    
    // Attach convenience properties for backward compatibility
    req.currentUser = context.getUser();
    req.currentCompany = context.getCompany();
    req.currentRole = context.getRole();
    req.currentPermissions = context.getPermissions();
    req.assignedFeeders = context.getAssignedFeeders();
    req.assignedFeederIds = context.getAssignedFeederIds();
    req.coverageStates = context.getCoverageStates();
    req.coverageStateNames = context.getCoverageStateNames();
    req.coverageStateIds = context.getCoverageStateIds();
    req.currentBand = context.getBand();
    req.operationalScope = context.getOperationalScope();

    const effectiveCompanyId = context.getCompany()?._id ||
      (isValidObjectId(context.getUser()?.companyId) ? toObjectId(context.getUser().companyId) : null);

    tenantScopeStorage.run({
      runtimeContext: context,
      authenticated: Boolean(context.getUser()),
      companyId: effectiveCompanyId,
      isPlatformOwner: context.isPlatformOwnerUser()
    }, next);
  } catch (error) {
    console.error('Error in runtime context middleware:', error);
    next(); // Continue even if context initialization fails
  }
}

export default RuntimeContext;
