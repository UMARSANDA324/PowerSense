import axios from "axios";

/**
 * Determine the API base URL dynamically based on environment variables.
 * 
 * VITE_API_URL Configuration in Render:
 * - Go to your Render Dashboard -> Select your Frontend Frontend Web Service.
 * - Under 'Environment', add a variable: VITE_API_URL
 * - Set the value to your Backend URL, e.g., https://your-backend.onrender.com (no trailing slash).
 */
const getBaseUrl = () => {
  // Use VITE_API_URL if defined, otherwise empty string
  const rawUrl = import.meta.env.VITE_API_URL || "";
  let resolvedUrl = "";

  if (rawUrl) {
    // Strip any trailing slashes from the raw URL to avoid double slashes, then append '/api/'
    resolvedUrl = `${rawUrl.trim().replace(/\/+$/, "")}/api/`;
  } else {
    // Fallback if VITE_API_URL is not set:
    // In development, assume localhost:5000
    // In production, assume same-domain relative path
    resolvedUrl = import.meta.env.DEV ? "http://localhost:5000/api/" : "/api/";
  }

  console.log(`[API Config] Initializing Axios with baseURL: ${resolvedUrl}`);
  return resolvedUrl;
};

// Configure Axios instance
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, 
});

// Add request interceptor: attach JWT token dynamically
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

// Add response interceptor: handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error is due to an unauthorized/expired token
    if (error.response?.status === 401) {
      console.warn("[API] 401 Unauthorized detected. Clearing session.");
      
      // Clear auth tokens
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Dispatch custom event so React components (like AuthProvider) can immediately re-render or redirect safely
      window.dispatchEvent(new Event("unauthorized"));
      
      // Fallback redirect if the app doesn't handle the event internally
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
