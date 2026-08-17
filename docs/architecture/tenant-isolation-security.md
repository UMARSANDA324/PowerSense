# Tenant Isolation and Data Security Architecture

This document describes the comprehensive tenant isolation and data security architecture for LITHA as it evolves into a multi-tenant enterprise SaaS platform. Every Distribution Company operates as an isolated tenant with complete data separation.

## Overview

LITHA will implement a true multi-tenant architecture where each Distribution Company (DISCO) operates as an isolated tenant. This ensures complete data separation, security boundaries, and compliance with data protection regulations. No tenant should ever access another tenant's data under any circumstances.

## Tenant Model

The tenant model establishes a clear hierarchy where each Distribution Company represents an isolated tenant within the LITHA platform.

```
LITHA Platform
    ↓
Distribution Company (Tenant)
    ↓
States
    ↓
LGAs (Local Government Areas)
    ↓
Injection Substations
    ↓
Feeders
    ↓
Wards
    ↓
Users
```

### Tenant Definition

**Tenant**: A Distribution Company (DISCO) that operates as an isolated entity within the LITHA platform. Each tenant has complete data isolation, independent configuration, and dedicated resources within the shared infrastructure.

**Tenant Characteristics**:
- **Data Isolation**: Complete separation of all data from other tenants
- **Configuration Independence**: Each tenant can configure settings independently
- **Resource Allocation**: Dedicated resource quotas and limits
- **Security Boundaries**: Strict access control between tenants
- **Compliance Scope**: Each tenant maintains its own compliance requirements

### Tenant Hierarchy Levels

#### LITHA Platform
- **Definition**: The overarching SaaS platform that hosts multiple tenants
- **Responsibilities**:
  - Infrastructure management
  - Tenant onboarding and management
  - Platform-wide security and compliance
  - Resource allocation and monitoring
  - Cross-tenant analytics (Platform Owner only)
- **Scope**: Global across all tenants

#### Distribution Company (Tenant)
- **Definition**: An isolated tenant representing an electricity distribution company
- **Examples**:
  - KEDCO (Kano Electricity Distribution Company)
  - AEDC (Abuja Electricity Distribution Company)
  - BEDC (Benin Electricity Distribution Company)
- **Responsibilities**:
  - Manage their assigned states and infrastructure
  - Configure tenant-specific settings
  - Manage their users and admins
  - Access tenant-specific analytics
- **Scope**: Limited to their tenant only

#### States
- **Definition**: Geographic regions managed by a tenant
- **Relationship**: One tenant manages multiple states
- **Isolation**: States belong exclusively to one tenant
- **Scope**: State-level within tenant boundary

#### LGAs (Local Government Areas)
- **Definition**: Administrative divisions within a state
- **Relationship**: Multiple LGAs belong to one state (and thus one tenant)
- **Isolation**: LGAs belong exclusively to one tenant
- **Scope**: LGA-level within tenant boundary

#### Injection Substations
- **Definition**: Power distribution substations that feed multiple feeders
- **Relationship**: Multiple injection substations belong to one LGA (and thus one tenant)
- **Isolation**: Injection substations belong exclusively to one tenant
- **Scope**: Substation-level within tenant boundary

#### Feeders
- **Definition**: Power distribution lines from injection substations to wards
- **Relationship**: Multiple feeders belong to one injection substation (and thus one tenant)
- **Isolation**: Feeders belong exclusively to one tenant
- **Scope**: Feeder-level within tenant boundary

#### Wards
- **Definition**: Geographic areas served by feeders
- **Relationship**: Multiple wards belong to one feeder (and thus one tenant)
- **Isolation**: Wards belong exclusively to one tenant
- **Scope**: Ward-level within tenant boundary

#### Users
- **Definition**: End users (customers) of the electricity distribution company
- **Relationship**: Users belong to a specific tenant
- **Isolation**: Users belong exclusively to one tenant
- **Scope**: Individual user within tenant boundary

## Tenant Isolation

All platform resources must belong to exactly one tenant. This creates a clear ownership model and prevents cross-tenant data access.

### Resource Isolation by Category

#### Users
- **Isolation Requirement**: Each user belongs to exactly one tenant
- **Implementation**: User model includes `companyId` field referencing the tenant
- **Access Control**: Users can only access data within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: A KEDCO user cannot access AEDC user data

#### Admins
- **Isolation Requirement**: Each admin belongs to exactly one tenant
- **Implementation**: Admin model includes `companyId` field referencing the tenant
- **Access Control**: Admins can only manage resources within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: A KEDCO admin cannot manage AEDC feeders

#### States
- **Isolation Requirement**: Each state belongs to exactly one tenant
- **Implementation**: State model includes `companyId` field referencing the tenant
- **Access Control**: States are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: Kano State (KEDCO) is not visible to AEDC

#### LGAs
- **Isolation Requirement**: Each LGA belongs to exactly one tenant (via state relationship)
- **Implementation**: LGA model includes `companyId` field referencing the tenant
- **Access Control**: LGAs are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: Dala LGA (KEDCO) is not visible to AEDC

#### Injection Substations
- **Isolation Requirement**: Each injection substation belongs to exactly one tenant
- **Implementation**: Injection Substation model includes `companyId` field referencing the tenant
- **Access Control**: Injection substations are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: Kano Injection Substation (KEDCO) is not visible to AEDC

#### Feeders
- **Isolation Requirement**: Each feeder belongs to exactly one tenant
- **Implementation**: Feeder model includes `companyId` field referencing the tenant
- **Access Control**: Feeders are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: Dala 11kV Feeder (KEDCO) is not visible to AEDC

#### Wards
- **Isolation Requirement**: Each ward belongs to exactly one tenant
- **Implementation**: Ward model includes `companyId` field referencing the tenant
- **Access Control**: Wards are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: Sabon Gari Ward (KEDCO) is not visible to AEDC

#### Reports
- **Isolation Requirement**: Each report belongs to exactly one tenant
- **Implementation**: Report model includes `companyId` field referencing the tenant
- **Access Control**: Reports are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO outage reports are not visible to AEDC

#### Notifications
- **Isolation Requirement**: Each notification belongs to exactly one tenant
- **Implementation**: Notification model includes `companyId` field referencing the tenant
- **Access Control**: Notifications are delivered only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO notifications are not delivered to AEDC users

#### Messaging
- **Isolation Requirement**: Each message belongs to exactly one tenant
- **Implementation**: OperationsMessage model includes `companyId` field referencing the tenant
- **Access Control**: Messages are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO internal messages are not visible to AEDC

#### History
- **Isolation Requirement**: Each historical data entry belongs to exactly one tenant
- **Implementation**: PowerLog model includes `companyId` field referencing the tenant
- **Access Control**: Historical data is visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO power history is not visible to AEDC

#### Dashboard
- **Isolation Requirement**: Dashboard data is scoped to exactly one tenant
- **Implementation**: Dashboard queries automatically filter by `companyId`
- **Access Control**: Dashboard data is visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO dashboard shows only KEDCO data

#### AI
- **Isolation Requirement**: AI analytics and insights are scoped to exactly one tenant
- **Implementation**: AI queries automatically filter by `companyId`
- **Access Control**: AI data is processed only within their tenant scope
- **Cross-Tenant Access**: Prevented by AI service layer
- **Example**: KEDCO AI analytics use only KEDCO data

#### Analytics
- **Isolation Requirement**: Analytics data is scoped to exactly one tenant
- **Implementation**: Analytics queries automatically filter by `companyId`
- **Access Control**: Analytics data is visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO analytics show only KEDCO metrics

#### Audit Logs
- **Isolation Requirement**: Each audit log entry belongs to exactly one tenant
- **Implementation**: AuditLog model includes `companyId` field referencing the tenant
- **Access Control**: Audit logs are visible only within their tenant
- **Cross-Tenant Access**: Prevented by middleware and query filtering
- **Example**: KEDCO audit logs are not visible to AEDC

#### Future Resources
- **Isolation Requirement**: All future resources must belong to exactly one tenant
- **Implementation**: All new models must include `companyId` field
- **Access Control**: All new resources must respect tenant boundaries
- **Cross-Tenant Access**: Prevented by architectural design
- **Example**: Any new feature must include tenant isolation

### Tenant Isolation Principles

1. **Single Ownership**: Every resource belongs to exactly one tenant
2. **No Sharing**: Resources cannot be shared between tenants
3. **Strict Boundaries**: Tenant boundaries cannot be crossed
4. **Automatic Filtering**: All queries automatically filter by tenant
5. **Default Deny**: Cross-tenant access is denied by default
6. **Explicit Allow**: Only Platform Owner can access cross-tenant data (read-only)

## Company ID as Tenant Isolation Key

The `companyId` field serves as the primary tenant isolation key across the entire LITHA system. This field ensures that all data access is automatically scoped to the correct tenant.

### Company ID Implementation

#### Database Level
Every database document includes a `companyId` field:
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other fields
}
```

#### Query Level
All database queries automatically include `companyId` filter:
```javascript
// Automatic tenant filtering
const users = await User.find({ 
  companyId: req.user.companyId,
  // ... other filters
});
```

#### API Level
All API endpoints enforce tenant isolation via middleware:
```javascript
// Middleware automatically adds companyId filter
app.use(tenantIsolationMiddleware);
```

#### Frontend Level
All frontend components respect tenant boundaries:
```javascript
// API calls automatically include tenant context
const data = await api.get('/api/feeders'); // Filtered by user's companyId
```

### Company ID Properties

#### Uniqueness
- Each `companyId` is unique across the platform
- Represents a specific tenant (Distribution Company)
- Cannot be changed after resource creation

#### Immutability
- `companyId` cannot be modified after resource creation
- Resources cannot be transferred between tenants
- Ensures clear ownership throughout resource lifecycle

#### Indexing
- All `companyId` fields are indexed for query performance
- Compound indexes include `companyId` for optimal filtering
- Enables efficient tenant-scoped queries

#### Validation
- `companyId` must reference an existing active company
- Invalid `companyId` values are rejected
- Cross-tenant reference attempts are prevented

## Security Model

The security model establishes strict boundaries between tenants to prevent unauthorized data access. Each role has clearly defined security boundaries that must never be crossed.

### Role-Based Security Boundaries

#### Platform Owner Security Boundaries
**Access Scope**: Global platform access
- Can access all tenants' data (read-only for operational data)
- Can manage platform-level settings and configuration
- Can create, modify, and delete tenants
- Can access platform-wide analytics and reporting
- Can configure platform security and compliance

**Security Boundaries**:
- Cannot modify tenant-specific operational data without explicit authorization
- Cannot impersonate tenant users
- Cannot access tenant-specific financial data beyond billing
- Platform-level changes require approval process for critical changes
- All cross-tenant access is logged and audited

**Security Enforcement**:
- Platform Owner authentication requires additional verification
- Cross-tenant access triggers audit alerts
- Platform Owner actions are logged with full context
- Critical platform changes require multi-factor authentication

#### Company Super Admin Security Boundaries
**Access Scope**: Single tenant (their company)
- Can access all data within their tenant
- Can manage tenant infrastructure and resources
- Can manage tenant users and admins
- Can configure tenant-specific settings
- Can access tenant-level analytics and reporting

**Security Boundaries**:
- Cannot access other tenants' data under any circumstances
- Cannot access platform-level settings or configuration
- Cannot modify platform-level policies
- Cannot view or access other tenants' analytics
- Cannot access other tenants' user information

**Security Enforcement**:
- All queries automatically filtered by their `companyId`
- Cross-tenant access attempts are blocked and logged
- Company Super Admin actions are logged with tenant context
- Tenant configuration changes are audited

#### Admin Security Boundaries
**Access Scope**: Specific feeders within their tenant
- Can access data within their assigned feeders only
- Can manage power status for assigned feeders
- Can view and respond to reports from assigned feeders
- Can send notifications to users in assigned feeders
- Can access feeder-level analytics

**Security Boundaries**:
- Cannot access data outside their assigned feeders
- Cannot access other tenants' data
- Cannot access tenant-level settings or configuration
- Cannot manage other admins or company infrastructure
- Cannot access platform-level features

**Security Enforcement**:
- All queries filtered by `companyId` AND assigned feeders
- Cross-feeder access attempts are blocked and logged
- Admin actions are logged with feeder context
- Feeder assignment changes are audited

#### User Security Boundaries
**Access Scope**: Personal data and their assigned feeder's public data
- Can access their own profile and settings
- Can view power status for their assigned feeder
- Can submit reports for their location
- Can receive notifications based on their preferences
- Can access their personal power history

**Security Boundaries**:
- Cannot access other users' data
- Cannot access admin functions or company-level data
- Cannot access other tenants' data
- Cannot modify infrastructure or settings
- Cannot view other feeders' data

**Security Enforcement**:
- All queries filtered by `companyId` AND user ID
- Cross-user access attempts are blocked and logged
- User actions are logged with user context
- Profile changes are audited

### Security Enforcement Layers

#### Layer 1: Authentication
- Verify user identity with JWT tokens
- Validate token integrity and expiration
- Extract `companyId` from authenticated user context
- Prevent token reuse and session hijacking

#### Layer 2: Authorization
- Verify user role has required permissions
- Check role-based access control (RBAC)
- Validate permission group assignments
- Prevent unauthorized feature access

#### Layer 3: Tenant Isolation
- Automatically add `companyId` filter to all queries
- Prevent manual override of `companyId` in requests
- Validate `companyId` references are valid
- Block cross-tenant access attempts

#### Layer 4: Resource Scope
- Enforce geographic scope (feeder, ward, LGA, state)
- Validate user has access to requested resource
- Prevent unauthorized resource access
- Log all access attempts

#### Layer 5: Data Validation
- Validate data integrity and consistency
- Prevent data injection attacks
- Validate business rules and constraints
- Ensure data belongs to correct tenant

### Security Monitoring

#### Audit Logging
- All cross-tenant access attempts are logged
- Security boundary violations trigger alerts
- Admin actions are logged with full context
- Platform Owner actions are logged with additional scrutiny

#### Intrusion Detection
- Monitor for unusual cross-tenant access patterns
- Detect potential security breaches
- Alert on suspicious activity
- Implement automated response protocols

#### Compliance Reporting
- Generate tenant-specific compliance reports
- Document all cross-tenant access (Platform Owner only)
- Maintain audit trail for regulatory requirements
- Support data protection compliance (GDPR, etc.)

## AI Security

AI services, particularly the Gemini AI integration, must respect tenant isolation boundaries. AI should only receive and process data belonging to the current tenant unless explicitly authorized by the Platform Owner.

### AI Data Isolation Requirements

#### Data Input Isolation
- AI services must only receive data from the requesting tenant
- Input data must be filtered by `companyId` before sending to AI
- AI prompts must not include data from other tenants
- AI context must be tenant-scoped

#### AI Processing Isolation
- AI models must be trained or fine-tuned per tenant (optional)
- AI processing must not mix data from multiple tenants
- AI insights must be generated from tenant-specific data only
- AI recommendations must be tenant-scoped

#### AI Output Isolation
- AI responses must be delivered only to the requesting tenant
- AI analytics must be filtered by `companyId`
- AI insights must not leak information from other tenants
- AI recommendations must not reference other tenants' data

### Gemini AI Integration Security

#### Current Implementation
The current Gemini AI integration processes power status data to generate insights and predictions. This must be enhanced to respect tenant isolation.

#### Future Implementation
```javascript
// Before (single-tenant)
const aiInsights = await geminiAI.analyze(allPowerData);

// After (multi-tenant)
const aiInsights = await geminiAI.analyze(
  tenantPowerData,  // Filtered by companyId
  { 
    tenantId: user.companyId,
    scope: 'tenant-only'
  }
);
```

#### AI Service Layer
The AI service layer must:
1. Extract `companyId` from authenticated user context
2. Filter all input data by `companyId`
3. Pass tenant context to AI services
4. Filter AI output by `companyId`
5. Log all AI data access for audit purposes

#### Platform Owner Cross-Tenant AI
Platform Owner may request cross-tenant AI analysis with explicit authorization:
```javascript
// Platform Owner only
const crossTenantAI = await geminiAI.analyze(
  allTenantData,  // Multiple tenants
  {
    scope: 'platform-wide',
    authorizedBy: 'platform-owner',
    authorizationId: 'AUTH-12345'
  }
);
```

This requires:
- Explicit Platform Owner authentication
- Additional authorization verification
- Comprehensive audit logging
- Data anonymization where required

### AI Security Best Practices

#### Data Minimization
- Send only necessary data to AI services
- Anonymize sensitive data before AI processing
- Implement data retention policies for AI data
- Regularly audit AI data access

#### Model Isolation
- Consider per-tenant AI model training
- Implement model versioning per tenant
- Prevent model contamination between tenants
- Document AI model training data sources

#### Output Filtering
- Filter AI outputs to remove tenant references
- Sanitize AI responses to prevent data leakage
- Validate AI responses for tenant boundary violations
- Implement AI response monitoring

#### Compliance
- Ensure AI processing complies with data protection laws
- Document AI data processing for regulatory requirements
- Implement AI explainability for tenant decisions
- Support AI audit trails

## Future Database Design

The future database design will enforce tenant isolation at multiple levels to ensure complete data separation between tenants.

### Database Schema Design

#### Company ID Field
All collections will include a `companyId` field:
```javascript
{
  companyId: {
    type: ObjectId,
    ref: 'Company',
    required: true,
    index: true,
    immutable: true
  }
}
```

#### Compound Indexes
Compound indexes will include `companyId` for optimal query performance:
```javascript
// User collection
userSchema.index({ companyId: 1, email: 1 });
userSchema.index({ companyId: 1, role: 1 });

// Feeder collection
feederSchema.index({ companyId: 1, name: 1 });
feederSchema.index({ companyId: 1, isActive: 1 });

// Report collection
reportSchema.index({ companyId: 1, status: 1 });
reportSchema.index({ companyId: 1, createdAt: -1 });
```

#### Unique Constraints
Unique constraints will be scoped to `companyId`:
```javascript
// Email is unique per company, not globally
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

// Feeder name is unique per company
feederSchema.index({ companyId: 1, name: 1 }, { unique: true });
```

### Query Enforcement

#### Middleware Pattern
All database queries will pass through tenant isolation middleware:
```javascript
// Middleware automatically adds companyId filter
function tenantIsolationMiddleware(req, res, next) {
  req.queryFilter = { companyId: req.user.companyId };
  next();
}
```

#### Query Builder Pattern
Database queries will use a query builder that enforces tenant isolation:
```javascript
// Automatic tenant filtering
const users = await User.find()
  .byTenantId(req.user.companyId)
  .where({ role: 'admin' })
  .exec();
```

#### Repository Pattern
Data access will use repository pattern with built-in tenant isolation:
```javascript
// Repository automatically handles tenant isolation
const userRepository = new UserRepository(req.user.companyId);
const admins = await userRepository.findByRole('admin');
```

### Database-Level Security

#### Row-Level Security
Implement row-level security (RLS) at the database level:
- Database triggers enforce `companyId` constraints
- Database views automatically filter by `companyId`
- Stored procedures include tenant validation

#### Database Roles
Create database roles per tenant:
- Each tenant has dedicated database role
- Database role permissions are scoped to tenant data
- Database connections use tenant-specific roles

#### Database Encryption
Implement encryption for sensitive tenant data:
- Tenant-specific encryption keys
- Field-level encryption for sensitive data
- Secure key management per tenant

### Data Migration Strategy

#### Phase 1: Schema Preparation
- Add `companyId` field to all existing collections
- Create indexes on `companyId` fields
- Update unique constraints to include `companyId`
- Add validation rules for `companyId`

#### Phase 2: Data Migration
- Create default "KEDCO" company
- Migrate existing data to default company
- Validate data integrity after migration
- Update application references to use `companyId`

#### Phase 3: Middleware Activation
- Activate tenant isolation middleware
- Enable automatic `companyId` filtering
- Test cross-tenant access prevention
- Monitor query performance with new filters

#### Phase 4: Validation
- Comprehensive testing of tenant isolation
- Security audit of cross-tenant access prevention
- Performance testing with tenant filtering
- Rollback plan if issues arise

### Backup and Recovery

#### Tenant-Level Backups
- Implement per-tenant backup strategies
- Tenant-specific backup schedules
- Tenant-specific retention policies
- Isolated backup storage per tenant

#### Recovery Procedures
- Tenant-specific recovery procedures
- Isolated recovery to prevent cross-tenant contamination
- Validation of tenant data integrity after recovery
- Audit logging of all recovery operations

### Data Retention

#### Tenant-Specific Retention
- Each tenant can configure data retention policies
- Automated data archival per tenant
- Tenant-specific data deletion schedules
- Compliance with data protection regulations

#### Data Archival
- Archive old data per tenant
- Maintain tenant separation in archives
- Quick recovery from archives per tenant
- Audit trail of archival operations

## Security Compliance

### Data Protection Compliance

#### GDPR Compliance
- Tenant-specific data processing agreements
- Data subject access requests per tenant
- Data portability within tenant scope
- Right to be forgotten within tenant scope

#### Industry Compliance
- Regulatory compliance per tenant (NERC, etc.)
- Industry-specific data handling requirements
- Audit trail for compliance verification
- Compliance reporting per tenant

### Security Certifications

#### ISO 27001
- Information security management per tenant
- Risk assessment per tenant
- Security controls per tenant
- Certification maintenance per tenant

#### SOC 2
- Security controls per tenant
- Availability guarantees per tenant
- Processing integrity per tenant
- Privacy controls per tenant

## Monitoring and Alerting

### Tenant Health Monitoring

#### Performance Monitoring
- Monitor query performance per tenant
- Track resource usage per tenant
- Alert on performance degradation per tenant
- Capacity planning per tenant

#### Security Monitoring
- Monitor cross-tenant access attempts
- Alert on security boundary violations
- Track unusual activity patterns per tenant
- Security incident response per tenant

### Platform Monitoring

#### Cross-Tenant Analytics
- Platform Owner can view aggregated metrics
- Tenant comparison analytics (Platform Owner only)
- Platform-wide performance monitoring
- Resource utilization across tenants

#### Capacity Planning
- Monitor platform capacity across all tenants
- Predict resource needs based on tenant growth
- Plan infrastructure scaling
- Optimize resource allocation

## Disaster Recovery

### Tenant-Level Disaster Recovery

#### Backup Strategy
- Automated backups per tenant
- Geographic distribution of backups
- Backup integrity verification
- Regular backup testing

#### Recovery Procedures
- Tenant-specific recovery procedures
- Recovery time objectives per tenant
- Recovery point objectives per tenant
- Disaster recovery testing per tenant

### Platform-Level Disaster Recovery

#### Platform Recovery
- Platform-wide disaster recovery procedures
- Cross-tenant coordination during recovery
- Platform recovery time objectives
- Regular platform disaster recovery testing

## Summary

The tenant isolation and data security architecture ensures that each Distribution Company operates as a completely isolated tenant within the LITHA platform. This architecture provides:

- **Complete Data Separation**: Every resource belongs to exactly one tenant
- **Strict Security Boundaries**: Clear boundaries between tenants that cannot be crossed
- **Automatic Enforcement**: Tenant isolation is enforced automatically at all layers
- **Comprehensive Monitoring**: All cross-tenant access is logged and monitored
- **Compliance Support**: Meets data protection and regulatory requirements
- **Scalability**: Supports unlimited tenants with consistent security
- **Performance**: Optimized queries with proper indexing and caching

This architecture ensures that LITHA can safely serve multiple electricity distribution companies while maintaining complete data isolation and security.
