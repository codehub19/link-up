/**
 * Screens opened from another screen (like native "pushed" screens): they get a
 * back button in the top bar and no bottom tab bar.
 */
export const PUSHED_ROUTES = [
  '/dashboard/notifications',
  '/dashboard/edit-profile',
  '/dashboard/settings',
  '/dashboard/support-history',
  '/dashboard/plans',
  '/dashboard/premium',
  '/dashboard/random-call',
  '/dashboard/dating-profile',
  '/dashboard/views',
]

export function isPushedRoute(pathname: string) {
  return PUSHED_ROUTES.includes(pathname) || /^\/dashboard\/(events|groups)\/[^/]+/.test(pathname)
}
