import React, { useEffect, useState } from 'react'
import { createRound, listRounds, setActiveRound, syncApprovedMalesToActiveRound, setPhaseTimes, getPhaseTimes } from '../../services/rounds'
import AdminGuard from './AdminGuard'
import { AdminHeader } from './AdminHome'
import { Timestamp } from 'firebase/firestore'
import { Link } from 'react-router-dom'

// Helper to get live status of a round
function getRoundLiveStatus(phases: any): { live: boolean, phase: string | null } {
  const now = Date.now();
  if (phases?.boys?.startAt && phases?.boys?.endAt) {
    const boysStart = phases.boys.startAt.seconds * 1000;
    const boysEnd = phases.boys.endAt.seconds * 1000;
    if (now >= boysStart && now <= boysEnd) return { live: true, phase: 'boys' };
  }
  if (phases?.girls?.startAt && phases?.girls?.endAt) {
    const girlsStart = phases.girls.startAt.seconds * 1000;
    const girlsEnd = phases.girls.endAt.seconds * 1000;
    if (now >= girlsStart && now <= girlsEnd) return { live: true, phase: 'girls' };
  }
  return { live: false, phase: null };
}

function formatTime(ts?: { seconds: number } | null): string {
  if (!ts || typeof ts.seconds !== 'number') return '--';
  const d = new Date(ts.seconds * 1000);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleString();
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
      setSyncMsg(`Synced. Total males in round: ${res.totalMales}.`)
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
          <AdminHeader current="Rounds" />
          <h2 style={{marginTop:0}}>Rounds Admin</h2>

          <form className="row" onSubmit={onCreate} style={{gap:12, marginTop:12, flexWrap:'wrap'}}>
            <input className="input" placeholder="New round ID (e.g., round_oct_2025)" value={newId} onChange={e=>setNewId(e.target.value)} />
            <button className="btn btn-primary" type="submit">Create</button>
          </form>

          <div style={{height:12}}/>
          <div className="stack">
            {rounds.map(r => {
              const status = getRoundLiveStatus(r.phases);
              return (
                <div key={r.id} className="card" style={{padding:16, marginBottom:12}}>
                  
                  <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <b>{r.id}</b>
                      {r.isActive && <span className="badge badge-success" style={{marginLeft:8}}>ACTIVE</span>}
                      {status.live && <span className="badge badge-live" style={{ marginLeft: 8 }}>
                        {status.phase === 'boys' ? "Boys' Round LIVE" : "Girls' Round LIVE"}
                      </span>}
                    </div>
                    <div className="row" style={{gap:8, flexWrap:'wrap'}}>
                      <button className="btn" onClick={()=>setSelectedRound(r)}>Set phase times</button>
                      <Link
                      to={`/admin/rounds/${r.id}/matches`}
                      className="btn"
                      style={{ marginLeft: 8 }}
                    >
                      View Matches
                    </Link>
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
                  {/* Phase timeline */}
                  <div className="phase-timeline" style={{marginTop:10}}>
                    <div>
                      <span>Boys: </span>
                      <span>{formatTime(r.phases?.boys?.startAt)} – {formatTime(r.phases?.boys?.endAt)}</span>
                      {status.phase === "boys" && <span className="badge badge-live" style={{ marginLeft: 8 }}>LIVE</span>}
                    </div>
                    <div>
                      <span>Girls: </span>
                      <span>{formatTime(r.phases?.girls?.startAt)} – {formatTime(r.phases?.girls?.endAt)}</span>
                      {status.phase === "girls" && <span className="badge badge-live" style={{ marginLeft: 8 }}>LIVE</span>}
                    </div>
                  </div>
                  {/* Phase time setting UI */}
                  {selectedRound?.id === r.id && (
                    <div style={{marginTop:16, padding:16, border:'1px solid #eee'}}>
                      <h3>Phase Times</h3>
                      <div>
                        <b>Boys Round</b><br/>
                        <input
                          type="datetime-local"
                          value={r.phases?.boys?.startAt ? new Date(r.phases.boys.startAt.seconds*1000).toISOString().slice(0,16) : ''}
                          onChange={e=>setPhaseTimesState(prev=>({...prev, boys:{...prev.boys, startAt:e.target.value}}))}
                        />
                        <input
                          type="datetime-local"
                          value={r.phases?.boys?.endAt ? new Date(r.phases.boys.endAt.seconds*1000).toISOString().slice(0,16) : ''}
                          onChange={e=>setPhaseTimesState(prev=>({...prev, boys:{...prev.boys, endAt:e.target.value}}))}
                        />
                        <button className="btn btn-primary" onClick={()=>handlePhaseTimeUpdate('boys', phaseTimes.boys?.startAt, phaseTimes.boys?.endAt)}>Save Boys Phase Times</button>
                      </div>
                      <div style={{marginTop:12}}>
                        <b>Girls Round</b><br/>
                        <input
                          type="datetime-local"
                          value={r.phases?.girls?.startAt ? new Date(r.phases.girls.startAt.seconds*1000).toISOString().slice(0,16) : ''}
                          disabled={!r.phases?.boys?.endAt}
                          onChange={e=>setPhaseTimesState(prev=>({...prev, girls:{...prev.girls, startAt:e.target.value}}))}
                        />
                        <input
                          type="datetime-local"
                          value={r.phases?.girls?.endAt ? new Date(r.phases.girls.endAt.seconds*1000).toISOString().slice(0,16) : ''}
                          disabled={!r.phases?.boys?.endAt}
                          onChange={e=>setPhaseTimesState(prev=>({...prev, girls:{...prev.girls, endAt:e.target.value}}))}
                        />
                        <button className="btn btn-primary" onClick={()=>handlePhaseTimeUpdate('girls', phaseTimes.girls?.startAt, phaseTimes.girls?.endAt)} disabled={!r.phases?.boys?.endAt}>Save Girls Phase Times</button>
                      </div>
                    </div>
                  )}
                  
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}