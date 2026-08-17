# Enterprise Role and Permission Architecture

This document describes the future role hierarchy and permission model for LITHA as it evolves into a multi-tenant enterprise SaaS platform.

## Overview

LITHA will transition from a simple three-role system (user, admin, super-admin) to a comprehensive enterprise role and permission architecture that supports multiple distribution companies with granular access control and flexible permission management.

## Role Hierarchy

The enterprise role hierarchy is designed to provide clear separation of concerns while maintaining flexibility for organizational structures:

```
Platform Owner
    ↓
Distribution Company
    ↓
Company Super Admin
    ↓
Admin
    ↓
User
```

### Platform Owner

**Definition**: The entity that owns and operates the LITHA platform itself. This is a platform-level role, not associated with any specific distribution company.

**Purpose**: 
- Manage the platform infrastructure and operations
- Oversee all distribution companies using the platform
- Configure platform-wide settings and policies
- Handle platform-level billing and subscriptions
- Monitor platform performance and security

**Responsibilities**:
- Create and manage distribution company accounts
- Configure platform-wide settings (security, compliance, features)
- Monitor all companies' performance and usage
- Manage platform billing and subscription tiers
- Access platform-wide analytics and reporting
- Handle company-level support escalations
- Configure platform integrations and third-party services
- Manage platform security and compliance

**Permissions**:
- Full access to all companies' data (read-only for operational data)
- Create/delete/modify distribution companies
- Configure platform-wide settings and policies
- Access platform-level analytics and reporting
- Manage platform billing and subscriptions
- View all system logs and metrics
- Configure platform integrations
- Manage platform security settings

**Boundaries**:
- Cannot modify company-specific operational data without explicit authorization
- Cannot impersonate company users
- Cannot access company-specific financial data beyond billing
- Platform-level changes require approval process for critical changes

### Distribution Company

**Definition**: The organizational entity representing an electricity distribution company (DISCO). This is not a user role but an organizational unit that contains users with various roles.

**Purpose**:
- Represent a distinct electricity distribution company
- Provide organizational boundary for data isolation
- Enable company-specific configuration and branding
- Support company-level subscription management

**Responsibilities**:
- Define company-specific settings and branding
- Manage company subscription and billing
- Configure company-specific features and integrations
- Maintain company-level compliance and regulatory requirements

**Note**: Distribution Company is an organizational entity, not a user role. Users belong to a Distribution Company and have roles within that company.

### Company Super Admin

**Definition**: The highest administrative role within a specific distribution company. This user has full access to all company resources and settings.

**Purpose**:
- Manage the entire distribution company's operations
- Configure company-specific settings and policies
- Manage company users and admins
- Oversee company infrastructure and resources

**Responsibilities**:
- Manage company's states, LGAs, injection substations, feeders, wards
- Create and manage company admins
- Manage company users and their permissions
- Configure company-specific settings (branding, features, notifications)
- Access company-wide analytics and reports
- Handle company-level operational decisions
- Manage company subscription and billing
- Configure company integrations and third-party services
- Handle company compliance and regulatory requirements

**Permissions**:
- Full access to their company's data and resources
- Create/delete/modify admins within their company
- Create/delete/modify users within their company
- Modify company infrastructure (states, LGAs, injection substations, feeders, wards)
- Configure company settings and policies
- Access company-level analytics and reporting
- Manage company subscription and billing
- Configure company integrations
- Send company-wide notifications
- View company logs and metrics

**Boundaries**:
- Cannot access other companies' data or settings
- Cannot access platform-level settings or configuration
- Cannot modify platform-level policies
- Company-level changes are logged and audited

### Admin

**Definition**: An operational role within a distribution company with access to specific feeders and geographic areas. Admins manage day-to-day operations within their assigned scope.

**Purpose**:
- Manage power status for assigned feeders
- Handle user reports and incidents
- Send targeted notifications to users
- Access feeder-level analytics and insights

**Responsibilities**:
- Manage assigned feeders' power status (on/off/maintenance)
- View and respond to reports from users in their assigned feeders
- Send notifications to users in their assigned feeders
- Access feeder-level analytics and performance metrics
- Manage users within their assigned feeders (limited operations)
- Coordinate maintenance activities for assigned feeders
- Handle customer service issues within their scope
- Generate reports on feeder performance

**Permissions**:
- Update power status for assigned feeders
- View reports from assigned feeders
- Send notifications to users in assigned feeders
- Access feeder-level analytics and reports
- View user information for assigned feeders
- Manage maintenance schedules for assigned feeders
- Generate feeder performance reports

**Boundaries**:
- Can only access data within their assigned feeders
- Cannot access other feeders or company-level settings
- Cannot modify company infrastructure
- Cannot manage other admins
- Cannot access platform-level features

### User

**Definition**: The end-user role representing electricity customers who use LITHA to monitor power status and report issues.

**Purpose**:
- Monitor power status for their location
- Receive notifications about power outages
- Report power issues and incidents
- Access personal power usage information

**Responsibilities**:
- View power status for their assigned location
- Submit power outage reports
- Receive notifications about power status changes
- Manage their personal profile and notification preferences
- Access historical power data for their location
- Provide feedback on power service quality

**Permissions**:
- View power status for their assigned feeder
- Submit reports for their location
- Receive notifications based on their preferences
- Manage their own profile and settings
- Access their personal power history
- View AI-powered insights for their location (if enabled)

**Boundaries**:
- Can only access their own data and their assigned feeder's public data
- Cannot access other users' data
- Cannot access admin functions or company-level data
- Cannot modify infrastructure or settings
- Cannot view other companies' data

## Job Title Independence

Job Title is independent from Role. This separation allows organizations to maintain their internal organizational structure while using standardized roles for permission management.

### Job Title Definition

**Job Title**: The formal position or designation within an organization's hierarchy (e.g., CEO, Managing Director, ICT Manager, Operations Manager). This is informational and does not affect system permissions.

**Role**: The system-level permission set that determines what actions a user can perform within LITHA (e.g., Company Super Admin, Admin, User). This controls access to system features and data.

### Job Title Examples

**Executive Level**:
- CEO (Chief Executive Officer)
- Managing Director
- Executive Director
- Chief Operating Officer (COO)

**Management Level**:
- ICT Manager
- Operations Manager
- Customer Service Manager
- Regional Manager
- Technical Manager

**Operational Level**:
- Engineer
- Operator
- Field Technician
- Customer Service Representative
- Data Analyst

**Support Level**:
- Administrative Assistant
- Support Staff
- Trainee

### Job Title vs Role Mapping

A user's Job Title and Role are independent:

| Job Title | Possible Role | Example Scenario |
|-----------|---------------|------------------|
| CEO | Company Super Admin | CEO has full company access |
| ICT Manager | Company Super Admin | ICT Manager manages company systems |
| Operations Manager | Admin | Operations Manager manages specific feeders |
| Engineer | Admin | Engineer manages technical operations for feeders |
| Customer Service Manager | Admin | CS Manager handles customer issues for feeders |
| Customer Service Representative | User | CSR uses system like a regular user |
| Field Technician | User | Technician reports issues like a regular user |

### Implementation Considerations

**User Model Schema**:
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  role: Enum ["platform-owner", "company-super-admin", "admin", "user"],
  jobTitle: String,  // Optional, informational only
  // ... other user fields
}
```

**Permission Determination**:
- System permissions are determined solely by `role`
- `jobTitle` is used for display, reporting, and organizational purposes
- Job title does not affect access control or permissions

**Benefits of Separation**:
- Organizations can maintain their internal structure
- Standardized roles across all companies
- Flexible organizational hierarchies
- Clear separation between permissions and organizational structure
- Easier to add new job titles without affecting permissions

## Permission Model

The permission model is designed to be flexible, scalable, and maintainable. Instead of hardcoding individual permissions for each role, permissions are grouped into logical permission groups that can be assigned to roles.

### Permission Groups

Permissions are organized into functional groups for easier management:

#### Power Control Group
**Purpose**: Control and manage power distribution operations

**Permissions**:
- `power.view`: View power status for assigned feeders
- `power.update`: Update power status (on/off/maintenance)
- `power.history`: View power status history
- `power.schedule`: Schedule maintenance windows
- `power.predict`: View predictive outage information
- `power.analytics`: Access power analytics and insights

#### Reports Group
**Purpose**: Manage incident reports and customer feedback

**Permissions**:
- `reports.view`: View reports from assigned areas
- `reports.create`: Submit new reports
- `reports.respond`: Respond to and resolve reports
- `reports.assign`: Assign reports to specific users
- `reports.analytics`: Access report analytics
- `reports.export`: Export report data

#### Messaging Group
**Purpose**: Send and manage communications

**Permissions**:
- `messaging.view`: View message history
- `messaging.create`: Create and send messages
- `messaging.broadcast`: Send broadcast messages
- `messaging.emergency`: Send emergency notifications
- `messaging.templates`: Manage message templates
- `messaging.analytics`: Access messaging analytics

#### AI Dashboard Group
**Purpose**: Access AI-powered analytics and insights

**Permissions**:
- `ai.view`: View AI dashboard and analytics
- `ai.predictions`: View AI predictions
- `ai.insights`: Access AI-generated insights
- `ai.customize`: Customize AI models and parameters
- `ai.export`: Export AI analytics data

#### Infrastructure Group
**Purpose**: Manage infrastructure and geographic data

**Permissions**:
- `infrastructure.view`: View infrastructure data
- `infrastructure.create`: Create new infrastructure (states, LGAs, wards, feeders)
- `infrastructure.update`: Modify existing infrastructure
- `infrastructure.delete`: Delete infrastructure
- `infrastructure.assign`: Assign infrastructure to admins/users
- `infrastructure.analytics`: Access infrastructure analytics

#### Users Group
**Purpose**: Manage user accounts and permissions

**Permissions**:
- `users.view`: View user information
- `users.create`: Create new user accounts
- `users.update`: Modify user accounts
- `users.delete`: Delete user accounts
- `users.assign`: Assign roles and permissions to users
- `users.activate`: Activate/deactivate user accounts
- `users.analytics`: Access user analytics

#### Notifications Group
**Purpose**: Configure and manage notification systems

**Permissions**:
- `notifications.view`: View notification history
- `notifications.configure`: Configure notification settings
- `notifications.send`: Send notifications
- `notifications.manage`: Manage notification preferences
- `notifications.analytics`: Access notification analytics

#### Analytics Group
**Purpose**: Access system-wide analytics and reporting

**Permissions**:
- `analytics.view`: View analytics dashboards
- `analytics.reports`: Generate and view reports
- `analytics.export`: Export analytics data
- `analytics.custom`: Create custom analytics views
- `analytics.predictive`: Access predictive analytics
- `analytics.company`: View company-level analytics

#### Company Management Group
**Purpose**: Manage company-level settings and configuration

**Permissions**:
- `company.view`: View company information
- `company.configure`: Configure company settings
- `company.branding`: Manage company branding
- `company.subscription`: Manage company subscription
- `company.integrations`: Configure company integrations
- `company.analytics`: Access company analytics

#### Platform Management Group
**Purpose**: Platform-level management (Platform Owner only)

**Permissions**:
- `platform.view`: View platform-wide information
- `platform.configure`: Configure platform settings
- `platform.companies`: Manage distribution companies
- `platform.billing`: Manage platform billing
- `platform.security`: Configure platform security
- `platform.analytics`: Access platform analytics
- `platform.integrations`: Configure platform integrations

### Role-Permission Mapping

Roles are assigned permission groups rather than individual permissions:

#### Platform Owner
**Permission Groups**: All groups
- Full access to all platform permissions
- Can manage all companies
- Can configure platform settings

#### Company Super Admin
**Permission Groups**: Power Control, Reports, Messaging, AI Dashboard, Infrastructure, Users, Notifications, Analytics, Company Management
- Full access to all company-level permissions
- Cannot access platform management permissions
- Scope limited to their company

#### Admin
**Permission Groups**: Power Control (limited), Reports (limited), Messaging (limited), AI Dashboard (limited), Analytics (limited)
- Power Control: view, update, history, schedule (for assigned feeders only)
- Reports: view, respond, assign (for assigned feeders only)
- Messaging: create, broadcast (for assigned feeders only)
- AI Dashboard: view, predictions (for assigned feeders only)
- Analytics: view, reports (for assigned feeders only)
- Scope limited to assigned feeders

#### User
**Permission Groups**: Power Control (view only), Reports (create only), Notifications (view only)
- Power Control: view (for their assigned feeder only)
- Reports: create (for their location only)
- Notifications: view (their own notifications)
- Scope limited to their own data and assigned feeder

### Permission Inheritance

Permissions follow a hierarchical inheritance model:

1. **Platform Owner**: Inherits all permissions from all roles
2. **Company Super Admin**: Inherits all permissions from Admin and User within their company
3. **Admin**: Inherits view permissions from User within their scope
4. **User**: Base permissions only

This inheritance ensures that higher-level roles can perform all actions of lower-level roles within their scope.

### Permission Scope

All permissions are scoped by:
- **Company**: Users can only access data within their company
- **Geography**: Admins can only access data within their assigned feeders
- **User**: Users can only access their own data and public data

Permission checks are performed at multiple levels:
1. Authentication: User is authenticated
2. Authorization: User has required role
3. Permission: User has required permission
4. Scope: User has access to requested resource (company, feeder, etc.)

## Role Responsibilities

### Platform Owner Responsibilities

**Strategic Level**:
- Define platform strategy and direction
- Set platform policies and standards
- Approve major platform changes
- Monitor platform performance and health

**Operational Level**:
- Manage platform infrastructure and resources
- Oversee company onboarding and offboarding
- Handle platform-level incidents and emergencies
- Configure platform security and compliance

**Financial Level**:
- Manage platform billing and subscriptions
- Set pricing tiers and policies
- Monitor platform revenue and costs
- Approve major financial decisions

**Compliance Level**:
- Ensure platform regulatory compliance
- Manage platform security certifications
- Handle platform-level audits
- Implement data protection policies

### Company Super Admin Responsibilities

**Strategic Level**:
- Define company strategy within platform constraints
- Set company policies and procedures
- Approve company-level changes
- Monitor company performance

**Operational Level**:
- Manage company infrastructure and resources
- Oversee admin and user management
- Handle company-level incidents
- Configure company settings and integrations

**Team Management**:
- Hire and manage company admins
- Define admin roles and responsibilities
- Provide training and support
- Monitor admin performance

**Customer Service**:
- Handle escalated customer issues
- Define customer service policies
- Monitor customer satisfaction
- Implement service improvements

### Admin Responsibilities

**Operational Level**:
- Monitor power status for assigned feeders
- Update power status based on field reports
- Coordinate maintenance activities
- Handle operational incidents

**Customer Service**:
- Respond to user reports and complaints
- Provide status updates to users
- Handle customer inquiries
- Escalate complex issues to Company Super Admin

**Reporting**:
- Generate feeder performance reports
- Track outage statistics
- Identify recurring issues
- Suggest operational improvements

**Coordination**:
- Coordinate with field teams
- Communicate with other admins
- Participate in operational meetings
- Share best practices

### User Responsibilities

**Self-Service**:
- Monitor power status for their location
- Report power issues promptly
- Manage their notification preferences
- Update their profile information

**Community**:
- Provide accurate reports
- Give feedback on service quality
- Participate in community initiatives
- Share information with neighbors

**Compliance**:
- Follow platform usage policies
- Report issues responsibly
- Respect system resources
- Maintain account security

## Future Role Expansion

The permission architecture is designed to support future role additions without requiring system redesign. New roles can be added by:

### Adding New Roles

**Step 1**: Define Role Purpose
- Clearly define the role's purpose and scope
- Identify which permission groups the role needs
- Define the role's position in the hierarchy

**Step 2**: Assign Permission Groups
- Select appropriate permission groups from existing groups
- If needed, create new permission groups
- Define scope limitations (company, feeder, etc.)

**Step 3**: Update Role Hierarchy
- Determine where the new role fits in the hierarchy
- Define inheritance relationships
- Set up permission scope rules

**Step 4**: Implement Role
- Add role to User model enum
- Create role middleware if needed
- Update UI to handle new role
- Add role assignment functionality

### Example Future Roles

#### Maintenance Admin
**Purpose**: Specialized admin for maintenance operations

**Permission Groups**: Power Control (full), Reports (view only), Messaging (limited), Analytics (limited)
**Scope**: All feeders for maintenance operations
**Use Case**: Dedicated maintenance team that schedules and performs maintenance but doesn't handle customer service

#### Read Only Admin
**Purpose**: Admin with view-only access for monitoring and reporting

**Permission Groups**: Power Control (view only), Reports (view only), Analytics (view only)
**Scope**: All feeders or specific feeders
**Use Case**: Managers who need visibility but no operational control

#### Operations Manager
**Purpose**: Mid-level management role between Company Super Admin and Admin

**Permission Groups**: Power Control (full), Reports (full), Messaging (full), Analytics (full), Users (view only)
**Scope**: Multiple feeders or geographic regions
**Use Case**: Regional managers who oversee multiple admins and feeders

#### Regional Manager
**Purpose**: Manager for a specific geographic region within a company

**Permission Groups**: Power Control (full), Reports (full), Messaging (full), Analytics (full), Users (limited)
**Scope**: All feeders in assigned region
**Use Case**: Companies with large geographic coverage need regional management

#### Customer Service Manager
**Purpose**: Manager focused on customer service and support

**Permission Groups**: Reports (full), Messaging (full), Users (view only), Analytics (limited)
**Scope**: All feeders for customer service coordination
**Use Case**: Dedicated customer service leadership role

#### Data Analyst
**Purpose**: Role focused on analytics and reporting

**Permission Groups**: Analytics (full), Reports (view only), AI Dashboard (full)
**Scope**: Company-wide or feeder-specific
**Use Case**: Dedicated analytics role for business intelligence

#### Compliance Officer
**Purpose**: Role focused on regulatory compliance and audits

**Permission Groups**: Analytics (view only), Reports (view only), Users (view only), Infrastructure (view only)
**Scope**: Company-wide
**Use Case**: Regulatory compliance and audit requirements

### Permission Group Expansion

New permission groups can be added as needed:

**Example New Groups**:
- **Billing Group**: For managing billing and payments
- **Integration Group**: For managing third-party integrations
- **Security Group**: For managing security settings and audits
- **Training Group**: For managing training and onboarding
- **Quality Group**: For quality assurance and control

### Architecture Benefits

**Flexibility**:
- New roles can be added without system redesign
- Permission groups can be extended as needed
- Role hierarchy can be adjusted as requirements evolve

**Scalability**:
- Supports unlimited number of roles
- Handles complex organizational structures
- Scales with company growth

**Maintainability**:
- Clear separation between roles and permissions
- Centralized permission management
- Easy to audit and review permissions

**Security**:
- Principle of least privilege
- Clear permission boundaries
- Comprehensive permission tracking
