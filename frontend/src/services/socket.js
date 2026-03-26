import { io } from "socket.io-client";

// In production, fallback to root ("/") if VITE_API_URL is missing
// In development, fallback to localhost:5000
const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "development" ? "http://localhost:5000" : "/");

const socket = io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: true,
});

export default socket;
