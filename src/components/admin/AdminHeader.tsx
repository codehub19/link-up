import React, { useEffect, useState } from 'react'

/**
 * AdminHeader
 * Provides:
 *  - Title
 *  - Optional nav with highlighting based on `current`
 *  - Optional pending payments badge (auto fetched if available)
 */

export interface AdminHeaderNavItem {
  slug: string
  label: string
  href?: string
}

export interface AdminHeaderProps {
  title?: string
  current?: string
  showPendingCount?: boolean
  hideNav?: boolean
  navItems?: AdminHeaderNavItem[]
  className?: string
  style?: React.CSSProperties
  onPendingCountLoaded?: (count: number) => void
}

const DEFAULT_NAV: AdminHeaderNavItem[] = [
  { slug: 'dashboard', label: 'Dashboard', href: '/admin' },
  { slug: 'plans', label: 'Plans', href: '/admin/plans' },
  { slug: 'payments', label: 'Payments', href: '/admin/payments' },
  { slug: 'curation', label: 'Curation', href: '/admin/curation' },
]

const badgeBase: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1,
  padding: '4px 8px',
  borderRadius: 999,
  fontWeight: 600,
  display: 'inline-block',
  whiteSpace: 'nowrap',
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title = 'Admin',
  current,
  showPendingCount = true,
  hideNav = false,
  navItems = DEFAULT_NAV,
  className,
  style,
  onPendingCountLoaded,
}) => {
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [pendingError, setPendingError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!showPendingCount) {
      setPendingCount(null)
      return
    }

    // Dynamic import so build won’t fail if service refactors.
    import('../../services/payments')
      .then(mod => {
        if (typeof mod.listPendingPayments !== 'function') {
          throw new Error('listPendingPayments not exported')
        }
        return mod.listPendingPayments()
      })
      .then(rows => {
        if (cancelled) return
        setPendingCount(rows.length)
        setPendingError(null)
        onPendingCountLoaded?.(rows.length)
      })
      .catch(err => {
        if (cancelled) return
        // Silent fallback; keep UI working.
        setPendingCount(0)
        setPendingError(err?.message || 'Failed to load')
        onPendingCountLoaded?.(0)
      })

    return () => {
      cancelled = true
    }
  }, [showPendingCount, onPendingCountLoaded])

  return (
    <header
      className={className}
      style={{ marginBottom: 28, ...style }}
      data-component="AdminHeader"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            lineHeight: 1.15,
            fontWeight: 600,
          }}
        >
          {title}
        </h2>

        {showPendingCount && pendingCount !== null && (
          <span
            title={
              pendingError
                ? `Pending payments (fallback: ${pendingError})`
                : 'Pending payments'
            }
            style={{
              ...badgeBase,
              background: pendingCount > 0 ? '#fff4e0' : '#e7faef',
              color: pendingCount > 0 ? '#8a4b00' : '#1d6b32',
              border: `1px solid ${
                pendingCount > 0 ? '#f6c38a' : '#8dd6a6'
              }`,
            }}
          >
            Pending: {pendingCount}
          </span>
        )}
      </div>

      {!hideNav && navItems.length > 0 && (
        <nav
          aria-label="Admin sections"
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            fontSize: 14,
          }}
        >
          {navItems.map(item => {
            const active = current === item.slug
            return (
              <a
                key={item.slug}
                href={item.href || '#'}
                style={{
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: active ? '#222' : '#f2f3f5',
                  color: active ? '#fff' : '#333',
                  fontWeight: active ? 600 : 500,
                  border: active ? '1px solid #222' : '1px solid #d9dce0',
                  transition: 'background .15s,color .15s',
                }}
                data-active={active ? 'true' : 'false'}
              >
                {item.label}
              </a>
            )
          })}
        </nav>
      )}
    </header>
  )
}

export default AdminHeader