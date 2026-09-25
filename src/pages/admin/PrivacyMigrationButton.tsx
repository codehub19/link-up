import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import { useState } from 'react'

// One-time (safe to repeat) move of contact details / college ID images off public profiles.
export default function PrivacyMigrationButton() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const go = async () => {
    setBusy(true)
    setResult(null)
    try {
      const fn = httpsCallable(functions, 'migrateUserPrivateData')
      const res: any = await fn({})
      setResult(`Moved private data for ${res.data.migrated} of ${res.data.total} users.`)
    } catch (e: any) {
      setResult(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="admin-card" style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Privacy migration</div>
      <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 12 }}>
        Moves emails, phone numbers, UPI IDs, push tokens and college ID images from public profiles
        into private storage. Run once after deploying; it's safe to run again.
      </div>
      <button className="btn" onClick={go} disabled={busy}>{busy ? 'Migrating…' : 'Run privacy migration'}</button>
      {result && <div style={{ marginTop: 10, fontSize: 13 }}>{result}</div>}
    </div>
  )
}
