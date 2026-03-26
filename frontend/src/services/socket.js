import { io } from "socket.io-client";

/**
 * Socket.io connection setup.
 *
 * In development: Vite dev proxy forwards socket requests to localhost:5000.
 * In production (separate services): VITE_API_URL must be set to the backend URL.
 * In production (single service): "/" connects to the same origin.
 */
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, "");
  }
  // Development falls back to proxy; production single-service uses same origin
  return import.meta.env.DEV ? "http://localhost:5000" : "/";
};

const SOCKET_URL = getSocketUrl();

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: true,
  transports: ["websocket", "polling"], // Try WebSocket first; fall back to polling
});

export default socket;
