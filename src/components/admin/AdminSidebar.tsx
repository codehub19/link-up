import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, CreditCard, Layers, Zap, Shield, Key, Bell, Send, Inbox, Briefcase, Flag, BarChart3, UserCog, Phone, BadgeCheck, SlidersHorizontal, ScrollText } from 'lucide-react'

export default function AdminSidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (o: boolean) => void }) {
    const location = useLocation()
    const path = location.pathname

    const navSections: { title: string; items: { label: string; href: string; icon: any }[] }[] = [
        {
            title: 'Overview',
            items: [
                { label: 'Dashboard', href: '/admin/home', icon: Home },
                { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
            ],
        },
        {
            title: 'People',
            items: [
                { label: 'Users', href: '/admin/users', icon: UserCog },
                { label: 'Reports', href: '/admin/reports', icon: Flag },
                { label: 'ID Verification', href: '/admin/college-id-verification', icon: Key },
                { label: 'Requests', href: '/admin/requests', icon: Inbox },
                { label: 'Referrals', href: '/admin/referrals', icon: Users },
            ],
        },
        {
            title: 'Matching',
            items: [
                { label: 'Rounds', href: '/admin/rounds', icon: Layers },
                { label: 'Curation', href: '/admin/curation', icon: Zap },
                { label: 'Calls', href: '/admin/calls', icon: Phone },
            ],
        },
        {
            title: 'Money',
            items: [
                { label: 'Payments', href: '/admin/payments', icon: CreditCard },
                { label: 'Subscriptions', href: '/admin/subscriptions', icon: BadgeCheck },
                { label: 'Plans', href: '/admin/plans', icon: Shield },
            ],
        },
        {
            title: 'Messaging',
            items: [
                { label: 'Send Notification', href: '/admin/send-notification', icon: Send },
                { label: 'Notifications', href: '/admin/notifications', icon: Bell },
            ],
        },
        {
            title: 'System',
            items: [
                { label: 'App Controls', href: '/admin/controls', icon: SlidersHorizontal },
                { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
                { label: 'Applications', href: '/admin/applications', icon: Briefcase },
            ],
        },
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

                <nav className="admin-nav" style={{ overflowY: 'auto' }}>
                    {navSections.map(section => (
                        <div key={section.title}>
                            <div className="admin-nav-section">{section.title}</div>
                            {section.items.map(item => {
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
                        </div>
                    ))}
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
