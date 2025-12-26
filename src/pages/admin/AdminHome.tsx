import React, { useEffect, useState } from 'react'

/**
 * IMPORTANT:
 * This component is designed to be backward‑compatible with earlier usages like:
 *   <AdminHeader />
 *   <AdminHeader title="Payments" />
 *   <AdminHeader current="plans" />
 *   <AdminHeader title="Something" current="curation" showPendingCount={false} />
 *
 * It also safely ignores the pending count feature if the payments service is missing
 * (e.g. during a refactor) by catching dynamic import errors.
 *
 * If you already have a static import:
 *   import { listPendingPayments } from '../../services/payments'
 * you can keep it. Here we use a dynamic import so pages that don’t care
 * about pending payments aren’t forced to have the service ready at build time.
 */

// Types you may already have in services/payments.ts; duplicated minimally here
// for resilience if a circular dependency occurs.
interface Payment {
  id: string
  status?: string
  [k: string]: any
}

export interface AdminHeaderNavItem {
  slug: string
  label: string
  href?: string
}

export interface AdminHeaderProps {
  title?: string
  /**
   * Slug of the current admin section (e.g. 'plans', 'curation', 'payments', 'dashboard')
   * Used for highlighting navigation.
   */
  current?: string
  /**
   * Show the small badge with pending payment count (defaults true)
   */
  showPendingCount?: boolean
  /**
   * Hide the navigation bar entirely
   */
  hideNav?: boolean
  /**
   * Provide custom nav items. If omitted, a default set is used.
   */
  navItems?: AdminHeaderNavItem[]
  /**
   * Optional className for outer wrapper
   */
  className?: string
  /**
   * Optional style override
   */
  style?: React.CSSProperties
  /**
   * Called after pending count refresh (if needed)
   */
  onPendingCountLoaded?: (count: number) => void
}

/* --------------------------------- Defaults -------------------------------- */
const DEFAULT_NAV: AdminHeaderNavItem[] = [
  { slug: 'dashboard', label: 'Dashboard', href: '/admin/home' },
  { slug: 'plans', label: 'Plans', href: '/admin/plans' },
  { slug: 'payments', label: 'Payments', href: '/admin/payments' },
  { slug: 'curation', label: 'Curation', href: '/admin/curation' },
  { slug: 'rounds', label: 'Rounds', href: '/admin/rounds' }, // <-- Added here
  { slug: 'requests', label: 'Requests', href: '/admin/requests' },
  { slug: 'college-id-verification', label: 'College ID Verification', href: '/admin/college-id-verification' }, // <-- Added here
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

/* --------------------------------- Component -------------------------------- */
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

  /* ---------------------- Load Pending Payments (Optional) --------------------- */
  useEffect(() => {
    let cancelled = false
    if (!showPendingCount) {
      setPendingCount(null)
      return
    }

    // Dynamic import to avoid hard failure if payments service changes
    import('../../services/payments')
      .then(mod => {
        if (!mod.listPendingPayments) {
          throw new Error('listPendingPayments not exported')
        }
        return mod.listPendingPayments()
      })
      .then((rows: Payment[]) => {
        if (cancelled) return
        setPendingCount(rows.length)
        setPendingError(null)
        onPendingCountLoaded?.(rows.length)
      })
      .catch(err => {
        if (cancelled) return
        // Fallback: hide badge rather than crashing build
        setPendingCount(0)
        setPendingError(err?.message || 'Failed to load')
        onPendingCountLoaded?.(0)
      })

    return () => {
      cancelled = true
    }
  }, [showPendingCount, onPendingCountLoaded])

  /* --------------------------------- Rendering -------------------------------- */
  return (
    <header
      className={className}
      style={{
        marginBottom: 28,
        ...style,
      }}
      data-admin-header
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
                ? `Pending payments (error fallback: ${pendingError})`
                : 'Pending payments'
            }
            style={{
              ...badgeBase,
              background:
                pendingCount > 0
                  ? '#fff4e0'
                  : '#e7faef',
              color:
                pendingCount > 0
                  ? '#8a4b00'
                  : '#1d6b32',
              border: `1px solid ${pendingCount > 0 ? '#f6c38a' : '#8dd6a6'
                }`,
            }}
          >
            Pending: {pendingCount}
          </span>
        )}
      </div>

      {!hideNav && navItems.length > 0 && (
        <nav
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            fontSize: 14,
          }}
          aria-label="Admin sections"
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
                  border: active
                    ? '1px solid #222'
                    : '1px solid #d9dce0',
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