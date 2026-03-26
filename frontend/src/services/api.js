import axios from "axios";

/**
 * Determine the API base URL.
 *
 * DEPLOYMENT MODES:
 *
 * A) Separate frontend & backend services on Render (RECOMMENDED):
 *    - Set VITE_API_URL in Render's frontend environment variables
 *    - e.g. VITE_API_URL=https://powersense-backend.onrender.com
 *    - The "/api" prefix is appended automatically.
 *
 * B) Single Render service (backend serves frontend build):
 *    - Leave VITE_API_URL unset or empty.
 *    - Relative "/api" will work because frontend and backend share the same domain.
 *
 * IMPORTANT: Vite only exposes env vars prefixed with VITE_ to the browser bundle.
 * REACT_APP_* variables DO NOT work in Vite — only VITE_* does.
 */
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl && envUrl.trim() !== "") {
    // Strip trailing slash, then append /api
    return `${envUrl.trim().replace(/\/$/, "")}/api`;
  }

  // In production without VITE_API_URL, use a relative URL.
  // This only works if the frontend and backend are served from the same domain.
  if (import.meta.env.PROD) {
    console.warn(
      "[PowerSense] VITE_API_URL is not set. " +
        "If your frontend and backend are on separate Render services, " +
        "you MUST set VITE_API_URL in your frontend environment variables on Render."
    );
  }

  return "/api";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies if any (required for some auth flows)
});

// Attach JWT auth token automatically on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor — handle 401s uniformly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Redirect to login if not already there
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
