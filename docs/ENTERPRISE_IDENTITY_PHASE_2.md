# Enterprise Identity & Role Management - Phase 2 Implementation

## Overview

This document describes the Enterprise Identity & Role Management system implemented in Phase 2 of the Enterprise Implementation Pack (EIP-02). This system provides a production-level identity architecture while maintaining full backward compatibility with the existing Litha deployment.

## Implementation Status

### ✅ Completed Components

1. **Role Registry** (`backend/config/roleRegistry.js`)
   - Complete role hierarchy implementation
   - Role metadata and level definitions
   - Legacy role mapping for backward compatibility
   - Role validation and normalization functions

2. **Permission Registry** (`backend/config/permissionRegistry.js`)
   - Modular permission system
   - Permission groups for functional organization
   - Role-to-permission mapping
   - Permission validation functions

3. **Identity Configuration** (`backend/config/identityConfig.js`)
   - Centralized identity configuration
   - Unified interface for role and permission operations
   - Feature flags for identity system
   - Backward compatibility utilities

4. **Identity Middleware** (`backend/middleware/identityMiddleware.js`)
   - Permission-based access control
   - Role hierarchy validation
   - Enhanced authorization middleware
   - Backward-compatible role checks

5. **Database Model Updates**
   - User model updated with new role enum
   - Backward compatible with existing roles
   - No data migration required

6. **Controller Updates**
   - Auth controller enhanced with role information
   - Admin controller updated with role validation
   - All changes maintain backward compatibility

7. **Route Updates**
   - Admin routes updated with enhanced middleware
   - Support for new enterprise roles
   - Legacy role support maintained

## Role Hierarchy

The enterprise role hierarchy is implemented as follows:

```
Platform Owner (Level 100)
    ↓
Company Super Admin (Level 80)
    ↓
Regional Admin (Level 60)
    ↓
Operator/Admin (Level 40)
    ↓
User (Level 20)
```

### Role Definitions

#### Platform Owner
- **Role**: `platform-owner`
- **Level**: 100
- **Access**: Global platform access
- **Capabilities**:
  - Manage Companies
  - Create Companies
  - Suspend Companies
  - Delete Companies
  - Assign Company Super Admins
  - View Global Analytics
  - Configure Enterprise Settings
- **Status**: Prepared (not exposed in frontend yet)

#### Company Super Admin
- **Role**: `company-super-admin`
- **Level**: 80
- **Access**: Company-wide access within assigned company
- **Capabilities**:
  - Manage company's states, LGAs, injection substations, feeders, wards
  - Create and manage company admins
  - Configure company-specific settings
  - Manage company's users
  - Access company-wide analytics and reports
- **Boundary**: Cannot manage another company or access Platform Owner functionality

#### Regional Admin
- **Role**: `regional-admin`
- **Level**: 60
- **Access**: Geographic region within company
- **Capabilities**:
  - Manage multiple feeders in a region
  - Coordinate regional operations
  - Access regional analytics
  - Manage regional teams
- **Boundary**: Limited to assigned geographic region

#### Operator/Admin
- **Role**: `admin`
- **Level**: 40
- **Access**: Feeder-level access within assigned company
- **Capabilities**:
  - Manage assigned feeders' power status
  - View and respond to reports from users in their assigned feeders
  - Send notifications to users in their assigned feeders
  - Access feeder-level analytics
- **Status**: Fully functional (existing Admin role)

#### User
- **Role**: `user`
- **Level**: 20
- **Access**: Individual user access
- **Capabilities**:
  - View power status for their location
  - Submit power outage reports
  - Receive notifications about power status
  - Access personal analytics (if business mode enabled)
- **Status**: Fully functional (existing User role)

## Permission System

### Permission Groups

Permissions are organized into functional groups:

#### Power Control Group
- `power.view` - View power status for assigned feeders
- `power.update` - Update power status (on/off/maintenance)
- `power.history` - View power status history
- `power.schedule` - Schedule maintenance windows
- `power.predict` - View predictive outage information
- `power.analytics` - Access power analytics and insights

#### Reports Group
- `reports.view` - View reports from assigned areas
- `reports.create` - Submit new reports
- `reports.respond` - Respond to and resolve reports
- `reports.assign` - Assign reports to specific users
- `reports.analytics` - Access report analytics
- `reports.export` - Export report data

#### Messaging Group
- `messaging.view` - View message history
- `messaging.create` - Create and send messages
- `messaging.broadcast` - Send broadcast messages
- `messaging.emergency` - Send emergency notifications
- `messaging.templates` - Manage message templates
- `messaging.analytics` - Access messaging analytics

#### AI Dashboard Group
- `ai.view` - View AI dashboard and analytics
- `ai.predictions` - View AI predictions
- `ai.insights` - Access AI-generated insights
- `ai.customize` - Customize AI models and parameters
- `ai.export` - Export AI analytics data

#### Infrastructure Group
- `infrastructure.view` - View infrastructure data
- `infrastructure.create` - Create new infrastructure
- `infrastructure.update` - Modify existing infrastructure
- `infrastructure.delete` - Delete infrastructure
- `infrastructure.assign` - Assign infrastructure to admins/users
- `infrastructure.analytics` - Access infrastructure analytics

#### Users Group
- `users.view` - View user information
- `users.create` - Create new user accounts
- `users.update` - Modify user accounts
- `users.delete` - Delete user accounts
- `users.assign` - Assign roles and permissions to users
- `users.activate` - Activate/deactivate user accounts
- `users.analytics` - Access user analytics

#### Notifications Group
- `notifications.view` - View notification history
- `notifications.configure` - Configure notification settings
- `notifications.send` - Send notifications
- `notifications.manage` - Manage notification preferences
- `notifications.analytics` - Access notification analytics

#### Analytics Group
- `analytics.view` - View analytics dashboards
- `analytics.reports` - Generate and view reports
- `analytics.export` - Export analytics data
- `analytics.custom` - Create custom analytics views
- `analytics.predictive` - Access predictive analytics
- `analytics.company` - View company-level analytics

#### Company Management Group
- `company.view` - View company information
- `company.configure` - Configure company settings
- `company.branding` - Manage company branding
- `company.subscription` - Manage company subscription
- `company.integrations` - Configure company integrations
- `company.analytics` - Access company analytics

#### Platform Management Group
- `platform.view` - View platform-wide information
- `platform.configure` - Configure platform settings
- `platform.companies` - Manage distribution companies
- `platform.billing` - Manage platform billing
- `platform.security` - Configure platform security
- `platform.analytics` - Access platform analytics
- `platform.integrations` - Configure platform integrations

### Role-Permission Mapping

#### Platform Owner
- **Permission Groups**: All groups
- **Access**: Full platform access

#### Company Super Admin
- **Permission Groups**: All except Platform Management
- **Access**: Full company access

#### Regional Admin
- **Permission Groups**: Power Control, Reports, Messaging, AI Dashboard, Infrastructure, Users, Notifications, Analytics
- **Access**: Regional company access

#### Admin
- **Permission Groups**: Power Control, Reports, Messaging, AI Dashboard, Analytics
- **Access**: Feeder-level access

#### User
- **Permission Groups**: Power Control (view only), Reports (create only), Notifications (view only)
- **Access**: Personal access

## Backward Compatibility

### Legacy Role Mapping

The system maintains full backward compatibility with existing roles through automatic normalization:

| Legacy Role | New Role | Level |
|-------------|----------|-------|
| `super-admin` | `company-super-admin` | 80 |
| `admin` | `admin` | 40 |
| `user` | `user` | 20 |

### Database Compatibility

- **User Model**: Updated enum includes both new and legacy roles
- **No Migration Required**: Existing users continue to work without changes
- **Automatic Normalization**: Legacy roles are automatically normalized to new roles

### API Compatibility

- **Existing Endpoints**: All existing API endpoints continue to work
- **Response Format**: Enhanced responses include additional role information
- **Authentication**: Current login flow remains unchanged
- **Authorization**: Existing role checks continue to work

### Frontend Compatibility

- **Current Dashboards**: Admin and Super Admin dashboards continue to work
- **User Interface**: No breaking changes to existing UI
- **Role Display**: Frontend can use either legacy or normalized role names

## Architecture Components

### 1. Role Registry (`backend/config/roleRegistry.js`)

**Purpose**: Central role management and hierarchy validation

**Key Functions**:
- `normalizeRole()` - Convert legacy roles to new roles
- `getRoleLevel()` - Get privilege level for a role
- `hasHigherOrEqualPrivilege()` - Check role hierarchy
- `getRoleMetadata()` - Get role display information
- `getManageableRoles()` - Get roles that can be managed by a given role

**Usage Example**:
```javascript
import { normalizeRole, hasHigherOrEqualPrivilege } from '../config/roleRegistry.js';

const normalizedRole = normalizeRole('super-admin'); // Returns 'company-super-admin'
const canManage = hasHigherOrEqualPrivilege('company-super-admin', 'admin'); // Returns true
```

### 2. Permission Registry (`backend/config/permissionRegistry.js`)

**Purpose**: Modular permission management and validation

**Key Functions**:
- `getRolePermissions()` - Get all permissions for a role
- `roleHasPermission()` - Check if role has specific permission
- `getGroupPermissions()` - Get permissions in a group
- `isValidPermission()` - Validate permission string

**Usage Example**:
```javascript
import { getRolePermissions, roleHasPermission } from '../config/permissionRegistry.js';

const permissions = getRolePermissions('admin');
const canUpdatePower = roleHasPermission('admin', 'power.update'); // Returns true
```

### 3. Identity Configuration (`backend/config/identityConfig.js`)

**Purpose**: Unified interface for identity operations

**Key Functions**:
- `canPerformAction()` - Check if role can perform action
- `canManageRole()` - Check if role can manage another role
- `validateRoleAssignment()` - Validate role assignment
- `getRoleDisplayInfo()` - Get role display information

**Usage Example**:
```javascript
import { canPerformAction, validateRoleAssignment } from '../config/identityConfig.js';

const canUpdate = canPerformAction('admin', 'power.update');
const validation = validateRoleAssignment('company-super-admin', 'admin');
```

### 4. Identity Middleware (`backend/middleware/identityMiddleware.js`)

**Purpose**: Permission-based access control middleware

**Key Middleware**:
- `requirePermission()` - Require specific permission
- `requireAnyPermission()` - Require any of specified permissions
- `requireAllPermissions()` - Require all specified permissions
- `canManageRoleMiddleware()` - Check role management capability
- `authorizeEnhanced()` - Enhanced role-based authorization

**Usage Example**:
```javascript
import { requirePermission, authorizeEnhanced } from '../middleware/identityMiddleware.js';

router.get('/api/power/status', requirePermission('power.view'), controller);
router.post('/api/users/:id/role', canManageRoleMiddleware('targetRole'), controller);
router.get('/api/admin/stats', authorizeEnhanced('super-admin', 'admin'), controller);
```

## API Changes

### Enhanced Response Format

Login and profile endpoints now include additional role information:

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "super-admin",
    "normalizedRole": "company-super-admin",
    "roleInfo": {
      "role": "company-super-admin",
      "name": "Company Super Admin",
      "description": "Highest administrative role within a specific distribution company",
      "level": 80,
      "isPlatformRole": false,
      "isLegacy": true
    },
    "permissions": [
      "power.view",
      "power.update",
      "reports.view",
      // ... more permissions
    ],
    // ... other user fields
  },
  "token": "jwt_token"
}
```

### New Role Assignment Support

Admin creation and promotion endpoints now support role assignment:

```json
POST /api/admin/create-admin
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "regional-admin",
  "assignedFeederId": "feeder_id"
}
```

### Enhanced Error Messages

Role-related errors now include detailed information:

```json
{
  "message": "Insufficient privilege to assign this role",
  "code": "ROLE_ASSIGNMENT_INVALID",
  "assignerRole": "admin",
  "targetRole": "company-super-admin"
}
```

## Testing

### Verification Checklist

- [x] Current Login - Users can log in with existing credentials
- [x] Admin Login - Admins can log in and access admin dashboard
- [x] Super Admin Login - Super admins can log in and access super admin dashboard
- [x] User Login - Regular users can log in and access user features
- [x] Dashboard Access - All dashboards remain accessible
- [x] Permission Checks - Permission validation works correctly
- [x] Role Hierarchy - Role hierarchy validation works correctly
- [x] Legacy Support - Legacy roles continue to work
- [x] API Endpoints - All existing API endpoints continue to work
- [x] Database Operations - Database operations work correctly

### Backward Compatibility Tests

1. **Login Test**: Existing users can log in without changes
2. **Role Test**: Existing admin and super-admin roles work correctly
3. **Dashboard Test**: Admin and super-admin dashboards load correctly
4. **API Test**: All existing API endpoints respond correctly
5. **Permission Test**: Existing permission checks work correctly

## Migration Guide

### For Existing Users

No migration required. The system automatically handles legacy roles:

1. Existing `super-admin` users are treated as `company-super-admin`
2. Existing `admin` users continue as `admin`
3. Existing `user` users continue as `user`

### For Developers

When developing new features:

1. **Use Enhanced Middleware**: Prefer `authorizeEnhanced()` over `authorize()`
2. **Permission-Based Access**: Use `requirePermission()` for granular control
3. **Role Normalization**: Always normalize roles before comparison
4. **Display Information**: Use `getRoleDisplayInfo()` for UI display

### Example: Adding New Role Check

**Old Way**:
```javascript
import { authorize } from '../middleware/rolemiddleware.js';

router.get('/api/resource', authorize('super-admin', 'admin'), controller);
```

**New Way**:
```javascript
import { authorizeEnhanced } from '../middleware/identityMiddleware.js';

router.get('/api/resource', authorizeEnhanced('super-admin', 'admin', 'company-super-admin', 'regional-admin'), controller);
```

## Future Readiness

### Foundation for Future Phases

This implementation provides the foundation for:

- **Phase 3**: Tenant Isolation & Data Security
- **Phase 4**: Runtime Context & Operations
- **Phase 5**: Operational Scope & Administrative Hierarchy
- **Phase 6**: Enterprise Governance, Workflow & Audit

### Extensibility

The system is designed to be easily extended:

1. **New Roles**: Add roles to role registry without changing core logic
2. **New Permissions**: Add permissions to permission groups
3. **New Permission Groups**: Create new functional permission groups
4. **Custom Middleware**: Build custom middleware using existing functions

### Scalability

The architecture supports:

- **Multiple Companies**: Ready for multi-tenant deployment
- **Complex Hierarchies**: Supports nested organizational structures
- **Granular Permissions**: Fine-grained access control
- **Performance**: Optimized for high-volume operations

## Security Considerations

### Role Validation

- All role assignments are validated against hierarchy
- Users cannot assign roles higher than their own
- Platform owner role is protected

### Permission Checks

- Permission checks are performed at multiple levels
- Scope validation ensures data isolation
- Permission inheritance follows hierarchy

### Audit Trail

- Role changes are logged
- Permission checks are traceable
- Access violations are recorded

## Performance

### Optimization

- Role normalization is cached
- Permission checks are optimized
- Database queries are indexed

### Caching Strategy

- Role metadata is cached in memory
- Permission groups are pre-computed
- Hierarchy levels are stored as constants

## Troubleshooting

### Common Issues

**Issue**: Users cannot access previously accessible routes
- **Solution**: Check if role normalization is working correctly
- **Check**: Verify legacy role mapping in role registry

**Issue**: Permission checks failing unexpectedly
- **Solution**: Verify permission group assignments
- **Check**: Ensure role has required permission groups

**Issue**: Role assignment failing
- **Solution**: Check role hierarchy validation
- **Check**: Verify assigner has sufficient privilege

## Conclusion

The Enterprise Identity & Role Management system (Phase 2) provides a production-ready, scalable, and backward-compatible identity architecture. It establishes the foundation for future enterprise phases while ensuring that all existing functionality continues to work without interruption.

### Key Achievements

✅ Complete role hierarchy implementation
✅ Modular permission system
✅ Backward compatibility maintained
✅ Production-ready architecture
✅ Foundation for future phases
✅ No breaking changes
✅ Enhanced security
✅ Improved developer experience

### Next Steps

Phase 2 is complete. The system is ready for:
- Phase 3: Tenant Isolation & Data Security
- Frontend integration for new roles
- Additional testing and validation
- Performance optimization
- Documentation updates

---

**Implementation Date**: 2026-07-17
**Phase**: EIP-02 Phase 2
**Status**: ✅ Complete
