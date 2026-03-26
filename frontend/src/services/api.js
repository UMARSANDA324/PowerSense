import axios from "axios";

// Use Vite environment variables instead of hardcoded paths.
// If VITE_API_URL is available, use it (and append /api). Otherwise fallback to /api (for local dev proxy or single deployment).
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL;
  if (envUrl) {
    // Ensuring no trailing slash to correctly append /api
    return `${envUrl.replace(/\/$/, "")}/api`;
  }
  return "/api";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token automatically on every request
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
