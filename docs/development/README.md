# Development Guide

This guide will help you set up and develop LITHA locally.

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd LITHA
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install backend and frontend dependencies
npm run install-all
```

### 3. Set up environment variables

#### Backend `.env` file (in `backend/` directory or root)

```env
NODE_ENV=development
PORT=5002
MONGO_URI=mongodb://LITHA_User:1220501@ac-ag7fv7v-shard-00-00.rarxrdl.mongodb.net:27017,ac-ag7fv7v-shard-00-01.rarxrdl.mongodb.net:27017,ac-ag7fv7v-shard-00-02.rarxrdl.mongodb.net:27017/test?ssl=true&replicaSet=atlas-8olqds-shard-0&authSource=admin&appName=Cluster0
MONGODB_URI=mongodb://LITHA_User:1220501@ac-ag7fv7v-shard-00-00.rarxrdl.mongodb.net:27017,ac-ag7fv7v-shard-00-01.rarxrdl.mongodb.net:27017,ac-ag7fv7v-shard-00-02.rarxrdl.mongodb.net:27017/test?ssl=true&replicaSet=atlas-8olqds-shard-0&authSource=admin&appName=Cluster0
JWT_SECRET=LITHA_secret_123
NODE_ENV=development
```

#### Frontend `.env` file (in `frontend/` directory)

```env
VITE_API_URL=http://localhost:5002/api
VITE_SOCKET_URL=http://localhost:5002
```

### 4. Start development servers

#### Option 1: Start both servers together (from root)

```bash
npm run dev
```

#### Option 2: Start servers separately

**Backend**:
```bash
cd backend
npm run dev
```

**Frontend**:
```bash
cd frontend
npm run dev
```

The backend will be available at `http://localhost:5002` and the frontend at `http://localhost:5173`.

## Development Scripts

### Root scripts
- `npm run install-all`: Install all dependencies (backend + frontend)
- `npm run dev`: Start both backend and frontend dev servers
- `npm run dev:client`: Start only frontend dev server
- `npm run dev:server`: Start only backend dev server
- `npm run build`: Build frontend for production
- `npm start`: Start backend in production mode

### Backend scripts
- `npm start`: Start in production mode
- `npm run prod`: Start in production mode (Windows)
- `npm run dev`: Start with nodemon (auto-reload)
- `npm run geocode:kano-wards`: Geocode Kano wards
- `npm run import:kano-feeders`: Import Kano feeders

### Frontend scripts
- `npm run dev`: Start Vite dev server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build
- `npm run test:countdown`: Test countdown engine

## Code Style

### Backend
- ES modules (import/export)
- Async/await for asynchronous code
- Mongoose models for data access
- Express routers for API endpoints
- Controllers for business logic

### Frontend
- React 19 with hooks
- Functional components only
- Tailwind CSS for styling
- Context API for state management (AuthProvider, DashboardProvider)
- Custom hooks for reusable logic
- Socket.IO client for real-time updates

## Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Backend port | No (default: 5000) |
| `MONGO_URI` | MongoDB connection string | Yes |
| `MONGODB_URI` | Fallback for MONGO_URI | Yes |
| `JWT_SECRET` | JWT secret key | Yes |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | No |
| `ENABLE_PREDICTIONS` | Enable prediction scheduler | No |
| `SEED_DATABASE` | Seed database on startup | No |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_SOCKET_URL` | Socket.IO server URL | Yes |

## Database Setup

LITHA uses MongoDB Atlas. The connection string explicitly specifies the `test` database.

### Diagnostic Logging
On backend startup, the database connection will log:
- Connected cluster
- Database name
- Connection state
- Collections list
- User count
- Sample user (if any)

## API Design

### REST API Conventions
- Use plural resource names (e.g., `/api/users`)
- Use appropriate HTTP methods:
  - `GET`: Retrieve data
  - `POST`: Create data
  - `PUT`: Update data
  - `DELETE`: Delete data
- Return JSON responses with appropriate status codes
- Protect sensitive routes with `protect` middleware
- Use `authorize` middleware for role-based access control

### Response Format
Success response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error response:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Testing

### Frontend Tests
```bash
cd frontend
npm run test:countdown
```

### Manual Testing
- Use Postman or similar tools to test API endpoints
- Test different user roles (user, admin, super-admin)
- Verify real-time updates with multiple browser tabs

## Deployment

### Production Build
```bash
npm run build
```

### Deploy to Render
- Backend: Deploy `backend/` directory
- Frontend: Deploy `frontend/dist/` directory (or serve from backend)
- Set environment variables in Render dashboard
- Configure CORS origins for production domains

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Verify MONGO_URI has correct username/password
   - Check IP whitelist in MongoDB Atlas
   - Ensure connection string includes `/test` database

2. **CORS Errors**
   - Verify FRONTEND_URL includes your frontend origin
   - Check for trailing slashes in URLs

3. **Express 5 Path Errors**
   - Use named wildcards: `app.get('*path', ...)` instead of `app.get('*', ...)`

4. **Socket.IO Connection Issues**
   - Use `127.0.0.1` instead of `localhost` in development
   - Verify CORS origins include socket URL

5. **Duplicate API Calls**
   - Use DashboardProvider for shared state
   - Avoid fetching data in multiple components
