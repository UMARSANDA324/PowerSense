import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { updateProfile } from "./authService";

const isFirebaseConfigValid = !!import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_PROJECT_ID !== "your_project_id";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app, messaging;

if (isFirebaseConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const requestNotificationPermission = async () => {
  if (!isFirebaseConfigValid || !messaging) {
    console.warn("FCM: Firebase config is invalid or messaging not initialized.");
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission state:", permission);
    
    if (permission === "granted") {
      // Register service worker explicitly for better reliability
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log("Service Worker registered with scope:", registration.scope);
      
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        if (token) {
          console.log("FCM Token generated successfully:", token);
          // Send token to backend
          await updateProfile({ fcmToken: token, deviceType: "web" });
          return token;
        } else {
          console.warn("Failed to get FCM token.");
        }
      }
    } else {
      console.warn("Notification permission denied or dismissed.");
    }
  } catch (error) {
    console.error("Error in requestNotificationPermission:", error);
  }
  return null;
};

export const onMessageListener = (callback) => {
  if (!isFirebaseConfigValid || !messaging) {
    return () => {};
  }
  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    if (callback) callback(payload);
  });
};

export default messaging;
