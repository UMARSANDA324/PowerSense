import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import socket from "../services/socket";

const DashboardContext = createContext(null);
const DASHBOARD_REFRESH_COOLDOWN_MS = 30000;
const DASHBOARD_REFRESH_DEBOUNCE_MS = 1500;
const DASHBOARD_REQUEST_TIMEOUT_MS = 30000;

export const DashboardProvider = ({ children }) => {
  const { user } = useAuth();
  const userFeeder = user?.assignedFeeders?.[0]?.name || user?.feeder;
  const userFeederId = user?.assignedFeeders?.[0]?._id;

  // --- STATE ---
  const [powerStatus, setPowerStatus] = useState({
    status: "on",
    isActive: true,
    lastUpdated: "Fetching...",
    expectedOutageTime: null,
    expectedRestoreTime: null,
    maintenanceStart: null,
    maintenanceEnd: null,
    reason: null,
    nextScheduledOutage: null,
    estimatedNextOutage: null,
    maintenanceReason: null,
    updatedBy: null,
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [powerError, setPowerError] = useState(null);
  const abortControllerRef = useRef(null);
  const isFetchingPowerRef = useRef(false);
  const isFetchingDashboardRef = useRef(false);
  const dashboardAbortControllerRef = useRef(null);
  const dashboardRefreshTimerRef = useRef(null);
  const lastDashboardRefreshRef = useRef(0);
  const dashboardDataRef = useRef(null);

  useEffect(() => {
    dashboardDataRef.current = dashboardData;
  }, [dashboardData]);

  useEffect(() => {
    setDashboardData(null);
    setPowerStatus((current) => ({ ...current, lastUpdated: "Fetching..." }));
    lastDashboardRefreshRef.current = 0;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (dashboardAbortControllerRef.current) dashboardAbortControllerRef.current.abort();
  }, [user?.companyId]);

  // --- REFRESH POWER STATUS ---
  const refreshPowerStatus = useCallback(async () => {
    if (isFetchingPowerRef.current) return;
    isFetchingPowerRef.current = true;
    setPowerError(null);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = userFeeder 
        ? `power/status?feeder=${encodeURIComponent(userFeeder)}` 
        : "power/status";
      const response = await api.get(url, { signal: controller.signal });
      setPowerStatus(response.data);
      setPowerError(null);
    } catch (error) {
      if (error.name === "CanceledError" || error.name === "AbortError") {
        return;
      }
      console.error("Dashboard: Failed to refresh power status:", error);
      setPowerError("Unable to reach the backend. Please check your connection.");
      setPowerStatus((prev) => ({ ...prev, lastUpdated: "Error loading" }));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isFetchingPowerRef.current = false;
      setIsLoading(false);
    }
  }, [userFeeder, userFeederId]);

  // --- REFRESH DASHBOARD DATA ---
  const refreshDashboardData = useCallback(async ({ force = false, background = false } = {}) => {
    if (!user || isFetchingDashboardRef.current) return;

    const now = Date.now();
    if (!force && now - lastDashboardRefreshRef.current < DASHBOARD_REFRESH_COOLDOWN_MS) {
      return;
    }

    isFetchingDashboardRef.current = true;
    lastDashboardRefreshRef.current = now;

    const shouldShowLoader = !background || !dashboardDataRef.current;
    if (shouldShowLoader) {
      setIsDashboardLoading(true);
    }

    if (dashboardAbortControllerRef.current) {
      dashboardAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    dashboardAbortControllerRef.current = controller;

    try {
      const response = await api.get("ai/analytics", {
        signal: controller.signal,
        timeout: DASHBOARD_REQUEST_TIMEOUT_MS,
      });
      if (response.data && response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      if (error.name === "CanceledError" || error.name === "AbortError") {
        return;
      }
      console.error("Dashboard: Failed to refresh analytics:", error);
    } finally {
      if (dashboardAbortControllerRef.current === controller) {
        dashboardAbortControllerRef.current = null;
      }
      isFetchingDashboardRef.current = false;
      if (shouldShowLoader) {
        setIsDashboardLoading(false);
      }
    }
  }, [user]);

  const scheduleDashboardRefresh = useCallback((delay = DASHBOARD_REFRESH_DEBOUNCE_MS) => {
    if (dashboardRefreshTimerRef.current) {
      clearTimeout(dashboardRefreshTimerRef.current);
    }

    dashboardRefreshTimerRef.current = setTimeout(() => {
      dashboardRefreshTimerRef.current = null;
      refreshDashboardData({ background: true });
    }, delay);
  }, [refreshDashboardData]);

  // --- INITIAL FETCH ---
  useEffect(() => {
    refreshPowerStatus();
    if (user) {
      refreshDashboardData({ force: true });
    } else {
      setDashboardData(null);
      setIsDashboardLoading(false);
    }
  }, [refreshPowerStatus, refreshDashboardData, user]);

  // --- REAL-TIME SOCKET LISTENER ---
  useEffect(() => {
    const handleStatusUpdate = (update) => {
      const isSuperAdmin = user?.role === "super-admin" || user?.role === "company-super-admin";
      const isTargetFeeder = !userFeeder || update.feederId === userFeederId || update.feederId === user.feeder || update.feederName === userFeeder;

      if (isSuperAdmin || isTargetFeeder) {
        setPowerStatus((prev) => ({
          ...prev,
          ...update,
          status: update.status || (update.isActive ? "on" : "off"),
          isActive: update.isActive,
          lastUpdated: "Just Now",
        }));
        // Power status should update instantly, while analytics refresh in the background.
        scheduleDashboardRefresh();
      }
    };

    socket.on("powerStatusUpdated", handleStatusUpdate);
    return () => socket.off("powerStatusUpdated", handleStatusUpdate);
  }, [scheduleDashboardRefresh, user?.role, userFeeder, userFeederId, user?.feeder]);

  // --- CLEANUP ---
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (dashboardAbortControllerRef.current) {
        dashboardAbortControllerRef.current.abort();
        dashboardAbortControllerRef.current = null;
      }
      if (dashboardRefreshTimerRef.current) {
        clearTimeout(dashboardRefreshTimerRef.current);
        dashboardRefreshTimerRef.current = null;
      }
    };
  }, []);

  const value = {
    powerStatus,
    isLoading,
    powerError,
    refreshPowerStatus,
    dashboardData,
    isDashboardLoading,
    refreshDashboardData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
