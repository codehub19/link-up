import { useEffect, useState } from 'react'
import { useDialog } from '../../components/ui/Dialog'
import { AppConfig, getConfigDoc, saveConfigDoc } from '../../services/adminTools'

// Mirrors RANDOM_CALL_DEFAULTS in functions/src/randomCall.ts
const CALL_DEFAULTS = {
  enabled: true,
  maxCallSeconds: 300,
  dailyCallLimit: 5,
  premiumDailyCallLimit: 20,
  matchCallMaxSeconds: 900,
  chatWindowHours: 24,
  openHour: null as number | null,
  closeHour: null as number | null,
  utcOffsetMinutes: 330,
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="admin-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{hint}</div>}
      </span>
    </label>
  )
}

function NumField({ label, value, onChange, hint, min = 0 }: { label: string; value: number | ''; onChange: (v: number | '') => void; hint?: string; min?: number }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <input className="input" type="number" min={min} value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

/** App-wide switches and settings that take effect without a redeploy. */
export default function ControlsAdmin() {
  const { showAlert, showConfirm } = useDialog()
  const [app, setApp] = useState<AppConfig>({})
  const [calls, setCalls] = useState(CALL_DEFAULTS)
  const [turn, setTurn] = useState<Record<string, any>>({})
  const [turnMode, setTurnMode] = useState<'cloudflare' | 'static'>('cloudflare')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getConfigDoc<AppConfig>('config/app'), getConfigDoc('config/randomCall'), getConfigDoc('serverConfig/turn')])
      .then(([a, c, t]) => {
        setApp(a)
        setCalls({ ...CALL_DEFAULTS, ...(c as any) })
        setTurn(t)
        setTurnMode((t as any).urls ? 'static' : 'cloudflare')
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async (key: string, fn: () => Promise<void>) => {
    setSaving(key)
    try {
      await fn()
      await showAlert('Saved. Changes apply to the app right away.')
    } catch (e: any) {
      await showAlert(e?.message || 'Save failed')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="admin-card">Loading settings…</div>

  const ann = app.announcement || {}
  const hoursOn = calls.openHour != null && calls.closeHour != null

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>App controls</h2>
          <div className="admin-page-sub">Switches and settings that apply to the live app instantly — no redeploy</div>
        </div>
      </div>

      <div className="admin-grid-2">
        {/* Site status */}
        <div className="admin-card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Site status</div>
          <div className="stack" style={{ gap: 14 }}>
            <Switch
              checked={!!app.maintenanceMode}
              onChange={(v) => setApp({ ...app, maintenanceMode: v })}
              label="Maintenance mode"
              hint="Everyone except admins sees a maintenance screen"
            />
            <div className="admin-field">
              <label>Maintenance message</label>
              <textarea className="input" rows={2} placeholder="We're making DateU better. Back in a few minutes!" value={app.maintenanceMessage || ''} onChange={(e) => setApp({ ...app, maintenanceMessage: e.target.value })} />
            </div>
            <Switch
              checked={!!app.signupsPaused}
              onChange={(v) => setApp({ ...app, signupsPaused: v })}
              label="Pause new sign-ups"
              hint="Existing users can still log in; new accounts can't be created"
            />
            <div>
              <button className="btn btn-primary" disabled={saving === 'status'} onClick={async () => {
                if (app.maintenanceMode && !(await showConfirm('Turn on maintenance mode? Users will be locked out until you turn it off.'))) return
                save('status', () => saveConfigDoc('config/app', { maintenanceMode: !!app.maintenanceMode, maintenanceMessage: app.maintenanceMessage || '', signupsPaused: !!app.signupsPaused }))
              }}>Save site status</button>
            </div>
          </div>
        </div>

        {/* Announcement */}
        <div className="admin-card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Announcement banner</div>
          <div className="stack" style={{ gap: 14 }}>
            <Switch checked={!!ann.active} onChange={(v) => setApp({ ...app, announcement: { ...ann, active: v } })} label="Show banner" hint="A dismissible bar at the top of every page" />
            <div className="admin-field">
              <label>Text</label>
              <input className="input" placeholder="🎉 New round starts Friday 8 PM!" value={ann.text || ''} onChange={(e) => setApp({ ...app, announcement: { ...ann, text: e.target.value } })} />
            </div>
            <div className="admin-field">
              <label>Link (optional)</label>
              <input className="input" placeholder="/dashboard/random-call" value={ann.link || ''} onChange={(e) => setApp({ ...app, announcement: { ...ann, link: e.target.value } })} />
            </div>
            <div className="admin-field">
              <label>Style</label>
              <select className="input" value={ann.tone || 'info'} onChange={(e) => setApp({ ...app, announcement: { ...ann, tone: e.target.value as any } })}>
                <option value="info">Info (blue)</option>
                <option value="success">Good news (green)</option>
                <option value="warning">Warning (amber)</option>
              </select>
            </div>
            <div>
              <button className="btn btn-primary" disabled={saving === 'ann' || (!!ann.active && !ann.text?.trim())}
                onClick={() => save('ann', () => saveConfigDoc('config/app', { announcement: { active: !!ann.active, text: ann.text || '', link: ann.link || '', tone: ann.tone || 'info' } }))}>
                Save banner
              </button>
            </div>
          </div>
        </div>

        {/* Referral rewards */}
        <div className="admin-card">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Referral rewards</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--admin-text-muted)' }}>
            When someone joins with an invite code and completes their profile (with a photo), both people get free Premium days.
            Set days to 0 to turn this off.
          </p>
          <div className="admin-grid-2" style={{ gap: 12 }}>
            <NumField label="Premium days for both people" value={(app as any).referralRewardDays ?? 3} onChange={(v) => setApp({ ...app, referralRewardDays: Number(v || 0) } as any)} />
            <NumField label="Max rewards per inviter" value={(app as any).referralMaxRewards ?? 10} onChange={(v) => setApp({ ...app, referralMaxRewards: Number(v || 0) } as any)} hint="Stops anyone farming Premium with fake accounts" />
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" disabled={saving === 'ref'} onClick={() => save('ref', () => saveConfigDoc('config/app', { referralRewardDays: Number((app as any).referralRewardDays ?? 3), referralMaxRewards: Number((app as any).referralMaxRewards ?? 10) }))}>Save referral rewards</button>
          </div>
        </div>

        {/* Random calls */}
        <div className="admin-card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Random calls</div>
          <div className="stack" style={{ gap: 14 }}>
            <Switch checked={!!calls.enabled} onChange={(v) => setCalls({ ...calls, enabled: v })} label="Random calls enabled" hint="Turn off to pause matchmaking instantly" />
            <div className="admin-grid-2" style={{ gap: 12 }}>
              <NumField label="Max call length (minutes)" value={Math.round(calls.maxCallSeconds / 60)} onChange={(v) => setCalls({ ...calls, maxCallSeconds: Number(v || 1) * 60 })} min={1} />
              <NumField label="Match call length (minutes)" value={Math.round(calls.matchCallMaxSeconds / 60)} onChange={(v) => setCalls({ ...calls, matchCallMaxSeconds: Number(v || 1) * 60 })} min={1} />
              <NumField label="Free calls per day" value={calls.dailyCallLimit} onChange={(v) => setCalls({ ...calls, dailyCallLimit: Number(v || 0) })} />
              <NumField label="Premium calls per day" value={calls.premiumDailyCallLimit} onChange={(v) => setCalls({ ...calls, premiumDailyCallLimit: Number(v || 0) })} hint="A plan's own limit overrides this" />
              <NumField label="Free chat after a match (hours)" value={calls.chatWindowHours} onChange={(v) => setCalls({ ...calls, chatWindowHours: Number(v || 1) })} min={1} />
            </div>
            <Switch
              checked={hoursOn}
              onChange={(v) => setCalls({ ...calls, openHour: v ? 21 : null, closeHour: v ? 0 : null })}
              label="Only allow calls during call hours"
              hint="Concentrates users so matches happen faster; reminders go out at opening time"
            />
            {hoursOn && (
              <div className="admin-grid-2" style={{ gap: 12 }}>
                <NumField label="Opens at (hour, 0–23 IST)" value={calls.openHour ?? 0} onChange={(v) => setCalls({ ...calls, openHour: Math.min(23, Number(v || 0)) })} />
                <NumField label="Closes at (hour, 0–23 IST)" value={calls.closeHour ?? 0} onChange={(v) => setCalls({ ...calls, closeHour: Math.min(23, Number(v || 0)) })} hint="0 = midnight. Can wrap past midnight." />
              </div>
            )}
            <div>
              <button className="btn btn-primary" disabled={saving === 'calls'} onClick={() => save('calls', () => saveConfigDoc('config/randomCall', calls))}>Save call settings</button>
            </div>
          </div>
        </div>

        {/* TURN */}
        <div className="admin-card">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Call relay (TURN server)</div>
          <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 14 }}>
            Helps calls connect on strict mobile networks. Stored server-side only — users never see these values.
            {(turn.cloudflareKeyId || turn.urls) ? ' ✅ Configured.' : ' ⚠️ Not configured yet.'}
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <select className="input" value={turnMode} onChange={(e) => setTurnMode(e.target.value as any)}>
              <option value="cloudflare">Cloudflare Realtime TURN (recommended)</option>
              <option value="static">Other TURN server (static credentials)</option>
            </select>
            {turnMode === 'cloudflare' ? (
              <>
                <div className="admin-field"><label>TURN key ID</label><input className="input" value={turn.cloudflareKeyId || ''} onChange={(e) => setTurn({ ...turn, cloudflareKeyId: e.target.value.trim() })} /></div>
                <div className="admin-field"><label>API token</label><input className="input" type="password" autoComplete="off" value={turn.cloudflareApiToken || ''} onChange={(e) => setTurn({ ...turn, cloudflareApiToken: e.target.value.trim() })} /></div>
              </>
            ) : (
              <>
                <div className="admin-field"><label>URLs (comma separated)</label><input className="input" placeholder="turn:turn.example.com:3478" value={Array.isArray(turn.urls) ? turn.urls.join(', ') : (turn.urls || '')} onChange={(e) => setTurn({ ...turn, urls: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></div>
                <div className="admin-field"><label>Username</label><input className="input" value={turn.username || ''} onChange={(e) => setTurn({ ...turn, username: e.target.value })} /></div>
                <div className="admin-field"><label>Credential</label><input className="input" type="password" autoComplete="off" value={turn.credential || ''} onChange={(e) => setTurn({ ...turn, credential: e.target.value })} /></div>
              </>
            )}
            <div>
              <button className="btn btn-primary" disabled={saving === 'turn'} onClick={() => save('turn', () => saveConfigDoc('serverConfig/turn', turnMode === 'cloudflare'
                ? { cloudflareKeyId: turn.cloudflareKeyId || null, cloudflareApiToken: turn.cloudflareApiToken || null, urls: null, username: null, credential: null }
                : { urls: turn.urls || null, username: turn.username || null, credential: turn.credential || null, cloudflareKeyId: null, cloudflareApiToken: null }))}>
                Save relay settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
