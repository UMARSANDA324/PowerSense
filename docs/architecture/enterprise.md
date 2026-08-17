# Enterprise Multi-Tenant Architecture

This document describes the future enterprise architecture for LITHA as it evolves from a single electricity distribution platform into a multi-tenant SaaS platform capable of serving multiple electricity distribution companies.

## Implementation Status

### Phase 1: Company Foundation ✅ COMPLETED
- **Backend Implementation**: Complete
  - Company Model (`backend/models/Company.js`)
  - Company Validation (`backend/utils/companyValidation.js`)
  - Company Service (`backend/services/companyService.js`)
  - Company Controller (`backend/controllers/companyController.js`)
  - Company Routes (`backend/routes/companyRoutes.js`)
  - Company Configuration (`backend/config/companyConfig.js`)
  - Company Seeder (`backend/utils/seedCompany.js`)
  - Default KEDCO company seeded
- **API Endpoints**: Available
  - POST /api/companies - Create company
  - GET /api/companies - Get all companies
  - GET /api/companies/:id - Get company by ID
  - GET /api/companies/code/:code - Get company by code
  - PUT /api/companies/:id - Update company
  - PATCH /api/companies/:id/status - Update company status
  - DELETE /api/companies/:id - Delete company
  - GET /api/companies/active - Get active companies
  - GET /api/companies/search/:term - Search companies
  - GET /api/companies/:id/settings - Get company settings
  - PUT /api/companies/:id/settings - Update company settings

### Future Phases
- Phase 2: Role & Permission Architecture (Not implemented)
- Phase 3: Tenant Isolation & Data Security (Not implemented)
- Phase 4: Runtime Context & Operations (Not implemented)
- Phase 5: Operational Scope & Administrative Hierarchy (Not implemented)
- Phase 6: Enterprise Governance, Workflow & Audit (Not implemented)

## Overview

LITHA is transitioning from a single-tenant platform (currently serving KEDCO) to a multi-tenant enterprise SaaS platform that can serve multiple electricity distribution companies (DISCOs) across Nigeria and potentially other African countries.

## Enterprise Hierarchy

The platform hierarchy will be restructured to support multi-tenancy:

```
Platform Owner
    ↓
Distribution Company (DISCO)
    ↓
States (One company may manage multiple states)
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

### Hierarchy Levels

#### Platform Owner
- **Definition**: The entity that owns and operates the LITHA platform
- **Responsibilities**:
  - Platform infrastructure management
  - Company onboarding and management
  - Platform-wide configuration and settings
  - Billing and subscription management
  - Platform-level analytics and reporting
  - System monitoring and maintenance
- **Scope**: Global across all distribution companies

#### Distribution Company (DISCO)
- **Definition**: An electricity distribution company that uses LITHA to manage their operations
- **Examples**:
  - KEDCO (Kano Electricity Distribution Company)
    - Kano State
    - Katsina State
    - Jigawa State
  - AEDC (Abuja Electricity Distribution Company)
    - FCT (Federal Capital Territory)
    - Nasarawa State
    - Niger State
    - Kogi State
- **Responsibilities**:
  - Manage their assigned states
  - Configure company-specific settings
  - Manage their own users and admins
  - Control their infrastructure (states, LGAs, injection substations, feeders)
  - Access company-specific analytics and reports
- **Scope**: Limited to their assigned states and infrastructure

#### States
- **Definition**: Geographic regions managed by a distribution company
- **Relationship**: One company can manage multiple states
- **Examples**:
  - KEDCO manages: Kano, Katsina, Jigawa
  - AEDC manages: FCT, Nasarawa, Niger, Kogi
- **Scope**: State-level within a company's territory

### Coverage States Relationship

A Distribution Company may manage multiple states, which is a fundamental aspect of the Nigerian electricity distribution structure. This relationship is critical for understanding the geographic scope and operational boundaries of each company.

#### Multi-State Company Examples

**KEDCO (Kano Electricity Distribution Company)**
- Kano State
- Katsina State
- Jigawa State
- Total: 3 states

**AEDC (Abuja Electricity Distribution Company)**
- FCT (Federal Capital Territory)
- Nasarawa State
- Niger State
- Kogi State
- Total: 4 states

**BEDC (Benin Electricity Distribution Company)**
- Edo State
- Delta State
- Ondo State
- Ekiti State
- Total: 4 states

**IKEDC (Ikeja Electricity Distribution Company)**
- Lagos State
- Total: 1 state

#### Relationship Characteristics

- **One-to-Many**: One company can manage multiple states
- **Exclusive Assignment**: Each state is assigned to exactly one company
- **Geographic Contiguity**: States managed by a company are typically geographically contiguous
- **Operational Independence**: Each state within a company operates independently but shares company-level resources
- **Data Isolation**: All data within a state is isolated to the company that manages it

#### Implementation Considerations

- State model will include `company_id` reference to the managing company
- Company model will include `coverageStates` array of state references
- Queries for states must be filtered by `company_id`
- Company operations span across all assigned states
- State-level analytics roll up to company-level analytics

## Distribution Company Entity

The Distribution Company (DISCO) entity is the foundational building block for multi-tenant architecture. It represents an electricity distribution company that operates within the LITHA platform.

### Company Model Schema

```javascript
{
  _id: ObjectId,
  name: String (required, unique),              // Full legal company name
  shortName: String (required, unique),         // Abbreviated name for UI
  code: String (required, unique, uppercase),    // Company identifier (e.g., "KEDCO", "AEDC")
  logo: String,                                  // URL to company logo image
  officialEmail: String (required, unique),     // Primary contact email
  officialPhone: String (required),             // Primary contact phone number
  headquarters: {
    address: String (required),
    city: String (required),
    state: String (required),
    postalCode: String,
    country: String (default: "Nigeria")
  },
  coverageStates: [ObjectId (ref: State)],      // States managed by this company
  timeZone: String (default: "Africa/Lagos"),   // Company's operational time zone
  status: Enum ["active", "suspended", "inactive"] (default: "active"),
  settings: {
    theme: {
      primaryColor: String (default: "#3B82F6"),
      secondaryColor: String (default: "#10B981"),
      accentColor: String (default: "#F59E0B"),
      logo: String,
      favicon: String
    },
    language: String (default: "en"),           // Default language for company
    notificationDefaults: {
      channels: [String] (default: ["in-app", "push"]),
      emergencyChannels: [String] (default: ["in-app", "push", "sms", "email"]),
      defaultPriority: Enum ["normal", "high"] (default: "normal")
    },
    features: {
      aiAnalytics: Boolean (default: true),
      predictiveMaintenance: Boolean (default: true),
      advancedReporting: Boolean (default: true),
      customIntegrations: Boolean (default: false)
    }
  },
  subscription: {
    tier: Enum ["basic", "standard", "premium"] (default: "standard"),
    startDate: Date,
    endDate: Date,
    maxUsers: Number,
    maxStates: Number,
    maxFeeders: Number
  },
  metadata: {
    licenseNumber: String,
    regulatoryBody: String,
    establishedDate: Date,
    website: String,
    description: String
  },
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

### Field Descriptions

#### Core Identity Fields

**name** (String, required, unique)
- **Purpose**: Full legal name of the electricity distribution company
- **Example**: "Kano Electricity Distribution Company PLC"
- **Validation**: Must be unique across all companies, minimum 3 characters
- **Usage**: Legal documents, contracts, formal communications

**shortName** (String, required, unique)
- **Purpose**: Abbreviated name for UI display and user-facing communications
- **Example**: "KEDCO", "AEDC", "BEDC"
- **Validation**: Must be unique across all companies, typically 3-8 characters
- **Usage**: Dashboard headers, navigation, user interface elements

**code** (String, required, unique, uppercase)
- **Purpose**: System identifier for the company used in API calls and database references
- **Example**: "KEDCO", "AEDC", "BEDC"
- **Validation**: Must be unique, uppercase only, alphanumeric, 3-10 characters
- **Usage**: API endpoints, database queries, internal system references

#### Contact Information Fields

**logo** (String, optional)
- **Purpose**: URL to the company's official logo image
- **Example**: "https://storage.example.com/companies/kedco/logo.png"
- **Validation**: Must be a valid URL to an image file
- **Usage**: Company branding in UI, email headers, reports

**officialEmail** (String, required, unique)
- **Purpose**: Primary contact email address for the company
- **Example**: "contact@kedco.com.ng"
- **Validation**: Must be a valid email format, unique across all companies
- **Usage**: Platform communications, billing, support, notifications

**officialPhone** (String, required)
- **Purpose**: Primary contact phone number for the company
- **Example**: "+234 812 345 6789"
- **Validation**: Must be a valid phone number format
- **Usage**: Emergency contacts, support calls, SMS notifications

#### Location Fields

**headquarters** (Object, required)
- **Purpose**: Physical headquarters address of the company
- **Fields**:
  - `address`: Street address (required)
  - `city`: City name (required)
  - `state`: State name (required)
  - `postalCode`: Postal/ZIP code (optional)
  - `country`: Country name (default: "Nigeria")
- **Usage**: Legal documents, regulatory compliance, shipping

**coverageStates** (Array of ObjectId, optional)
- **Purpose**: States managed by this distribution company
- **Example**: [ObjectId("Kano"), ObjectId("Katsina"), ObjectId("Jigawa")]
- **Validation**: Must reference valid State documents
- **Usage**: Geographic scope determination, data filtering, analytics

#### Operational Fields

**timeZone** (String, default: "Africa/Lagos")
- **Purpose**: Company's operational time zone for scheduling and reporting
- **Example**: "Africa/Lagos", "Africa/Abuja"
- **Validation**: Must be a valid IANA time zone identifier
- **Usage**: Scheduled maintenance, outage predictions, report timestamps

**status** (Enum, default: "active")
- **Purpose**: Current operational status of the company account
- **Values**: "active", "suspended", "inactive"
- **Usage**: Account management, billing, access control
- **Behavior**:
  - `active`: Full platform access
  - `suspended`: Limited access, billing issues
  - `inactive`: No access, account closed

#### Company Settings Fields

**settings.theme** (Object)
- **Purpose**: Company-specific branding and visual customization
- **Fields**:
  - `primaryColor`: Primary brand color (hex)
  - `secondaryColor`: Secondary brand color (hex)
  - `accentColor`: Accent color for highlights (hex)
  - `logo`: URL to branded logo
  - `favicon`: URL to favicon
- **Usage**: UI theming, branded experiences, white-label deployments

**settings.language** (String, default: "en")
- **Purpose**: Default language for company communications and UI
- **Example**: "en", "ha", "yo", "ig"
- **Validation**: Must be a supported language code
- **Usage**: User interface localization, notification language

**settings.notificationDefaults** (Object)
- **Purpose**: Default notification preferences for the company
- **Fields**:
  - `channels`: Default delivery channels (["in-app", "push"])
  - `emergencyChannels`: Emergency delivery channels (["in-app", "push", "sms", "email"])
  - `defaultPriority`: Default message priority ("normal" or "high")
- **Usage**: Notification delivery configuration, user defaults

**settings.features** (Object)
- **Purpose**: Feature flags for company-specific functionality
- **Fields**:
  - `aiAnalytics`: Enable AI-powered analytics
  - `predictiveMaintenance`: Enable predictive maintenance features
  - `advancedReporting`: Enable advanced reporting tools
  - `customIntegrations`: Enable third-party integrations
- **Usage**: Subscription tier management, feature access control

#### Subscription Fields

**subscription** (Object)
- **Purpose**: Company subscription and billing information
- **Fields**:
  - `tier`: Subscription tier ("basic", "standard", "premium")
  - `startDate`: Subscription start date
  - `endDate`: Subscription end date
  - `maxUsers`: Maximum allowed users
  - `maxStates`: Maximum allowed states
  - `maxFeeders`: Maximum allowed feeders
- **Usage**: Billing, access control, feature limits

#### Metadata Fields

**metadata** (Object)
- **Purpose**: Additional company information for regulatory and business purposes
- **Fields**:
  - `licenseNumber`: Regulatory license number
  - `regulatoryBody`: Name of regulatory authority
  - `establishedDate`: Company establishment date
  - `website`: Company website URL
  - `description`: Company description
- **Usage**: Compliance, documentation, public information

#### Timestamp Fields

**createdAt** (Date, default: Date.now)
- **Purpose**: Timestamp when company record was created
- **Usage**: Audit trail, analytics, reporting

**updatedAt** (Date, default: Date.now)
- **Purpose**: Timestamp when company record was last updated
- **Usage**: Audit trail, change tracking, synchronization

### Company Relationships

The Company entity has the following relationships:

1. **Company → States**: One-to-Many
   - One company manages multiple states
   - Each state belongs to exactly one company

2. **Company → Users**: One-to-Many
   - One company has multiple users
   - Each user belongs to exactly one company

3. **Company → Admins**: One-to-Many
   - One company has multiple admins
   - Each admin belongs to exactly one company

4. **Company → Feeders**: One-to-Many (via States)
   - One company has multiple feeders across its states
   - Each feeder belongs to exactly one company

5. **Company → Reports**: One-to-Many
   - One company receives multiple reports
   - Each report belongs to exactly one company

6. **Company → Notifications**: One-to-Many
   - One company sends multiple notifications
   - Each notification belongs to exactly one company

### Company Validation Rules

1. **Uniqueness Constraints**:
   - `name` must be unique across all companies
   - `shortName` must be unique across all companies
   - `code` must be unique across all companies
   - `officialEmail` must be unique across all companies

2. **Required Fields**:
   - `name`, `shortName`, `code`, `officialEmail`, `officialPhone`
   - `headquarters.address`, `headquarters.city`, `headquarters.state`

3. **Format Validation**:
   - `code` must be uppercase alphanumeric
   - `officialEmail` must be valid email format
   - `officialPhone` must be valid phone format
   - `timeZone` must be valid IANA time zone

4. **Business Rules**:
   - A company cannot be deleted if it has active users
   - A company cannot be deleted if it has active states
   - Company status change to "inactive" requires confirmation
   - Coverage states must be within the company's operational region

### Company Lifecycle

1. **Creation**:
   - Platform Owner creates company record
   - Company assigned initial subscription tier
   - Company settings configured with defaults
   - Coverage states assigned

2. **Active State**:
   - Full platform access
   - Users can be onboarded
   - Infrastructure can be managed
   - Normal billing operations

3. **Suspended State**:
   - Limited platform access
   - Read-only access to existing data
   - No new user creation
   - Billing issues resolution required

4. **Inactive State**:
   - No platform access
   - Data archived
   - Account closed
   - Requires reactivation to restore access

## Company ID as Primary Isolation Key

The `companyId` field will become the primary isolation key across the entire LITHA system, ensuring complete data separation between different distribution companies. This section documents how `companyId` will be implemented and used across all system components.

### Isolation Strategy

The `companyId` will be implemented as a required field on all data models that represent company-specific resources. This creates a clear boundary between companies and prevents cross-company data access.

### Company ID Implementation Across Models

#### User Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other user fields
}
```
- **Purpose**: Associate each user with their distribution company
- **Isolation**: Users can only access data within their company
- **Query Pattern**: All user queries filtered by `companyId`

#### Admin Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other admin fields
}
```
- **Purpose**: Associate each admin with their distribution company
- **Isolation**: Admins can only manage resources within their company
- **Query Pattern**: All admin queries filtered by `companyId`

#### State Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other state fields
}
```
- **Purpose**: Associate each state with its managing company
- **Isolation**: States are exclusive to one company
- **Query Pattern**: All state queries filtered by `companyId`

#### LGA Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other LGA fields
}
```
- **Purpose**: Associate each LGA with its company (via state relationship)
- **Isolation**: LGAs are exclusive to one company
- **Query Pattern**: All LGA queries filtered by `companyId`

#### Ward Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other ward fields
}
```
- **Purpose**: Associate each ward with its company
- **Isolation**: Wards are exclusive to one company
- **Query Pattern**: All ward queries filtered by `companyId`

#### Feeder Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other feeder fields
}
```
- **Purpose**: Associate each feeder with its company
- **Isolation**: Feeders are exclusive to one company
- **Query Pattern**: All feeder queries filtered by `companyId`

#### Injection Substation Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other substation fields
}
```
- **Purpose**: Associate each injection substation with its company
- **Isolation**: Injection substations are exclusive to one company
- **Query Pattern**: All injection substation queries filtered by `companyId`

#### Report Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other report fields
}
```
- **Purpose**: Associate each report with its company
- **Isolation**: Reports are exclusive to one company
- **Query Pattern**: All report queries filtered by `companyId`

#### Notification Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other notification fields
}
```
- **Purpose**: Associate each notification with its company
- **Isolation**: Notifications are exclusive to one company
- **Query Pattern**: All notification queries filtered by `companyId`

#### Power Log Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other power log fields
}
```
- **Purpose**: Associate each power log entry with its company
- **Isolation**: Power logs are exclusive to one company
- **Query Pattern**: All power log queries filtered by `companyId`

#### Power Status Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company, required, indexed),
  // ... other power status fields
}
```
- **Purpose**: Associate each power status with its company
- **Isolation**: Power status is exclusive to one company
- **Query Pattern**: All power status queries filtered by `companyId`

### Company ID in API Layer

#### Middleware Enforcement
All API endpoints will include company isolation middleware that:
1. Extracts `companyId` from the authenticated user's token
2. Automatically adds `companyId` filter to all database queries
3. Prevents manual override of `companyId` in requests
4. Logs any attempts to access cross-company data

#### Query Pattern
```javascript
// Before (single-tenant)
const users = await User.find({ role: 'admin' });

// After (multi-tenant)
const users = await User.find({ 
  companyId: req.user.companyId,
  role: 'admin' 
});
```

#### API Response Pattern
```javascript
// Before (single-tenant)
{
  "users": [...]
}

// After (multi-tenant)
{
  "companyId": "KEDCO",
  "users": [...]
}
```

### Company ID in Frontend Layer

#### Authentication Context
The `AuthContext` will include `companyId`:
```javascript
{
  user: {
    _id: ObjectId,
    companyId: ObjectId,
    // ... other user fields
  }
}
```

#### API Calls
All API calls will automatically include company context:
```javascript
// Before (single-tenant)
api.get('/api/admin/users')

// After (multi-tenant)
api.get('/api/admin/users') // companyId automatically included from auth context
```

#### Component Rendering
Components will respect company boundaries:
```javascript
// Before (single-tenant)
const feeders = await api.get('/api/feeders');

// After (multi-tenant)
const feeders = await api.get('/api/feeders'); // Automatically filtered by companyId
```

### Company ID in Real-Time Layer

#### Socket.IO Room Naming
Socket.IO rooms will include `companyId` for isolation:
```javascript
// Before (single-tenant)
socket.join(`user_${userId}`);
socket.join(`feeder_${feederId}`);

// After (multi-tenant)
socket.join(`company_${companyId}:user_${userId}`);
socket.join(`company_${companyId}:feeder_${feederId}`);
```

#### Event Emission
Events will be scoped to company:
```javascript
// Before (single-tenant)
io.to(`feeder_${feederId}`).emit('powerStatusUpdated', data);

// After (multi-tenant)
io.to(`company_${companyId}:feeder_${feederId}`).emit('powerStatusUpdated', data);
```

### Company ID in AI Layer

#### AI Analytics
AI analytics will be scoped to company:
```javascript
// Before (single-tenant)
const analytics = await getAnalyticsDashboardData({ user });

// After (multi-tenant)
const analytics = await getAnalyticsDashboardData({ 
  user,
  companyId: user.companyId 
});
```

#### AI Training Data
AI models will be trained per company:
```javascript
// Before (single-tenant)
const model = await trainModel(allData);

// After (multi-tenant)
const model = await trainModel(companyData, { companyId });
```

### Company ID in Dashboard Layer

#### Dashboard Data
Dashboard data will be filtered by company:
```javascript
// Before (single-tenant)
const dashboardData = await getDashboardData();

// After (multi-tenant)
const dashboardData = await getDashboardData({ companyId });
```

#### Analytics Aggregation
Analytics will aggregate within company scope:
```javascript
// Before (single-tenant)
const totalUsers = await User.countDocuments();

// After (multi-tenant)
const totalUsers = await User.countDocuments({ companyId });
```

### Company ID in Messaging Layer

#### Operations Center
Operations Center messages will be scoped to company:
```javascript
// Before (single-tenant)
const messages = await OperationsMessage.find({ audience: 'all' });

// After (multi-tenant)
const messages = await OperationsMessage.find({ 
  companyId,
  audience: 'all' 
});
```

#### Notification Delivery
Notifications will be delivered within company scope:
```javascript
// Before (single-tenant)
io.to(`user_${userId}`).emit('newNotification', notification);

// After (multi-tenant)
io.to(`company_${companyId}:user_${userId}`).emit('newNotification', notification);
```

### Company ID in History Layer

#### Historical Data
Historical data will be isolated by company:
```javascript
// Before (single-tenant)
const history = await PowerLog.find({ feeder: feederId });

// After (multi-tenant)
const history = await PowerLog.find({ 
  companyId,
  feeder: feederId 
});
```

### Company ID Indexing Strategy

All `companyId` fields will be indexed for query performance:
```javascript
// Database indexes
userSchema.index({ companyId: 1 });
adminSchema.index({ companyId: 1 });
stateSchema.index({ companyId: 1 });
lgaSchema.index({ companyId: 1 });
wardSchema.index({ companyId: 1 });
feederSchema.index({ companyId: 1 });
injectionSubstationSchema.index({ companyId: 1 });
reportSchema.index({ companyId: 1 });
notificationSchema.index({ companyId: 1 });
powerLogSchema.index({ companyId: 1 });
powerStatusSchema.index({ companyId: 1 });
```

### Company ID Validation

#### Creation Validation
- All documents must include valid `companyId`
- `companyId` must reference an existing active company
- Users cannot create documents for other companies

#### Update Validation
- `companyId` cannot be changed after creation
- Updates must respect original `companyId`
- Cross-company updates are prevented

#### Deletion Validation
- Company cannot be deleted if it has associated data
- Cascade delete rules must respect company boundaries
- Archive strategy for company data deletion

### Company ID Security Considerations

#### Access Control
- `companyId` is extracted from authentication token, not user input
- Users cannot override their `companyId`
- API middleware enforces company boundaries

#### Audit Logging
- All cross-company access attempts are logged
- `companyId` changes are audited
- Company isolation violations trigger alerts

#### Data Leakage Prevention
- Response filtering to remove `companyId` from user-facing data
- Query result validation to ensure company isolation
- Regular security audits for isolation breaches

### Company ID Migration Strategy

#### Data Migration
When implementing multi-tenancy:
1. Create default "KEDCO" company
2. Add `companyId` field to all existing documents
3. Set `companyId` to default company for existing data
4. Validate data integrity after migration
5. Enable company isolation middleware

#### Backward Compatibility
During transition period:
- Company isolation middleware can be toggled
- Legacy endpoints can bypass company filtering
- Gradual rollout to avoid disruption
- Monitoring for compatibility issues

#### LGAs (Local Government Areas)
- **Definition**: Administrative divisions within a state
- **Relationship**: Multiple LGAs belong to one state
- **Scope**: LGA-level within a company's territory

#### Injection Substations
- **Definition**: Power distribution substations that feed multiple feeders
- **Relationship**: Multiple injection substations belong to one LGA
- **Scope**: Substation-level within a company's territory

#### Feeders
- **Definition**: Power distribution lines from injection substations to wards
- **Relationship**: Multiple feeders belong to one injection substation
- **Scope**: Feeder-level within a company's territory

#### Wards
- **Definition**: Geographic areas served by feeders
- **Relationship**: Multiple wards belong to one feeder
- **Scope**: Ward-level within a company's territory

#### Users
- **Definition**: End users (customers) of the electricity distribution company
- **Relationship**: Users belong to a specific ward and are associated with a company
- **Scope**: Individual user within a company's territory

## Role Hierarchy

The role system will be expanded to support the multi-tenant architecture:

```
Platform Owner
    ↓
Company Super Admin
    ↓
Admin
    ↓
User
```

### Role Definitions

#### Platform Owner
- **Access Level**: Global platform access
- **Responsibilities**:
  - Create and manage distribution companies
  - Configure platform-wide settings
  - Monitor all companies' performance
  - Manage platform billing and subscriptions
  - Access platform-wide analytics
  - Handle company-level support escalations
- **Permissions**:
  - Full access to all companies' data
  - Can create/delete companies
  - Can modify platform configuration
  - Can view all system logs and metrics
- **Boundary**: Cannot modify company-specific operational data unless authorized by the company

#### Company Super Admin
- **Access Level**: Company-wide access within their assigned company
- **Responsibilities**:
  - Manage company's states, LGAs, injection substations, feeders, wards
  - Create and manage company admins
  - Configure company-specific settings
  - Manage company's users
  - Access company-wide analytics and reports
  - Handle company-level operational decisions
- **Permissions**:
  - Full access to their company's data
  - Can create/delete admins within their company
  - Can modify company infrastructure
  - Can view all company logs and metrics
- **Boundary**: Cannot access other companies' data or platform-level settings

#### Admin
- **Access Level**: Feeder-level access within their assigned company
- **Responsibilities**:
  - Manage assigned feeders' power status
  - View and respond to reports from users in their assigned feeders
  - Send notifications to users in their assigned feeders
  - Access feeder-level analytics
  - Manage users within their assigned feeders (limited operations)
- **Permissions**:
  - Can update power status for assigned feeders
  - Can view reports from assigned feeders
  - Can send notifications to assigned feeders
  - Can view feeder-level analytics
- **Boundary**: Cannot access other feeders, other companies' data, or company-level settings

#### User
- **Access Level**: Individual user access within their assigned(company)
- **Responsibilities**:
  - View power status for their location
  - Submit power outage reports
  - Receive notifications about power status
  - Access personal analytics (if business mode enabled)
- **Permissions**:
  - Can view status for their assigned feeder
  - Can submit reports
  - Can manage their own profile and notification preferences
- **Boundary**: Cannot access other users' data, admin functions, or company-level data

## Company Isolation Architecture

Each distribution company must have complete data isolation to ensure security and privacy. No company should ever access another company's data.

### Data Isolation Strategy

#### Database-Level Isolation
- **Option A**: Separate databases per company
  - Each company gets its own MongoDB database
  - Complete physical isolation
  - Easier backup and restore per company
  - Higher infrastructure cost
- **Option B**: Shared database with company_id field
  - All companies share one database
  - Every document includes a `company_id` field
  - Query filtering by `company_id` on all operations
  - Lower infrastructure cost
  - Requires strict query filtering enforcement

**Recommended**: Option B (Shared database with company_id) for cost efficiency, with strict middleware enforcement.

#### Middleware Enforcement
All API endpoints must include company isolation middleware:
- Extract `company_id` from authenticated user's context
- Automatically filter all database queries by `company_id`
- Prevent cross-company data access at the middleware level
- Log any attempted cross-company access attempts

#### Isolated Data Types
Each company's data must be isolated:

1. **Users**
   - Users belong to a specific company
   - User queries filtered by `company_id`
   - User authentication scoped to company

2. **Admins**
   - Admins belong to a specific company
   - Admin queries filtered by `company_id`
   - Admin permissions scoped to company

3. **States**
   - States belong to a specific company
   - State queries filtered by `company_id`
   - State management scoped to company

4. **LGAs**
   - LGAs belong to a specific company
   - LGA queries filtered by `company_id`
   - LGA management scoped to company

5. **Injection Substations**
   - Injection substations belong to a specific company
   - Substation queries filtered by `company_id`
   - Substation management scoped to company

6. **Feeders**
   - Feeders belong to a specific company
   - Feeder queries filtered by `company_id`
   - Feeder management scoped to company

7. **Wards**
   - Wards belong to a specific company
   - Ward queries filtered by `company_id`
   - Ward management scoped to company

8. **Reports**
   - Reports belong to a specific company
   - Report queries filtered by `company_id`
   - Report management scoped to company

9. **Notifications**
   - Notifications belong to a specific company
   - Notification queries filtered by `company_id`
   - Notification delivery scoped to company

10. **AI Analytics**
    - Analytics data scoped to company
    - Analytics queries filtered by `company_id`
    - AI models trained per company (optional)

11. **History**
    - Power logs scoped to company
    - History queries filtered by `company_id`
    - Historical data retention per company

12. **Dashboard**
    - Dashboard data scoped to company
    - Dashboard queries filtered by `company_id`
    - Real-time updates scoped to company

#### Socket.IO Room Isolation
Socket.IO rooms must include company scoping:
- Current: `user_{userId}`, `feeder_{feederId}`, `ward_{wardId}`, `lga_{lgaId}`, `state_{stateId}`
- Future: `company_{companyId}:user_{userId}`, `company_{companyId}:feeder_{feederId}`, etc.
- Prevents cross-company real-time data leakage

#### File Storage Isolation
If file storage is used (e.g., uploaded documents, images):
- Separate storage buckets per company
- Path-based isolation within shared storage
- Access control lists (ACLs) per company

## Operations Center

The Operations Center will be an internal communication system for distribution companies to manage their internal operations.

### Communication Types

#### Internal Announcements
- **Purpose**: Company-wide announcements from management
- **Examples**: Policy changes, system updates, holiday schedules
- **Audience**: All company staff (admins, super admins)
- **Delivery**: In-app notifications, email (optional)
- **Priority**: Normal

#### Meeting Notices
- **Purpose**: Schedule and notify about internal meetings
- **Examples**: Weekly ops meetings, training sessions, strategy reviews
- **Audience**: Specific teams or all staff
- **Delivery**: In-app notifications, calendar integration (future)
- **Priority**: Normal

#### Emergency Broadcasts
- **Purpose**: Critical emergency notifications
- **Examples**: Grid failures, security incidents, natural disasters
- **Audience**: All relevant staff based on location/role
- **Delivery**: In-app notifications, SMS, email, push notifications
- **Priority**: Critical

#### Task Assignments
- **Purpose**: Assign and track operational tasks
- **Examples**: Feeder maintenance, outage investigation, customer follow-up
- **Audience**: Specific admins or teams
- **Delivery**: In-app notifications
- **Priority**: Normal/High

#### Read Acknowledgements
- **Purpose**: Track message read status
- **Examples**: Important announcements requiring confirmation
- **Audience**: Recipients must acknowledge receipt
- **Delivery**: In-app notifications with acknowledgment button
- **Priority**: High

#### Priority Messages
- **Purpose**: Urgent messages requiring immediate attention
- **Examples**: Critical outages, safety incidents, regulatory issues
- **Audience**: Specific recipients based on role/location
- **Delivery**: In-app notifications, SMS, push notifications
- **Priority**: High

### Message Flow

1. **Message Creation**
   - Company Super Admin or Admin creates a message
   - Selects message type (announcement, meeting, emergency, task, etc.)
   - Selects audience (all staff, specific team, specific individuals)
   - Sets priority (normal, high, critical)
   - Sets delivery channels (in-app, email, SMS, push)

2. **Message Delivery**
   - System determines recipients based on audience selection
   - Messages routed through appropriate channels
   - Socket.IO for real-time in-app delivery
   - Email service for email delivery
   - SMS service for SMS delivery (future)
   - FCM for push notifications

3. **Message Tracking**
   - Delivery status tracked per recipient
   - Read status tracked (if acknowledgment required)
   - Response tracking (for tasks)
   - Analytics on message engagement

4. **Message Management**
   - Message history and archive
   - Message search and filtering
   - Message expiration and cleanup
   - Message templates for common communications

### Operations Center UI

The Operations Center will include:
- Message composition interface
- Audience selection tools
- Message templates
- Message history and tracking dashboard
- Real-time message delivery status
- Analytics on communication effectiveness
- Integration with calendar (future)

## Implementation Considerations

### Database Schema Changes
- Add `company_id` field to all relevant models
- Create `Company` model for company management
- Add indexes on `company_id` for query performance
- Update all queries to include `company_id` filtering

### Authentication Changes
- Update User model to include `company_id`
- Update auth middleware to extract and validate `company_id`
- Update token generation to include company context
- Update role middleware to respect company boundaries

### API Changes
- Add company isolation middleware
- Update all endpoints to enforce company scoping
- Add company management endpoints (for Platform Owner)
- Add Operations Center endpoints

### Frontend Changes
- Add company context to AuthProvider
- Update all components to respect company boundaries
- Add Operations Center UI
- Add company management UI (for Platform Owner)

### Migration Strategy
- Data migration script to add `company_id` to existing data
- Create default company for existing KEDCO data
- Gradual rollout to avoid disruption
- Backward compatibility during transition

### Performance Considerations
- Index `company_id` on all collections
- Cache company-specific data
- Optimize queries with `company_id` filtering
- Monitor query performance with company filtering

### Security Considerations
- Strict middleware enforcement of company isolation
- Audit logging for cross-company access attempts
- Regular security audits of isolation implementation
- Penetration testing for data leakage vulnerabilities
