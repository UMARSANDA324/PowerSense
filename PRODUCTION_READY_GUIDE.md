# PowerSense Production Deployment Guide 🚀

This document summarizes the changes made during the Audit and prep phase to ensure the system is ready for real users.

## 1. Audit Findings & Fixes
- **CRITICAL SECURITY**: Fixed a vulnerability in `authController.js` where users could register as Admins by passing a `role` in the request body. All registrations now default to `"user"`.
- **Security Headers**: Integrated `helmet.js` to protect against common web vulnerabilities (XSS, Sniffing, etc.).
- **Rate Limiting**: Added `express-rate-limit` to block brute-force attempts on sensitive API routes.
- **Performance**: Replaced heavy `/location/all` calls with targeted `/states`, `/lgas`, and `/feeders` endpoints to save bandwidth and speed up the UI.
- **Database integrity**: Applied compound unique indexes to prevent duplicate location naming collisions.

## 2. Infrastructure Configuration
The application is now prepared for **Render**, **Heroku**, or a custom **VPS**.

### Required Environment Variables (.env)
Ensure your production environment (e.g. Render Dashboard) has these keys set:
- `NODE_ENV=production`
- `PORT=5000`
- `MONGO_URI` (Your MongoDB Atlas connection)
- `JWT_SECRET` (Strong random string)
- `EMAIL_SERVICE` (e.g., Gmail)
- `EMAIL_USER` / `EMAIL_PASS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL` 
- `FIREBASE_PRIVATE_KEY` (Ensure it is wrapped in quotes if it has newlines)
- `FRONTEND_URL` (The final URL of your live site for CORS)

## 3. Build & Run
We have added a unified buildup script at the root:

```bash
# To install all dependencies and build frontend
npm run deploy

# To start the server (Serving both frontend and backend)
npm start
```

## 4. Serving the App
In production mode (`NODE_ENV=production`), the backend will automatically serve the static files from `frontend/dist`. You only need to point your hosting provider's build command to:
`npm run deploy` 
And the start command to:
`npm start`

---
**Audit Status: COMPLETED**
- Performance: Optimized
- Security: Hardened
- Scalability: Ready
