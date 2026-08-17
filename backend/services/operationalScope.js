/**
 * Operational Scope Service
 * 
 * Central service for determining WHAT infrastructure a user is allowed to OPERATE.
 * This is the single source of truth for all operational actions.
 * 
 * Operational Scope is different from Runtime Context:
 * - Runtime Context: WHO is making the request and what they can VIEW
 * - Operational Scope: WHAT they can OPERATE (modify, control, change state)
 * 
 * This service ensures that operations never leak across feeders, substations,
 * regions, or companies.
 */

import mongoose from 'mongoose';
import { getRuntimeContext } from './runtimeContext.js';
import Company from '../models/Company.js';
import Feeder from '../models/Location/Feeder.js';
import InjectionSubstation from '../models/Location/InjectionSubstation.js';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';
import { isValidObjectId, toObjectId } from '../utils/objectIdUtils.js';

/**
 * Operational Scope class
 * Encapsulates the operational scope for the current user
 */
class OperationalScope {
  constructor() {
    this.scopeLevel = null;
    this.accessibleFeeders = [];
    this.accessibleFeederIds = [];
    this.accessibleInjectionSubstations = [];
    this.accessibleInjectionSubstationIds = [];
    this.accessibleStates = [];
    this.accessibleStateIds = [];
    this.accessibleLGAs = [];
    this.accessibleLGAIds = [];
    this.accessibleWards = [];
    this.accessibleWardIds = [];
    this.companyId = null;
    this._resolved = false;
  }

  /**
   * Initialize operational scope from runtime context
   * @returns {Promise<OperationalScope>} This scope instance
   */
  async initialize() {
    if (this._resolved) {
      return this;
    }

    try {
      const context = getRuntimeContext();
      const user = context.getUser();
      const company = context.getCompany();
      const role = context.getRole();

      if (!user) {
        this._resolved = true;
        return this;
      }

      // Platform Owner has global scope, no company required
      if (role === 'platform-owner') {
        this.scopeLevel = 'global';
        this.companyId = null; // Platform Owner belongs to Platform, not any company
        // Platform Owner has access to everything, no resource resolution needed
        this._resolved = true;
        return this;
      }

      if (!company) {
        this._resolved = true;
        return this;
      }

      this.companyId = company._id;

      // Determine scope level based on role
      this._determineScopeLevel(role);

      // Resolve accessible resources based on scope level
      await this._resolveAccessibleResources(user, role);

      this._resolved = true;
    } catch (error) {
      console.error('Error initializing operational scope:', error);
      this._resolved = true; // Mark as resolved even on error
    }

    return this;
  }

  /**
   * Determine scope level based on role
   * @private
   */
  _determineScopeLevel(role) {
    const roleLower = role?.toLowerCase() || '';

    if (roleLower === 'platform-owner') {
      this.scopeLevel = 'global';
    } else if (roleLower === 'company-super-admin') {
      this.scopeLevel = 'company';
    } else if (roleLower === 'regional-admin') {
      this.scopeLevel = 'regional';
    } else if (roleLower === 'admin' || roleLower === 'operator') {
      this.scopeLevel = 'feeder';
    } else {
      this.scopeLevel = 'user';
    }
  }

  /**
   * Resolve accessible resources based on scope level
   * @private
   */
  async _resolveAccessibleResources(user, role) {
    switch (this.scopeLevel) {
      case 'global':
        // Platform owners can operate everything (no filtering)
        break;
      
      case 'company':
        // Company super admins can operate all feeders in their company
        await this._resolveCompanyResources(this.companyId);
        break;
      
      case 'regional':
        // Regional admins can operate resources in their assigned regions
        await this._resolveRegionalResources(user);
        break;
      
      case 'feeder':
        // Admins/Operators can operate their assigned feeders
        await this._resolveFeederResources(user);
        break;
      
      case 'user':
        // Users can only operate their specific assigned feeder
        await this._resolveUserResources(user);
        break;
    }
  }

  /**
   * Resolve all resources for a company
   * @private
   */
  async _resolveCompanyResources(companyId) {
    // Get all feeders in the company
    this.accessibleFeeders = await Feeder.find({ companyId }).select('_id name');
    this.accessibleFeederIds = this.accessibleFeeders.map(f => f._id.toString());

    // Get all injection substations in the company
    this.accessibleInjectionSubstations = await InjectionSubstation.find({ companyId }).select('_id name');
    this.accessibleInjectionSubstationIds = this.accessibleInjectionSubstations.map(s => s._id.toString());

    // Resolve coverage states from company & runtimeContext
    const context = getRuntimeContext();
    if (context && context.getCoverageStates && context.getCoverageStates().length > 0) {
      this.accessibleStates = context.getCoverageStates();
      this.accessibleStateIds = context.getCoverageStateIds().map(id => id.toString());
    } else {
      const company = await Company.findById(companyId).select('coverageStates');
      if (company && Array.isArray(company.coverageStates) && company.coverageStates.length > 0) {
        const stateItems = company.coverageStates.map(s => {
          if (!s) return "";
          if (typeof s === "string") return s.trim();
          if (s?.name) return String(s.name).trim();
          return String(s).trim();
        }).filter(Boolean);

        const objectIds = stateItems.filter(s => isValidObjectId(s)).map(s => toObjectId(s));
        const names = stateItems.filter(s => !isValidObjectId(s));

        const queries = [];
        if (objectIds.length > 0) queries.push({ _id: { $in: objectIds } });
        if (names.length > 0) {
          queries.push({ name: { $in: names } });
          const regexList = names.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
          queries.push({ name: { $in: regexList } });
        }

        if (queries.length > 0) {
          const stateDocs = await State.find({ $or: queries }).select('_id name').lean();
          this.accessibleStates = stateDocs;
          this.accessibleStateIds = stateDocs.map(s => s._id.toString());
        } else {
          this.accessibleStates = [];
          this.accessibleStateIds = [];
        }
      } else {
        this.accessibleStates = [];
        this.accessibleStateIds = [];
      }
    }

    // Get all LGAs in the company (from LGAs collection matching company or allowed states)
    const lgaQuery = [];
    if (this.accessibleStateIds.length > 0) {
      lgaQuery.push({ state: { $in: this.accessibleStateIds } });
    }
    if (companyId) {
      lgaQuery.push({ companyId });
    }

    if (lgaQuery.length > 0) {
      const lgaDocs = await LGA.find({ $or: lgaQuery }).select('_id name').lean();
      this.accessibleLGAs = lgaDocs;
      this.accessibleLGAIds = lgaDocs.map(l => l._id.toString());
    } else {
      this.accessibleLGAs = [];
      this.accessibleLGAIds = [];
    }
  }

  /**
   * Resolve resources for regional admin
   * @private
   */
  async _resolveRegionalResources(user) {
    // Regional admins would have assigned states/LGAs
    // For now, fall back to company scope if no regional assignment
    if (user.assignedStates && user.assignedStates.length > 0) {
      this.accessibleStateIds = user.assignedStates.map(id => id.toString());
      
      // Get feeders in assigned states
      this.accessibleFeeders = await Feeder.find({ 
        companyId: this.companyId,
        stateId: { $in: this.accessibleStateIds }
      }).select('_id name');
      this.accessibleFeederIds = this.accessibleFeeders.map(f => f._id.toString());
    } else {
      // Fallback to company scope
      await this._resolveCompanyResources(this.companyId);
    }
  }

  /**
   * Resolve resources for admin/operator
   * @private
   */
  async _resolveFeederResources(user) {
    // Get assigned feeders
    if (user.assignedFeeders && user.assignedFeeders.length > 0) {
      this.accessibleFeederIds = user.assignedFeeders.map(id => id.toString());
      this.accessibleFeeders = await Feeder.find({ 
        _id: { $in: this.accessibleFeederIds },
        companyId: this.companyId
      }).select('_id name');

      // Get injection substations for these feeders
      this.accessibleInjectionSubstations = await InjectionSubstation.find({
        _id: { $in: this.accessibleFeeders.map(f => f.injectionSubstationId).filter(Boolean) }
      }).select('_id name');
      this.accessibleInjectionSubstationIds = this.accessibleInjectionSubstations.map(s => s._id.toString());
    }
  }

  /**
   * Resolve resources for regular user
   * @private
   */
  async _resolveUserResources(user) {
    // Users can only operate their specific assigned feeder
    if (user.assignedFeeders && user.assignedFeeders.length > 0) {
      // Take the first assigned feeder as the operational scope
      const feederId = user.assignedFeeders[0].toString();
      this.accessibleFeederIds = [feederId];
      
      const feeder = await Feeder.findOne({
        _id: feederId,
        companyId: this.companyId
      }).select('_id name');
      if (feeder) {
        this.accessibleFeeders = [feeder];
      }
    }
  }

  /**
   * Check if user can operate a specific feeder
   * @param {string|ObjectId} feederId - The feeder ID
   * @returns {boolean} Whether the user can operate this feeder
   */
  canOperateFeeder(feederId) {
    if (this.scopeLevel === 'global') {
      return true; // Platform owners can operate everything
    }

    const feederIdStr = feederId.toString();
    return this.accessibleFeederIds.includes(feederIdStr);
  }

  /**
   * Check if user can operate a specific injection substation
   * @param {string|ObjectId} substationId - The injection substation ID
   * @returns {boolean} Whether the user can operate this substation
   */
  canOperateInjectionSubstation(substationId) {
    if (this.scopeLevel === 'global') {
      return true; // Platform owners can operate everything
    }

    const substationIdStr = substationId.toString();
    return this.accessibleInjectionSubstationIds.includes(substationIdStr);
  }

  /**
   * Check if user can operate in a specific state
   * @param {string|ObjectId} stateId - The state ID
   * @returns {boolean} Whether the user can operate in this state
   */
  canOperateInState(stateId) {
    if (this.scopeLevel === 'global' || this.scopeLevel === 'company') {
      return true;
    }

    const stateIdStr = stateId.toString();
    return this.accessibleStateIds.includes(stateIdStr);
  }

  /**
   * Check if user can operate in a specific LGA
   * @param {string|ObjectId} lgaId - The LGA ID
   * @returns {boolean} Whether the user can operate in this LGA
   */
  canOperateInLGA(lgaId) {
    if (this.scopeLevel === 'global' || this.scopeLevel === 'company') {
      return true;
    }

    const lgaIdStr = lgaId.toString();
    return this.accessibleLGAIds.includes(lgaIdStr);
  }

  /**
   * Get scope level
   * @returns {string} The scope level
   */
  getScopeLevel() {
    return this.scopeLevel;
  }

  /**
   * Get accessible feeder IDs
   * @returns {Array} Array of accessible feeder IDs
   */
  getAccessibleFeederIds() {
    return this.accessibleFeederIds;
  }

  /**
   * Get accessible injection substation IDs
   * @returns {Array} Array of accessible injection substation IDs
   */
  getAccessibleInjectionSubstationIds() {
    return this.accessibleInjectionSubstationIds;
  }

  /**
   * Get accessible state IDs
   * @returns {Array} Array of accessible state IDs
   */
  getAccessibleStateIds() {
    return this.accessibleStateIds;
  }

  /**
   * Get accessible LGA IDs
   * @returns {Array} Array of accessible LGA IDs
   */
  getAccessibleLGAIds() {
    return this.accessibleLGAIds;
  }

  /**
   * Build operational filter for queries
   * @param {Object} baseFilter - Base query filter
   * @param {string} feederField - Field name for feeder (default: 'feeder')
   * @returns {Object} Filtered query object
   */
  buildOperationalFilter(baseFilter = {}, feederField = 'feeder') {
    const filter = { ...baseFilter };

    if (this.scopeLevel === 'global') {
      return filter; // No filtering for platform owners
    }

    // Add feeder filter based on accessible feeders
    if (this.accessibleFeederIds.length > 0) {
      filter[feederField] = { $in: this.accessibleFeederIds };
    } else {
      // If no accessible feeders, return empty filter to prevent access
      filter[feederField] = { $in: [] };
    }

    return filter;
  }

  /**
   * Get scope summary for logging/debugging
   * @returns {Object} Scope summary
   */
  getSummary() {
    return {
      scopeLevel: this.scopeLevel,
      accessibleFeederCount: this.accessibleFeederIds.length,
      accessibleInjectionSubstationCount: this.accessibleInjectionSubstationIds.length,
      accessibleStateCount: this.accessibleStateIds.length,
      accessibleLGACount: this.accessibleLGAIds.length,
      companyId: this.companyId
    };
  }

  /**
   * Clear scope (for testing or request cleanup)
   */
  clear() {
    this.scopeLevel = null;
    this.accessibleFeeders = [];
    this.accessibleFeederIds = [];
    this.accessibleInjectionSubstations = [];
    this.accessibleInjectionSubstationIds = [];
    this.accessibleStates = [];
    this.accessibleStateIds = [];
    this.accessibleLGAs = [];
    this.accessibleLGAIds = [];
    this.accessibleWards = [];
    this.accessibleWardIds = [];
    this.companyId = null;
    this._resolved = false;
  }
}

// Global operational scope instance
const globalOperationalScope = new OperationalScope();

/**
 * Get global operational scope
 * @returns {OperationalScope} The global operational scope
 */
export function getOperationalScope() {
  return globalOperationalScope;
}

/**
 * Create new operational scope instance
 * @returns {OperationalScope} A new operational scope instance
 */
export function createOperationalScope() {
  return new OperationalScope();
}

/**
 * Initialize operational scope
 * @returns {Promise<OperationalScope>} The initialized operational scope
 */
export async function initOperationalScope() {
  const scope = createOperationalScope();
  await scope.initialize();
  return scope;
}

/**
 * Middleware to initialize operational scope
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function operationalScopeMiddleware(req, res, next) {
  try {
    const scope = await initOperationalScope();
    
    // Attach operational scope to request for use in controllers
    req.operationalScope = scope;
    
    next();
  } catch (error) {
    console.error('Error in operational scope middleware:', error);
    next(); // Continue even if scope initialization fails
  }
}

export default OperationalScope;
