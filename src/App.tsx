import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Protected from './components/Protected'
import SetupGuard from './components/SetupGuard'
import { useAuth } from './state/AuthContext'
import ProfileWizard from './pages/setup/Profile'
import Legal from './pages/legal/Legal'
import TermsOfService from './pages/legal/TermsOfService'
import Support from './pages/legal/Support'
import Pricing from './pages/legal/Pricing'
import About from './pages/legal/About'
import CommunityGuidelines from './pages/legal/CommunityGuidelines'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import Security from './pages/legal/Security'
import RoundsPage from './pages/marketing/RoundsPage'
import SuccessStoriesPage from './pages/marketing/SuccessStoriesPage'
import DownloadPage from './pages/marketing/DownloadPage'
import CareersPage from './pages/marketing/CareersPage'
import BlogPage from './pages/marketing/BlogPage'
import ContactPage from './pages/marketing/ContactPage'
import MaleRound from './pages/dashboard/male/MatchingRounds'
import RoundMatchesAdmin from './pages/admin/RoundMatchesAdmin'
import NotificationsPage from './pages/dashboard/Notifications'
import SendNotificationAdmin from './pages/admin/SendNotification'
import NotificationsAdminList from './pages/admin/AdminNotification'
import LoadingHeart from './components/LoadingHeart'
import MatchesPage from './pages/dashboard/Matches'
import ProfileView from './pages/dashboard/ProfileView'
import AdminGuard from './pages/admin/AdminGuard'

/* Lazy dashboard/admin pages (unchanged) */
const DashboardChooser = lazy(() => import('./pages/dashboard/DashboardChooser'))
const MalePlans = lazy(() => import('./pages/dashboard/male/Plans'))
const MaleProfile = lazy(() => import('./pages/dashboard/male/Profile'))
const FemaleRound = lazy(() => import('./pages/dashboard/female/MatchingRound'))
const FemaleProfile = lazy(() => import('./pages/dashboard/female/Profile'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const RoundsAdmin = lazy(() => import('./pages/admin/RoundsAdmin'))
const PaymentsAdmin = lazy(() => import('./pages/admin/PaymentsAdmin'))
const CurationAdmin = lazy(() => import('./pages/admin/CurationAdmin'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const PlansAdmin = lazy(() => import('./pages/admin/PlansAdmin'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const ReferralsAdmin = lazy(() => import('./pages/admin/ReferralsAdmin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
import { Outlet } from 'react-router-dom'
const ChatPage = lazy(() => import('./pages/dashboard/chat/ChatPage'))
const CollegeIdVerification = lazy(() => import('./pages/admin/CollegeIdVerification'))
const RequestsAdmin = lazy(() => import('./pages/admin/RequestsAdmin'))
const EditProfile = lazy(() => import('./pages/dashboard/EditProfile'))
const SettingsPage = lazy(() => import('./pages/dashboard/Settings'))
const SupportHistory = lazy(() => import('./pages/dashboard/SupportHistory'))

import AnimatedRoutesLayout from './components/layout/AnimatedRoutesLayout'

export default function App() {
  const { loading, profile } = useAuth();

  // Capture referral code from URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      sessionStorage.setItem('referralCode', ref.toUpperCase())
    }
  }, [])

  if (loading) return <div className="loading-page-wrapper">
    <LoadingHeart size={72} />
  </div>;
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AnimatedRoutesLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/legal/legal" element={<Legal />} />
          <Route path="/legal/terms" element={<TermsOfService />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          {/* <Route path="/legal/cookies" element={<Cookies />} /> */}
          <Route path="/legal/guidelines" element={<CommunityGuidelines />} />
          <Route path="/community-guidelines" element={<Navigate to="/legal/guidelines" replace />} />
          <Route path="/legal/security" element={<Security />} />

          {/* Marketing / Footer Pages */}
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/success-stories" element={<SuccessStoriesPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/contact" element={<ContactPage />} />

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
          <Route path="/setup/looking-for" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/height" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/details" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/interests" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/preferences" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/q1" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/q2" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/bio" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/photos" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/relationship-goals" element={<Navigate to="/setup/profile" replace />} />
          <Route path="/setup/deal-breakers" element={<Navigate to="/setup/profile" replace />} />
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
            path="/dashboard/male/rounds"
            element={
              <Protected>
                {profile?.gender === 'male' ? <MaleRound /> : <Navigate to="/dashboard" replace />}
              </Protected>
            }
          />
          <Route
            path="/dashboard/male/profile"
            element={
              <Protected>
                {profile?.gender === 'male' ? <MaleProfile /> : <Navigate to="/dashboard" replace />}
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
            path="/dashboard/female/profile"
            element={
              <Protected>
                {profile?.gender === 'female' ? <FemaleProfile /> : <Navigate to="/dashboard" replace />}
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

          <Route
            path="/dashboard/matches"
            element={
              <Protected>
                <MatchesPage />
              </Protected>
            }
          />

          <Route
            path="/dashboard/notifications"
            element={
              <Protected>
                <NotificationsPage />
              </Protected>
            }
          />

          <Route
            path="/dashboard/edit-profile"
            element={
              <Protected>
                <EditProfile />
              </Protected>
            }
          />

          <Route
            path="/dashboard/settings"
            element={
              <Protected>
                <SettingsPage />
              </Protected>
            }
          />

          <Route
            path="/dashboard/support-history"
            element={
              <Protected>
                <SupportHistory />
              </Protected>
            }
          />

          <Route path="/profile/:uid" element={<ProfileView />} />

          {/* Payments */}
          <Route path="/pay" element={<Protected><PaymentPage /></Protected>} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Routes with Layout */}
          <Route element={
            <Protected>
              <AdminGuard>
                <AdminLayout>
                  <Outlet />
                </AdminLayout>
              </AdminGuard>
            </Protected>
          }>
            <Route path="/admin/home" element={<AdminDashboard />} />
            <Route path="/admin/rounds" element={<RoundsAdmin />} />
            <Route path="/admin/requests" element={<RequestsAdmin />} />
            <Route path="/admin/payments" element={<PaymentsAdmin />} />
            <Route path="/admin/curation" element={<CurationAdmin />} />
            <Route path="/admin/plans" element={<PlansAdmin />} />
            <Route path="/admin/rounds/:roundId/matches" element={<RoundMatchesAdmin />} />
            <Route path="/admin/college-id-verification" element={<CollegeIdVerification />} />
            <Route path="/admin/send-notification" element={<SendNotificationAdmin />} />
            <Route path="/admin/notifications" element={<NotificationsAdminList />} />
            <Route path="/admin/referrals" element={<ReferralsAdmin />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}