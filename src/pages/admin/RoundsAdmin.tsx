import React, { useEffect, useState } from 'react'
import { createRound, listRounds, setActiveRound, syncApprovedMalesToActiveRound, setPhaseTimes, getPhaseTimes } from '../../services/rounds'
import AdminGuard from './AdminGuard'
import { AdminHeader } from './AdminHome'
import { Timestamp } from 'firebase/firestore'

function formatTimestamp(ts?: { seconds: number } | null): string {
  if (!ts || typeof ts.seconds !== 'number') return '';
  const d = new Date(ts.seconds * 1000);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0,16);
}

export default function RoundsAdmin() {
  const [rounds, setRounds] = useState<any[]>([])
  const [newId, setNewId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<any|null>(null)
  const [phaseTimes, setPhaseTimesState] = useState<{boys?:any,girls?:any}>({})

  async function refresh() {
    const rds = await listRounds()
    setRounds(rds)
    if (selectedRound) {
      const pt = await getPhaseTimes(selectedRound.id)
      setPhaseTimesState(pt)
    }
  }
  useEffect(() => { refresh() }, [selectedRound])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newId.trim()) return
    await createRound(newId.trim())
    setNewId('')
    await refresh()
  }

  async function onSync() {
    setSyncMsg(null)
    setSyncing(true)
    try {
      const res = await syncApprovedMalesToActiveRound()
      setSyncMsg(`Synced. Added ${res.addedCount} males. Total in round: ${res.totalMales}.`)
      await refresh()
    } catch (e: any) {
      setSyncMsg(e?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handlePhaseTimeUpdate(phase: 'boys'|'girls', startAt: string, endAt: string) {
    if (!selectedRound) return
    let tsStart: any = null, tsEnd: any = null
    if (startAt) tsStart = Timestamp.fromDate(new Date(startAt))
    if (endAt) tsEnd = Timestamp.fromDate(new Date(endAt))
    await setPhaseTimes(selectedRound.id, phase, {
      startAt: tsStart,
      endAt: tsEnd,
      isComplete: false
    })
    await refresh()
  }

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:900}}>
          <AdminHeader title="Rounds" />
          <h2 style={{marginTop:0}}>Rounds Admin</h2>

          <form className="row" onSubmit={onCreate} style={{gap:12, marginTop:12, flexWrap:'wrap'}}>
            <input className="input" placeholder="New round ID (e.g., round_oct_2025)" value={newId} onChange={e=>setNewId(e.target.value)} />
            <button className="btn btn-primary" type="submit">Create</button>
          </form>

          <div style={{height:12}}/>
          <div className="stack">
            {rounds.map(r => (
              <div key={r.id} className="card" style={{padding:16}}>
                <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <b>{r.id}</b> {r.isActive ? <span style={{color:'#22c55e', marginLeft:8}}>(Active)</span> : null}
                    <div style={{color:'var(--muted)', fontSize:13}}>
                      Males: {r.participatingMales?.length ?? 0} • Females: {r.participatingFemales?.length ?? 0}
                    </div>
                  </div>
                  <div className="row" style={{gap:8, flexWrap:'wrap'}}>
                    <button className="btn" onClick={()=>setSelectedRound(r)}>Set phase times</button>
                    {!r.isActive ? (
                      <button className="btn btn-primary" onClick={()=> setActiveRound(r.id).then(refresh)}>Activate</button>
                    ) : (
                      <>
                        <button className="btn btn-ghost" onClick={()=> setActiveRound('').then(refresh)}>Deactivate All</button>
                        <button className="btn btn-primary" onClick={onSync} disabled={syncing}>
                          {syncing ? 'Syncing…' : 'Sync approved males'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {syncMsg && r.isActive ? <div style={{marginTop:8, color:'var(--muted)'}}>{syncMsg}</div> : null}
                {/* Phase time setting UI */}
                {selectedRound?.id === r.id && (
                  <div style={{marginTop:16, padding:16, border:'1px solid #eee'}}>
                    <h3>Phase Times</h3>
                    <div>
                      <b>Boys Round</b><br/>
                      <input
                        type="datetime-local"
                        value={phaseTimes.boys?.startAt ? formatTimestamp(phaseTimes.boys.startAt) : ''}
                        onChange={e=>setPhaseTimesState(prev=>({...prev, boys:{...prev.boys, startAt:e.target.value}}))}
                      />
                      <input
                        type="datetime-local"
                        value={phaseTimes.boys?.endAt ? formatTimestamp(phaseTimes.boys.endAt) : ''}
                        onChange={e=>setPhaseTimesState(prev=>({...prev, boys:{...prev.boys, endAt:e.target.value}}))}
                      />
                      <button className="btn btn-primary" onClick={()=>handlePhaseTimeUpdate('boys', phaseTimes.boys?.startAt, phaseTimes.boys?.endAt)}>Save Boys Phase Times</button>
                    </div>
                    <div style={{marginTop:12}}>
                      <b>Girls Round</b><br/>
                      <input
                        type="datetime-local"
                        value={phaseTimes.girls?.startAt ? formatTimestamp(phaseTimes.girls.startAt) : ''}
                        disabled={!phaseTimes.boys?.endAt}
                        onChange={e=>setPhaseTimesState(prev=>({...prev, girls:{...prev.girls, startAt:e.target.value}}))}
                      />
                      <input
                        type="datetime-local"
                        value={phaseTimes.girls?.endAt ? formatTimestamp(phaseTimes.girls.endAt) : ''}
                        disabled={!phaseTimes.boys?.endAt}
                        onChange={e=>setPhaseTimesState(prev=>({...prev, girls:{...prev.girls, endAt:e.target.value}}))}
                      />
                      <button className="btn btn-primary" onClick={()=>handlePhaseTimeUpdate('girls', phaseTimes.girls?.startAt, phaseTimes.girls?.endAt)} disabled={!phaseTimes.boys?.endAt}>Save Girls Phase Times</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}