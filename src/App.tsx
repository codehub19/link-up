import { Navigate, Route, Routes } from 'react-router-dom'
import React, { Suspense, lazy } from 'react'
import Home from './pages/Home'
import Gender from './pages/setup/Gender'
import Profile from './pages/setup/Profile' // Wizard entry (Looking For → Interests → Photos → Details)
import { useAuth } from './state/AuthContext'
import Protected from './components/Protected'
import SetupGuard from './components/SetupGuard'  // ← add this import

// Lazy dashboard/admin routes (trimmed here for brevity)
const MalePlans = lazy(() => import('./pages/dashboard/male/Plans'))
const MaleMatches = lazy(() => import('./pages/dashboard/male/MaleMatches'))
const MaleEditProfile = lazy(() => import('./pages/dashboard/male/EditProfile'))
const FemaleRound = lazy(() => import('./pages/dashboard/female/MatchingRound'))
const FemaleConnections = lazy(() => import('./pages/dashboard/female/Connections'))
const FemaleEditProfile = lazy(() => import('./pages/dashboard/female/EditProfile'))
const DashboardChooser = lazy(() => import('./pages/dashboard/DashboardChooser'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const RoundsAdmin = lazy(() => import('./pages/admin/RoundsAdmin'))
const PaymentsAdmin = lazy(() => import('./pages/admin/PaymentsAdmin'))
const CurationAdmin = lazy(() => import('./pages/admin/CurationAdmin'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const PlansAdmin = lazy(() => import('./pages/admin/PlansAdmin'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))

export default function App() {
  const { profile } = useAuth()

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Onboarding (blocked if already complete) */}
        <Route
          path="/setup/gender"
          element={
            <Protected requireProfile={false}>
              <SetupGuard>
                <Gender />
              </SetupGuard>
            </Protected>
          }
        />
        <Route
          path="/setup/profile"
          element={
            <Protected requireProfile={false}>
              <SetupGuard>
                {/* Ensure gender exists before showing the wizard */}
                {!profile?.gender ? <Navigate to="/setup/gender" replace /> : <Profile />}
              </SetupGuard>
            </Protected>
          }
        />

        {/* Dashboard entry decides male/female */}
        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardChooser />
            </Protected>
          }
        />

        {/* Male */}
        <Route
          path="/dashboard/plans"
          element={
            <Protected>
              {profile?.gender === 'male' ? <MalePlans /> : <Navigate to="/dashboard" replace />}
            </Protected>
          }
        />
        <Route
          path="/dashboard/matches"
          element={
            <Protected>
              {profile?.gender === 'male' ? <MaleMatches /> : <Navigate to="/dashboard" replace />}
            </Protected>
          }
        />
        <Route
          path="/dashboard/edit-profile"
          element={
            <Protected>
              {profile?.gender === 'male' ? <MaleEditProfile /> : <Navigate to="/dashboard" replace />}
            </Protected>
          }
        />

        {/* Female */}
        <Route
          path="/dashboard/round"
          element={
            <Protected>
              {profile?.gender === 'female' ? <FemaleRound /> : <Navigate to="/dashboard" replace />}
            </Protected>
          }
        />
        <Route
          path="/dashboard/connections"
          element={
            <Protected>
              {profile?.gender === 'female' ? <FemaleConnections /> : <Navigate to="/dashboard" replace />}
            </Protected>
          }
        />
        <Route
          path="/dashboard/female/edit-profile"
          element={
            <Protected>
              {profile?.gender === 'female' ? <FemaleEditProfile /> : <Navigate to="/dashboard" replace />}
            </Protected>
          }
        />

        {/* Payments */}
        <Route
          path="/pay"
          element={
            <Protected>
              <PaymentPage />
            </Protected>
          }
        />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <Protected>
              <AdminHome />
            </Protected>
          }
        />
        <Route
          path="/admin/rounds"
          element={
            <Protected>
              <RoundsAdmin />
            </Protected>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <Protected>
              <PaymentsAdmin />
            </Protected>
          }
        />
        <Route
          path="/admin/curation"
          element={
            <Protected>
              <CurationAdmin />
            </Protected>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <Protected>
              <PlansAdmin />
            </Protected>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}