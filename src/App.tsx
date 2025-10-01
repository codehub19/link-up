import { Navigate, Route, Routes } from 'react-router-dom'
import React, { Suspense, lazy } from 'react'
import Home from './pages/Home'
import Gender from './pages/setup/Gender'
import Profile from './pages/setup/Profile' // Wizard entry (Looking For → Interests → Photos → Details)
import { useAuth } from './state/AuthContext'
import Protected from './components/Protected'

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

        {/* Onboarding */}
        <Route
          path="/setup/gender"
          element={
            <Protected requireProfile={false}>
              <Gender />
            </Protected>
          }
        />
        <Route
          path="/setup/profile"
          element={
            <Protected requireProfile={false}>
              {/* Ensure gender exists before showing the wizard */}
              {!profile?.gender ? <Navigate to="/setup/gender" replace /> : <Profile />}
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
        <Route path="/pay" element={<PaymentPage />} />
        <Route path="/pay/:planId" element={<PaymentPage />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/rounds" element={<RoundsAdmin />} />
        <Route path="/admin/payments" element={<PaymentsAdmin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/curation" element={<CurationAdmin />} />
        <Route path="/admin/plans" element={<PlansAdmin />} />

        {/* Catch-all at the very end */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}