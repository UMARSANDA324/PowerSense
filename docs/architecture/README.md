# Architecture Overview

LITHA uses a modern MERN stack architecture with real-time capabilities.

## Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express 5.x**: Web framework
- **MongoDB with Mongoose**: Database and ODM
- **Socket.IO**: Real-time communication
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **Helmet**: Security headers
- **Compression**: Response compression
- **Morgan**: HTTP logging
- **Express Rate Limit**: API rate limiting
- **Firebase Admin**: Push notifications

### Frontend
- **React 19.x**: UI library
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **Socket.IO Client**: Real-time client
- **Leaflet / React Leaflet**: Interactive maps
- **Lucide React**: Icons
- **Firebase**: Push notifications
- **Tailwind CSS**: Styling

## High-Level Architecture

```
┌─────────────────┐
│  Frontend (Vite)│
│  - React        │
│  - Tailwind     │
│  - Leaflet      │
└────────┬────────┘
         │ HTTP + WebSocket
         ▼
┌──────────────────────┐
│  Backend (Express 5) │
│  - REST API          │
│  - Socket.IO Server  │
│  - Auth Middleware   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────┐
│  MongoDB Atlas   │
│  - Users         │
│  - Locations     │
│  - Power Status  │
│  - Power Logs    │
└──────────────────┘
```

## Directory Structure

### Root
```
LITHA/
├── backend/
├── frontend/
└── docs/
```

### Backend Directory
```
backend/
├── config/          # DB config
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Mongoose models
│   └── Location/    # Location hierarchy models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utilities
├── scripts/         # Data import/processing
└── server.js        # Entry point
```

### Frontend Directory
```
frontend/
├── src/
│   ├── components/  # Reusable components
│   ├── context/     # React Context providers
│   ├── hooks/       # Custom hooks
│   ├── pages/       # Page components
│   ├── routes/      # Route definitions
│   ├── services/    # API and socket services
│   └── utils/       # Utilities
└── vite.config.js
```

## Frontend Architecture

### DashboardProvider
The `DashboardProvider` is a central React Context that:
- Fetches and shares power status data
- Manages Socket.IO listeners for real-time updates
- Provides analytics data to components
- Reduces duplicate API calls and socket connections
- Keeps analytics refreshes in the background with debounced/throttled updates
- Relies on a cached backend analytics snapshot for shared grid-wide metrics

Components should use the `useDashboard()` hook to access shared data.

### App Component
- Wraps everything with `AuthProvider` and `DashboardProvider`
- Manages Socket.IO rooms for user, feeder, ward, lga, state
- Handles notifications (in-app + Firebase push)
- Renders navbar, routes, and bottom nav

## Backend Architecture

### Server Entry (server.js)
- Connects to MongoDB
- Initializes Express app and Socket.IO server
- Sets up middleware (CORS, helmet, compression, etc.)
- Mounts API routes
- Serves static frontend in production
- Handles graceful shutdowns

### API Route Structure
- `/api/auth`: Authentication endpoints (register, login, forgot password, etc.)
- `/api/admin`: Admin-only endpoints
- `/api/location`: Location hierarchy (states, LGAs, wards, feeders)
- `/api/power`: Power status and history
- `/api/reports`: Incident reports
- `/api/notifications`: Notification management
- `/api/predictions`: Outage predictions
- `/api/ai`: AI chat assistant

## Real-Time Architecture

### Socket.IO Rooms
When a user logs in, they join:
- `user_{userId}`: User-specific notifications
- `feeder_{feederId}`: Feeder-specific updates
- `ward_{wardId}`: Ward-level updates
- `lga_{lgaId}`: LGA-level updates
- `state_{stateId}`: State-level updates

### Real-Time Events
- `powerStatusUpdated`: Emitted when a feeder's status changes
- `newNotification`: Emitted when a new notification is created

## Database Connection
- Uses Mongoose connection pooling
- Connection timeout and retry logic
- Diagnostic logging on startup (DB name, collections, user count)
- Graceful shutdown handling

## CORS Configuration
- Allows production origins: `https://LITHA-1.onrender.com`, `https://LITHA-2.onrender.com`
- Allows localhost in development
- Supports credentials for auth cookies/tokens
