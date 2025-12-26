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
import { DialogProvider } from './components/ui/Dialog';

onMessage(messaging, (payload) => {
  const title = payload.notification?.title || payload.data?.title || "DateU";
  const body = payload.notification?.body || payload.data?.body;
  const icon = payload.notification?.icon || "/icons/icon-192.png";

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: icon,
    });
  }
  // In-app toast
  toast(title, {
    description: body,
    duration: 6000,
  });
  window.dispatchEvent(new Event("new-notification"));
});

// Register the service worker so the app is installable/offline
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <DialogProvider>
          <App />
          <Toaster position="top-center" richColors />
          <NotificationPrompt />
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)