import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import AppRoutes from "./routes/AppRoutes";
import Toast from "./components/Toast";
import socket from "./services/socket";
import { useAuth } from "./context/AuthContext";
import { DashboardProvider } from "./context/DashboardProvider";
import { requestNotificationPermission, onMessageListener } from "./services/firebaseMessaging";

function App() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      socket.auth = { token: localStorage.getItem("token") };
      if (!socket.connected) socket.connect();
      const assignedFeederNames = (user.assignedFeeders || [])
        .map((feederItem) => (typeof feederItem === "string" ? feederItem : feederItem?.name))
        .filter(Boolean);
      const assignedFeederIds = (user.assignedFeeders || [])
        .map((feederItem) => (typeof feederItem === "string" ? null : feederItem?._id))
        .filter(Boolean);

      // Join rooms for real-time notifications
      socket.emit("join", {
        userId: user._id,
        role: user.role,
        feeder: user.feeder,
        feeders: assignedFeederNames,
        feederIds: assignedFeederIds,
        ward: user.ward,
        lga: user.lga,
        state: user.state,
      });

      // Request Firebase notification permission and token
      requestNotificationPermission();

      // Listen for foreground Firebase messages
      const unsubscribeFCM = onMessageListener((payload) => {
        console.log("Push received in foreground:", payload);
        setNotifications((prev) => [...prev, {
          id: Date.now(),
          title: payload.notification.title,
          message: payload.notification.body
        }]);
      });

      // Named handler — required so socket.off removes ONLY this listener,
      // not the one registered in Navbar.jsx or any other component.
      const handleNewNotification = (notification) => {
        setNotifications((prev) => [...prev, {
          id: Date.now(),
          title: notification.title,
          message: notification.message
        }]);
      };

      const handlePowerStatusUpdated = (data) => {
        console.log("Power status updated in grid:", data);
      };

      socket.on("newNotification", handleNewNotification);
      socket.on("powerStatusUpdated", handlePowerStatusUpdated);

      return () => {
        socket.off("newNotification", handleNewNotification);
        socket.off("powerStatusUpdated", handlePowerStatusUpdated);
        if (unsubscribeFCM) unsubscribeFCM();
      };
    }

    if (socket.connected) socket.disconnect();
  }, [user]);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const isPlatformRoute = window.location.pathname.startsWith("/platform-owner");
  const isPlatformOwner = user && user.role === "platform-owner";
  const hideGlobalNav = isPlatformOwner || isPlatformRoute;

  return (
    <div className="flex flex-col min-h-screen">
      {!hideGlobalNav && <Navbar />}

      {/* Notifications overlay */}
      <div className="fixed top-0 right-0 p-4 z-50 pointer-events-none space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <Toast
              title={n.title}
              message={n.message}
              onClose={() => removeNotification(n.id)}
            />
          </div>
        ))}
      </div>

      <div className={hideGlobalNav ? "flex-1" : "flex-1 pt-[72px] pb-20"}>
        <DashboardProvider>
          <AppRoutes />
        </DashboardProvider>
      </div>
      
      {!hideGlobalNav && <BottomNav />}
    </div>
  );
}

export default App;
