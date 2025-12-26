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
// Handle background push messages
// Handle background push messages
messaging.onBackgroundMessage(function (payload) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = data.title || notification.title || "DateU";
  const body = data.body || notification.body || "New message";

  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  return self.registration.showNotification(title, {
    body: body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png', // Small white icon for status bar
    image: data.image || null, // Optional large image
    vibrate: [200, 100, 200],
    requireInteraction: true, // Keeps notification until user interacts
    data: {
      url: data.url || data.click_action || '/dashboard/notifications'
    }
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});