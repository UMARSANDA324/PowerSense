import api from "./api";

/**
 * Client-side analytics event tracker.
 * Dispatches non-blocking product events to the backend.
 */
export const trackEvent = async (eventName, metadata = {}) => {
  try {
    let sessionId = sessionStorage.getItem("nikola_analytics_session");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("nikola_analytics_session", sessionId);
    }

    await api.post("/platform-analytics/events", {
      eventName,
      feature: "report",
      sessionId,
      metadata
    });
  } catch (err) {
    // Fail-soft: silent catch so user experience is never impacted
    console.debug("[Analytics] Track event silent error:", err?.message);
  }
};
