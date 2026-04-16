/* eslint-disable no-undef */
// Give the service worker access to Firebase Messaging.
// Note: Using compat version for easier script injection in public folder.
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// These values are hardcoded here because this file is served statically from the public folder.
firebase.initializeApp({
  apiKey: "AIzaSyDRQUlCtiEmX79TKfwPxyI_gLbCGcS3GqA",
  authDomain: "powersense-d48a7.firebaseapp.com",
  projectId: "powersense-d48a7",
  storageBucket: "powersense-d48a7.firebasestorage.app",
  messagingSenderId: "161586697486",
  appId: "1:161586697486:web:c9d0343a11363648bb735f"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || "PowerSense Alert";
  const notificationOptions = {
    body: payload.notification?.body || "New update received",
    icon: "/vite.svg", // Using vite.svg since logo.png doesn't exist
    badge: "/vite.svg",
    data: payload.data,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.');
  event.notification.close();

  // Open the app or a specific URL
  event.waitUntil(
    clients.openWindow('/')
  );
});
