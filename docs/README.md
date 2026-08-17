# Nikola Documentation

Welcome to the Nikola documentation! This is your comprehensive guide to the Nikola power monitoring and notification system.

## Table of Contents

- [Architecture Overview](architecture/README.md)
- [Enterprise Architecture](architecture/enterprise.md)
- [Roles and Permissions](architecture/roles-permissions.md)
- [Tenant Isolation and Data Security](architecture/tenant-isolation-security.md)
- [Runtime Context and Operations Architecture](architecture/runtime-context-operations.md)
- [Operational Scope and Administrative Hierarchy](architecture/operational-scope-admin-hierarchy.md)
- [Enterprise Governance, Workflow and Audit Platform](architecture/enterprise-governance-workflow-audit.md)
- [Product Analytics & Growth Architecture](EIP-07-PRODUCT-ANALYTICS.md)
- [Feature Flag & Controlled Rollout System](EIP-08-FEATURE-FLAGS.md)
- [Features](features/README.md)
- [Geocoding System](features/geocoding.md)
- [Data Models](data/README.md)
- [Development Guide](development/README.md)
- [Architectural Decisions](decisions/README.md)
- [Roadmap](roadmap/README.md)
- [KEDCO Integration](kedco/README.md)

## AI Development Rules

All development on Nikola must follow these rules:

1. **Read docs/README.md first** - Always start here to understand the project structure and conventions.
2. **Read only the documentation relevant to the task** - Stay focused on the specific module or feature you're working on.
3. **Understand existing code before modifying it** - Take time to read and comprehend the current implementation.
4. **Never duplicate existing logic** - Reuse existing services, utilities, and patterns.
5. **Reuse existing services and utilities** - Favor composition over duplication.
6. **Maintain the current architecture** - Keep changes consistent with the existing system design.
7. **Prefer scalable solutions** - Design with growth in mind.
8. **Preserve backward compatibility** - Avoid breaking changes whenever possible.
9. **Do not remove features unless requested** - Only remove functionality when explicitly asked.
10. **Optimize for performance** - Consider performance implications of your changes.
11. **Use Socket.IO as the primary real-time mechanism** - For live updates and notifications.
12. **Avoid unnecessary API calls** - Use caching, debouncing, and the DashboardProvider where appropriate.
13. **Follow established database relationships** - Adhere to the existing data model hierarchy.
14. **Update documentation after implementation** - Keep docs in sync with code changes.
15. **Add new documentation whenever a new subsystem is introduced** - Document new features as you build them.

## Project Overview

Nikola (inspired by Nikola Tesla) is an enterprise power monitoring and grid intelligence platform designed for multi-tenant electricity distribution utilities and end-users.

- **Real-time Power Status Monitoring**: Track feeder statuses live.
- **Predictive Outage Notifications**: AI-powered predictions about upcoming outages.
- **Interactive Maps**: Visualize feeders and outages on OpenStreetMap.
- **AI Chat Assistant**: Get help and information about power status.
- **Multi-role Access**: Support for users, admins, and super-admins.
