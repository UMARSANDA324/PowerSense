# Features

This document describes all major features of LITHA.

## User Authentication & Authorization

### Registration
- Users can register with full name, email, password, and optional phone
- Public registration enforces `user` role
- Email is normalized (lowercase, trimmed) and validated
- Password must be at least 6 characters
- Password is hashed using bcryptjs

### Login
- Email/password authentication
- JWT token generation
- Last login timestamp updated
- Account deactivation check

### Password Reset
- Forgot password flow with 6-digit OTP sent via email
- OTP expires after 10 minutes
- OTP is hashed before storage
- Password reset after OTP verification

### Roles
- **super-admin**: Full system access, can manage locations and all users
- **admin**: Can manage assigned feeders, update power status
- **user**: Can view power status for their location, submit reports

## Power Status Monitoring

### Current Status
- Real-time feeder status (on/off/maintenance)
- Expected outage/restore times
- Maintenance windows
- Last updated timestamp
- Visual countdown timer to next event

### Status History
- Historical power status changes
- Filtered by user's location/feeder
- Shows timestamp and who updated the status

## Real-Time Updates

### Socket.IO Integration
- Automatic status updates without page refresh
- Room-based notifications (user, feeder, ward, lga, state)
- Events:
  - `powerStatusUpdated`: Feeder status change
  - `newNotification`: New notification available

### Notifications
- **In-app notifications**: Toast messages in UI
- **Push notifications**: Firebase Cloud Messaging (FCM)
- **Email notifications**: (Optional, configured per user)
- User can set notification preferences

## Interactive Map

### OpenStreetMap Integration
- Leaflet map showing feeders
- Feeder markers colored by status
- Click markers to view details
- Pan and zoom controls

## Location Management

### Hierarchy
- Country → State → LGA → Ward → Feeder
- Super-admins can create/edit/delete locations
- Ward changes auto-update user's feeder

## AI Features

### AI Chat Assistant
- Natural language interface for power information
- Answers questions about outages, status, etc.
- Context-aware responses

### Predictive Outage Analysis
- AI-powered predictions of upcoming outages
- Estimated next outage time
- Risk scoring for business users

## Business Mode
- Optional business mode for commercial users
- Business type classification
- Risk score based on business type
- Enhanced outage alerts

## Incident Reporting
- Users can submit power outage reports
- Reports include location and details
- Admins can review and respond to reports

## Dashboard Analytics
- Overview of power status trends
- Feeder health metrics
- Outage history visualization
- AI-powered insights

## Admin Features
- Manage assigned feeders
- Update power status
- View reports from users
- Manage users (super-admin)
- Manage location hierarchy (super-admin)
