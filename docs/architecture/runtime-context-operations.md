# Runtime Context and Operations Architecture

This document describes the future runtime context architecture and operations center for LITHA as it evolves into a multi-tenant enterprise SaaS platform. The runtime context provides a single source of truth for all operational context, eliminating repeated database queries and ensuring consistent behavior across all platform services.

## Overview

LITHA will implement a comprehensive runtime context system that automatically builds and maintains the operational context for every authenticated session. This context becomes the single source of truth for all platform operations, eliminating the need for repeated database queries to determine user identity, permissions, and operational scope.

## Runtime Context System

The Runtime Context is a comprehensive object that captures all relevant information about the current user session, their organizational context, permissions, and operational scope. This context is-built once during authentication and reused throughout the session.

### Runtime Context Hierarchy

```
Current Tenant
    ↓
Current Company
    ↓
Current State
    ↓
Current Role
    ↓
Permission Groups
    ↓
Current Injection Substation
    ↓
Current Assigned Feeder
    ↓
Current Band
    ↓
Current User
```

### Runtime Context Structure

```javascript
{
  // Tenant Information
  tenant: {
    id: ObjectId,
    name: String,
    code: String,
    shortName: String,
    status: String,
    timeZone: String,
    settings: Object
  },

  // Company Information
  company: {
    id: ObjectId,
    name: String,
    code: String,
    shortName: String,
    logo: String,
    officialEmail: String,
    officialPhone: String,
    headquarters: Object,
    coverageStates: [ObjectId],
    subscription: Object,
    settings: Object
  },

  // Geographic Context
  geography: {
    currentState: {
      id: ObjectId,
      name: String,
      lgaId: ObjectId,
      companyId: ObjectId
    },
    currentLGA: {
      id: ObjectId,
      name: String,
      stateId: ObjectId,
      companyId: ObjectId
    },
    currentWard: {
      id: ObjectId,
      name: String,
      lgaId: ObjectId,
      stateId: ObjectId,
      companyId: ObjectId
    },
    currentInjectionSubstation: {
      id: ObjectId,
      name: String,
      lgaId: ObjectId,
      companyId: ObjectId
    },
    currentFeeder: {
      id: ObjectId,
      name: String,
      injectionSubstationId: ObjectId,
      band: String,
      companyId: ObjectId
    }
  },

  // User Information
  user: {
    id: ObjectId,
    fullName: String,
    email: String,
    phone: String,
    role: String,
    jobTitle: String,
    isActive: Boolean,
    lastLogin: Date,
    notificationPreference: String,
    businessModeEnabled: Boolean,
    businessType: String
  },

  // Role and Permissions
  role: {
    id: String,
    name: String,
    level: Number,
    scope: String,
    permissions: [String],
    permissionGroups: [String]
  },

  // Permission Groups
  permissions: {
    powerControl: {
      view: Boolean,
      update: Boolean,
      history: Boolean,
      schedule: Boolean,
      predict: Boolean,
      analytics: Boolean
    },
    reports: {
      view: Boolean,
      create: Boolean,
      respond: Boolean,
      assign: Boolean,
      analytics: Boolean,
      export: Boolean
    },
    messaging: {
      view: Boolean,
      create: Boolean,
      broadcast: Boolean,
      emergency: Boolean,
      templates: Boolean,
      analytics: Boolean
    },
    aiDashboard: {
      view: Boolean,
      predictions: Boolean,
      insights: Boolean,
      customize: Boolean,
      export: Boolean
    },
    infrastructure: {
      view: Boolean,
      create: Boolean,
      update: Boolean,
      delete: Boolean,
      assign: Boolean,
      analytics: Boolean
    },
    users: {
      view: Boolean,
      create: Boolean,
      update: Boolean,
      delete: Boolean,
      assign: Boolean,
      activate: Boolean,
      analytics: Boolean
    },
    notifications: {
      view: Boolean,
      configure: Boolean,
      send: Boolean,
      manage: Boolean,
      analytics: Boolean
    },
    analytics: {
      view: Boolean,
      reports: Boolean,
      export: Boolean,
      custom: Boolean,
      predictive: Boolean,
      company: Boolean
    },
    companyManagement: {
      view: Boolean,
      configure: Boolean,
      branding: Boolean,
      subscription: Boolean,
      integrations: Boolean,
      analytics: Boolean
    },
    platformManagement: {
      view: Boolean,
      configure: Boolean,
      companies: Boolean,
      billing: Boolean,
      security: Boolean,
      analytics: Boolean,
      integrations: Boolean
    }
  },

  // Operational Scope
  scope: {
    level: String, // "platform", "company", "feeder", "user"
    assignedFeeders: [ObjectId],
    assignedStates: [ObjectId],
    assignedLGAs: [ObjectId],
    assignedWards: [ObjectId],
    geographicScope: String, // "global", "state", "lga", "ward", "feeder"
    dataAccessScope: String // "all", "assigned", "own"
  },

  // Session Information
  session: {
    id: String,
    startTime: Date,
    lastActivity: Date,
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    location: Object
  },

  // Feature Flags
  features: {
    aiAnalytics: Boolean,
    predictiveMaintenance: Boolean,
    advancedReporting: Boolean,
    customIntegrations: Boolean,
    operationsCenter: Boolean,
    multiLanguage: Boolean
  },

  // Configuration
  configuration: {
    timeZone: String,
    language: String,
    dateFormat: String,
    timeFormat: String,
    currency: String,
    notificationChannels: [String],
    emergencyChannels: [String]
  }
}
```

### Runtime Context Building Process

#### Step 1: Authentication
- User authenticates with email/password
- JWT token is generated and returned
- Token contains user ID and basic session information

#### Step 2: Context Building
On successful authentication, the system builds the complete runtime context:
1. Extract user ID from JWT token
2. Fetch user document from database
3. Fetch company document using user's `companyId`
4. Fetch role and permission groups for user
5. Fetch assigned geographic scope (states, LGAs, wards, feeders)
6. Fetch company settings and feature flags
7. Build complete runtime context object
8. Cache runtime context in session/memory

#### Step 3: Context Storage
Runtime context is stored in multiple locations for different access patterns:
- **Session Storage**: For current HTTP request/response cycle
- **Memory Cache**: For rapid access during session
- **Redis Cache**: For distributed systems (future)
- **JWT Payload**: Encrypted context in token (optional, for stateless)

#### Step 4: Context Refresh
Runtime context is refreshed periodically or on specific events:
- **Periodic Refresh**: Every 15 minutes to ensure data currency
- **Role Change**: Immediate refresh when user role is modified
- **Permission Change**: Immediate refresh when permissions are modified
- **Company Change**: Immediate refresh when company settings change
- **Manual Refresh**: User can trigger context refresh

### Runtime Context Benefits

#### Performance Optimization
- **Reduced Database Queries**: Eliminates repeated queries for user, company, role, permissions
- **Faster Response Times**: Context is cached in memory for instant access
- **Lower Database Load**: Fewer database connections and queries
- **Improved Scalability**: Reduced database load improves system scalability

#### Consistency
- **Single Source of Truth**: All services use the same context
- **Consistent Permissions**: Permissions are evaluated consistently across all services
- **Unified Behavior**: All services behave consistently based on the same context
- **Reduced Bugs**: Eliminates inconsistencies from different data sources

#### Security
- **Centralized Authorization**: All authorization checks use the same context
- **Consistent Enforcement**: Security boundaries are enforced consistently
- **Audit Trail**: Context changes are logged for security auditing
- **Easier Compliance**: Consistent context makes compliance verification easier

#### Maintainability
- **Simplified Code**: Services don't need to build context repeatedly
- **Clearer Logic**: Business logic is clearer with explicit context
- **Easier Testing**: Context can be mocked for testing
- **Better Debugging**: Context is available for debugging and troubleshooting

## Runtime Context Usage

All platform services will rely on the runtime context instead of repeatedly querying company, feeder, role, or permissions. This ensures consistent behavior and optimal performance.

### Authentication Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple database queries for each authentication operation
async function login(email, password) {
  const user = await User.findOne({ email });
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  const permissions = await Permission.find({ roleId: role._id });
  // ... more queries
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Single authentication, context built once
async function login(email, password) {
  const user = await User.findOne({ email });
  const runtimeContext = await buildRuntimeContext(user);
  return { user, runtimeContext, token };
}
```

#### Benefits
- Reduced database queries from 5+ to 2
- Faster authentication response
- Consistent context across all services
- Easier to add new context fields

### Authorization Service

#### Current Implementation (Without Runtime Context)
```javascript
// Repeated permission checks with database queries
async function checkPermission(userId, permission) {
  const user = await User.findById(userId);
  const role = await Role.findById(user.role);
  const permissions = await Permission.find({ roleId: role._id });
  return permissions.includes(permission);
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Instant permission check from runtime context
function checkPermission(runtimeContext, permission) {
  return runtimeContext.permissions[permission] === true;
}
```

#### Benefits
- Zero database queries for permission checks
- Instant authorization decisions
- Consistent permission evaluation
- Easier to audit authorization decisions

### AI Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple queries to build context for AI
async function getAIAnalytics(userId) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const feeder = await Feeder.findById(user.feeder);
  const role = await Role.findById(user.role);
  const powerData = await PowerData.find({ companyId: company._id });
  // ... AI processing
}
```

#### Future Implementation (With Runtime Context)
```javascript
// AI receives complete context immediately
async function getAIAnalytics(runtimeContext) {
  const powerData = await PowerData.find({ 
    companyId: runtimeContext.company.id,
    feederId: runtimeContext.geography.currentFeeder.id
  });
  // ... AI processing with full context
}
```

#### Benefits
- AI receives complete operational context immediately
- No repeated database queries for context building
- AI can make better decisions with full context
- Consistent AI behavior across all requests

### History Service

#### Current Implementation (Without Runtime Context)
```javascript
// Repeated queries to determine scope
async function getPowerHistory(userId) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const feeder = await Feeder.findById(user.feeder);
  const history = await PowerLog.find({ 
    companyId: company._id,
    feederId: feeder._id
  });
  return history;
}
```

#### Future Implementation (With Runtime Context)
```javascript
// History query uses runtime context directly
async function getPowerHistory(runtimeContext) {
  const history = await PowerLog.find({ 
    companyId: runtimeContext.company.id,
    feederId: runtimeContext.geography.currentFeeder.id
  });
  return history;
}
```

#### Benefits
- Single database query instead of multiple
- Faster history retrieval
- Consistent scoping across all history queries
- Easier to add new scoping rules

### Dashboard Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple queries to build dashboard data
async function getDashboardData(userId) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  const feeders = await Feeder.find({ companyId: company._id });
  const powerStatus = await PowerStatus.find({ companyId: company._id });
  // ... build dashboard
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Dashboard uses runtime context for all data
async function getDashboardData(runtimeContext) {
  const feeders = await Feeder.find({ 
    companyId: runtimeContext.company.id,
    _id: { $in: runtimeContext.scope.assignedFeeders }
  });
  const powerStatus = await PowerStatus.find({ 
    companyId: runtimeContext.company.id,
    feederId: { $in: runtimeContext.scope.assignedFeeders }
  });
  // ... build dashboard with context
}
```

#### Benefits
- Reduced database queries
- Faster dashboard loading
- Consistent dashboard data
- Easier to personalize dashboard per user

### Notifications Service

#### Current Implementation (Without Runtime Context)
```javascript
// Repeated queries to determine notification scope
async function sendNotification(userId, message) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const feeder = await Feeder.findById(user.feeder);
  const users = await User.find({ 
    companyId: company._id,
    feederId: feeder._id
  });
  // ... send notifications
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Notifications use runtime context for targeting
async function sendNotification(runtimeContext, message) {
  const users = await User.find({ 
    companyId: runtimeContext.company.id,
    feederId: runtimeContext.geography.currentFeeder.id
  });
  // ... send notifications with context
}
```

#### Benefits
- Accurate notification targeting
- Faster notification delivery
- Consistent notification scope
- Easier to add complex targeting rules

### Reports Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple queries to determine report scope
async function getReports(userId) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  const reports = await Report.find({ 
    companyId: company._id,
    $or: [
      { userId: user._id },
      { feederId: user.feeder }
    ]
  });
  return reports;
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Reports use runtime context for scoping
async function getReports(runtimeContext) {
  const reports = await Report.find({ 
    companyId: runtimeContext.company.id,
    $or: [
      { userId: runtimeContext.user.id },
      { feederId: runtimeContext.geography.currentFeeder.id }
    ]
  });
  return reports;
}
```

#### Benefits
- Consistent report scoping
- Faster report retrieval
- Easier to implement complex report filters
- Better performance for report queries

### Messaging Service

#### Current Implementation (Without Runtime Context)
```javascript
// Repeated queries to determine message scope
async function sendMessage(userId, message) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  // ... determine message scope
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Messaging uses runtime context for scope determination
async function sendMessage(runtimeContext, message) {
  const scope = determineMessageScopeFromContext(runtimeContext);
  // ... send message with determined scope
}
```

#### Benefits
- Accurate message targeting
- Faster message delivery
- Consistent message scope
- Easier to implement complex targeting

### Power Control Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple queries to validate power control operations
async function updatePowerStatus(userId, feederId, status) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  const feeder = await Feeder.findById(feederId);
  // ... validate permissions
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Power control uses runtime context for validation
async function updatePowerStatus(runtimeContext, feederId, status) {
  if (!runtimeContext.permissions.powerControl.update) {
    throw new Error('Permission denied');
  }
  if (!runtimeContext.scope.assignedFeeders.includes(feederId)) {
    throw new Error('Feeder not assigned');
  }
  // ... update power status
}
```

#### Benefits
- Instant permission validation
- Consistent permission enforcement
- Faster power status updates
- Easier to audit power control operations

### Infrastructure Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple queries to validate infrastructure operations
async function createInfrastructure(userId, data) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  // ... validate permissions
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Infrastructure uses runtime context for validation
async function createInfrastructure(runtimeContext, data) {
  if (!runtimeContext.permissions.infrastructure.create) {
    throw new Error('Permission denied');
  }
  data.companyId = runtimeContext.company.id;
  // ... create infrastructure
}
```

#### Benefits
- Instant permission validation
- Automatic company assignment
- Consistent infrastructure management
- Easier to audit infrastructure changes

### Analytics Service

#### Current Implementation (Without Runtime Context)
```javascript
// Multiple queries to determine analytics scope
async function getAnalytics(userId) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const role = await Role.findById(user.role);
  const analytics = await Analytics.find({ companyId: company._id });
  return analytics;
}
```

#### Future Implementation (With Runtime Context)
```javascript
// Analytics uses runtime context for scoping
async function getAnalytics(runtimeContext) {
  const analytics = await Analytics.find({ 
    companyId: runtimeContext.company.id,
    $or: [
      { scope: 'company' },
      { feederId: { $in: runtimeContext.scope.assignedFeeders } }
    ]
  });
  return analytics;
}
```

#### Benefits
- Consistent analytics scoping
- Faster analytics retrieval
- Easier to implement personalized analytics
- Better performance for analytics queries

## Operations Center

The Operations Center is an internal communication system used exclusively by Platform Owner, Company Super Admins, and Admins. Users must never access this system. It provides a centralized platform for internal communications, task management, and operational coordination.

### Operations Center Access Control

#### Authorized Roles
- **Platform Owner**: Full access to all operations center features
- **Company Super Admin**: Full access within their company
- **Admin**: Limited access within their assigned scope

#### Unauthorized Access
- **Users**: No access to operations center
- **Cross-Company Access**: Company Super Admins cannot access other companies' operations
- **Cross-Feeder Access**: Admins cannot access operations outside their assigned feeders

### Operations Center Capabilities

#### Internal Announcements
**Purpose**: Company-wide or platform-wide announcements for staff

**Features**:
- Create announcements with rich text formatting
- Target announcements by scope (company, state, LGA, feeder)
- Schedule announcements for future delivery
- Set announcement priority (normal, high, critical)
- Include attachments (documents, images)
- Track announcement read status
- Archive announcements after expiry

**Use Cases**:
- Policy changes
- System updates
- Holiday schedules
- Organizational changes
- Training announcements

#### Meeting Notices
**Purpose**: Schedule and notify staff about internal meetings

**Features**:
- Create meeting notices with date, time, location
- Add meeting agenda and objectives
- Invite specific participants or groups
- Send meeting reminders
- Track attendance and RSVPs
- Integrate with calendar systems (future)
- Record meeting minutes
- Archive meeting notices

**Use Cases**:
- Weekly operations meetings
- Training sessions
- Strategy reviews
- Project kickoffs
- Performance reviews

#### Emergency Broadcasts
**Purpose**: Critical emergency notifications requiring immediate attention

**Features**:
- Create emergency broadcasts with urgent priority
- Target by geographic scope or role
- Multi-channel delivery (in-app, SMS, email, push)
- Read acknowledgment required
- Track delivery status in real-time
- Escalation to higher priority if not acknowledged
- Emergency response coordination
- Audit trail for compliance

**Use Cases**:
- Grid failures
- Security incidents
- Natural disasters
- Critical infrastructure issues
- Safety emergencies

#### Operational Alerts
**Purpose**: Real-time alerts about operational issues

**Features**:
- Automatic alerts based on system events
- Custom alert rules and thresholds
- Alert escalation chains
- Multi-channel delivery
- Alert acknowledgment and resolution tracking
- Integration with monitoring systems
- Historical alert analysis
- Alert performance metrics

**Use Cases**:
- Power outages
- Equipment failures
- Performance degradation
- Security breaches
- Capacity issues

#### Task Assignments
**Purpose**: Assign and track operational tasks to staff

**Features**:
- Create tasks with descriptions and deadlines
- Assign tasks to individuals or teams
- Set task priority and dependencies
- Track task progress and status
- Add task comments and attachments
- Task notifications and reminders
- Task reporting and analytics
- Task templates for common tasks

**Use Cases**:
- Maintenance tasks
- Investigation tasks
- Customer follow-up tasks
- Compliance tasks
- Improvement projects

#### Acknowledgments
**Purpose**: Track message read status and acknowledgments

**Features**:
- Require acknowledgment for important messages
- Set acknowledgment deadlines
- Track who has acknowledged
- Send reminder notifications for unacknowledged messages
- Generate acknowledgment reports
- Escalate unacknowledged messages
- Audit acknowledgment compliance

**Use Cases**:
- Critical policy changes
- Safety notices
- Mandatory training
- Compliance requirements
- Important announcements

#### Priority Levels
**Purpose**: Classify messages by urgency and importance

**Priority Levels**:
- **Low**: Informational messages, no immediate action required
- **Normal**: Standard operational messages, action required within reasonable time
- **High**: Urgent messages requiring prompt attention
- **Critical**: Emergency messages requiring immediate action

**Priority-Based Behavior**:
- Different notification channels per priority
- Different delivery speeds per priority
- Different acknowledgment requirements per priority
- Different escalation rules per priority
- Different retention periods per priority

#### Message Expiry
**Purpose**: Automatically archive or delete messages after specified time

**Features**:
- Set message expiry date/time
- Automatic archival of expired messages
- Configurable retention periods per message type
- Manual override of expiry for important messages
- Expiry notifications before message expires
- Audit trail of message lifecycle

**Use Cases**:
- Temporary announcements
- Time-sensitive notifications
- Event-specific messages
- Campaign messages
- Seasonal information

#### Archive
**Purpose**: Store and manage historical messages for reference and compliance

**Features**:
- Automatic archival of expired messages
- Search and filter archived messages
- Archive retention policies
- Archive export functionality
- Archive analytics and reporting
- Compliance reporting from archive
- Secure archive storage

**Use Cases**:
- Historical reference
- Compliance requirements
- Audit trail
- Performance analysis
- Trend analysis

#### Delivery Status
**Purpose**: Track message delivery across all channels

**Features**:
- Real-time delivery status tracking
- Per-channel delivery status (in-app, email, SMS, push)
- Delivery failure notifications
- Retry mechanisms for failed deliveries
- Delivery analytics and reporting
- Delivery performance metrics
- Integration with delivery providers

**Use Cases**:
- Monitor message delivery
- Troubleshoot delivery issues
- Optimize delivery performance
- Compliance verification
- Delivery analytics

#### Read Status
**Purpose**: Track which recipients have read messages

**Features**:
- Real-time read status tracking
- Read receipts per recipient
- Read analytics and reporting
- Read rate metrics
- Follow-up for unread messages
- Read status export
- Integration with user activity tracking

**Use Cases**:
- Monitor message engagement
- Follow up on unread messages
- Optimize message content
- Compliance verification
- Communication analytics

#### Acknowledged Status
**Purpose**: Track which recipients have acknowledged messages requiring acknowledgment

**Features**:
- Real-time acknowledgment tracking
- Acknowledgment receipts per recipient
- Acknowledgment analytics and reporting
- Acknowledgment rate metrics
- Escalation for unacknowledged messages
- Acknowledgment deadline tracking
- Compliance reporting

**Use Cases**:
- Monitor acknowledgment compliance
- Escalate unacknowledged messages
- Compliance verification
- Performance tracking
- Audit requirements

## Message Targeting

The Operations Center supports sophisticated message targeting to ensure messages reach the right audience. Messages can be targeted at various organizational levels and geographic scopes.

### Targeting Scopes

#### Entire Company
**Scope**: All users within a specific company
**Use Cases**:
- Company-wide announcements
- Policy changes
- System updates
- Holiday schedules
- Organizational changes

**Implementation**:
```javascript
{
  targetType: "company",
  targetId: companyId,
  recipients: "all-users-in-company"
}
```

#### Specific State
**Scope**: All users within a specific state
**Use Cases**:
- State-specific announcements
- Regional maintenance notices
- State-level policy changes
- Geographic-specific issues

**Implementation**:
```javascript
{
  targetType: "state",
  targetId: stateId,
  companyId: companyId,
  recipients: "all-users-in-state"
}
```

#### Specific LGA
**Scope**: All users within a specific LGA
**Use Cases**:
- LGA-specific maintenance
- Local service disruptions
- LGA-level announcements
- Community-specific information

**Implementation**:
```javascript
{
  targetType: "lga",
  targetId: lgaId,
  companyId: companyId,
  stateId: stateId,
  recipients: "all-users-in-lga"
}
```

#### Specific Injection Substation
**Scope**: All users served by a specific injection substation
**Use Cases**:
- Substation maintenance
- Equipment issues
- Substation-specific outages
- Technical notifications

**Implementation**:
```javascript
{
  targetType: "injection-substation",
  targetId: substationId,
  companyId: companyId,
  recipients: "all-users-served-by-substation"
}
```

#### Specific Feeder
**Scope**: All users connected to a specific feeder
**Use Cases**:
- Feeder maintenance
- Feeder outages
- Feeder-specific issues
- Technical notifications

**Implementation**:
```javascript
{
  targetType: "feeder",
  targetId: feederId,
  companyId: companyId,
  recipients: "all-users-on-feeder"
}
```

#### Single Admin
**Scope**: Individual admin user
**Use Cases**:
- Direct assignments
- Personal notifications
- Role-specific information
- Individual coordination

**Implementation**:
```javascript
{
  targetType: "user",
  targetId: userId,
  companyId: companyId,
  recipients: "specific-user"
}
```

#### Multiple Admins
**Scope**: Specific group of admin users
**Use Cases**:
- Team assignments
- Group notifications
- Role-specific communications
- Project coordination

**Implementation**:
```javascript
{
  targetType: "users",
  targetIds: [userId1, userId2, userId3],
  companyId: companyId,
  recipients: "specific-users"
}
```

#### Admin Groups
**Scope**: Predefined groups of admins based on criteria
**Use Cases**:
- Role-based communications
- Department-specific notifications
- Skill-based assignments
- Geographic team coordination

**Implementation**:
```javascript
{
  targetType: "admin-group",
  groupType: "role", // or "department", "skill", "location"
  groupCriteria: {
    role: "admin",
    department: "operations",
    skill: "technical",
    location: "kano-state"
  },
  companyId: companyId,
  recipients: "matching-admins"
}
```

### Targeting Logic

#### Target Resolution
The system resolves targeting through a multi-step process:
1. **Validate Target**: Ensure target exists and user has permission to target
2. **Resolve Recipients**: Determine all users matching the target criteria
3. **Filter by Permissions**: Remove users who don't have permission to receive the message
4. **Filter by Active Status**: Remove inactive users
5. **Filter by Notification Preferences**: Remove users who have opted out
6. **Final Recipient List**: Generate final list of message recipients

#### Target Caching
Target resolution results are cached for performance:
- Company user lists cached for 5 minutes
- State user lists cached for 5 minutes
- Feeder user lists cached for 2 minutes
- Admin group lists cached for 10 minutes
- Cache invalidated on user changes

#### Target Validation
All targeting is validated before message delivery:
- Target exists within user's tenant
- User has permission to target specified scope
- Target is active and operational
- Recipients are within user's permission scope
- Message type is appropriate for target scope

## AI Context

Gemini AI should always receive Runtime Context before analyzing operational data. This ensures AI understands the complete operational context without requiring multiple database lookups.

### AI Context Structure

```javascript
{
  // Company Context
  company: {
    id: ObjectId,
    name: String,
    code: String,
    timeZone: String,
    coverageStates: [String]
  },

  // Geographic Context
  geography: {
    currentState: String,
    currentLGA: String,
    currentWard: String,
    currentFeeder: String,
    currentBand: String
  },

  // Role Context
  role: {
    name: String,
    level: String,
    permissions: [String],
    permissionGroups: [String]
  },

  // Permission Scope
  permissionScope: {
    level: String,
    assignedFeeders: [ObjectId],
    geographicScope: String,
    dataAccessScope: String
  },

  // Operational Context
  operations: {
    currentFeederStatus: String,
    recentOutages: Number,
    averageUptime: Number,
    maintenanceSchedule: [Date],
    knownIssues: [String]
  },

  // User Context
  user: {
    id: ObjectId,
    role: String,
    businessModeEnabled: Boolean,
    businessType: String
  }
}
```

### AI Context Benefits

#### Improved AI Decisions
- AI understands the complete operational context
- AI can make context-aware recommendations
- AI considers permission boundaries in recommendations
- AI provides relevant insights based on user's scope

#### Reduced Database Load
- AI doesn't need to query for context
- Context is provided once with the request
- Reduces AI service latency
- Improves AI service scalability

#### Consistent AI Behavior
- AI receives consistent context structure
- AI behavior is predictable across requests
- Easier to test AI with consistent context
- Easier to debug AI issues

#### Better AI Personalization
- AI can personalize based on user's role
- AI can tailor insights to user's geographic scope
- AI can adjust recommendations based on permissions
- AI can provide relevant information for user's level

### AI Context Implementation

#### Current Implementation (Without AI Context)
```javascript
// AI must query for context
async function getAIInsights(userId) {
  const user = await User.findById(userId);
  const company = await Company.findById(user.companyId);
  const feeder = await Feeder.findById(user.feeder);
  const role = await Role.findById(user.role);
  const powerData = await PowerData.find({ companyId: company._id });
  
  const aiResponse = await geminiAI.analyze({
    powerData: powerData,
    userRole: role.name,
    company: company.name,
    feeder: feeder.name
  });
  
  return aiResponse;
}
```

#### Future Implementation (With AI Context)
```javascript
// AI receives complete context immediately
async function getAIInsights(runtimeContext) {
  const powerData = await PowerData.find({ 
    companyId: runtimeContext.company.id,
    feederId: runtimeContext.geography.currentFeeder.id
  });
  
  const aiContext = buildAIContext(runtimeContext, powerData);
  
  const aiResponse = await geminiAI.analyze({
    context: aiContext,
    powerData: powerData
  });
  
  return aiResponse;
}
```

### AI Context Security

#### Tenant Isolation
- AI context includes only tenant-specific data
- AI cannot access data from other tenants
- AI context is validated before sending to AI service
- Cross-tenant AI analysis requires explicit Platform Owner authorization

#### Permission Awareness
- AI context includes user's permission scope
- AI recommendations respect permission boundaries
- AI doesn't suggest actions beyond user's permissions
- AI provides appropriate insights for user's role

#### Data Minimization
- AI context includes only necessary data
- Sensitive data is anonymized before sending to AI
- AI context follows data minimization principles
- AI context retention policies are enforced

## Summary

The Runtime Context and Operations Architecture provides a comprehensive foundation for enterprise-grade operations:

- **Runtime Context**: Single source of truth for all operational context
- **Performance Optimization**: Eliminates repeated database queries
- **Consistency**: All services use the same context
- **Security**: Centralized authorization and permission checking
- **Operations Center**: Comprehensive internal communication system
- **Message Targeting**: Sophisticated targeting capabilities
- **AI Context**: AI receives complete operational context

This architecture ensures that LITHA can efficiently scale to serve multiple distribution companies while maintaining high performance, security, and consistency across all platform services.
