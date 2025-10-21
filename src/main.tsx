import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { AuthProvider } from './state/AuthContext'
import { Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import { messaging } from "./firebase";
import { onMessage } from "firebase/messaging";
import { NotificationPrompt } from './components/NotificationPrompt'
import { toast } from 'sonner';

onMessage(messaging, (payload) => {
  if (Notification.permission === "granted") {
    new Notification(payload.notification?.title || "Notification", {
      body: payload.notification?.body,
      icon: payload.notification?.icon,
    });
  }
  // In-app toast
  toast(payload.notification?.title || "Notification", {
    description: payload.notification?.body,
    duration: 6000,
    icon: payload.notification?.icon,
  });
  window.dispatchEvent(new Event("new-notification"));
});

// Register the service worker so the app is installable/offline
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" richColors />
        <NotificationPrompt />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)