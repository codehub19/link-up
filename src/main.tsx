import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { AuthProvider } from './state/AuthContext'
import { Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

// Register the service worker so the app is installable/offline
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)