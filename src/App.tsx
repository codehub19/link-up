import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Protected from './components/Protected'
import SetupGuard from './components/SetupGuard'
import { useAuth } from './state/AuthContext'
import LoadingHeart from './components/LoadingHeart'
import AdminGuard from './pages/admin/AdminGuard'
import IncomingCall from './components/IncomingCall'

/* Pages are loaded on demand so the landing page downloads less JavaScript */
const ProfileWizard = lazy(() => import('./pages/setup/Profile'))
const Legal = lazy(() => import('./pages/legal/Legal'))
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'))
const Support = lazy(() => import('./pages/legal/Support'))
const Pricing = lazy(() => import('./pages/legal/Pricing'))
const About = lazy(() => import('./pages/legal/About'))
const CommunityGuidelines = lazy(() => import('./pages/legal/CommunityGuidelines'))
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'))
const Security = lazy(() => import('./pages/legal/Security'))
const RoundsPage = lazy(() => import('./pages/marketing/RoundsPage'))
const SuccessStoriesPage = lazy(() => import('./pages/marketing/SuccessStoriesPage'))
const DownloadPage = lazy(() => import('./pages/marketing/DownloadPage'))
const CareersPage = lazy(() => import('./pages/marketing/CareersPage'))
const JobApplicationPage = lazy(() => import('./pages/marketing/JobApplicationPage'))
const CertificatePage = lazy(() => import('./pages/marketing/CertificatePage'))
const BlogPage = lazy(() => import('./pages/marketing/BlogPage'))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'))
const MaleRound = lazy(() => import('./pages/dashboard/male/MatchingRounds'))
const RoundMatchesAdmin = lazy(() => import('./pages/admin/RoundMatchesAdmin'))
const NotificationsPage = lazy(() => import('./pages/dashboard/Notifications'))
const SendNotificationAdmin = lazy(() => import('./pages/admin/SendNotification'))
const NotificationsAdminList = lazy(() => import('./pages/admin/AdminNotification'))
const MatchesPage = lazy(() => import('./pages/dashboard/Matches'))
const ProfileView = lazy(() => import('./pages/dashboard/ProfileView'))
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
const JobApplications = lazy(() => import('./pages/admin/JobApplications'))
const RandomCall = lazy(() => import('./pages/dashboard/RandomCall'))
const PremiumPage = lazy(() => import('./pages/dashboard/Premium'))
const ReportsAdmin = lazy(() => import('./pages/admin/ReportsAdmin'))

import AnimatedRoutesLayout from './components/layout/AnimatedRoutesLayout'

export default function App() {
  const { loading, profile, user } = useAuth();

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
      {user && <IncomingCall />}
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
          <Route path="/careers/apply" element={<JobApplicationPage />} />
          <Route path="/certificate/:id" element={<CertificatePage />} />
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
            path="/dashboard/premium"
            element={
              <Protected>
                <PremiumPage />
              </Protected>
            }
          />

          <Route
            path="/dashboard/random-call"
            element={
              <Protected>
                <RandomCall />
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
            <Route path="/admin/applications" element={<JobApplications />} />
            <Route path="/admin/reports" element={<ReportsAdmin />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}