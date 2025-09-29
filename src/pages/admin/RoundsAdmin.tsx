import React, { useEffect, useState } from 'react'
import { createRound, listRounds, setActiveRound } from '../../services/rounds'
import AdminGuard from './AdminGuard'

export default function RoundsAdmin(){
  const [rounds, setRounds] = useState<any[]>([])
  const [newId, setNewId] = useState('')

  async function refresh(){ setRounds(await listRounds()) }
  useEffect(()=>{ refresh() }, [])

  async function onCreate(e: React.FormEvent){
    e.preventDefault()
    if(!newId.trim()) return
    await createRound(newId.trim())
    setNewId('')
    await refresh()
  }

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:900}}>
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
                  <div className="row" style={{gap:8}}>
                    {!r.isActive ? (
                      <button className="btn btn-primary" onClick={()=> setActiveRound(r.id).then(refresh)}>Activate</button>
                    ) : (
                      <button className="btn btn-ghost" onClick={()=> setActiveRound('').then(refresh)}>Deactivate All</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}