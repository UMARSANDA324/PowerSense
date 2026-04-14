import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import AppRoutes from "./routes/AppRoutes";
import Toast from "./components/Toast";
import socket from "./services/socket";
import { useAuth } from "./context/AuthContext";
import { requestNotificationPermission, onMessageListener } from "./services/firebaseMessaging";

function App() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      // Join rooms for real-time notifications
      socket.emit("join", {
        userId: user._id,
        feeder: user.feeder,
        ward: user.ward,
        lga: user.lga,
        state: user.state,
      });

      // Request Firebase notification permission and token
      requestNotificationPermission();

      // Listen for foreground Firebase messages
      const unsubscribeFCM = onMessageListener((payload) => {
        console.log("Push received in foreground:", payload);
        // We only show FCM toast if Socket.io hasn't already shown it
        // For simplicity, we can just show it, but Socket.io is usually faster
        setNotifications((prev) => [...prev, {
          id: Date.now(),
          title: payload.notification.title,
          message: payload.notification.body
        }]);
      });

      // Listen for new notifications via Socket.io
      socket.on("newNotification", (notification) => {
        setNotifications((prev) => [...prev, {
          id: Date.now(),
          title: notification.title,
          message: notification.message
        }]);
      });

      // Listen for power status updates (only for UI state, not toasts)
      socket.on("powerStatusUpdated", (data) => {
        // We can use this to trigger global UI refreshes if needed, 
        // but toasts are handled by "newNotification"
        console.log("Power status updated in grid:", data);
      });

      return () => {
        socket.off("newNotification");
        socket.off("powerStatusUpdated");
        if (unsubscribeFCM) unsubscribeFCM();
      };
    }
  }, [user]);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

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

      <div className="flex-1 pt-[72px] pb-20">
        <AppRoutes />
      </div>
      <BottomNav />
    </div>
  );
}

export default App;