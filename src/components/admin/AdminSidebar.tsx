import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, CreditCard, Layers, Zap, Shield, Key, Bell, Send, Inbox } from 'lucide-react'

export default function AdminSidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (o: boolean) => void }) {
    const location = useLocation()
    const path = location.pathname

    const navItems = [
        { label: 'Dashboard', href: '/admin/home', icon: Home },
        { label: 'Rounds', href: '/admin/rounds', icon: Layers },
        { label: 'Requests', href: '/admin/requests', icon: Inbox }, // <-- Added
        { label: 'Curation', href: '/admin/curation', icon: Zap },
        { label: 'Payments', href: '/admin/payments', icon: CreditCard },
        { label: 'Plans', href: '/admin/plans', icon: Shield },
        { label: 'ID Verification', href: '/admin/college-id-verification', icon: Key },
        { label: 'Notifications', href: '/admin/notifications', icon: Bell },
        { label: 'Send Notification', href: '/admin/send-notification', icon: Send }, // <-- Added
    ]

    const sidebarClass = mobileOpen ? 'admin-sidebar open' : 'admin-sidebar'

    return (
        <>
            {/* Backdrop for mobile */}
            {mobileOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={sidebarClass}>
                <div className="admin-sidebar-header">
                    <Link to="/" className="admin-brand">
                        Admin Portal
                    </Link>
                </div>

                <nav className="admin-nav">
                    {navItems.map(item => {
                        const isActive = path === item.href || (item.href !== '/admin/home' && path.startsWith(item.href))
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon className="admin-nav-icon" />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div style={{ padding: 24, borderTop: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        Logged in as Admin
                    </div>
                </div>
            </aside>
        </>
    )
}
