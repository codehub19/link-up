import { useEffect, useState } from 'react'
import { useDialog } from '../../components/ui/Dialog'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Group, saveGroup, seedStarterGroups } from '../../services/groups'

const blank: Partial<Group> = { name: '', emoji: '👥', description: '', category: '', order: 50, active: true }

/** Create, edit and hide interest groups. */
export default function GroupsAdmin() {
  const { showAlert } = useDialog()
  const [groups, setGroups] = useState<Group[]>([])
  const [edit, setEdit] = useState<{ id: string | null; data: Partial<Group> } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => onSnapshot(collection(db, 'groups'), (s) =>
    setGroups(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))), [])

  const save = async () => {
    if (!edit?.data.name?.trim()) return
    setBusy(true)
    try {
      await saveGroup(edit.id, { ...edit.data, name: edit.data.name.trim(), order: Number(edit.data.order) || 0 })
      setEdit(null)
    } catch (e: any) {
      await showAlert(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const field = (k: keyof Group, label: string, type = 'text') => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      {label}
      <input className="input" type={type} value={(edit?.data[k] as any) ?? ''} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, [k]: e.target.value } }))} />
    </label>
  )

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Groups</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted)', fontSize: 14 }}>Interest groups in Friends → Groups. Members post plans and others tap “I’m in”.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" disabled={busy} onClick={async () => { setBusy(true); await seedStarterGroups().catch((e) => showAlert(e?.message)); setBusy(false) }}>Add starter groups</button>
          <button className="btn btn-sm btn-primary" onClick={() => setEdit({ id: null, data: { ...blank } })}>New group</button>
        </div>
      </div>

      {edit && (
        <div className="admin-card" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {field('name', 'Name')}
          {field('emoji', 'Emoji')}
          {field('category', 'Category')}
          {field('order', 'Order', 'number')}
          <div style={{ gridColumn: '1 / -1' }}>{field('description', 'Description')}</div>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={edit.data.active !== false} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, active: e.target.checked } }))} /> Visible
          </label>
          <div className="row" style={{ gap: 8, gridColumn: '1 / -1' }}>
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={save}>Save</button>
            <button className="btn btn-sm" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="admin-card">No groups yet — click “Add starter groups”.</div>
      ) : groups.map((g) => (
        <div key={g.id} className="admin-card row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, opacity: g.active === false ? 0.5 : 1 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{g.emoji} {g.name} {g.active === false && <span className="badge badge-warning">Hidden</span>}</div>
            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>{g.memberCount || 0} members · {g.category || '—'} · {g.description}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <a className="btn btn-sm" href={`/dashboard/groups/${g.id}`} target="_blank" rel="noreferrer">Open</a>
            <button className="btn btn-sm" onClick={() => setEdit({ id: g.id, data: { ...g } })}>Edit</button>
          </div>
        </div>
      ))}
    </div>
  )
}
