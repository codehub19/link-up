import React, { useEffect, useState } from 'react'
import { createRound, listRounds, setActiveRound, syncApprovedMalesToActiveRound, setPhaseTimes, getPhaseTimes } from '../../services/rounds'
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
  const [selectedRound, setSelectedRound] = useState<any | null>(null)
  const [phaseTimes, setPhaseTimesState] = useState<{ boys?: any, girls?: any }>({})

  async function refresh() {
    const rds = await listRounds()
    rds.sort((a, b) => b.id.localeCompare(a.id))
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

  async function handlePhaseTimeUpdate(phase: 'boys' | 'girls', startAt: string, endAt: string) {
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
    <div className="admin-container">
      <div className="row stack-mobile" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0 }}>Matching Rounds</h2>
        <div className="row stack-mobile" style={{ gap: 12, alignItems: 'center' }}>
          {/* Smart Launch Button */}
          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}
            onClick={async () => {
              if (!window.confirm("🚀 Fully Automate Launch?\n\nThis will:\n1. Create a new round\n2. Sync all males\n3. Activate round\n4. SMART MATCH Best-Fit Girls to Boys\n\n(Girls matching requires likes and happens later)")) return;
              try {
                const { createAndSetupRound } = await import('../../services/rounds');
                alert("Starting launch sequence... This may take a few seconds.");
                const res = await createAndSetupRound();
                alert(`✅ Launch Complete!\n\nRound ID: ${res.roundId}\nMales Synced: ${res.males}\nInitial Matches: ${res.matches}`);
                await refresh();
              } catch (e: any) {
                alert("Launch Failed: " + e.message);
              }
            }}
          >
            🚀 Auto-Launch Round
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--admin-border)' }}></div>

          <form onSubmit={onCreate} className="row" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder="Custom Round ID"
              value={newId}
              onChange={e => setNewId(e.target.value)}
              style={{ width: 200 }}
            />
            <button className="btn btn-ghost" type="submit" disabled={!newId.trim()}>Create</button>
          </form>
        </div>
      </div>

      <div className="stack" style={{ gap: 24 }}>
        {rounds.map(r => {
          const status = getRoundLiveStatus(r.phases);
          const isExpanded = selectedRound?.id === r.id;

          return (
            <div key={r.id} className={`admin-card ${r.isActive ? 'border-primary' : ''}`} style={{ transition: 'all 0.2s' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div className="row" style={{ alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{r.id}</div>
                  {r.isActive && <span className="badge badge-success">ACTIVE</span>}
                  {status.live && <span className="badge badge-warning">
                    {status.phase === 'boys' ? "Boys Live" : "Girls Live"}
                  </span>}
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <Link to={`/admin/rounds/${r.id}/matches`} className="btn btn-sm btn-ghost">
                    View Matches
                  </Link>
                  <button className={`btn btn-sm ${isExpanded ? 'btn-neutral' : 'btn-ghost'}`} onClick={() => setSelectedRound(isExpanded ? null : r)}>
                    {isExpanded ? 'Hide Settings' : 'Settings'}
                  </button>
                  {!r.isActive ? (
                    <button className="btn btn-sm btn-primary" onClick={() => setActiveRound(r.id).then(refresh)}>Activate</button>
                  ) : (
                    <button className="btn btn-sm btn-ghost" onClick={() => setActiveRound('').then(refresh)} style={{ color: '#ef4444' }}>Deactivate</button>
                  )}
                </div>
              </div>

              {/* Status/Sync Msg */}
              {syncMsg && isExpanded && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--admin-accent)' }}>{syncMsg}</div>}

              {/* Expanded Area */}
              {isExpanded && (
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--admin-border)' }}>

                  {/* Timeline Visualization */}
                  <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 24 }}>
                    <div style={{ marginBottom: 12, fontWeight: 600 }}>Phase Timeline</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#60a5fa' }}>Boys Phase</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                          {r.phases?.boys?.startAt ? new Date(r.phases.boys.startAt.seconds * 1000).toLocaleString() : 'Not set'}
                        </div>
                      </div>

                      <div style={{ flex: 2, height: 2, background: 'var(--admin-border)', margin: '0 16px', position: 'relative' }}>
                        <div style={{ height: '100%', background: 'var(--admin-primary)', width: status.phase === 'boys' ? '50%' : (status.phase === 'girls' ? '100%' : '0%') }}></div>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 8, height: 8, borderRadius: '50%', background: 'var(--admin-text-muted)' }}></div>
                      </div>

                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#f472b6' }}>Girls Phase</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                          {r.phases?.girls?.startAt ? new Date(r.phases.girls.startAt.seconds * 1000).toLocaleString() : 'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid cols-2" style={{ gap: 24 }}>
                    {/* Boys Phase Control */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0' }}>Boys Phase Times</h4>
                      <div className="stack" style={{ gap: 8 }}>
                        <input
                          className="input"
                          type="datetime-local"
                          value={phaseTimes.boys?.startAt ? new Date(phaseTimes.boys.startAt.seconds * 1000).toISOString().slice(0, 16) : ''}
                          onChange={e => setPhaseTimesState(prev => ({ ...prev, boys: { ...prev.boys, startAt: e.target.value } }))}
                        />
                        <input
                          className="input"
                          type="datetime-local"
                          value={phaseTimes.boys?.endAt ? new Date(phaseTimes.boys.endAt.seconds * 1000).toISOString().slice(0, 16) : ''}
                          onChange={e => setPhaseTimesState(prev => ({ ...prev, boys: { ...prev.boys, endAt: e.target.value } }))}
                        />
                        <button className="btn btn-sm btn-primary" onClick={() => handlePhaseTimeUpdate('boys', phaseTimes.boys?.startAt, phaseTimes.boys?.endAt)}>Update Boys Phase</button>
                      </div>
                    </div>

                    {/* Girls Phase Control */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0' }}>Girls Phase Times</h4>
                      <div className="stack" style={{ gap: 8 }}>
                        <input
                          className="input"
                          type="datetime-local"
                          value={phaseTimes.girls?.startAt ? new Date(phaseTimes.girls.startAt.seconds * 1000).toISOString().slice(0, 16) : ''}
                          onChange={e => setPhaseTimesState(prev => ({ ...prev, girls: { ...prev.girls, startAt: e.target.value } }))}
                        />
                        <input
                          className="input"
                          type="datetime-local"
                          value={phaseTimes.girls?.endAt ? new Date(phaseTimes.girls.endAt.seconds * 1000).toISOString().slice(0, 16) : ''}
                          onChange={e => setPhaseTimesState(prev => ({ ...prev, girls: { ...prev.girls, endAt: e.target.value } }))}
                        />
                        <button className="btn btn-sm btn-primary" onClick={() => handlePhaseTimeUpdate('girls', phaseTimes.girls?.startAt, phaseTimes.girls?.endAt)}>Update Girls Phase</button>
                      </div>
                    </div>
                  </div>

                  {/* Sync Action */}
                  {r.isActive && (
                    <div style={{ marginTop: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14 }}>Sync approved males to this round</span>
                      <button className="btn btn-xs btn-primary" onClick={onSync} disabled={syncing}>
                        {syncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div >
    </div >
  )
}
