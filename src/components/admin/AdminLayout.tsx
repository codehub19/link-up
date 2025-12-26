import React, { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import '../../styles/admin.css'
import { Menu } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="admin-layout">
            <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

            <main className="admin-main">
                <div className="admin-header-mobile">
                    <span className="admin-brand">Admin</span>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <Menu size={24} />
                    </button>
                </div>
                {children}
            </main>
        </div>
    )
}
