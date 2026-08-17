# EIP-03: Tenant Isolation Engine

## Overview

The Tenant Isolation Engine is Phase 3 of the Enterprise Identity & Role Management system. It ensures that every piece of data in the application is associated with exactly one Distribution Company (tenant), enabling true multi-company operation while maintaining full backward compatibility.

## Architecture

### Core Components

1. **Tenant Resolver** (`backend/services/tenantResolver.js`)
   - Resolves the tenant (Company) for a given request or user
   - Determines which company a user or request belongs to
   - Provides functions for tenant access validation

2. **Tenant Context Service** (`backend/services/tenantContext.js`)
   - Manages tenant context throughout the request lifecycle
   - Provides centralized access to tenant information
   - Handles tenant isolation enablement via environment variable

3. **Tenant Middleware** (`backend/middleware/tenantMiddleware.js`)
   - Resolves tenant context for each request
   - Non-breaking design - maintains backward compatibility
   - Provides optional strict tenant enforcement

4. **Tenant Validation** (`backend/services/tenantValidation.js`)
   - Validates tenant-related operations
   - Ensures data integrity and proper tenant isolation
   - Validates cross-tenant operations (platform owners only)

5. **Tenant Repository Utilities** (`backend/utils/tenantRepository.js`)
   - Utility functions for tenant-aware database operations
   - Helps implement tenant isolation in queries
   - Provides tenant filtering for CRUD operations

## Database Schema Changes

All data models now include a `companyId` field:

- **UserModel.js** - Users belong to a company
- **Report.js** - Reports belong to a company
- **Notification.js** - Notifications belong to a company
- **PowerStatus.js** - Power status belongs to a company
- **Feeder.js** - Feeders belong to a company
- **State.js** - States belong to a company
- **LGA.js** - LGAs belong to a company
- **Ward.js** - Wards belong to a company
- **InjectionSubstation.js** - Injection substations belong to a company
- **Outage.js** - Outages belong to a company
- **PowerLog.js** - Power logs belong to a company
- **Prediction.js** - Predictions belong to a company
- **Reminder.js** - Reminders belong to a company

All `companyId` fields are:
- Optional (non-breaking)
- Indexed for performance
- Reference the Company model

## API Changes

### Non-Breaking Enhancements

1. **Server Middleware**
   - Added `softTenantMiddleware` to `server.js`
   - Quietly resolves tenant context without changing existing behavior
   - Attaches `req.tenantContext`, `req.companyId`, `req.company` to requests

2. **User Registration**
   - New users are automatically associated with the default company
   - No breaking changes to registration API

3. **Admin Creation**
   - New admins are automatically associated with the default company
   - No breaking changes to admin creation API

## Environment Variables

### TENANT_ISOLATION_ENABLED

- **Default**: `false` (disabled for backward compatibility)
- **Purpose**: Controls whether tenant isolation is enforced
- **Usage**: Set to `true` to enable strict tenant filtering

When disabled (default):
- Tenant context is resolved but not enforced
- All existing functionality continues to work unchanged
- New data gets companyId but queries don't filter by it

When enabled:
- Queries automatically filter by tenant
- Platform owners can see all data
- Regular users only see their company's data

## Migration

### Safe Migration Script

Run the migration script to associate existing data with the default company:

```bash
npm run migrate:tenant
```

The migration script:
- Finds or creates a default company
- Adds `companyId` to all documents that don't have it
- Is idempotent (safe to run multiple times)
- Never removes or modifies existing data
- Never changes existing `companyId` values

### Manual Migration

If you need to migrate manually:

```javascript
import { getDefaultCompany } from './services/tenantResolver.js';
import User from './models/UserModel.js';

const defaultCompany = await getDefaultCompany();
await User.updateMany(
  { companyId: { $exists: false } },
  { companyId: defaultCompany._id }
);
```

## Usage Examples

### Using Tenant Context in Controllers

```javascript
export const myController = async (req, res) => {
  // Tenant context is available from middleware
  const companyId = req.companyId;
  const company = req.company;
  const tenantContext = req.tenantContext;
  
  // Check if user is platform owner
  if (tenantContext.isPlatformOwnerUser()) {
    // Platform owner can access all data
  }
  
  // Get tenant filter for queries
  const filter = tenantContext.getTenantFilter();
  const data = await MyModel.find(filter);
};
```

### Using Tenant Repository Utilities

```javascript
import { tenantFind, createWithTenant } from '../utils/tenantRepository.js';

// Find with tenant filtering
const query = await tenantFind(MyModel, { status: 'active' });
const results = await query.exec();

// Create with tenant context
const data = createWithTenant({ name: 'Test', status: 'active' });
const document = await MyModel.create(data);
```

### Using Tenant Validation

```javascript
import { validateUserCompanyAccess } from '../services/tenantValidation.js';

const validation = await validateUserCompanyAccess(userId, companyId);
if (!validation.valid) {
  return res.status(403).json({ message: validation.message });
}
```

## Backward Compatibility

The Tenant Isolation Engine is designed to be fully backward compatible:

1. **Optional companyId**: All companyId fields are optional
2. **Soft middleware**: Tenant middleware doesn't fail if context can't be resolved
3. **Disabled by default**: Tenant isolation is off unless explicitly enabled
4. **Existing APIs**: All existing APIs continue to work unchanged
5. **Data migration**: Existing data is safely migrated without loss
6. **Default company**: New users/data automatically get default company

## Security Considerations

### Platform Owners

Platform owners (`platform-owner`, `super-admin` roles):
- Can access data from all companies
- Can perform cross-tenant operations
- Are exempt from tenant filtering

### Regular Users

Regular users:
- Can only access data from their own company
- Are subject to tenant filtering when isolation is enabled
- Cannot perform cross-tenant operations

### Tenant Isolation Rules

When `TENANT_ISOLATION_ENABLED=true`:
- All queries automatically filter by user's companyId
- Users cannot access data from other companies
- Platform owners see all data
- Cross-company operations require platform owner access

## Testing

### Verify Tenant Isolation

1. Run the migration script:
   ```bash
   npm run migrate:tenant
   ```

2. Verify data has companyId:
   ```bash
   npm run doctor
   ```

3. Test existing functionality:
   ```bash
   npm run verify
   ```

### Enable Tenant Isolation

To enable strict tenant isolation:

1. Set environment variable:
   ```bash
   TENANT_ISOLATION_ENABLED=true
   ```

2. Restart the server:
   ```bash
   npm run dev
   ```

3. Test that users can only access their company's data

## Troubleshooting

### Issue: Users can't access data after enabling isolation

**Cause**: Users don't have companyId assigned

**Solution**: Run migration script to assign default company:
```bash
npm run migrate:tenant
```

### Issue: Platform owners can't see all data

**Cause**: Platform owner role not recognized

**Solution**: Ensure user has `platform-owner` or `super-admin` role

### Issue: New users don't get companyId

**Cause**: Default company doesn't exist

**Solution**: Run migration script to create default company:
```bash
npm run migrate:tenant
```

## Future Enhancements

The Tenant Isolation Engine prepares the system for:

1. **Multi-company UI**: Company selector for platform owners
2. **Company switching**: Runtime context switching for authorized users
3. **Cross-company reporting**: Aggregated reports across companies
4. **Company-specific settings**: Per-company configuration
5. **Horizontal scalability**: Database sharding by company

## Global Geography vs Company Coverage Architecture

### Concept Distinction
1. **Global Geography (`Country` → `State`)**:
   - Administrative geographic entities are global (`companyId: null`).
   - Standard states (e.g., Kano, Jigawa, Katsina under Nigeria) exist once in the global registry.
   - Managed exclusively by Platform Owner (`platform-owner`).

2. **Company Coverage (`Company.coverageStates`)**:
   - Utility companies (DISCOs) reference existing global states via their ObjectIds inside `coverageStates`.
   - Creating or assigning company coverage does NOT duplicate global State records.
   - Super Admins operations (LGAs, Wards, Feeders) inside coverage states are scoped to their assigned company coverage.

### Data Reconciliation & Seeder Rules
- **Idempotency**: `seedDefaultGeography` matches existing states case-insensitively by `name` + `country` ID to prevent duplicate state creation.
- **Data Reconciliation**: `backend/scripts/reconcileGeography.js` resolves all LGAs, Wards, Feeders, and Company Coverage references to canonical State ObjectIds.
- **Index Optimization**: Duplicate index declarations in `Country`, `Platform`, and `Coordinates` schemas are eliminated to prevent Mongoose duplicate key / index warnings on startup.

## Implementation Checklist

- [x] Review Company Foundation (EIP-01) and Enterprise Identity (EIP-02)
- [x] Analyze current database models for companyId requirements
- [x] Design and implement Tenant Resolver
- [x] Design and implement Tenant Context Service
- [x] Design and implement Tenant Middleware
- [x] Design and implement Tenant Validation
- [x] Implement Tenant Repository support utilities
- [x] Safely migrate existing data to default company
- [x] Update database models with companyId (non-breaking)
- [x] Update APIs to support tenant isolation (backward compatible)
- [x] Reconcile orphaned LGAs/Wards to canonical State ObjectIds
- [x] Enforce idempotent geography seeding and fix duplicate schema index warnings
- [x] Update documentation for Tenant Isolation Engine & Global Geography

## Notes

- This implementation follows SOLID principles
- Tenant logic is centralized in dedicated services
- No changes to business logic, authentication, AI, or frontend
- Full backward compatibility maintained
- No breaking changes to existing APIs
- Data migration is safe and idempotent
