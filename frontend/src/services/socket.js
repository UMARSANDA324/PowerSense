import { io } from "socket.io-client";

/**
 * Socket.io singleton connection.
 *
 * IMPORTANT: This module exports a SINGLE shared socket instance.
 * All components must import from here — never call io() directly in a component.
 * Creating multiple io() instances causes duplicate connections and HTTP 400 errors
 * when the server restarts (stale session IDs).
 *
 * URL resolution:
 *  - VITE_API_URL set  → use it (production / staging)
 *  - DEV mode          → connect directly to localhost:5002 (Vite proxy handles /socket.io WS)
 *  - Production        → relative path "/" (same-origin, single-service deploy)
 */
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, "");
  }
  return import.meta.env.DEV ? "http://127.0.0.1:5002" : "/";
};

const SOCKET_URL = getSocketUrl();

const socket = io(SOCKET_URL, {
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
  withCredentials: true,
  // App.jsx connects only after a logged-in user provides the JWT.
  autoConnect: false,
  // Transport order: try WebSocket first, fall back to polling.
  // Matching the server config avoids upgrade negotiation failures.
  transports: ["websocket", "polling"],
  // Reconnection settings — prevents accumulation of stale sessions after server restarts.
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,       // wait 1s before first retry
  reconnectionDelayMax: 10000,   // cap retry interval at 10s
  randomizationFactor: 0.5,
  // Timeout for each connection attempt
  timeout: 20000,
});

// Debug logging in development only
if (import.meta.env.DEV) {
  socket.on("connect", () =>
    console.log("[Socket] Connected:", socket.id)
  );
  socket.on("disconnect", (reason) =>
    console.warn("[Socket] Disconnected:", reason)
  );
  socket.on("connect_error", (err) =>
    console.error("[Socket] Connection error:", err.message)
  );
}

export default socket;
