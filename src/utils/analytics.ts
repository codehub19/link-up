/*
 * Crash reports (Sentry) and product analytics (PostHog).
 *
 * Both load only when their key is set at build time, and only after the page
 * has loaded, so they never slow down the first screen:
 *   VITE_SENTRY_DSN=https://…@o….ingest.sentry.io/…
 *   VITE_POSTHOG_KEY=phc_…            (VITE_POSTHOG_HOST defaults to the India-friendly EU/US cloud you pick)
 *
 * We never send names, emails, phone numbers or message text — only the user
 * id and coarse traits (gender, student or not) so funnels can be split.
 *
 * Funnel events (build a funnel in PostHog → Product analytics → Funnels):
 *   signed_up → profile_completed → friend_request_sent → friend_request_accepted
 *   → message_sent (first: true) → event_joined / group_joined → call_connected
 */

type Props = Record<string, string | number | boolean | null | undefined>

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'

let ph: any = null
let sentry: any = null
const queue: Array<(p: any) => void> = []

function withPosthog(fn: (p: any) => void) {
  if (!POSTHOG_KEY) return
  if (ph) fn(ph)
  else if (queue.length < 100) queue.push(fn)
}

export function initMonitoring() {
  if (typeof window === 'undefined') return
  const start = () => {
    if (SENTRY_DSN) {
      import('@sentry/react').then((S) => {
        S.init({
          dsn: SENTRY_DSN,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0,
          // Don't collect personal data
          sendDefaultPii: false,
          ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            /Failed to fetch dynamically imported module/,
            /Load failed/,
            /NotAllowedError/,
          ],
        })
        sentry = S
      }).catch(() => { })
    }
    if (POSTHOG_KEY) {
      import('posthog-js').then(({ default: posthog }) => {
        posthog.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          person_profiles: 'identified_only',
          capture_pageview: 'history_change',
          autocapture: false,
          disable_session_recording: true,
          mask_all_text: true,
          persistence: 'localStorage',
        })
        ph = posthog
        queue.splice(0).forEach((fn) => { try { fn(ph) } catch { /* ignore */ } })
      }).catch(() => { })
    }
  }
  if (document.readyState === 'complete') setTimeout(start, 1500)
  else window.addEventListener('load', () => setTimeout(start, 1500), { once: true })
}

/** Record a product event (no personal data in props, please). */
export function track(event: string, props?: Props) {
  withPosthog((p) => p.capture(event, props))
}

/** Tie events to the signed-in member (id + coarse traits only). */
export function identify(uid: string, traits?: Props) {
  withPosthog((p) => p.identify(uid, traits))
  if (sentry) sentry.setUser({ id: uid })
}

export function resetAnalytics() {
  withPosthog((p) => p.reset())
  if (sentry) sentry.setUser(null)
}

/** Report a handled error to Sentry (no-op when Sentry isn't set up). */
export function captureError(e: unknown, context?: Props) {
  if (sentry) sentry.captureException(e, context ? { extra: context } : undefined)
}
