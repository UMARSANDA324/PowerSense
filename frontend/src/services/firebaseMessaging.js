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
    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();
    console.log("Notification permission state:", permission);
    
    if (permission === "granted") {
      console.log("Permission granted. Registering service worker...");
      if ('serviceWorker' in navigator) {
        // Register or get existing service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log("Service Worker active with scope:", registration.scope);
      
        console.log("Fetching FCM token...");
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        if (token) {
          console.log("FCM Token generated successfully:", token);
          // Send token to backend to associate with user profile
          try {
            await updateProfile({ fcmToken: token, deviceType: "web" });
            console.log("FCM Token synced with backend.");
          } catch (syncError) {
            console.error("Failed to sync FCM token with backend:", syncError);
          }
          return token;
        } else {
          console.warn("No FCM token retrieved. Check VAPID key or browser support.");
        }
      } else {
        console.warn("Service workers are not supported in this browser.");
      }
    } else {
      console.warn("Notification permission denied/dismissed.");
    }
  } catch (error) {
    console.error("Critical error in FCM setup:", error);
  }
  return null;
};

export const onMessageListener = (callback) => {
  if (!isFirebaseConfigValid || !messaging) {
    console.warn("onMessageListener: Messaging not initialized.");
    return () => {};
  }
  
  console.log("Setting up foreground message listener...");
  return onMessage(messaging, (payload) => {
    console.log("Foreground push notification received:", payload);
    if (callback) callback(payload);
  });
};

export default messaging;
