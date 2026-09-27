import type { NavigateFunction } from 'react-router-dom'

/**
 * Leave a screen after finishing something on it (saving, paying, …): go back
 * to where the user came from, so Back afterwards doesn't reopen the finished
 * screen. Falls back to `path` when the screen was opened directly.
 */
export function goBackOr(nav: NavigateFunction, path: string) {
  if ((window.history.state?.idx ?? 0) > 0) nav(-1)
  else nav(path, { replace: true })
}
