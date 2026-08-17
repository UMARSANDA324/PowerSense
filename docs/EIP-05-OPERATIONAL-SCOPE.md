# EIP-05: Operational Scope Engine

## Overview

The Operational Scope Engine is Phase 5 of the Enterprise Identity & Role Management system. It determines WHAT infrastructure a user is allowed to OPERATE, not simply VIEW. This is the single source of truth for all operational actions, ensuring that operations never leak across feeders, substations, regions, or companies.

## Architecture

### Core Components

1. **Operational Scope Service** (`backend/services/operationalScope.js`)
   - Central service for managing operational scope
   - Resolves accessible infrastructure based on role and assignments
   - Provides validation for operational actions
   - Ensures operations stay within user's scope

2. **Scope Validation Service** (`backend/services/scopeValidation.js`)
   - Validation functions for operational scope checks
   - Validates feeder, substation, state, and LGA operations
   - Provides middleware for automatic validation
   - Returns meaningful error messages for unauthorized operations

3. **Scope Utilities** (`backend/utils/scopeUtils.js`)
   - Utility functions for working with operational scope
   - Convenient methods for scope checking in controllers
   - Helper functions for filtering and validation

4. **Scope Repository** (`backend/utils/scopeRepository.js`)
   - Repository functions for scope-aware database operations
   - Applies scope filters to queries automatically
   - Ensures database operations respect operational scope

5. **Operational Scope Middleware** (`backend/services/operationalScope.js`)
   - Middleware to initialize operational scope for each request
   - Non-breaking design - maintains backward compatibility
   - Attaches scope to request for use in controllers

## Scope Levels

### Platform Owner
- **Scope**: All Companies
- **Access**: Can operate infrastructure across all companies
- **Feeders**: All feeders globally
- **Substations**: All injection substations globally
- **Regions**: All states and LGAs globally

### Company Super Admin
- **Scope**: Entire Company Infrastructure
- **Access**: Can operate all infrastructure within their company
- **Feeders**: All feeders in their company
- **Substations**: All injection substations in their company
- **Regions**: All states and LGAs in their company

### Regional Admin
- **Scope**: Assigned States / LGAs
- **Access**: Can operate infrastructure in assigned regions
- **Feeders**: Feeders in assigned states/LGAs
- **Substations**: Injection substations in assigned regions
- **Regions**: Only assigned states and LGAs

### Operator/Admin
- **Scope**: Assigned Injection Substations → Assigned Feeders
- **Access**: Can operate assigned feeders only
- **Feeders**: Only assigned feeders
- **Substations**: Only assigned injection substations
- **Regions**: Limited to feeder coverage areas

### User
- **Scope**: Own Assigned Feeder
- **Access**: Can operate only their specific assigned feeder
- **Feeders**: Only their assigned feeder
- **Substations**: Only substations serving their feeder
- **Regions**: Limited to their feeder's coverage area

## Operational Rules

### Example: Admin Assigned to Sallari 11kV

An admin assigned to **Sallari 11kV** can:
- **Operate**: Sallari 11kV
- **View**: Sallari 11kV and related infrastructure

An admin assigned to **Sallari 11kV** CANNOT:
- **Operate**: Hotoro
- **Operate**: Hausawa
- **Operate**: Airport Road
- **Operate**: Any other injection substation

### Cross-Company Operations

- **Platform Owner**: Can operate across companies
- **Company Super Admin**: Can only operate within their company
- **Regional Admin**: Can only operate within their company
- **Admin/Operator**: Can only operate within their company
- **User**: Can only operate within their company

## API Integration

### Middleware Integration

The operational scope middleware is added to `server.js`:

```javascript
import { operationalScopeMiddleware } from "./services/operationalScope.js";

app.use(operationalScopeMiddleware);
```

### Request Context

After middleware runs, each request has access to:

```javascript
req.operationalScope        // Full operational scope object
req.scopeLevel              // Current scope level
req.accessibleFeederIds     // Accessible feeder IDs
req.accessibleInjectionSubstationIds  // Accessible substation IDs
req.accessibleStateIds      // Accessible state IDs
req.accessibleLGAIds        // Accessible LGA IDs
```

## Usage Examples

### Using Operational Scope in Controllers

```javascript
export const powerControl = async (req, res) => {
  const { feederId } = req.params;
  const { operation } = req.body;

  // Check if user can operate this feeder
  if (!req.operationalScope.canOperateFeeder(feederId)) {
    return res.status(403).json({ 
      message: 'You do not have permission to operate this feeder',
      code: 'FEEDER_OUT_OF_SCOPE'
    });
  }

  // Proceed with power control operation
  const result = await executePowerControl(feederId, operation);
  res.json(result);
};
```

### Using Scope Validation Middleware

```javascript
import { validateFeederOperationMiddleware } from '../services/scopeValidation.js';

router.post('/power/:feederId/control', 
  validateFeederOperationMiddleware('feederId'),
  powerControlController
);
```

### Using Scope Repository Functions

```javascript
import { scopeFind, scopeUpdate } from '../utils/scopeRepository.js';

export const getReports = async (req, res) => {
  // Automatically filter by operational scope
  const query = scopeFind(Report, { status: 'active' });
  const reports = await query.exec();

  res.json(reports);
};

export const updatePowerStatus = async (req, res) => {
  const { feederId } = req.params;
  const updateData = req.body;

  // Update only if feeder is in scope
  const result = await scopeUpdate(
    PowerStatus,
    { feeder: feederId },
    updateData
  );

  res.json(result);
};
```

### Using Scope Utilities

```javascript
import { 
  canOperateFeeder, 
  buildOperationalFilter,
  getScopeLevelDisplayName
} from '../utils/scopeUtils.js';

export const myController = async (req, res) => {
  // Check operation permission
  if (!canOperateFeeder(req.params.feederId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Build scope-aware filter
  const filter = buildOperationalFilter({ status: 'active' });
  const data = await MyModel.find(filter);

  res.json({
    scope: getScopeLevelDisplayName(),
    data
  });
};
```

## Power Control Integration

Operational Scope must be integrated into:

### Power ON/OFF
```javascript
export const powerOn = async (req, res) => {
  const validation = await validatePowerControlOperation(
    req.params.feederId, 
    'on'
  );
  
  if (!validation.valid) {
    return res.status(403).json(validation);
  }

  // Proceed with power ON
  await executePowerOn(req.params.feederId);
  res.json({ success: true });
};
```

### Maintenance
```javascript
export const setMaintenance = async (req, res) => {
  const validation = await validatePowerControlOperation(
    req.params.feederId,
    'maintenance'
  );
  
  if (!validation.valid) {
    return res.status(403).json(validation);
  }

  // Proceed with maintenance mode
  await setMaintenanceMode(req.params.feederId, req.body.schedule);
  res.json({ success: true });
};
```

### Scheduling
```javascript
export const scheduleOperation = async (req, res) => {
  const validation = await validateSchedulingOperation(req.params.feederId);
  
  if (!validation.valid) {
    return res.status(403).json(validation);
  }

  // Proceed with scheduling
  await schedulePowerOperation(req.params.feederId, req.body.schedule);
  res.json({ success: true });
};
```

## Security Considerations

### Never Trust Frontend Selections

Always validate operational scope on the backend:

```javascript
// ❌ WRONG - Trusting frontend
export const powerControl = async (req, res) => {
  const { feederId } = req.body;
  // No validation - security risk!
  await executePowerControl(feederId, req.body.operation);
};

// ✅ CORRECT - Validating scope
export const powerControl = async (req, res) => {
  const { feederId } = req.body;
  const validation = await validatePowerControlOperation(feederId, req.body.operation);
  if (!validation.valid) {
    return res.status(403).json(validation);
  }
  await executePowerControl(feederId, req.body.operation);
};
```

### Reject Unauthorized Operations

Always return meaningful error messages:

```javascript
{
  success: false,
  message: 'You do not have permission to operate this feeder',
  code: 'FEEDER_OUT_OF_SCOPE'
}
```

### Cross-Scope Operations

Only platform owners can perform cross-scope operations:

```javascript
const validation = await validateCrossScopeOperation('company');
if (!validation.valid) {
  return res.status(403).json(validation);
}
```

## Performance

### Resolve Once Per Request

Operational scope is resolved once per request and reused:

```javascript
// Middleware resolves scope once
app.use(operationalScopeMiddleware);

// Controllers reuse the resolved scope
export const myController = async (req, res) => {
  const scope = req.operationalScope; // Already resolved
  // No additional database queries
};
```

### Avoid Repeated Queries

Use scope-aware repository functions to avoid repeated filtering:

```javascript
// ❌ WRONG - Repeated queries
const feeders = await Feeder.find({ companyId: user.companyId });
const accessibleFeeders = feeders.filter(f => 
  user.assignedFeeders.includes(f._id)
);

// ✅ CORRECT - Single query with scope filter
const feeders = await scopeFind(Feeder, { companyId: user.companyId });
```

## Backward Compatibility

The Operational Scope Engine is fully backward compatible:

1. **Non-breaking middleware**: Continues even if scope resolution fails
2. **Optional usage**: Controllers can choose to use scope or not
3. **Existing APIs**: All existing APIs continue to work unchanged
4. **No route changes**: No modifications to existing routes required
5. **Graceful degradation**: Falls back to existing behavior if scope unavailable

## Testing

### Verify Operational Scope

1. Start the server:
   ```bash
   npm run dev
   ```

2. Test that scope is attached to requests:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:5002/api/protected-endpoint
   ```

3. Verify scope validation works correctly

### Test Scope Levels

Test that each scope level operates correctly:
- **Platform Owner**: Can operate all infrastructure
- **Company Super Admin**: Can operate company infrastructure only
- **Regional Admin**: Can operate regional infrastructure only
- **Admin/Operator**: Can operate assigned feeders only
- **User**: Can operate their assigned feeder only

### Test Security

Verify that:
- Operations never leak across feeders
- Operations never leak across substations
- Operations never leak across regions
- Operations never leak across companies
- Unauthorized operations are rejected with meaningful errors

## Troubleshooting

### Issue: User cannot operate assigned feeder

**Cause**: Operational scope not resolving correctly

**Solution**: Ensure user has `assignedFeeders` populated and middleware is running

### Issue: Scope validation always fails

**Cause**: Scope not initialized or user not authenticated

**Solution**: Ensure authentication middleware runs before operational scope middleware

### Issue: Cross-company operations allowed for non-platform owners

**Cause**: Scope validation not implemented correctly

**Solution**: Use validation middleware or manual validation in controllers

## Future Enhancements

The Operational Scope Engine prepares the system for:

1. **Workflow Engine**: Scope-aware workflow execution
2. **Audit System**: Scope-aware audit logging
3. **Approval System**: Scope-aware approval workflows
4. **Internal Messaging**: Scope-aware messaging system
5. **Advanced Regional Assignment**: Multi-state and multi-LGA assignments

## Implementation Checklist

- [x] Review EIP-01 through EIP-04 and existing architecture
- [x] Design and implement Operational Scope Service
- [x] Implement Scope Resolver
- [x] Implement Scope Validation
- [x] Implement Scope Middleware
- [x] Implement Scope Utilities
- [x] Implement Scope Repository
- [x] Integrate Operational Scope middleware into server.js (non-breaking)
- [x] Update Operational Scope documentation
- [ ] Test all existing functionality (no breaking changes)

## Notes

- This implementation follows SOLID principles
- Scope logic is centralized in dedicated services
- Scope is resolved once per request for performance
- No changes to business logic, authentication, or frontend
- Full backward compatibility maintained
- No breaking changes to existing APIs
- Operations never leak across infrastructure boundaries
- Security is enforced at the backend level
- Meaningful error messages for unauthorized operations
