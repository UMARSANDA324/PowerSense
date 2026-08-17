# Operational Scope and Administrative Hierarchy

This document describes the future operational scope management and administrative hierarchy for LITHA as it evolves into a multi-tenant enterprise SaaS platform. Operational scope determines where a user's authority begins and ends, complementing the role-based permission system.

## Overview

LITHA will implement a comprehensive operational scope system that defines the geographic and organizational boundaries within which users can exercise their permissions. While roles define WHAT actions a user can perform, operational scope defines WHERE those actions can be performed. This dual-layer authorization model provides granular control over user access while maintaining flexibility for complex organizational structures.

## Operational Scope Model

Operational scope determines the geographic and organizational boundaries within which a user can exercise their permissions. It answers the question: "Where can this user perform their authorized actions?"

### Operational Scope Levels

#### Entire Company
**Definition**: User has authority across all geographic areas and infrastructure within their company.

**Scope Characteristics**:
- Access to all states managed by the company
- Access to all LGAs within those states
- Access to all injection substations
- Access to all feeders
- Access to all wards
- Company-wide operational authority

**Typical Roles**:
- Company Super Admin
- Future: Operations Manager
- Future: Regional Manager (if single-state company)

**Use Cases**:
- Company-wide policy implementation
- Cross-state coordination
- Company-level analytics and reporting
- Strategic decision making
- Resource allocation across company

#### Specific State
**Definition**: User has authority within a specific state within their company.

**Scope Characteristics**:
- Access to all LGAs within the assigned state
- Access to all injection substations within the state
- Access to all feeders within the state
- Access to all wards within the state
- State-level operational authority

**Typical Roles**:
- Future: State Coordinator
- Future: Regional Manager (multi-state companies)
- Future: Operations Manager (state-level)

**Use Cases**:
- State-level operations management
- State-specific policy implementation
- State-level coordination
- State analytics and reporting
- Resource allocation within state

#### Multiple States
**Definition**: User has authority across multiple specific states within their company.

**Scope Characteristics**:
- Access to all LGAs within assigned states
- Access to all injection substations within assigned states
- Access to all feeders within assigned states
- Access to all wards within assigned states
- Multi-state operational authority

**Typical Roles**:
- Future: Regional Manager
- Future: Operations Manager (regional)
- Company Super Admin (can be limited to specific states)

**Use Cases**:
- Regional operations management
- Cross-state coordination
- Regional analytics and reporting
- Regional resource allocation
- Multi-state project management

#### Specific LGA
**Definition**: User has authority within a specific Local Government Area within their company.

**Scope Characteristics**:
- Access to all injection substations within the LGA
- Access to all feeders within the LGA
- Access to all wards within the LGA
- LGA-level operational authority

**Typical Roles**:
- Future: LGA Manager
- Future: Area Coordinator
- Admin (can be limited to specific LGA)

**Use Cases**:
- LGA-level operations management
- LGA-specific service delivery
- LGA analytics and reporting
- Local resource allocation
- Community engagement

#### Multiple LGAs
**Definition**: User has authority across multiple specific LGAs within their company.

**Scope Characteristics**:
- Access to all injection substations within assigned LGAs
- Access to all feeders within assigned LGAs
- Access to all wards within assigned LGAs
- Multi-LGA operational authority

**Typical Roles**:
- Future: Area Manager
- Future: Regional Coordinator
- Admin (can be assigned multiple LGAs)

**Use Cases**:
- Area-level operations management
- Cross-LGA coordination
- Area analytics and reporting
- Area resource allocation
- Multi-LGA project management

#### Specific Injection Substation
**Definition**: User has authority for a specific injection substation and all its feeders.

**Scope Characteristics**:
- Access to all feeders connected to the substation
- Access to all wards served by those feeders
- Substation-level operational authority

**Typical Roles**:
- Future: Substation Manager
- Future: Technical Supervisor
- Admin (can be limited to specific substation)

**Use Cases**:
- Substation operations management
- Substation maintenance coordination
- Substation analytics and reporting
- Technical supervision
- Equipment management

#### Multiple Injection Substations
**Definition**: User has authority across multiple specific injection substations.

**Scope Characteristics**:
- Access to all feeders connected to assigned substations
- Access to all wards served by those feeders
- Multi-substation operational authority

**Typical Roles**:
- Future: Area Technical Manager
- Future: Maintenance Supervisor
- Admin (can be assigned multiple substations)

**Use Cases**:
- Multi-substation operations management
- Technical coordination across substations
- Area maintenance management
- Resource allocation across substations
- Multi-substation project management

#### Specific Feeder
**Definition**: User has authority for a specific feeder and all its wards.

**Scope Characteristics**:
- Access to all wards connected to the feeder
- Feeder-level operational authority
- Limited to specific feeder operations

**Typical Roles**:
- Admin (current implementation)
- Future: Feeder Manager
- Future: Feeder Operator

**Use Cases**:
- Feeder operations management
- Feeder maintenance coordination
- Customer service for feeder
- Feeder analytics and reporting
- Feeder-specific issue resolution

#### Multiple Feeders
**Definition**: User has authority across multiple specific feeders.

**Scope Characteristics**:
- Access to all wards connected to assigned feeders
- Multi-feeder operational authority
- Can manage operations across multiple feeders

**Typical Roles**:
- Admin (current implementation with multiple feeders)
- Future: Area Feeder Manager
- Future: Senior Operator

**Use Cases**:
- Multi-feeder operations management
- Cross-feeder coordination
- Area customer service
- Multi-feeder analytics
- Resource allocation across feeders

### Operational Scope Structure

```javascript
{
  // Scope Definition
  scope: {
    level: String, // "company", "state", "lga", "substation", "feeder", "multi"
    type: String, // "single", "multiple", "all"
    
    // Geographic Scope
    states: [ObjectId],  // Assigned states
    lgas: [ObjectId],    // Assigned LGAs
    substations: [ObjectId],  // Assigned injection substations
    feeders: [ObjectId],      // Assigned feeders
    wards: [ObjectId],        // Assigned wards (derived from feeders)
    
    // Scope Metadata
    stateNames: [String],
    lgaNames: [String],
    substationNames: [String],
    feederNames: [String],
    
    // Scope Validation
    isValid: Boolean,
    validationErrors: [String],
    lastValidated: Date
  },
  
  // Scope Permissions
  scopePermissions: {
    canExpandScope: Boolean,
    canDelegateScope: Boolean,
    canViewOtherScopes: Boolean,
    canCrossScopeOperate: Boolean
  },
  
  // Scope Hierarchy
  scopeHierarchy: {
    parentScope: ObjectId,  // Parent scope if nested
    childScopes: [ObjectId], // Child scopes if managing others
    level: Number,  // Hierarchy level (1 = company, 2 = state, etc.)
    path: String  // Hierarchical path (e.g., "company/state/lga")
  }
}
```

## Role vs Operational Scope

The authorization system uses a dual-layer model where roles and operational scope work together to determine user access. Both layers are required for complete authorization.

### Role: What Can You Do?

**Definition**: Role defines the set of actions and permissions a user can perform within the system.

**Questions Answered by Role**:
- What actions can this user perform?
- What features can this user access?
- What permissions does this user have?
- What system functions can this user use?

**Role Examples**:
- **Company Super Admin**: Can manage company settings, create admins, view all company data
- **Admin**: Can update power status, respond to reports, send notifications
- **User**: Can view status, submit reports, receive notifications

**Role Characteristics**:
- Action-based: Defines WHAT can be done
- Functional: Defines system capabilities
- Permission-based: Defines access to features
- Role-specific: Different roles have different capabilities

### Operational Scope: Where Can You Do It?

**Definition**: Operational scope defines the geographic and organizational boundaries within which a user can exercise their permissions.

**Questions Answered by Operational Scope**:
- Where can this user perform their authorized actions?
- What geographic areas can this user manage?
- What infrastructure can this user access?
- What organizational boundaries apply to this user?

**Operational Scope Examples**:
- **Company Scope**: Can perform actions across entire company
- **State Scope**: Can perform actions within specific state(s)
- **Feeder Scope**: Can perform actions within specific feeder(s)
- **LGA Scope**: Can perform actions within specific LGA(s)

**Operational Scope Characteristics**:
- Geographic-based: Defines WHERE actions can be done
- Boundary-based: Defines organizational limits
- Scope-specific: Different scopes have different boundaries
- Hierarchical: Scopes can be nested (company → state → LGA → feeder)

### Authorization Matrix

The combination of role and operational scope creates a comprehensive authorization matrix:

| Role | Operational Scope | Authorized Actions |
|------|-------------------|-------------------|
| Company Super Admin | Company | All company-level actions across all states |
| Company Super Admin | State | All state-level actions within assigned state |
| Admin | Feeder | Power status updates, report responses within assigned feeder |
| Admin | Multiple Feeders | Power status updates, report responses within assigned feeders |
| User | Single Feeder | View status, submit reports within assigned feeder |
| Future: Regional Manager | Multiple States | Regional coordination across assigned states |
| Future: State Coordinator | Single State | State-level operations within assigned state |

### Authorization Process

#### Step 1: Role Validation
```javascript
// Check if user has required role/permission
if (!hasPermission(user.role, requiredPermission)) {
  return { authorized: false, reason: 'Insufficient role permissions' };
}
```

#### Step 2: Operational Scope Validation
```javascript
// Check if user has operational scope for requested resource
if (!hasOperationalScope(user.scope, resource)) {
  return { authorized: false, reason: 'Resource outside operational scope' };
}
```

#### Step 3: Combined Authorization
```javascript
// Both role and scope must be valid
if (hasPermission(user.role, requiredPermission) && 
    hasOperationalScope(user.scope, resource)) {
  return { authorized: true };
}
```

### Benefits of Dual-Layer Authorization

#### Flexibility
- Same role can have different operational scopes
- Same operational scope can apply to different roles
- Easy to adjust user authority without changing roles
- Supports complex organizational structures

#### Security
- Defense in depth: Both layers must be satisfied
- Clear separation of concerns
- Easier to audit and review
- Reduces risk of over-privilege

#### Scalability
- Supports unlimited geographic complexity
- Handles multi-state operations
- Scales with organizational growth
- Maintains performance with proper indexing

#### Maintainability
- Clear authorization logic
- Easy to understand and debug
- Simplifies permission management
- Reduces permission errors

## Administrative Hierarchy

The administrative hierarchy defines the organizational structure for management and operational oversight within LITHA. This hierarchy supports complex organizational structures while maintaining clear lines of authority and responsibility.

### Administrative Hierarchy Structure

```
Platform Owner
    ↓
Distribution Company
    ↓
Company Super Admin
    ↓
Regional Manager (future)
    ↓
State Coordinator (future)
    ↓
Operations Manager (future)
    ↓
Admin
    ↓
Operator (future)
    ↓
User
```

### Hierarchy Level Definitions

#### Platform Owner
**Level**: Platform Level (Level 0)
**Scope**: Global platform access
**Responsibilities**:
- Platform infrastructure management
- Company onboarding and management
- Platform-wide configuration and settings
- Platform-level analytics and reporting
- System monitoring and maintenance
- Platform security and compliance

**Operational Boundaries**:
- Can access all companies' data (read-only for operational data)
- Cannot modify company-specific operational data without authorization
- Platform-level changes require approval process

#### Distribution Company
**Level**: Organizational Level (Level 1)
**Scope**: Company boundary
**Responsibilities**:
- Company-specific configuration and branding
- Company subscription and billing management
- Company-level compliance and regulatory requirements
- Company infrastructure ownership

**Operational Boundaries**:
- Represents organizational boundary, not a user role
- All users belong to exactly one company
- Company isolation enforced at all levels

#### Company Super Admin
**Level**: Company Executive Level (Level 2)
**Scope**: Entire company
**Responsibilities**:
- Manage company's states, LGAs, injection substations, feeders, wards
- Create and manage company admins and regional managers
- Configure company-specific settings and policies
- Access company-wide analytics and reporting
- Handle company-level operational decisions
- Manage company subscription and billing

**Operational Boundaries**:
- Full access to all data within their company
- Cannot access other companies' data
- Cannot access platform-level settings
- Company-level changes are logged and audited

#### Regional Manager (Future)
**Level**: Regional Level (Level 3)
**Scope**: Multiple states within company
**Responsibilities**:
- Manage operations across assigned states
- Coordinate state coordinators within region
- Implement regional policies and procedures
- Access regional analytics and reporting
- Handle regional operational decisions
- Coordinate cross-state activities

**Operational Boundaries**:
- Access to all data within assigned states
- Cannot access data outside assigned states
- Cannot modify company-level settings
- Reports to Company Super Admin

#### State Coordinator (Future)
**Level**: State Level (Level 4)
**Scope**: Single state within company
**Responsibilities**:
- Manage operations within assigned state
- Coordinate operations managers and admins within state
- Implement state-level policies
- Access state analytics and reporting
- Handle state operational decisions
- Coordinate state-level activities

**Operational Boundaries**:
- Access to all data within assigned state
- Cannot access data outside assigned state
- Cannot modify regional or company-level settings
- Reports to Regional Manager

#### Operations Manager (Future)
**Level**: Operations Level (Level 5)
**Scope**: Multiple LGAs or substations within state
**Responsibilities**:
- Manage day-to-day operations within assigned area
- Coordinate admins and operators within area
- Implement operational procedures
- Access area analytics and reporting
- Handle operational issues and incidents
- Coordinate maintenance activities

**Operational Boundaries**:
- Access to all data within assigned LGAs/substations
- Cannot access data outside assigned area
- Cannot modify state or regional settings
- Reports to State Coordinator

#### Admin
**Level**: Field Operations Level (Level 6)
**Scope**: Specific feeders within company
**Responsibilities**:
- Manage power status for assigned feeders
- View and respond to reports from assigned feeders
- Send notifications to users in assigned feeders
- Access feeder-level analytics and reporting
- Handle customer service issues within scope
- Coordinate maintenance for assigned feeders

**Operational Boundaries**:
- Access to data within assigned feeders only
- Cannot access data outside assigned feeders
- Cannot modify higher-level settings
- Reports to Operations Manager

#### Operator (Future)
**Level**: Operational Support Level (Level 7)
**Scope**: Specific feeders (limited actions)
**Responsibilities**:
- Monitor power status for assigned feeders
- Report issues to admins
- Perform basic operational tasks
- Access limited feeder information
- Follow operational procedures
- Document operational activities

**Operational Boundaries**:
- View-only access to assigned feeders
- Cannot modify power status
- Cannot access administrative functions
- Reports to Admin

#### User
**Level**: Customer Level (Level 8)
**Scope**: Personal location and assigned feeder
**Responsibilities**:
- View power status for their location
- Submit power outage reports
- Receive notifications based on preferences
- Manage personal profile and settings
- Access personal power history
- Provide feedback on service quality

**Operational Boundaries**:
- Access to own data and assigned feeder's public data
- Cannot access other users' data
- Cannot access administrative functions
- No operational authority

### Hierarchy Relationships

#### Reporting Lines
- Platform Owner oversees all Distribution Companies
- Company Super Admin reports to Platform Owner
- Regional Manager reports to Company Super Admin
- State Coordinator reports to Regional Manager
- Operations Manager reports to State Coordinator
- Admin reports to Operations Manager
- Operator reports to Admin
- User is customer (no reporting line)

#### Delegation of Authority
- Higher levels can delegate authority to lower levels
- Delegation is limited by operational scope
- Delegated authority can be revoked
- All delegation is logged and audited

#### Escalation Paths
- Issues escalate up the hierarchy
- Each level has defined escalation criteria
- Emergency escalation bypasses normal paths
- All escalations are documented

### Hierarchy Flexibility

#### Optional Levels
Not all companies need all hierarchy levels:
- Small companies: Company Super Admin → Admin → User
- Medium companies: Company Super Admin → State Coordinator → Admin → User
- Large companies: Full hierarchy with all levels

#### Custom Hierarchy
Companies can customize hierarchy:
- Skip levels if not needed
- Add intermediate levels if required
- Rename levels to match organizational structure
- Define custom reporting relationships

#### Geographic Adaptation
Hierarchy adapts to geographic coverage:
- Single-state companies: Skip regional level
- Multi-state companies: Use regional level
- Urban-focused: Emphasize LGA level
- Rural-focused: Emphasize feeder level

## Multi-Scope Support

The operational scope system must support various scope levels without requiring architecture redesign. Users may manage anything from a single feeder to an entire company, and the system must handle all scenarios seamlessly.

### Scope Level Support Matrix

| Scope Level | Single Resource | Multiple Resources | All Resources | Implementation Complexity |
|-------------|----------------|-------------------|---------------|---------------------------|
| Company | N/A | N/A | Supported | Low |
| State | Supported | Supported | N/A | Low |
| LGA | Supported | Supported | N/A | Low |
| Substation | Supported | Supported | N/A | Medium |
| Feeder | Supported | Supported | N/A | Low |
| Ward | Supported | Supported | N/A | Medium |

### Single Resource Scope

#### Definition
User has authority over exactly one resource at a specific level.

#### Examples
- Single Feeder: Admin manages Feeder A only
- Single State: State Coordinator manages Kano State only
- Single Substation: Substation Manager manages Substation X only

#### Implementation
```javascript
{
  scope: {
    level: "feeder",
    type: "single",
    feeders: [ObjectId("feeder-a-id")]
  }
}
```

#### Use Cases
- Specialized roles (Feeder Manager, Substation Manager)
- Geographic focus (single state operations)
- Technical specialization (specific equipment)
- Customer service (specific area)

### Multiple Resources Scope

#### Definition
User has authority over multiple resources at the same level.

#### Examples
- Multiple Feeders: Admin manages Feeders A, B, and C
- Multiple States: Regional Manager manages Kano and Katsina States
- Multiple LGAs: Area Manager manages Dala and Nassarawa LGAs

#### Implementation
```javascript
{
  scope: {
    level: "feeder",
    type: "multiple",
    feeders: [
      ObjectId("feeder-a-id"),
      ObjectId("feeder-b-id"),
      ObjectId("feeder-c-id")
    ]
  }
}
```

#### Use Cases
- Regional management (multiple states)
- Area coordination (multiple LGAs)
- Technical supervision (multiple substations)
- Senior admin roles (multiple feeders)

### All Resources Scope

#### Definition
User has authority over all resources at a specific level within their company.

#### Examples
- Entire Company: Company Super Admin manages all company resources
- All States: Regional Manager manages all states in region
- All Feeders: Operations Manager manages all feeders in area

#### Implementation
```javascript
{
  scope: {
    level: "company",
    type: "all",
    companyId: ObjectId("company-id")
  }
}
```

#### Use Cases
- Executive management (Company Super Admin)
- Regional oversight (Regional Manager)
- Area management (Operations Manager)
- Company-wide coordination

### Mixed Scope Levels

#### Definition
User has authority at multiple hierarchical levels simultaneously.

#### Examples
- State + Specific Feeders: State Coordinator manages entire state plus specific critical feeders
- LGA + Substations: Area Manager manages entire LGA plus specific substations
- Company + States: Company Super Admin manages entire company plus focuses on specific states

#### Implementation
```javascript
{
  scope: {
    level: "mixed",
    type: "mixed",
    states: [ObjectId("state-id")],
    feeders: [
      ObjectId("critical-feeder-1"),
      ObjectId("critical-feeder-2")
    ]
  }
}
```

#### Use Cases
- Executive focus (company-wide + specific areas)
- Critical infrastructure management (state + critical feeders)
- Hybrid roles (management + operational)
- Transitional roles (expanding scope)

### Dynamic Scope Adjustment

#### Scope Expansion
Users can have their scope expanded over time:
- Promotion: Admin promoted to Operations Manager (feeder → LGA scope)
- Company growth: Regional manager adds new state to scope
- Special projects: Temporary scope expansion for specific initiatives

#### Scope Contraction
Users can have their scope reduced:
- Reassignment: Admin moved from multiple feeders to single feeder
- Company restructuring: Regional manager scope reduced to single state
- Performance issues: Scope temporarily reduced

#### Scope Transfer
Scope can be transferred between users:
- Handover: Admin leaving company transfers scope to replacement
- Reorganization: Scope redistributed during restructuring
- Temporary delegation: Scope temporarily delegated during absence

### Scope Validation

#### Consistency Validation
- Ensure scope resources belong to user's company
- Ensure scope resources are active and operational
- Ensure scope doesn't conflict with other users
- Ensure scope is appropriate for user's role

#### Hierarchy Validation
- Ensure scope respects organizational hierarchy
- Ensure scope doesn't skip required hierarchy levels
- Ensure scope is appropriate for user's level in hierarchy
- Ensure scope delegation follows proper channels

#### Performance Validation
- Ensure scope queries perform efficiently
- Ensure scope doesn't impact system performance
- Ensure scope caching is effective
- Ensure scope doesn't cause excessive database load

## Operations Center Integration

The Operations Center will integrate seamlessly with the operational scope system to automatically determine message recipients based on scope definitions. This ensures that messages reach the right audience without manual recipient selection.

### Scope-Based Message Targeting

#### Entire Company Targeting
**Scope**: Company Super Admin or Platform Owner
**Target**: All users within the company
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "company",
  targetId: runtimeContext.company.id,
  recipients: "all-users-in-company",
  resolvedRecipients: [all user IDs in company]
}
```

**Use Cases**:
- Company-wide policy changes
- System updates
- Holiday schedules
- Organizational announcements

#### Single State Targeting
**Scope**: State Coordinator or Regional Manager
**Target**: All users within a specific state
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "state",
  targetId: runtimeContext.scope.states[0],
  companyId: runtimeContext.company.id,
  recipients: "all-users-in-state",
  resolvedRecipients: [all user IDs in state]
}
```

**Use Cases**:
- State-specific maintenance
- Regional policy changes
- State-level coordination
- Geographic-specific issues

#### Multiple States Targeting
**Scope**: Regional Manager
**Target**: All users across multiple states
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "states",
  targetIds: runtimeContext.scope.states,
  companyId: runtimeContext.company.id,
  recipients: "all-users-in-states",
  resolvedRecipients: [all user IDs across states]
}
```

**Use Cases**:
- Regional coordination
- Multi-state maintenance
- Regional policy implementation
- Cross-state projects

#### Single LGA Targeting
**Scope**: Area Manager or LGA Manager
**Target**: All users within a specific LGA
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "lga",
  targetId: runtimeContext.scope.lgas[0],
  companyId: runtimeContext.company.id,
  recipients: "all-users-in-lga",
  resolvedRecipients: [all user IDs in LGA]
}
```

**Use Cases**:
- LGA-specific operations
- Local service disruptions
- Community-specific information
- LGA-level coordination

#### Single Injection Substation Targeting
**Scope**: Substation Manager or Technical Supervisor
**Target**: All users served by a specific substation
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "substation",
  targetId: runtimeContext.scope.substations[0],
  companyId: runtimeContext.company.id,
  recipients: "all-users-served-by-substation",
  resolvedRecipients: [all user IDs served by substation]
}
```

**Use Cases**:
- Substation maintenance
- Equipment issues
- Technical notifications
- Substation-specific outages

#### Multiple Injection Substations Targeting
**Scope**: Area Technical Manager or Maintenance Supervisor
**Target**: All users served by multiple substations
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "substations",
  targetIds: runtimeContext.scope.substations,
  companyId: runtimeContext.company.id,
  recipients: "all-users-served-by-substations",
  resolvedRecipients: [all user IDs served by substations]
}
```

**Use Cases**:
- Area maintenance coordination
- Multi-substation projects
- Technical coordination
- Equipment upgrades

#### Single Feeder Targeting
**Scope**: Admin or Feeder Manager
**Target**: All users connected to a specific feeder
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "feeder",
  targetId: runtimeContext.scope.feeders[0],
  companyId: runtimeContext.company.id,
  recipients: "all-users-on-feeder",
  resolvedRecipients: [all user IDs on feeder]
}
```

**Use Cases**:
- Feeder maintenance
- Feeder outages
- Feeder-specific issues
- Customer service for feeder

#### Multiple Feeders Targeting
**Scope**: Admin (multiple feeders) or Area Feeder Manager
**Target**: All users connected to multiple feeders
**Automatic Resolution**:
```javascript
{
  messageType: "announcement",
  targetType: "feeders",
  targetIds: runtimeContext.scope.feeders,
  companyId: runtimeContext.company.id,
  recipients: "all-users-on-feeders",
  resolvedRecipients: [all user IDs across feeders]
}
```

**Use Cases**:
- Multi-feeder maintenance
- Area customer service
- Cross-feeder coordination
- Multi-feeder projects

#### Selected Admins Targeting
**Scope**: Company Super Admin or Operations Manager
**Target**: Specific admin users
**Automatic Resolution**:
```javascript
{
  messageType: "task",
  targetType: "admins",
  targetIds: [selected admin IDs],
  companyId: runtimeContext.company.id,
  recipients: "specific-admins",
  resolvedRecipients: [selected admin IDs]
}
```

**Use Cases**:
- Task assignments
- Direct communications
- Role-specific notifications
- Project coordination

#### Selected Operators Targeting
**Scope**: Admin or Operations Manager
**Target**: Specific operator users
**Automatic Resolution**:
```javascript
{
  messageType: "task",
  targetType: "operators",
  targetIds: [selected operator IDs],
  companyId: runtimeContext.company.id,
  recipients: "specific-operators",
  resolvedRecipients: [selected operator IDs]
}
```

**Use Cases**:
- Task assignments
- Operational instructions
- Shift coordination
- Equipment notifications

### Scope-Based Recipient Resolution

#### Resolution Process
1. **Extract Scope**: Extract user's operational scope from runtime context
2. **Determine Target Type**: Determine message target type based on scope
3. **Resolve Recipients**: Resolve recipients based on scope and target type
4. **Filter by Permissions**: Remove recipients without appropriate permissions
5. **Filter by Active Status**: Remove inactive recipients
6. **Filter by Preferences**: Remove recipients who have opted out
7. **Final Recipient List**: Generate final list of message recipients

#### Caching Strategy
- Company user lists cached for 5 minutes
- State user lists cached for 5 minutes
- LGA user lists cached for 3 minutes
- Substation user lists cached for 3 minutes
- Feeder user lists cached for 2 minutes
- Admin lists cached for 10 minutes
- Cache invalidated on user changes

#### Performance Optimization
- Batch recipient resolution for multiple targets
- Use database indexes for scope queries
- Implement recipient resolution in background
- Cache frequently used recipient lists
- Optimize queries for large recipient lists

### Scope-Based Message Permissions

#### Sending Permissions
Users can only send messages to recipients within their operational scope:
- Company Super Admin: Can send to entire company
- Regional Manager: Can send to their assigned states
- State Coordinator: Can send to their assigned state
- Admin: Can send to their assigned feeders
- User: Cannot send messages (no operations center access)

#### Targeting Validation
- Validate target is within sender's operational scope
- Validate sender has permission to send to target type
- Validate target exists and is active
- Validate recipient count doesn't exceed limits

#### Escalation Permissions
- Messages can be escalated to higher scope with approval
- Emergency broadcasts can bypass normal scope restrictions
- Platform Owner can send to any scope
- Escalation requires audit trail and justification

## Audit and Security

All administrative actions must be comprehensively logged to ensure accountability, support security auditing, and meet compliance requirements. The audit system will capture complete context for every administrative action.

### Audit Log Structure

```javascript
{
  // Actor Information
  actor: {
    id: ObjectId,
    fullName: String,
    email: String,
    role: String,
    jobTitle: String
  },
  
  // Operational Scope
  operationalScope: {
    level: String,
    type: String,
    states: [ObjectId],
    lgas: [ObjectId],
    substations: [ObjectId],
    feeders: [ObjectId]
  },
  
  // Action Information
  action: {
    type: String,  // "create", "update", "delete", "view", "send"
    category: String,  // "user", "power", "infrastructure", "message", etc.
    description: String,
    method: String,  // HTTP method or function name
    endpoint: String  // API endpoint or function path
  },
  
  // Target Resource
  targetResource: {
    type: String,  // "user", "feeder", "state", "message", etc.
    id: ObjectId,
    name: String,
    companyId: ObjectId,
    stateId: ObjectId,
    feederId: ObjectId  // Context-specific IDs
  },
  
  // Request Context
  requestContext: {
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    location: Object,
    timestamp: Date,
    requestId: String
  },
  
  // Changes Made
  changes: {
    before: Object,  // State before action
    after: Object,   // State after action
    fieldsChanged: [String],
    changeType: String  // "create", "update", "delete"
  },
  
  // Authorization Context
  authorization: {
    permissionRequired: String,
    permissionGranted: Boolean,
    scopeRequired: String,
    scopeValid: Boolean,
    authorizationResult: String
  },
  
  // Result
  result: {
    success: Boolean,
    statusCode: Number,
    errorMessage: String,
    executionTime: Number
  },
  
  // Metadata
  metadata: {
    sessionId: String,
    correlationId: String,
    source: String,  // "web", "api", "mobile", "system"
    tags: [String]
  }
}
```

### Audit Log Categories

#### User Management
- User creation
- User role changes
- User scope changes
- User activation/deactivation
- User profile updates
- User permission changes

#### Power Management
- Power status updates
- Maintenance scheduling
- Outage declarations
- Restoration declarations
- Emergency power actions

#### Infrastructure Management
- State creation/modification
- LGA creation/modification
- Substation creation/modification
- Feeder creation/modification
- Ward creation/modification

#### Message Management
- Message creation
- Message sending
- Message targeting
- Message acknowledgment
- Message expiry
- Message archival

#### Administrative Actions
- Role assignments
- Scope assignments
- Permission grants
- Policy changes
- Configuration changes

#### Security Events
- Login attempts
- Permission denials
- Scope violations
- Cross-tenant access attempts
- Unauthorized access attempts

### Audit Log Retention

#### Retention Policies
- **Critical Security Events**: 7 years
- **User Management**: 5 years
- **Power Management**: 3 years
- **Infrastructure Changes**: 5 years
- **Message Management**: 2 years
- **Administrative Actions**: 5 years
- **General Events**: 1 year

#### Archival Strategy
- Automatic archival based on retention policies
- Compressed storage for old logs
- Searchable archive index
- Quick retrieval for recent logs
- Audit trail for archive access

### Audit Log Access

#### Access Control
- **Platform Owner**: Full access to all audit logs
- **Company Super Admin**: Access to company audit logs
- **Regional Manager**: Access to regional audit logs
- **State Coordinator**: Access to state audit logs
- **Admin**: Access to feeder-level audit logs
- **User**: No access to audit logs

#### Query Capabilities
- Query by actor
- Query by action type
- Query by time range
- Query by target resource
- Query by operational scope
- Query by result (success/failure)
- Complex queries with multiple filters

#### Export Capabilities
- Export to CSV
- Export to JSON
- Export to PDF (for compliance)
- Scheduled reports
- Custom report formats

### Security Monitoring

#### Real-Time Alerts
- Cross-tenant access attempts
- Permission escalation attempts
- Scope violation attempts
- Unusual activity patterns
- Bulk administrative actions

#### Anomaly Detection
- Statistical analysis of audit logs
- Machine learning for pattern detection
- Baseline behavior establishment
- Deviation alerting
- Risk scoring

#### Compliance Reporting
- GDPR compliance reports
- Industry-specific compliance reports
- Security audit reports
- Access control reports
- Data protection reports

### Audit Log Integrity

#### Tamper Prevention
- Write-once audit logs
- Cryptographic hashing
- Digital signatures
- Immutable storage
- Chain of custody tracking

#### Verification
- Regular integrity checks
- Hash verification
- Signature validation
- Audit trail of audit log access
- Compliance verification

## Summary

The Operational Scope and Administrative Hierarchy architecture provides a comprehensive foundation for enterprise-grade operational management:

- **Operational Scope**: Defines WHERE users can perform their authorized actions
- **Role vs Scope**: Dual-layer authorization model for granular control
- **Administrative Hierarchy**: Flexible organizational structure supporting complex organizations
- **Multi-Scope Support**: Handles various scope levels without architecture redesign
- **Operations Center Integration**: Automatic recipient resolution based on scope
- **Audit and Security**: Comprehensive logging for accountability and compliance

This architecture ensures that LITHA can efficiently scale to serve multiple distribution companies with complex organizational structures while maintaining clear authority boundaries, comprehensive security, and complete auditability.
