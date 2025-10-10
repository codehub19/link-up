import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Protected from './components/Protected'
import SetupGuard from './components/SetupGuard'
import { useAuth } from './state/AuthContext'
import ProfileWizard from './pages/setup/Profile'
import Legal from './pages/legal/Legal'
import Terms from './pages/setup/Terms'
import Support from './pages/legal/Support'
import Pricing from './pages/legal/Pricing'
import About from './pages/legal/About'
import CommunityGuidelines from './pages/legal/CommunityGuidelines'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'

/* Lazy dashboard/admin pages (unchanged) */
const DashboardChooser = lazy(() => import('./pages/dashboard/DashboardChooser'))
const MalePlans = lazy(() => import('./pages/dashboard/male/Plans'))
const MaleMatches = lazy(() => import('./pages/dashboard/male/MaleMatches'))
const MaleEditProfile = lazy(() => import('./pages/dashboard/male/EditProfile'))
const FemaleRound = lazy(() => import('./pages/dashboard/female/MatchingRound'))
const FemaleConnections = lazy(() => import('./pages/dashboard/female/Connections'))
const FemaleEditProfile = lazy(() => import('./pages/dashboard/female/EditProfile'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const RoundsAdmin = lazy(() => import('./pages/admin/RoundsAdmin'))
const PaymentsAdmin = lazy(() => import('./pages/admin/PaymentsAdmin'))
const CurationAdmin = lazy(() => import('./pages/admin/CurationAdmin'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const PlansAdmin = lazy(() => import('./pages/admin/PlansAdmin'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const ChatPage = lazy(() => import('./pages/dashboard/chat/ChatPage'))

export default function App() {
  const { profile } = useAuth()

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/support" element={<Support />} />
        <Route path="/legal/legal" element={<Legal />} />
        <Route path="/legal/terms" element={<Terms />} />
        <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        {/* <Route path="/legal/cookies" element={<Cookies />} /> */}
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />

        {/* Unified wizard */}
        <Route
          path="/setup/profile"
          element={
            <Protected requireProfile={false}>
              <SetupGuard>
                <ProfileWizard />
              </SetupGuard>
            </Protected>
          }
        />

        {/* Redirect any legacy step URLs to the unified wizard */}
        <Route path="/setup/gender" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/details" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/interests" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/q1" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/q2" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/bio" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/photos" element={<Navigate to="/setup/profile" replace />} />
        <Route path="/setup/terms" element={<Navigate to="/setup/profile" replace />} />

        {/* Dashboard root chooser */}
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
        <Route
          path="/dashboard/chat"
          element={
            <Protected>
              <ChatPage />
            </Protected>
          }
        />

        {/* Payments */}
        <Route path="/pay" element={<Protected><PaymentPage /></Protected>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/home" element={<Protected><AdminHome /></Protected>} />
        <Route path="/admin/rounds" element={<Protected><RoundsAdmin /></Protected>} />
        <Route path="/admin/payments" element={<Protected><PaymentsAdmin /></Protected>} />
        <Route path="/admin/curation" element={<Protected><CurationAdmin /></Protected>} />
        <Route path="/admin/plans" element={<Protected><PlansAdmin /></Protected>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}