import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'

type Review = {
  id: string
  uid: string
  url: string
  name?: string
  verdict: 'review' | 'block'
  status: 'pending' | 'removed' | 'approved'
  reviewed?: boolean
  scores?: Record<string, string>
  createdAt?: any
}

const pretty = (s?: string) => (s || 'UNKNOWN').replace('_', ' ').toLowerCase()

/**
 * Profile photos flagged by the automatic check (Cloud Vision SafeSearch).
 * "Removed" photos were taken down automatically — approve them if it was a mistake.
 * "Needs a look" photos are still live — remove them if they break the rules.
 */
export default function PhotoReviewAdmin() {
  const { showAlert } = useDialog()
  const [items, setItems] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const q = showDone
        ? query(collection(db, 'photoReviews'), orderBy('createdAt', 'desc'), limit(200))
        : query(collection(db, 'photoReviews'), where('reviewed', '==', false), limit(200))
      const snap = await getDocs(q).catch(async () =>
        // Older docs have no "reviewed" field — fall back to everything
        getDocs(query(collection(db, 'photoReviews'), orderBy('createdAt', 'desc'), limit(200))))
      const rs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Review[]
      setItems(showDone ? rs : rs.filter((r) => !r.reviewed))
    } catch (e: any) {
      await showAlert(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [showDone])

  const decide = async (r: Review, decision: 'approve' | 'remove') => {
    setBusy(r.id)
    try {
      await httpsCallable(functions, 'reviewPhoto')({ id: r.id, decision })
      setItems((prev) => showDone
        ? prev.map((x) => (x.id === r.id ? { ...x, reviewed: true, status: decision === 'approve' ? 'approved' : 'removed' } : x))
        : prev.filter((x) => x.id !== r.id))
    } catch (e: any) {
      await showAlert(e?.message || 'Failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Photo review</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted)', fontSize: 14 }}>
            New profile photos are checked automatically. Clear nudity/gore is removed at once; borderline photos stay up until you decide.
          </p>
        </div>
        <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          <span>Show reviewed</span>
        </label>
      </div>

      {loading ? (
        <div className="admin-card">Loading…</div>
      ) : items.length === 0 ? (
        <div className="admin-card">Nothing to review 🎉</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {items.map((r) => (
            <div key={r.id} className="admin-card" style={{ marginBottom: 0, padding: 12, opacity: r.reviewed ? 0.6 : 1 }}>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#111', aspectRatio: '3 / 4' }}>
                <img src={r.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: r.reviewed ? undefined : 'blur(14px)' }}
                  onClick={(e) => { (e.currentTarget as HTMLImageElement).style.filter = 'none' }} />
                {!r.reviewed && <span style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11, background: 'rgba(0,0,0,.6)', padding: '2px 6px', borderRadius: 6 }}>Tap to unblur</span>}
              </div>
              <div style={{ marginTop: 10, fontWeight: 600 }}>
                <a href={`/admin/users/${r.uid}`}>{r.name || r.uid}</a>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                <span className={`badge ${r.status === 'removed' ? 'badge-danger' : r.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                  {r.status === 'removed' ? 'Removed' : r.status === 'approved' ? 'Approved' : 'Needs a look'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                Nudity: {pretty(r.scores?.adult)} · Racy: {pretty(r.scores?.racy)} · Violence: {pretty(r.scores?.violence)}
              </div>
              {!r.reviewed && (
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn btn-sm" disabled={busy === r.id} onClick={() => decide(r, 'approve')}>
                    {r.status === 'removed' ? 'Restore' : 'Fine'}
                  </button>
                  <button className="btn btn-sm" style={{ color: '#f87171', borderColor: '#f87171' }} disabled={busy === r.id} onClick={() => decide(r, 'remove')}>
                    {r.status === 'removed' ? 'Keep removed' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
