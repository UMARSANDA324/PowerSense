# EIP-04: Runtime Context Engine

## Overview

The Runtime Context Engine is Phase 4 of the Enterprise Identity & Role Management system. It provides a centralized mechanism for every request to automatically know WHO is making the request and WHAT resources they are allowed to access. This eliminates duplicated permission logic and prepares the platform for enterprise-scale operation.

## Architecture

### Core Components

1. **Runtime Context Service** (`backend/services/runtimeContext.js`)
   - Central service for managing runtime context throughout the request lifecycle
   - Resolves user, company, role, permissions, and operational scope once per request
   - Provides unified interface for accessing context information
   - Reuses context throughout the request to improve performance

2. **Runtime Context Utilities** (`backend/utils/runtimeContextUtils.js`)
   - Utility functions for working with runtime context
   - Provides convenient methods for accessing context in controllers and services
   - Includes scope filtering, permission checking, and resource validation helpers

3. **Runtime Context Middleware** (`backend/services/runtimeContext.js`)
   - Middleware to initialize runtime context for each request
   - Non-breaking design - maintains backward compatibility
   - Attaches context to request for use in controllers

## Runtime Context Components

### Current Company Resolver

Resolves the current company for the authenticated user:
- Uses user's `companyId` if available
- Falls back to default company for backward compatibility
- Platform owners can access all companies

### Current User Resolver

Resolves the current authenticated user:
- Extracted from `req.user` (set by auth middleware)
- Provides user information throughout the request lifecycle
- Cached to avoid repeated database lookups

### Current Role Resolver

Resolves the current user's role:
- Normalizes role using identity configuration
- Provides role metadata and permissions
- Determines role hierarchy level

### Current Scope Resolver

Resolves the operational scope based on role:
- **Platform Owner**: Global scope (all companies)
- **Company Super Admin**: Company-wide scope
- **Regional Admin**: Regional scope
- **Admin**: Feeder-level scope
- **User**: Feeder + Ward scope

### Current Feeder Resolver

Resolves assigned feeders for the current user:
- Loads feeder details from database
- Provides feeder IDs for filtering
- Platform owners can access all feeders

### Current Band Resolver

Resolves the current band from assigned feeders:
- Extracts band information from assigned feeders
- Returns single band or array of bands
- Used for filtering and reporting

## Role-Based Access Control

### Platform Owner
- **Scope**: All Companies
- **Access**: Global access to all data
- **Feeders**: Can access all feeders
- **Companies**: Can access all companies

### Company Super Admin
- **Scope**: Own Company Only
- **Access**: Company-wide data access
- **Feeders**: Can access all feeders in their company
- **Companies**: Can only access their own company

### Regional Admin
- **Scope**: Assigned Region
- **Access**: Regional data access
- **Feeders**: Can access feeders in assigned region
- **Companies**: Can only access their own company

### Admin
- **Scope**: Assigned Feeder(s)
- **Access**: Feeder-level data access
- **Feeders**: Can only access assigned feeders
- **Companies**: Can only access their own company

### User
- **Scope**: Assigned Feeder + Ward
- **Access**: Feeder and ward-level data access
- **Feeders**: Can only access assigned feeders
- **Companies**: Can only access their own company

## API Integration

### Middleware Integration

The runtime context middleware is added to `server.js`:

```javascript
import { runtimeContextMiddleware } from "./services/runtimeContext.js";

app.use(runtimeContextMiddleware);
```

### Request Context

After middleware runs, each request has access to:

```javascript
req.runtimeContext        // Full runtime context object
req.currentUser           // Current user
req.currentCompany        // Current company
req.currentRole           // Current role
req.currentPermissions    // Current permissions
req.assignedFeeders       // Assigned feeders
req.assignedFeederIds     // Assigned feeder IDs
req.currentBand           // Current band
req.operationalScope      // Operational scope
```

## Usage Examples

### Using Runtime Context in Controllers

```javascript
export const myController = async (req, res) => {
  // Access runtime context
  const user = req.currentUser;
  const company = req.currentCompany;
  const role = req.currentRole;
  const permissions = req.currentPermissions;
  const feeders = req.assignedFeeders;
  const scope = req.operationalScope;

  // Check permissions
  if (!req.currentPermissions.includes('reports.read')) {
    return res.status(403).json({ message: 'Permission denied' });
  }

  // Use context for queries
  const reports = await Report.find({
    companyId: company._id,
    feeder: { $in: feeders.map(f => f._id) }
  });

  res.json(reports);
};
```

### Using Runtime Context Utilities

```javascript
import { 
  getCurrentUser, 
  getCurrentCompany, 
  hasPermission,
  buildScopeFilter,
  canAccessFeeder
} from '../utils/runtimeContextUtils.js';

export const myController = async (req, res) => {
  // Get current user
  const user = getCurrentUser();
  
  // Check permission
  if (!hasPermission('reports.read')) {
    return res.status(403).json({ message: 'Permission denied' });
  }

  // Build scope-aware filter
  const filter = buildScopeFilter({ status: 'active' });
  const reports = await Report.find(filter);

  res.json(reports);
};
```

### Checking Feeder Access

```javascript
import { canAccessFeeder } from '../utils/runtimeContextUtils.js';

export const getFeederDetails = async (req, res) => {
  const { feederId } = req.params;

  // Check if user can access this feeder
  if (!canAccessFeeder(feederId)) {
    return res.status(403).json({ message: 'Access denied to this feeder' });
  }

  const feeder = await Feeder.findById(feederId);
  res.json(feeder);
};
```

### Building Scope Filters

```javascript
import { buildScopeFilter } from '../utils/runtimeContextUtils.js';

export const getReports = async (req, res) => {
  // Automatically filter by user's scope
  const filter = buildScopeFilter({ 
    status: 'active',
    severity: 'high'
  });

  const reports = await Report.find(filter);
  res.json(reports);
};
```

### Validating Resource Access

```javascript
import { validateResourceAccess } from '../utils/runtimeContextUtils.js';

export const updateReport = async (req, res) => {
  const report = await Report.findById(req.params.id);

  // Validate user can access this report
  if (!validateResourceAccess(report)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Proceed with update
  const updated = await Report.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(updated);
};
```

## Performance Benefits

### Reduced Database Queries

- **Before**: Each controller might query user, company, role, permissions separately
- **After**: All context resolved once per request and reused

### Eliminated Duplicated Logic

- **Before**: Permission checks scattered across controllers
- **After**: Centralized permission checking via runtime context

### Improved Caching

- Context is resolved once and cached for the request lifecycle
- No repeated lookups for the same information

## Backward Compatibility

The Runtime Context Engine is fully backward compatible:

1. **Non-breaking middleware**: Continues even if context resolution fails
2. **Optional usage**: Controllers can choose to use context or not
3. **Existing APIs**: All existing APIs continue to work unchanged
4. **No route changes**: No modifications to existing routes required
5. **Graceful degradation**: Falls back to existing behavior if context unavailable

## Context Information Available

### User Information
- User object (from auth middleware)
- User ID, email, name
- User role and permissions

### Company Information
- Company object
- Company ID, name, code
- Company status and settings

### Role Information
- Current role
- Role metadata (name, description, level)
- Role permissions

### Resource Assignments
- Assigned feeders (with details)
- Assigned feeder IDs
- Assigned wards
- Assigned injection substations

### Operational Scope
- Current operational scope level
- Band information
- Scope description

## Utility Functions Reference

### Context Accessors
- `getCurrentUser()` - Get current user
- `getCurrentCompany()` - Get current company
- `getCurrentRole()` - Get current role
- `getCurrentPermissions()` - Get current permissions
- `getAssignedFeeders()` - Get assigned feeders
- `getAssignedFeederIds()` - Get assigned feeder IDs
- `getCurrentBand()` - Get current band
- `getOperationalScope()` - Get operational scope

### Permission Checks
- `hasPermission(permission)` - Check if user has permission
- `canAccessFeeder(feederId)` - Check feeder access
- `canAccessCompany(companyId)` - Check company access
- `hasHigherOrEqualPrivilege(targetRole)` - Check privilege level

### Scope Filtering
- `buildScopeFilter(baseFilter, feederField, companyField)` - Build scope-aware filter
- `getAccessibleFeederIds()` - Get accessible feeder IDs
- `getAccessibleCompanyIds()` - Get accessible company IDs

### Resource Validation
- `validateResourceAccess(resource, feederField, companyField)` - Validate resource access
- `canPerformAction(action, resourceType, resource)` - Check action permission

### Debugging
- `getContextSummary()` - Get context summary for logging
- `logContext(message)` - Log context information
- `getRoleDisplayName()` - Get user-friendly role name
- `getScopeDescription()` - Get user-friendly scope description

### Initialization
- `isContextInitialized()` - Check if context is initialized
- `requireContext()` - Require context to be initialized

## Testing

### Verify Runtime Context

1. Start the server:
   ```bash
   npm run dev
   ```

2. Make an authenticated request and check that context is available:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:5000/api/protected-endpoint
   ```

3. Verify context is attached to request in controller

### Test Context Resolution

Test that context resolves correctly for different roles:
- Platform owner should have global scope
- Company super admin should have company scope
- Admin should have feeder scope
- User should have feeder + ward scope

## Troubleshooting

### Issue: Context not available in controller

**Cause**: Runtime context middleware not running or auth middleware not setting user

**Solution**: Ensure both auth middleware and runtime context middleware are configured in server.js

### Issue: Permissions not working

**Cause**: Role permissions not configured or context not resolving permissions

**Solution**: Check identity configuration and ensure role is properly normalized

### Issue: Scope filtering not working

**Cause**: User not assigned to feeders or company not set

**Solution**: Ensure user has assigned feeders and companyId is set

## Future Enhancements

The Runtime Context Engine prepares the system for:

1. **Operational Scope**: Enhanced scope management with regions and zones
2. **Workflow Engine**: Context-aware workflow execution
3. **Audit System**: Context-aware audit logging
4. **Approval System**: Context-aware approval workflows
5. **Internal Messaging**: Context-aware messaging system
6. **Company Switching UI**: Runtime context switching for authorized users

## Implementation Checklist

- [x] Review EIP-01, EIP-02, EIP-03 and existing architecture
- [x] Design and implement Runtime Context Service
- [x] Implement Current Company Resolver
- [x] Implement Current User Resolver
- [x] Implement Current Role Resolver
- [x] Implement Current Scope Resolver
- [x] Implement Current Feeder Resolver
- [x] Implement Current Band Resolver
- [x] Implement Context Middleware
- [x] Implement Context Utilities
- [x] Refactor existing modules to use Runtime Context (safe integration)
- [x] Update Runtime Context documentation
- [ ] Test all existing functionality (no breaking changes)

## Notes

- This implementation follows SOLID principles
- Context logic is centralized in dedicated service
- Context is resolved once per request for performance
- No changes to business logic, authentication, or frontend
- Full backward compatibility maintained
- No breaking changes to existing APIs
- Eliminates duplicated permission logic
- Prepares platform for enterprise-scale operation
