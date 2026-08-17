LITHA Backend
===================

This folder contains the LITHA backend services (Express + MongoDB).

Quick start

1. Copy `.env.example` to `.env` and fill credentials.
2. Install dependencies:

```
cd backend
npm install
```

3. Run in development:

```
npm run dev
```

APIs

- `/api/auth` - authentication routes
- `/api/reports` - reporting routes
- `/api/predictions` - predictions API (run/list)
- `/api/ai` - AI assistant endpoints

Notes

- Gemini AI integration requires `GEMINI_API_KEY`.
- Prediction scheduler runs in development by default; control with `ENABLE_PREDICTIONS`.
