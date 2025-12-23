import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import './MobileNavbar.css'

export default function MobileNavbar() {
    const { profile } = useAuth()
    const loc = useLocation()
    const is = (p: string) => loc.pathname.startsWith(p)

    // Ensure we only show on dashboard pages
    if (!loc.pathname.startsWith('/dashboard')) return null

    const gender = profile?.gender
    const isMale = gender === 'male'

    return (
        <div className="mobile-dock-container">
            <div className="mobile-dock">
                {isMale ? (
                    <>
                        {/* Male Tabs */}
                        <Link to="/dashboard/plans" className={`dock-item ${is('/dashboard/plans') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 10l4 2 4-6 4 6 4-2 4-6v14H2z" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/male/rounds" className={`dock-item ${is('/dashboard/male/rounds') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/matches" className={`dock-item ${is('/dashboard/matches') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/chat" className={`dock-item ${is('/dashboard/chat') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/male/profile" className={`dock-item ${is('/dashboard/male/profile') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                        </Link>
                    </>
                ) : (
                    <>
                        {/* Female Tabs */}
                        <Link to="/dashboard/round" className={`dock-item ${is('/dashboard/round') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/matches" className={`dock-item ${is('/dashboard/matches') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/chat" className={`dock-item ${is('/dashboard/chat') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                        </Link>

                        <Link to="/dashboard/female/profile" className={`dock-item ${is('/dashboard/female/profile') ? 'active' : ''}`}>
                            <div className="dock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                        </Link>
                    </>
                )}
            </div>
        </div>
    )
}
