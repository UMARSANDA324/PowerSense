# Roadmap

This document outlines future plans for LITHA.

## Enterprise Multi-Tenant Architecture Roadmap

This section outlines the phased approach for transforming LITHA from a single-tenant platform to a multi-tenant enterprise SaaS platform.

### Phase 0: Architecture (Current Phase)
**Status**: In Progress
**Duration**: Documentation Only

**Objective**: Prepare the architecture for enterprise multi-tenancy through documentation only. No implementation.

**Deliverables**:
- [x] Enterprise hierarchy documentation (Platform Owner → Company → States → LGAs → Injection Substations → Feeders → Wards → Users)
- [x] Role hierarchy documentation (Platform Owner → Company Super Admin → Admin → User)
- [x] Operations Center documentation (internal communication system)
- [x] Company Isolation architecture documentation (data separation strategy)
- [x] Implementation roadmap (this document)

**Key Decisions**:
- Shared database with `company_id` field for cost efficiency
- Middleware-enforced company isolation
- Socket.IO room scoping for real-time isolation
- Separate storage buckets per company for file isolation

**No Code Changes**: This phase is documentation only to prepare for future implementation.

### Phase 1: Company Foundation
**Status**: Not Started
**Duration**: 4-6 weeks

**Objective**: Implement the foundational company model and basic multi-tenant structure.

**Backend Changes**:
- [ ] Create `Company` model with fields:
  - name (required, unique)
  - code (required, unique, e.g., "KEDCO", "AEDC")
  - description
  - logo
  - contactEmail
  - contactPhone
  - address
  - isActive (default: true)
  - subscriptionTier (enum: "basic", "standard", "premium")
  - subscriptionStart
  - subscriptionEnd
  - maxUsers
  - maxStates
  - settings (object for company-specific config)
  - createdAt
  - updatedAt
- [ ] Add `company_id` field to existing models:
  - User
  - State
  - LGA
  - Ward
  - Feeder
  - InjectionSubstation
  - Report
  - Notification
  - PowerLog
  - PowerStatus
- [ ] Add database indexes on `company_id` for all collections
- [ ] Create company management endpoints:
  - POST /api/platform/companies (Platform Owner only)
  - GET /api/platform/companies (Platform Owner only)
  - GET /api/platform/companies/:id (Platform Owner only)
  - PUT /api/platform/companies/:id (Platform Owner only)
  - DELETE /api/platform/companies/:id (Platform Owner only)
- [ ] Create company isolation middleware:
  - Extract `company_id` from authenticated user
  - Automatically filter queries by `company_id`
  - Prevent cross-company access
  - Log cross-company access attempts
- [ ] Update existing endpoints to use company isolation middleware
- [ ] Data migration script:
  - Create default "KEDCO" company
  - Assign existing data to KEDCO company
  - Backward compatibility during transition

**Frontend Changes**:
- [ ] Add company context to AuthProvider
- [ ] Update AuthContext to include company information
- [ ] Add Platform Owner dashboard (for company management)
- [ ] Update existing components to respect company boundaries

**Testing**:
- [ ] Unit tests for company isolation middleware
- [ ] Integration tests for company management endpoints
- [ ] Cross-company access prevention tests
- [ ] Data migration validation tests

### Phase 2: Role System
**Status**: Not Started
**Duration**: 3-4 weeks

**Objective**: Implement the expanded role hierarchy (Platform Owner, Company Super Admin, Admin, User).

**Backend Changes**:
- [ ] Update User model role enum:
  - "platform-owner"
  - "company-super-admin"
  - "admin"
  - "user"
- [ ] Update role middleware to handle new roles
- [ ] Create Platform Owner role middleware:
  - Full platform access
  - Company management permissions
  - Platform settings access
- [ ] Create Company Super Admin role middleware:
  - Company-wide access
  - Company infrastructure management
  - Company admin management
- [ ] Update Admin role middleware:
  - Feeder-level access within company
  - Company-scoped permissions
- [ ] Update User role middleware:
  - Individual user access within company
- [ ] Update auth endpoints to handle new roles
- [ ] Add role assignment endpoints:
  - POST /api/platform/users/:id/role (Platform Owner only)
  - POST /api/companies/:companyId/users/:id/role (Company Super Admin only)

**Frontend Changes**:
- [ ] Update role-based UI rendering
- [ ] Add Platform Owner dashboard components
- [ ] Add Company Super Admin dashboard components
- [ ] Update Admin dashboard for company context
- [ ] Update User dashboard for company context
- [ ] Add role management UI for Platform Owner
- [ ] Add role management UI for Company Super Admin

**Testing**:
- [ ] Role permission tests
- [ ] Role boundary tests
- [ ] Role assignment tests
- [ ] Cross-role access prevention tests

### Phase 3: Company Isolation
**Status**: Not Started
**Duration**: 4-5 weeks

**Objective**: Implement complete data isolation between companies.

**Backend Changes**:
- [ ] Enforce company isolation on all queries:
  - Users
  - Admins
  - States
  - LGAs
  - Wards
  - Injection Substations
  - Feeders
  - Reports
  - Notifications
  - Power Logs
  - Power Status
  - AI Analytics
- [ ] Update Socket.IO room naming:
  - Current: `user_{userId}`, `feeder_{feederId}`, etc.
  - Future: `company_{companyId}:user_{userId}`, `company_{companyId}:feeder_{feederId}`, etc.
- [ ] Update Socket.IO event handlers to respect company scoping
- [ ] Implement file storage isolation:
  - Separate storage buckets per company
  - Path-based isolation within shared storage
  - Access control lists per company
- [ ] Add audit logging for cross-company access attempts
- [ ] Add company isolation monitoring and alerts

**Frontend Changes**:
- [ ] Update Socket.IO client to use company-scoped rooms
- [ ] Update file upload components to respect company isolation
- [ ] Add company context to all API calls
- [ ] Update real-time update handlers for company scoping

**Testing**:
- [ ] Company isolation penetration tests
- [ ] Socket.IO room isolation tests
- [ ] File storage isolation tests
- [ ] Cross-company data leakage tests
- [ ] Audit logging validation tests

### Phase 4: Operations Center
**Status**: Not Started
**Duration**: 5-6 weeks

**Objective**: Implement the internal communication system for distribution companies.

**Backend Changes**:
- [ ] Create OperationsMessage model:
  - company_id (required)
  - sender_id (required, ref: User)
  - messageType (enum: "announcement", "meeting", "emergency", "task", "priority")
  - title (required)
  - content (required)
  - priority (enum: "normal", "high", "critical")
  - audienceType (enum: "all", "team", "individual")
  - audience (array of user IDs or team IDs)
  - deliveryChannels (array: "in-app", "email", "sms", "push")
  - requiresAcknowledgment (boolean)
  - acknowledgmentDeadline (Date)
  - acknowledgments (array of { userId, acknowledgedAt })
  - status (enum: "draft", "sent", "scheduled")
  - scheduledFor (Date)
  - createdAt
  - updatedAt
- [ ] Create Operations Center endpoints:
  - POST /api/operations/messages (Company Super Admin, Admin)
  - GET /api/operations/messages (Company Super Admin, Admin)
  - GET /api/operations/messages/:id (Company Super Admin, Admin)
  - PUT /api/operations/messages/:id (Company Super Admin, Admin)
  - DELETE /api/operations/messages/:id (Company Super Admin, Admin)
  - POST /api/operations/messages/:id/acknowledge (Company Super Admin, Admin)
  - GET /api/operations/messages/templates (Company Super Admin, Admin)
  - POST /api/operations/messages/templates (Company Super Admin, Admin)
- [ ] Create MessageTemplate model for reusable message templates
- [ ] Implement message delivery service:
  - In-app notifications via Socket.IO
  - Email delivery (existing service)
  - SMS delivery (new service, optional)
  - Push notifications via FCM (existing service)
- [ ] Implement message tracking and analytics
- [ ] Add company isolation to all Operations Center endpoints

**Frontend Changes**:
- [ ] Create Operations Center UI components:
  - Message composition interface
  - Audience selection tools
  - Message template management
  - Message history and tracking dashboard
  - Real-time message delivery status
  - Analytics dashboard
- [ ] Add Operations Center to navigation (Company Super Admin, Admin)
- [ ] Implement real-time message updates via Socket.IO
- [ ] Add message acknowledgment UI
- [ ] Add message search and filtering

**Testing**:
- [ ] Message delivery tests
- [ ] Message acknowledgment tests
- [ ] Message template tests
- [ ] Company isolation tests for Operations Center
- [ ] Real-time message update tests

### Phase 5: Company Management
**Status**: Not Started
**Duration**: 4-5 weeks

**Objective**: Implement comprehensive company management features for Platform Owner and Company Super Admins.

**Backend Changes**:
- [ ] Implement company subscription management:
  - Subscription tier management
  - Subscription billing (integration with payment gateway)
  - Subscription renewal and expiration
  - Usage tracking (users, states, etc.)
- [ ] Implement company settings management:
  - Company-specific configuration
  - Branding customization (logo, colors)
  - Feature flags per company
  - Notification preferences per company
- [ ] Implement company analytics:
  - Company-wide usage metrics
  - User activity analytics
  - System performance metrics per company
  - Custom report generation
- [ ] Implement company onboarding:
  - Company registration workflow
  - Initial setup wizard
  - Data import tools
  - Training resources
- [ ] Implement company audit logs:
  - Track all company-level changes
  - Admin activity logging
  - Configuration change history

**Frontend Changes**:
- [ ] Create Platform Owner company management dashboard:
  - Company list and search
  - Company creation wizard
  - Company details and settings
  - Subscription management
  - Company analytics dashboard
  - Audit log viewer
- [ ] Create Company Super Admin management dashboard:
  - Company settings
  - User management
  - Admin management
  - Company analytics
  - Audit log viewer
- [ ] Add company onboarding flow
- [ ] Add subscription billing UI (Platform Owner)
- [ ] Add company branding customization UI

**Testing**:
- [ ] Company management tests
- [ ] Subscription management tests
- [ ] Company settings tests
- [ ] Company analytics tests
- [ ] Audit logging tests

### Phase 6: Enterprise Features
**Status**: Not Started
**Duration**: 6-8 weeks

**Objective**: Implement advanced enterprise features for multi-tenant platform.

**Backend Changes**:
- [ ] Implement multi-language support per company:
  - Language preference per company
  - Translation management
  - Localized content delivery
- [ ] Implement company-specific AI models:
  - Per-company AI training data isolation
  - Custom AI model configuration
  - Company-specific AI insights
- [ ] Implement advanced company analytics:
  - Cross-company comparison (Platform Owner only)
  - Predictive analytics per company
  - Custom report builder
  - Data export functionality
- [ ] Implement company API access:
  - API key management per company
  - API rate limiting per company
  - API usage analytics
  - API documentation
- [ ] Implement company integrations:
  - Third-party service integrations per company
  - Webhook management per company
  - Custom integration configuration
- [ ] Implement company backup and restore:
  - Automated backups per company
  - On-demand backup
  - Data restore functionality
  - Backup retention policies

**Frontend Changes**:
- [ ] Add multi-language UI components
- [ ] Add AI model configuration UI (Company Super Admin)
- [ ] Add advanced analytics dashboard
- [ ] Add API management UI (Company Super Admin)
- [ ] Add integration management UI (Company Super Admin)
- [ ] Add backup and restore UI (Platform Owner, Company Super Admin)

**Testing**:
- [ ] Multi-language tests
- [ ] AI model isolation tests
- [ ] Advanced analytics tests
- [ ] API access tests
- [ ] Integration tests
- [ ] Backup and restore tests

## Short-Term (0-3 months)

### Performance & Reliability
- [ ] Add comprehensive test suite (unit tests, integration tests)
- [ ] Implement API caching with Redis
- [ ] Add request validation with Joi or Zod
- [ ] Optimize database queries with indexes
- [ ] Implement rate limiting per user
- [ ] Add logging and monitoring (e.g., Winston, Datadog)

### User Experience
- [ ] Improve mobile responsiveness
- [ ] Add dark mode
- [ ] Improve loading states and skeleton loaders
- [ ] Add more detailed error messages
- [ ] Implement infinite scroll for history

### Features
- [ ] Add outage confirmation from multiple users
- [ ] Implement user feedback system
- [ ] Add ability to share outage information
- [ ] Improve AI chat assistant with more context

## Medium-Term (3-6 months)

### Integration
- [ ] Integrate with KEDCO's official API (if available)
- [ ] Add SMS notifications for users without smartphones
- [ ] Integrate with weather APIs to correlate outages with weather
- [ ] Add calendar integration for scheduled maintenance

### Analytics
- [ ] Advanced outage analytics dashboard
- [ ] Predictive outage modeling improvements
- [ ] User behavior analytics
- [ ] Monthly/weekly summary reports

### Features
- [ ] Multi-language support (Hausa, Yoruba, Igbo)
- [ ] Community forums/discussion boards
- [ ] Energy usage tracking (if smart meter data available)
- [ ] Bill estimator tool
- [ ] Backup generator recommendations

## Long-Term (6+ months)

### Scalability
- [ ] Microservices architecture
- [ ] Multi-region deployment
- [ ] CDN for static assets
- [ ] Horizontal scaling for Socket.IO

### Advanced Features
- [ ] IoT integration for real-time voltage monitoring
- [ ] AI-powered demand response
- [ ] Peer-to-peer energy sharing platform
- [ ] Integration with solar panel systems
- [ ] Virtual power plant capabilities

### Expansion
- [ ] Expand to other DISCOs in Nigeria
- [ ] Expand to other African countries
- [ ] White-label solution for other utilities

## Technical Debt

- [ ] Refactor monolithic backend into modules
- [ ] Add TypeScript support
- [ ] Improve error handling and recovery
- [ ] Document all API endpoints with OpenAPI/Swagger
- [ ] Set up CI/CD pipeline
- [ ] Add database migration system
