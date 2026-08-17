# Architectural Decisions

This document records important architectural decisions made during LITHA development.

## 1. MERN Stack Selection
**Date**: Early development
**Status**: Accepted

### Context
We needed a modern, full-stack JavaScript framework for building a real-time power monitoring system.

### Decision
We chose the MERN stack:
- **MongoDB**: Flexible schema for location hierarchy and power data
- **Express**: Minimalist web framework for API
- **React**: Component-based UI with excellent ecosystem
- **Node.js**: Non-blocking I/O for real-time features

### Consequences
- Single language (JavaScript/TypeScript) across stack
- Large community and ecosystem
- Real-time support with Socket.IO
- Good performance for our use case

## 2. Socket.IO for Real-Time Features
**Date**: Early development
**Status**: Accepted

### Context
We needed real-time updates for power status changes and notifications.

### Decision
We use Socket.IO for all real-time communication:
- Room-based messaging (user, feeder, ward, lga, state)
- Automatic reconnection
- Fallback to polling if WebSockets aren't available

### Consequences
- Low-latency updates
- Simplified real-time logic
- Increased server resource usage
- Added complexity for connection management

## 3. DashboardProvider for Shared State
**Date**: Performance optimization phase
**Status**: Accepted

### Context
Multiple components were fetching the same data independently, causing duplicate API calls and inconsistent state.

### Decision
We created the `DashboardProvider` React Context:
- Centralizes data fetching for power status and analytics
- Manages Socket.IO listeners in one place
- Shares state with all consuming components via `useDashboard()` hook

### Consequences
- Reduced API calls
- Consistent state across components
- Simplified component logic
- Single point of failure for dashboard data

## 4. Cached Analytics Snapshots for Dashboard Refreshes
**Date**: After dashboard analytics timeout investigation
**Status**: Accepted

### Context
The dashboard analytics endpoint was recomputing grid-wide metrics on every refresh, and Socket.IO power updates could trigger repeated analytics requests from the `DashboardProvider`.

### Decision
We keep `powerStatusUpdated` as the immediate real-time channel, but:
- The backend now caches a short-lived shared analytics snapshot for grid-wide metrics
- User-specific analytics fields are layered on top of the cached snapshot per request
- The frontend refreshes analytics in the background with debounce/cooldown behavior instead of re-requesting immediately on every socket event

### Consequences
- Prevents repeated full-grid analytics recalculation during bursts of live updates
- Preserves the `DashboardProvider` single-source-of-truth architecture
- Keeps live feeder status updates immediate while analytics remain responsive under load

## 5. Express 5.x with Named Wildcards
**Date**: After Express 5 upgrade
**Status**: Accepted

### Context
Express 5 changed wildcard route syntax.

### Decision
We use named wildcards (`*path`) instead of anonymous wildcards (`*`).

### Consequences
- Fixes server crashes from wildcard routes
- Better parameter handling
- Explicit route definitions

## 6. Explicit Database Name in Connection String
**Date**: After wrong DB connection issue
**Status**: Accepted

### Context
We needed to ensure we always connect to the correct database (`test`).

### Decision
- Always include `/test` in the MongoDB connection string
- Added diagnostic logging on startup to verify database name
- Added runtime validation to fail fast if connected to wrong DB

### Consequences
- No more accidental connections to wrong DB
- Easier debugging of connection issues
- Clear visibility into DB state on startup

## 6. Location Hierarchy: Country → State → LGA → Ward → Feeder
**Date**: Early data model design
**Status**: Accepted

### Context
We needed to model the Nigerian power distribution network accurately.

### Decision
We implemented a strict geographic hierarchy:
- Country (Nigeria, implicit)
- State (e.g., Kano)
- LGA (e.g., Dala)
- Ward (e.g., Sabon Gari)
- Feeder (e.g., Dala 11kV Feeder)

### Consequences
- Accurate representation of KEDCO's network
- Easy to filter data by geographic region
- Room-based notifications scale with hierarchy
- More complex data model

## 7. JWT for Authentication
**Date**: Early auth design
**Status**: Accepted

### Context
We needed stateless authentication for our API.

### Decision
We use JSON Web Tokens (JWT):
- Tokens stored in client (localStorage or similar)
- Token attached to `Authorization` header
- Server validates token on each protected request

### Consequences
- Stateless auth (no server-side session storage)
- Good scalability
- Token revocation requires additional logic
- Token size can be large with many claims

## 8. bcryptjs for Password Hashing
**Date**: Early auth design
**Status**: Accepted

### Context
We needed to securely store user passwords.

### Decision
We use bcryptjs with 10 salt rounds:
- Pre-save hook hashes password automatically
- `matchPassword` method compares passwords

### Consequences
- Secure password storage
- Slow hashing algorithm resistant to brute force
- Slightly increased registration/login latency (acceptable tradeoff)

## 9. OpenStreetMap with Leaflet for Maps
**Date**: Early UI design
**Status**: Accepted

### Context
We needed an interactive map to display feeders and outages.

### Decision
We chose OpenStreetMap with Leaflet:
- Open-source and free
- Good performance
- React integration with react-leaflet
- Custom markers and popups

### Consequences
- No licensing costs
- Good customization options
- Requires self-hosting or using OSM tile servers

## 10. Firebase for Push Notifications
**Date**: Notification feature design
**Status**: Accepted

### Context
We needed push notifications for mobile and web.

### Decision
We use Firebase Cloud Messaging (FCM):
- Cross-platform support
- Reliable delivery
- Integration with Socket.IO for in-app fallback

### Consequences
- Dependency on Google Firebase
- Good notification delivery rates
- Additional setup for Firebase project

## 11. Role-Based Access Control (RBAC)
**Date**: User system design
**Status**: Accepted

### Context
We needed different permissions for users, admins, and super-admins.

### Decision
Three roles:
- `user`: Can view status, submit reports
- `admin`: Can manage assigned feeders, update status
- `super-admin`: Full system access

### Consequences
- Clear permission boundaries
- Middleware (`protect`, `authorize`) enforces access
- Easy to add new roles later
