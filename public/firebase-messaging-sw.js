importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBSVBM_8FFzkfCnqXugQtTQ93eUAtf6OTo",
  authDomain: "linkup-dc86a.firebaseapp.com",
  projectId: "linkup-dc86a",
  messagingSenderId: "773468471767",
  appId: "1:773468471767:web:89346bb4f9dd7752518b92"
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage(function(payload) {
  // Defensive: fallback in case notification property is missing
  const notification = payload.notification || {};
  self.registration.showNotification(
    notification.title || "Notification",
    {
      body: notification.body || "",
      icon: notification.icon || "/logo192.png", // fallback icon
      data: payload.data || {},
      // tag: notification.tag, // Optional, to group notifications
    }
  );
});