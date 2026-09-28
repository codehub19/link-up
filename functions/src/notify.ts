import * as admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'
import { sendPushToUsers } from './push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

/*
 * One place to tell a user about something: an in-app notification, a push
 * notification and (optionally) an email through Brevo.
 *
 * Email settings live in Firestore serverConfig/email (admins only), set from
 * Admin → App Controls:
 *   { brevoApiKey, fromEmail: 'hello@dateu.in', fromName: 'DateU', enabled: true }
 * Users can turn email alerts off in Settings (users/{uid}.emailAlerts === false).
 */

type EmailConfig = { brevoApiKey?: string; fromEmail?: string; fromName?: string; enabled?: boolean }
let cfgCache: { at: number; cfg: EmailConfig } | null = null
async function emailConfig(): Promise<EmailConfig> {
  if (cfgCache && Date.now() - cfgCache.at < 5 * 60_000) return cfgCache.cfg
  const cfg = ((await db.collection('serverConfig').doc('email').get()).data() || {}) as EmailConfig
  cfgCache = { at: Date.now(), cfg }
  return cfg
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export function emailHtml(opts: { heading: string; text: string; cta?: string; url?: string; footerNote?: string }) {
  const url = opts.url ? `https://dateu.in${opts.url.startsWith('/') ? opts.url : '/' + opts.url}` : 'https://dateu.in/dashboard'
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f1f6;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1f6;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;">
<tr><td style="padding:24px 28px 4px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#ff416c;">DateU</td></tr>
<tr><td style="padding:12px 28px 0;font-family:Arial,Helvetica,sans-serif;"><h1 style="margin:0 0 10px;font-size:22px;line-height:28px;color:#15131c;">${esc(opts.heading)}</h1>
<p style="margin:0;font-size:15px;line-height:23px;color:#4a4658;">${esc(opts.text)}</p></td></tr>
<tr><td style="padding:20px 28px 26px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ff416c" style="border-radius:999px;">
<a href="${url}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">${esc(opts.cta || 'Open DateU')}</a>
</td></tr></table></td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#8a8697;margin:14px 0 0;">${esc(opts.footerNote || 'You get these emails for activity on your DateU account.')}<br/>
Turn them off any time in <a href="https://dateu.in/dashboard/settings" style="color:#8a8697;">Settings → Email alerts</a>.</p>
</td></tr></table></body></html>`
}

/** Send one email through Brevo. Returns false (quietly) when email isn't set up. */
export async function sendEmail(to: { email: string; name?: string }, subject: string, html: string, tag = 'alert') {
  const cfg = await emailConfig()
  if (!cfg.enabled || !cfg.brevoApiKey || !cfg.fromEmail) return false
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': cfg.brevoApiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: cfg.fromEmail, name: cfg.fromName || 'DateU' },
        to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
        replyTo: { email: cfg.fromEmail },
        subject,
        htmlContent: html,
        tags: [tag],
      }),
    })
    if (!res.ok) { logger.warn('Brevo email failed', res.status, await res.text().catch(() => '')); return false }
    return true
  } catch (e: any) {
    logger.warn('Brevo email error', e?.message)
    return false
  }
}

export type Notice = {
  title: string
  body: string
  link?: string
  push?: boolean
  /** Also email it (only if the user allows email alerts and email is set up) */
  email?: { subject: string; heading?: string; text?: string; cta?: string }
}

export async function notifyUser(uid: string, n: Notice) {
  if (!uid) return
  await db.collection('notifications').add({
    userUid: uid, title: n.title, body: n.body, link: n.link || null,
    targetType: 'personal', seen: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { })
  if (n.push !== false) await sendPushToUsers([uid], n.title, n.body, n.link || '/dashboard/notifications').catch(() => 0)
  if (n.email) {
    const [user, priv] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('userPrivate').doc(uid).get(),
    ])
    if (user.get('emailAlerts') === false) return
    const email = priv.get('email') || user.get('email')
    if (!email) return
    const name = String(user.get('name') || '').split(' ')[0]
    await sendEmail({ email, name }, n.email.subject, emailHtml({
      heading: n.email.heading || n.title,
      text: n.email.text || n.body,
      cta: n.email.cta,
      url: n.link,
    }))
  }
}
