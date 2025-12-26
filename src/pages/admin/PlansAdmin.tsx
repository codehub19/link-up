import React, { useEffect, useState } from 'react'
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useDialog } from '../../components/ui/Dialog'

type Plan = {
  id: string
  name: string
  price: number
  discountPercent?: number
  matchQuota: number
  roundsAllowed: number
  offers: string[]
  supportAvailable: boolean
  active: boolean
}

export default function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(49)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [matchQuota, setMatchQuota] = useState<number>(1)
  const [roundsAllowed, setRoundsAllowed] = useState<number>(1)
  const [offersText, setOffersText] = useState('')
  const [supportAvailable, setSupportAvailable] = useState<boolean>(false)
  const [active, setActive] = useState<boolean>(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { showConfirm } = useDialog()

  async function load() {
    const snap = await getDocs(collection(db, 'plans'))
    setPlans(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
  }
  useEffect(() => { load() }, [])

  function toSlug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        // Update existing
        const offers = offersText.split('\n').map(s => s.trim()).filter(Boolean)
        await updateDoc(doc(db, 'plans', editingId), {
          name, price, discountPercent, matchQuota, roundsAllowed, offers, supportAvailable, active,
          updatedAt: new Date()
        })
      } else {
        // Create new
        const id = toSlug(name)
        const offers = offersText.split('\n').map(s => s.trim()).filter(Boolean)
        await setDoc(doc(db, 'plans', id), {
          name, price, discountPercent, matchQuota, roundsAllowed, offers, supportAvailable, active,
          createdAt: new Date(), updatedAt: new Date(),
        }, { merge: true })
      }

      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setName(''); setOffersText(''); setPrice(49); setDiscountPercent(0);
    setMatchQuota(1); setRoundsAllowed(1); setSupportAvailable(false); setActive(true)
    setEditingId(null)
  }

  function editPlan(p: Plan) {
    setEditingId(p.id)
    setName(p.name)
    setPrice(p.price)
    setDiscountPercent(p.discountPercent || 0)
    setMatchQuota(p.matchQuota || 1)
    setRoundsAllowed(p.roundsAllowed || 1)
    setOffersText(p.offers?.join('\n') || '')
    setSupportAvailable(p.supportAvailable || false)
    setActive(p.active)
    document.getElementById('createPlanForm')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function toggleActive(p: Plan) {
    await updateDoc(doc(db, 'plans', p.id), { active: !p.active, updatedAt: new Date() })
    await load()
  }

  async function removePlan(p: Plan) {
    const ok = await showConfirm(`Remove plan "${p.name}"? This does not affect existing subscriptions but users won't see this plan anymore.`)
    if (!ok) return
    await deleteDoc(doc(db, 'plans', p.id))
    await load()
  }

  return (
    <div className="admin-container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Subscription Plans</h2>
        <button className="btn btn-primary" onClick={() => document.getElementById('createPlanForm')?.scrollIntoView({ behavior: 'smooth' })}>
          + New Plan
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
        {plans.map(p => {
          const original = p.price
          const discount = p.discountPercent || 0
          const final = discount > 0 ? Math.round(original * (1 - discount / 100)) : original

          return (
            <div key={p.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{p.name}</h3>
                  <div style={{ marginTop: 4 }}>
                    {discount > 0 && (
                      <span style={{ fontSize: 14, textDecoration: 'line-through', color: '#888', marginRight: 8 }}>
                        ₹{original}
                      </span>
                    )}
                    <span style={{ fontSize: 24, fontWeight: 700, color: discount > 0 ? '#16a34a' : 'inherit' }}>
                      ₹{final}
                    </span>
                    {discount > 0 && <span className="badge badge-success" style={{ marginLeft: 8 }}>{discount}% OFF</span>}
                  </div>
                </div>
                <span className={`badge badge-${p.active ? 'success' : 'neutral'}`}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span className="badge badge-info">Quota: {p.matchQuota}</span>
                  <span className="badge badge-info">Rounds: {p.roundsAllowed ?? 1}</span>
                  {p.supportAvailable && <span className="badge badge-warning">Support</span>}
                </div>
                {p.offers?.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--admin-text-muted)' }}>
                    {p.offers.map(o => <li key={o}>{o}</li>)}
                  </ul>
                )}
              </div>

              <div className="row" style={{ gap: 8, marginTop: 20, borderTop: '1px solid var(--admin-border)', paddingTop: 16 }}>
                <button className={`btn btn-sm btn-ghost`} style={{ flex: 1 }} onClick={() => editPlan(p)}>
                  Edit
                </button>
                <button className={`btn btn-sm ${p.active ? 'btn-ghost' : 'btn-primary'}`} style={{ flex: 1 }} onClick={() => toggleActive(p)}>
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-sm btn-ghost" style={{ color: '#dc2626' }} onClick={() => removePlan(p)}>
                  Remove
                </button>
              </div>
            </div>
          )
        })}
        {plans.length === 0 && (
          <div className="admin-card" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            No plans created yet. Use the form below to add one.
          </div>
        )}
      </div>

      <div className="admin-card" style={{ maxWidth: 800 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Plan' : 'Create New Plan'}</h3>
          {editingId && (
            <button className="btn btn-sm btn-ghost" onClick={resetForm}>Cancel Edit</button>
          )}
        </div>
        <form id="createPlanForm" className="stack" onSubmit={createPlan} style={{ gap: 16 }}>
          <div className="grid cols-2" style={{ gap: 16 }}>
            <div className="stack">
              <label style={{ fontWeight: 600, marginBottom: 6 }}>Plan Name</label>
              <input className="input" placeholder="e.g. Starter" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="stack">
              <label style={{ fontWeight: 600, marginBottom: 6 }}>Price (₹)</label>
              <input className="input" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
            </div>
            <div className="stack">
              <label style={{ fontWeight: 600, marginBottom: 6 }}>Discount (%)</label>
              <input className="input" type="number" placeholder="0" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} />
            </div>
            <div className="stack">
              <label style={{ fontWeight: 600, marginBottom: 6 }}>Match Quota</label>
              <input className="input" type="number" value={matchQuota} onChange={e => setMatchQuota(Number(e.target.value))} />
            </div>
            <div className="stack">
              <label style={{ fontWeight: 600, marginBottom: 6 }}>Rounds Allowed</label>
              <input className="input" type="number" value={roundsAllowed} onChange={e => setRoundsAllowed(Number(e.target.value))} />
            </div>
          </div>

          <div className="stack">
            <label style={{ fontWeight: 600, marginBottom: 6 }}>Offers (one per line)</label>
            <textarea className="input" rows={4} value={offersText} onChange={e => setOffersText(e.target.value)} />
          </div>

          <div className="row" style={{ gap: 24 }}>
            <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={supportAvailable} onChange={e => setSupportAvailable(e.target.checked)} />
              <span>Support Available</span>
            </label>
            <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              <span>Mark Active Immediately</span>
            </label>
          </div>

          <div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : (editingId ? 'Update Plan' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
