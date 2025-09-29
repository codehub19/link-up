import React, { useEffect, useState } from 'react'
import AdminGuard from './AdminGuard'
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'

type Plan = {
  id: string
  name: string
  price: number
  matchQuota: number
  offers: string[]
  supportAvailable: boolean
  active: boolean
}

export default function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(49)
  const [matchQuota, setMatchQuota] = useState<number>(1)
  const [offersText, setOffersText] = useState('') // one per line
  const [supportAvailable, setSupportAvailable] = useState<boolean>(false)
  const [active, setActive] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    const snap = await getDocs(collection(db, 'plans'))
    setPlans(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
  }
  useEffect(()=>{ load() }, [])

  function toSlug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const id = toSlug(name)
      const offers = offersText.split('\n').map(s => s.trim()).filter(Boolean)
      await setDoc(doc(db, 'plans', id), {
        name, price, matchQuota, offers, supportAvailable, active,
        createdAt: new Date(), updatedAt: new Date(),
      }, { merge: true })
      setName(''); setOffersText(''); setPrice(49); setMatchQuota(1); setSupportAvailable(false); setActive(true)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: Plan) {
    await updateDoc(doc(db, 'plans', p.id), { active: !p.active, updatedAt: new Date() })
    await load()
  }

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 900 }}>
          <h2>Plans</h2>

          <form className="stack" onSubmit={createPlan} style={{ gap: 10, marginTop: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <input className="input" placeholder="Plan name (e.g., Starter)" value={name} onChange={e=>setName(e.target.value)} />
              <input className="input" type="number" placeholder="Price" value={price} onChange={e=>setPrice(Number(e.target.value||0))} style={{ width: 140 }} />
              <input className="input" type="number" placeholder="Match quota" value={matchQuota} onChange={e=>setMatchQuota(Number(e.target.value||0))} style={{ width: 140 }} />
            </div>
            <textarea className="input" placeholder="Offers (one per line)" rows={4} value={offersText} onChange={e=>setOffersText(e.target.value)} />
            <div className="row" style={{ gap: 12 }}>
              <label><input type="checkbox" checked={supportAvailable} onChange={e=>setSupportAvailable(e.target.checked)} /> Support available</label>
              <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} /> Active</label>
            </div>
            <div>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create/Update Plan'}</button>
            </div>
          </form>

          <div className="stack" style={{ marginTop: 24 }}>
            {plans.map(p => (
              <div key={p.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b>{p.name}</b> {p.active ? <span style={{ color: '#22c55e', marginLeft: 6 }}>(Active)</span> : <span style={{ color: '#ef4444', marginLeft: 6 }}>(Inactive)</span>}
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                      ₹{p.price} • Quota: {p.matchQuota} • {p.supportAvailable ? 'Support included' : 'No support'}
                    </div>
                    {p.offers?.length ? <ul style={{ margin: '6px 0 0 18px' }}>{p.offers.map(o => <li key={o}>{o}</li>)}</ul> : null}
                  </div>
                  <button className="btn" onClick={()=>toggleActive(p)}>{p.active ? 'Deactivate' : 'Activate'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}