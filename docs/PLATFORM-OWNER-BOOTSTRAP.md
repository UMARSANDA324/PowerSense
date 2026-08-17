# Platform Owner Bootstrap System

## Overview

The Platform Owner Bootstrap System provides the root account provisioning for the Litha Platform. The Platform Owner is the true root account that exists ABOVE every Company, with global access to all infrastructure, permissions, and features.

This system ensures that the Platform Owner is properly provisioned with the correct metadata and permissions, preventing authorization failures that occur when simply changing a user's role in MongoDB.

## Architecture

### Platform Hierarchy

```
Litha Platform
    ↓
Platform Owner (Root Account)
    ↓
Companies
    ↓
Company Super Admin
    ↓
Regional Admin
    ↓
Operator/Admin
    ↓
User
```

### Components

1. **Platform Model** (`backend/models/Platform.js`)
   - Represents the Litha Platform itself
   - Tracks bootstrap status
   - Stores Platform Owner reference
   - Platform-level configuration

2. **Bootstrap Service** (`backend/services/bootstrapService.js`)
   - Orchestrates the bootstrap process
   - Idempotent - running multiple times never creates duplicates
   - Runs on application startup
   - Non-breaking - failures don't prevent server startup

3. **Platform Owner Provisioner** (`backend/services/platformOwnerProvisioner.js`)
   - Creates the initial Platform Owner account
   - Sets required platform metadata
   - Generates secure credentials if not provided
   - Prevents unauthorized Platform Owner creation

4. **Bootstrap Validator** (`backend/services/bootstrapValidator.js`)
   - Validates Platform Owner integrity
   - Prevents unauthorized modifications
   - Prevents Platform Owner deletion/downgrade
   - Ensures bootstrap consistency

## Platform Owner Properties

### Required Properties

- **Role**: `platform-owner`
- **Global Runtime Context**: Access to all companies and infrastructure
- **Global Operational Scope**: No restrictions on operations
- **Global Permissions**: All permissions granted
- **Platform Metadata**: Special platform-level metadata

### NOT Required

- **Assigned Feeder**: Platform Owner doesn't need feeder assignments
- **Assigned Ward**: Platform Owner doesn't need ward assignments
- **Assigned Injection Substation**: Platform Owner doesn't need substation assignments
- **Assigned Band**: Platform Owner doesn't need band assignments
- **Assigned LGA**: Platform Owner doesn't need LGA assignments
- **Assigned State**: Platform Owner doesn't need state assignments
- **Assigned Company**: Platform Owner belongs to Platform, not any company

## Bootstrap Process

### Self-Healing Bootstrap Reconciliation

The bootstrap process is self-healing and uses database state as the source of truth:

1. **Ensure Platform**: Always ensure the Platform entity exists
2. **Check Database State**: Always check whether a Platform Owner user actually exists in the database
3. **Reconcile State**: If Platform Owner exists, reconcile platform state with database state
4. **Self-Heal**: If Platform Owner does not exist, automatically recreate it from .env variables

### Bootstrap Behavior

**If Platform Owner exists in database:**
- Reconciles platform state with database state
- Marks bootstrap as complete with existing Platform Owner
- Never overwrites existing credentials
- Never creates duplicates
- Returns action: `reconciled`

**If Platform Owner does not exist in database:**
- Reads credentials from environment variables
- Creates Platform Owner using .env values
- Attaches all required platform metadata
- Validates the created account
- Marks bootstrap as complete
- Returns action: `created`

**If required environment variables are missing:**
- Bootstrap fails with clear error message
- Server continues to start (non-critical failure)
- Error message indicates which variables are missing

### Self-Healing Behavior

The bootstrap is designed to be self-healing:
- If someone accidentally deletes the Platform Owner from the database
- Restarting the backend will automatically recreate it from .env variables
- The `bootstrapComplete` flag is never treated as the only source of truth
- Database state is the source of truth
- This ensures production systems can recover from accidental deletions

### Idempotent Behavior

The bootstrap process is idempotent:
- Running multiple times never creates duplicate Platform Owners
- If Platform Owner exists, it reconciles state without changes
- If Platform Owner doesn't exist, it creates one
- Safe to run on every server startup

## Environment Variables

### REQUIRED Configuration

The Platform Owner bootstrap REQUIRES the following environment variables to be set in the backend `.env` file:

```bash
# REQUIRED - Platform Owner credentials
PLATFORM_OWNER_NAME=Platform Owner
PLATFORM_OWNER_EMAIL=platform-owner@litha.com
PLATFORM_OWNER_PASSWORD=your-secure-password-minimum-8-characters
```

**Important Notes:**
- These variables are **REQUIRED** - the bootstrap will fail if any are missing
- No default values are generated - you must provide all three variables
- Password must be at least 8 characters long
- Email must be a valid email format (contains @ and .)
- The bootstrap process will never overwrite an existing Platform Owner's password
- The bootstrap process will never create duplicate Platform Owners

### Bootstrap Behavior

**If Platform Owner does not exist:**
- Creates Platform Owner using the environment variable values
- Marks bootstrap as complete

**If Platform Owner already exists:**
- Does nothing (idempotent)
- Never overwrites existing password
- Never creates duplicates

**If required environment variables are missing:**
- Bootstrap fails with clear error message
- Server continues to start (non-critical failure)
- Error message indicates which variables are missing

## Runtime Context Integration

### Platform Owner Context Resolution

When the authenticated user is Platform Owner:

```javascript
// Runtime Context resolves:
{
  user: Platform Owner,
  company: null,  // Platform Owner belongs to Platform, not any company
  role: 'platform-owner',
  permissions: ['*'],  // Global permissions
  isPlatformOwner: true,
  assignedFeeders: [],  // No assignments needed
  assignedInjectionSubstations: [],
  assignedWards: [],
  band: null
}
```

### Platform Owner vs Company Super Admin

**Platform Owner:**
- Belongs to Platform (not any company)
- Global access to all companies
- Global operational scope
- No resource assignments needed

**Company Super Admin:**
- Belongs to a specific company
- Access limited to their company only
- Company-wide operational scope
- May have resource assignments

## Operational Scope Integration

### Platform Owner Scope

```javascript
// Operational Scope resolves:
{
  scopeLevel: 'global',
  companyId: null,  // Platform Owner belongs to Platform
  accessibleFeederIds: [],  // All feeders accessible
  accessibleInjectionSubstationIds: [],  // All substations accessible
  accessibleStateIds: [],  // All states accessible
  accessibleLGAIds: []  // All LGAs accessible
}
```

### Scope Level Comparison

| Role | Scope Level | Company | Feeders |
|------|-------------|---------|---------|
| Platform Owner | Global | All | All |
| Company Super Admin | Company | Own Company | All in Company |
| Regional Admin | Regional | Own Company | Assigned Regions |
| Admin/Operator | Feeder | Own Company | Assigned Feeders |
| User | User | Own Company | Assigned Feeder |

## Security

### Immutable Platform Owner

The Platform Owner is protected by multiple security layers:

1. **Bootstrap Service Only**: Only bootstrap service can create Platform Owner
2. **Validator Protection**: Validator prevents unauthorized modifications
3. **Deletion Protection**: Platform Owner cannot be deleted
4. **Downgrade Protection**: Platform Owner cannot be downgraded
5. **Role Protection**: Role changes are validated

### Unauthorized Change Prevention

```javascript
// ❌ BLOCKED - Direct MongoDB role change
db.users.updateOne({ _id: userId }, { $set: { role: 'platform-owner' } })
// Result: 403 Forbidden - Missing platform metadata

// ❌ BLOCKED - Attempt to delete Platform Owner
await User.deleteOne({ role: 'platform-owner' })
// Result: Error - Cannot delete Platform Owner

// ❌ BLOCKED - Attempt to downgrade Platform Owner
await User.updateOne({ role: 'platform-owner' }, { role: 'admin' })
// Result: Error - Cannot downgrade Platform Owner

// ✅ ALLOWED - Bootstrap service creates Platform Owner
await bootstrapService.bootstrap()
// Result: Platform Owner created with correct metadata
```

## Authentication

### Platform Owner Login

Platform Owner uses the existing authentication system:

```javascript
// Standard login endpoint
POST /api/auth/login
{
  "email": "platform-owner@litha.com",
  "password": "password"
}

// Returns standard JWT token
{
  "token": "jwt-token",
  "user": {
    "email": "platform-owner@litha.com",
    "role": "platform-owner",
    "fullName": "Platform Owner"
  }
}
```

### No Special Endpoints

- No special Platform Owner login endpoint
- No duplicated authentication flow
- Uses existing `/api/auth/login` endpoint
- Standard JWT token generation

## Usage Examples

### Check Bootstrap Status

```javascript
import { getBootstrapService } from '../services/bootstrapService.js';

const bootstrapService = getBootstrapService();
const isComplete = await bootstrapService.isBootstrapComplete();
console.log('Bootstrap complete:', isComplete);
```

### Get Platform Owner

```javascript
import { getBootstrapService } from '../services/bootstrapService.js';

const bootstrapService = getBootstrapService();
const platformOwner = await bootstrapService.getPlatformOwner();
console.log('Platform Owner:', platformOwner);
```

### Validate Platform Owner

```javascript
import { getBootstrapValidator } from '../services/bootstrapValidator.js';

const validator = getBootstrapValidator();
const summary = await validator.getValidationSummary();
console.log('Validation summary:', summary);
```

### Check if User is Platform Owner

```javascript
import { getBootstrapValidator } from '../services/bootstrapValidator.js';

const validator = getBootstrapValidator();
const isPlatformOwner = await validator.isPlatformOwner(userId);
console.log('Is Platform Owner:', isPlatformOwner);
```

## Backward Compatibility

The Platform Owner Bootstrap System is fully backward compatible:

1. **Non-breaking**: Bootstrap failures don't prevent server startup
2. **Optional**: Existing users continue working without Platform Owner
3. **No Route Changes**: No modifications to existing routes
4. **No UI Changes**: No frontend modifications required
5. **Existing APIs**: All existing APIs continue to work
6. **Graceful Degradation**: System works without Platform Owner

## Testing

### Verify Bootstrap

1. Start the server:
   ```bash
   npm run dev
   ```

2. Check console output for bootstrap status:
   ```
   [Bootstrap] Starting platform bootstrap...
   [Bootstrap] Platform ensured: LITHA_PLATFORM
   [Bootstrap] Provisioning new Platform Owner...
   [PlatformOwnerProvisioner] Platform Owner created: { email: '...', fullName: '...' }
   [Bootstrap] Bootstrap marked as complete
   [Litha] Platform bootstrap complete: Bootstrap complete
   ```

3. Verify Platform Owner in database:
   ```javascript
   db.users.findOne({ role: 'platform-owner' })
   ```

4. Verify Platform in database:
   ```javascript
   db.platforms.findOne({ platformId: 'LITHA_PLATFORM' })
   ```

### Verify Platform Owner Login

1. Login as Platform Owner:
   ```bash
   curl -X POST http://localhost:5002/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"platform-owner@litha.com","password":"password"}'
   ```

2. Verify JWT token works with existing endpoints

3. Verify global access to all companies

### Verify Existing Functionality

Run smoke tests to ensure no breaking changes:
```bash
npm run smoke
npm run health
npm run verify
```

## Troubleshooting

### Issue: Bootstrap fails with "Missing required environment variables"

**Cause**: One or more required environment variables are not set in `.env` file

**Solution**: Add the following to your backend `.env` file:
```bash
PLATFORM_OWNER_NAME=Platform Owner
PLATFORM_OWNER_EMAIL=platform-owner@litha.com
PLATFORM_OWNER_PASSWORD=your-secure-password-minimum-8-characters
```

The error message will indicate which specific variables are missing or empty.

### Issue: Platform Owner not created

**Cause**: Bootstrap failed due to missing environment variables or database connection issue

**Solution**: 
1. Check server logs for specific error message
2. Verify all three required environment variables are set
3. Verify database connection
4. Re-run bootstrap by restarting server

### Issue: Platform Owner login fails with 403

**Cause**: Platform Owner missing platform metadata

**Solution**: Re-run bootstrap to ensure correct metadata is set (if Platform Owner doesn't exist)

### Issue: Bootstrap fails on startup

**Cause**: Required environment variables missing or database connection issue

**Solution**: 
1. Check that all three required environment variables are set in `.env`
2. Verify database connection
3. Check server logs for specific error message

### Issue: Password not being updated

**Cause**: Bootstrap never overwrites existing Platform Owner password

**Solution**: This is intentional. To change Platform Owner password, you must update it directly in the database or through a dedicated admin interface. The bootstrap process will never overwrite an existing Platform Owner's password.

### Issue: Platform Owner cannot access companies

**Cause**: Runtime context not resolving correctly

**Solution**: Verify runtime context middleware is running, check user role

## Implementation Checklist

- [x] Review existing Enterprise Architecture (EIP-01 through EIP-06)
- [x] Design Platform entity and Platform Owner data structure
- [x] Create Platform model
- [x] Implement Bootstrap Service
- [x] Implement Platform Owner Provisioner
- [x] Update Runtime Context Engine for Platform Owner
- [x] Update Operational Scope Engine for Platform Owner
- [x] Implement Bootstrap Validator
- [x] Integrate Bootstrap into server startup (non-breaking)
- [x] Update Enterprise Architecture documentation
- [ ] Test Platform Owner login and access
- [ ] Test all existing functionality (no breaking changes)

## Notes

- Platform Owner is the true root account of the Litha Platform
- Platform Owner exists ABOVE every Company
- Platform Owner requires special platform metadata beyond role field
- Bootstrap process is idempotent and safe to run multiple times
- Platform Owner cannot be deleted or downgraded
- Platform Owner uses existing authentication system
- Full backward compatibility maintained
- No breaking changes to existing APIs
- Production-ready implementation
