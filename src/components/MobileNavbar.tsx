import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import './MobileNavbar.css'

type Tab = { to: string; label: string; match: string[]; icon: JSX.Element }

const Icon = ({ d, children }: { d?: string; children?: React.ReactNode }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {d ? <path d={d} /> : children}
    </svg>
)

const RoundsIcon = () => (
    <Icon>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
)
const CallIcon = () => (
    <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" />
)
const HeartIcon = () => (
    <Icon d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z" />
)
const ChatIcon = () => <Icon d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
const ProfileIcon = () => (
    <Icon>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </Icon>
)

/** Native-style bottom tab bar for the app (phones and tablets). */
export default function MobileNavbar() {
    const { profile } = useAuth()
    const loc = useLocation()

    // Only inside the app, and never on top of a full-screen chat
    if (!loc.pathname.startsWith('/dashboard')) return null
    if (!profile?.isProfileComplete) return null

    const isMale = profile?.gender === 'male'
    const tabs: Tab[] = [
        { to: isMale ? '/dashboard/male/rounds' : '/dashboard/round', label: 'Rounds', match: ['/dashboard/male/rounds', '/dashboard/round'], icon: <RoundsIcon /> },
        { to: '/dashboard/random-call', label: 'Call', match: ['/dashboard/random-call'], icon: <CallIcon /> },
        { to: '/dashboard/matches', label: 'Matches', match: ['/dashboard/matches'], icon: <HeartIcon /> },
        { to: '/dashboard/chat', label: 'Chat', match: ['/dashboard/chat'], icon: <ChatIcon /> },
        {
            to: isMale ? '/dashboard/male/profile' : '/dashboard/female/profile',
            label: 'Profile',
            match: ['/dashboard/male/profile', '/dashboard/female/profile', '/dashboard/edit-profile', '/dashboard/settings', '/dashboard/plans', '/dashboard/premium'],
            icon: <ProfileIcon />,
        },
    ]

    return (
        <nav className="app-tabbar" aria-label="Main">
            {tabs.map((t) => {
                const active = t.match.some((m) => loc.pathname === m || loc.pathname.startsWith(m + '/'))
                return (
                    <Link key={t.label} to={t.to} className={`app-tab ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                        <span className="app-tab-icon">{t.icon}</span>
                        <span className="app-tab-label">{t.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
