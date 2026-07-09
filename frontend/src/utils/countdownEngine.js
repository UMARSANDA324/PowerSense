const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?([+-]\d{2}:?\d{2}|Z)?)?$/i;

const normalizeTime = (time) => {
  if (time instanceof Date) {
    return isNaN(time.getTime()) ? null : time;
  }

  if (typeof time === "number") {
    const date = new Date(time);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof time === "string") {
    const trimmed = time.trim();
    if (!trimmed) return null;
    if (!ISO_DATE_REGEX.test(trimmed)) return null;
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const formatCountdown = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

/**
 * Create a countdown object from current time and target time
 * 
 * CRITICAL NOTES:
 * - targetTime must be in ISO format (UTC)
 * - Handles invalid/null targets gracefully
 * - Returns consistent object structure
 */
export const createCountdown = ({ currentTime, targetTime }) => {
  const now = normalizeTime(currentTime instanceof Function ? currentTime() : currentTime) || new Date();
  const target = normalizeTime(targetTime);

  // Logging removed — fires every second per component instance

  if (!target) {
    return {
      remainingMs: 0,
      remainingSeconds: 0,
      remainingMinutes: 0,
      remainingHours: 0,
      remainingDays: 0,
      formatted: "No schedule available",
      isExpired: true,
      currentTime: now,
      targetTime: null,
      valid: false,
    };
  }

  const remainingMs = Math.max(0, target.getTime() - now.getTime());
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingDays = Math.floor(remainingHours / 24);

  const result = {
    remainingMs,
    remainingSeconds,
    remainingMinutes,
    remainingHours,
    remainingDays,
    formatted: formatCountdown(remainingMs),
    isExpired: remainingMs <= 0,
    currentTime: now,
    targetTime: target,
    valid: true,
  };

  // Debug: Log remaining time
  if (remainingMs > 0 && remainingMs < 3000) {
    // Log when close to expiration
    console.log(`[COUNTDOWN NEAR EXPIRY] ${remainingMs}ms remaining (${remainingSeconds}s)`);
  }

  return result;
};

export const isValidCountdownTarget = (value) => Boolean(normalizeTime(value));
