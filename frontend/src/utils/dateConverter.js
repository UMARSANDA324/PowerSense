/**
 * Convert ISO 8601 datetime string to HTML datetime-local format
 * ISO: "2026-06-30T23:02:00.000Z" → datetime-local: "2026-06-30T23:02"
 * 
 * CRITICAL: datetime-local expects LOCAL time (no timezone info)
 * We extract the local time equivalent from the ISO timestamp
 */
export const isoToDatetimeLocal = (isoString) => {
  try {
    if (!isoString) return "";
    
    // Parse ISO string into Date object
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    
    // Format as YYYY-MM-DDTHH:mm using local time
    // Using toISOString() gives UTC, so we need to adjust for local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("[DateConverter] Error converting ISO to datetime-local:", error);
    return "";
  }
};

/**
 * Convert HTML datetime-local format to ISO 8601 string
 * datetime-local: "2026-06-30T23:02" → ISO: "2026-06-30T23:02:00.000Z"
 * 
 * CRITICAL: datetime-local is in LOCAL time, we convert to ISO (UTC)
 */
export const datetimeLocalToIso = (datetimeLocal) => {
  try {
    if (!datetimeLocal) return null;
    
    // datetime-local format: "2026-06-30T23:02"
    // Parse it as a local date
    const date = new Date(datetimeLocal);
    if (isNaN(date.getTime())) return null;
    
    // Convert to ISO string (UTC)
    return date.toISOString();
  } catch (error) {
    console.error("[DateConverter] Error converting datetime-local to ISO:", error);
    return null;
  }
};

/**
 * Validate if a string is a valid datetime-local format
 */
export const isValidDatetimeLocal = (value) => {
  if (!value || typeof value !== "string") return false;
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  return pattern.test(value);
};

/**
 * Validate if a string is a valid ISO 8601 datetime
 */
export const isValidISO = (value) => {
  if (!value || typeof value !== "string") return false;
  try {
    const date = new Date(value);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Format an ISO string for display (readable time)
 * "2026-06-30T23:02:00.000Z" → "Jun 30, 2026 11:02 PM"
 */
export const formatISOForDisplay = (isoString) => {
  try {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (error) {
    console.error("[DateConverter] Error formatting ISO for display:", error);
    return "";
  }
};

/**
 * Get milliseconds remaining from ISO datetime string to now
 */
export const getTimeRemaining = (isoString) => {
  try {
    if (!isoString) return 0;
    const targetDate = new Date(isoString);
    if (isNaN(targetDate.getTime())) return 0;
    return Math.max(0, targetDate.getTime() - Date.now());
  } catch (error) {
    console.error("[DateConverter] Error calculating time remaining:", error);
    return 0;
  }
};

/**
 * Format last updated time for display:
 * - <1min: "Just Now"
 * - Today: "Today • 2:15 PM"
 * - Yesterday: "Yesterday • 7:42 PM"
 * - Older: "13 Jul 2026 • 9:18 AM"
 */
export const formatLastUpdated = (isoString) => {
    try {
        if (!isoString) return "";
        
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "";
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        // Less than 1 minute
        if (diffMins < 1) {
            return "Just Now";
        }
        
        // Format time part (e.g., "2:15 PM")
        const timePart = date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
        
        // Check if date is today
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        
        if (isToday) {
            return `Today • ${timePart}`;
        }
        
        // Check if date is yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();
        
        if (isYesterday) {
            return `Yesterday • ${timePart}`;
        }
        
        // Older date: format like "13 Jul 2026 • 9:18 AM"
        const datePart = date.toLocaleDateString([], {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
        
        return `${datePart} • ${timePart}`;
    } catch (error) {
        console.error("[DateConverter] Error formatting last updated:", error);
        return "";
    }
};

export default {
    isoToDatetimeLocal,
    datetimeLocalToIso,
    isValidDatetimeLocal,
    isValidISO,
    formatISOForDisplay,
    getTimeRemaining,
    formatLastUpdated
};
