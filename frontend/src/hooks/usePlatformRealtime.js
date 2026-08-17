import { useEffect, useState } from "react";
import socket from "../services/socket";

const PLATFORM_EVENTS = [
  "company.created",
  "company.updated",
  "company.suspended",
  "company.activated",
  "user.created",
  "superadmin.created",
  "admin.created",
  "report.created",
  "notification.created",
  "platform.health.changed",
  "dashboard.metric.changed"
];

export const usePlatformRealtime = (onEvent) => {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    const handlers = PLATFORM_EVENTS.map((eventName) => {
      const handler = (event) => onEvent?.(eventName, event);
      socket.on(eventName, handler);
      return [eventName, handler];
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      handlers.forEach(([eventName, handler]) => socket.off(eventName, handler));
    };
  }, [onEvent]);

  return { connected };
};