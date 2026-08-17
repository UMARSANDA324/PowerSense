import { invalidatePlatformAnalyticsCache } from "./platformAnalyticsService.js";
import { invalidateExecutiveIntelligenceCache } from "./executiveIntelligenceService.js";

let socketServer = null;

export const setPlatformSocketServer = (io) => {
  socketServer = io;
};

const normalizeId = (value) => value?.toString?.() || null;

/**
 * Publishes a small, tenant-aware event to the existing Socket.IO server.
 * Platform owners receive global events; tenant users receive only their company events.
 */
export const publishPlatformEvent = ({ type, companyId = null, data = {}, affects = [] }) => {
  if (!type) return;

  const event = {
    type,
    companyId: normalizeId(companyId),
    data,
    timestamp: new Date().toISOString()
  };

  invalidatePlatformAnalyticsCache(affects);
  invalidateExecutiveIntelligenceCache();

  if (!socketServer) return;

  socketServer.to("role_platform-owner").emit(type, event);
  if (event.companyId) {
    socketServer.to(`company_${event.companyId}`).emit(type, event);
  }
};