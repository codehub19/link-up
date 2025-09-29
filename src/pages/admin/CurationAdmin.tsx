import React, { useEffect, useMemo, useState } from 'react'
import AdminGuard from './AdminGuard'
import { getActiveRound } from '../../services/rounds'
import { listFemaleUsers } from '../../services/admin'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { getAssignments, setAssignments } from '../../services/assignments'
import { listLikesByGirl } from '../../services/likes'
import { createMatch } from '../../services/matches'

type UserLite = { uid: string; name?: string; instagramId?: string; photoUrl?: string; bio?: string }

export default function CurationAdmin(){
  const [activeRound, setActiveRound] = useState<any|null>(null)
  const [girls, setGirls] = useState<UserLite[]>([])
  const [selectedGirl, setSelectedGirl] = useState<UserLite | null>(null)
  const [verifiedMaleUids, setVerifiedMaleUids] = useState<string[]>([])
  const [verifiedMales, setVerifiedMales] = useState<UserLite[]>([])
  const [assigned, setAssigned] = useState<string[]>([])
  const [likes, setLikes] = useState<any[]>([])
  const roundId = activeRound?.id

  useEffect(()=>{ (async ()=>{
    const r = await getActiveRound()
    setActiveRound(r)
    if (r) {
      const roundSnap = await getDoc(doc(db, 'matchingRounds', r.id))
      const males = (roundSnap.data() as any)?.participatingMales || []
      setVerifiedMaleUids(males)
      const profiles: UserLite[] = []
      for (const uid of males.slice(0, 200)) {
        const u = await getDoc(doc(db, 'users', uid))
        if (u.exists()) profiles.push({ uid, ...(u.data() as any) })
      }
      setVerifiedMales(profiles)
    }
    const gs = await listFemaleUsers()
    setGirls(gs as any)
  })() }, [])

  useEffect(()=>{ (async ()=>{
    if (!roundId || !selectedGirl) { setAssigned([]); setLikes([]); return }
    const a = await getAssignments(roundId, selectedGirl.uid)
    setAssigned(a.maleCandidates || [])
    const l = await listLikesByGirl(roundId, selectedGirl.uid)
    setLikes(l)
  })() }, [roundId, selectedGirl])

  async function persistAssignments(){
    if (!roundId || !selectedGirl) return
    await setAssignments(roundId, selectedGirl.uid, assigned)
    alert('Assignments saved')
  }

  async function promoteLike(maleUid: string){
    if (!roundId || !selectedGirl) return
    await createMatch(roundId, maleUid, selectedGirl.uid)
    alert('Match created')
  }

  const assignedSet = useMemo(()=> new Set(assigned), [assigned])

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:1200}}>
          <h2 style={{marginTop:0}}>Round Curation</h2>
          {!activeRound ? <p>No active round</p> : <p style={{color:'var(--muted)'}}>Active round: <b>{roundId}</b></p>}

          <div className="row" style={{gap:16, alignItems:'flex-start', flexWrap:'wrap'}}>
            <div className="card" style={{padding:16, width:320, maxHeight:480, overflow:'auto'}}>
              <b>Girls</b>
              <div className="stack" style={{marginTop:8}}>
                {girls.map(g => (
                  <button
                    key={g.uid}
                    className="btn btn-ghost"
                    onClick={()=> setSelectedGirl(g)}
                    style={{justifyContent:'flex-start'}}
                  >
                    {g.name || g.uid}
                    {g.instagramId ? <span style={{marginLeft:8, color:'var(--muted)'}}>@{g.instagramId}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{padding:16, flex:1, minWidth:320}}>
              {!selectedGirl ? <p>Select a girl to curate</p> : (
                <>
                  <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <h3 style={{margin:'6px 0'}}>{selectedGirl.name || selectedGirl.uid}</h3>
                      {selectedGirl.instagramId ? <div style={{color:'var(--muted)'}}>@{selectedGirl.instagramId}</div> : null}
                    </div>
                    <button className="btn btn-primary" onClick={persistAssignments}>Save assignments</button>
                  </div>

                  <div className="row" style={{gap:16, flexWrap:'wrap', marginTop:12}}>
                    <div className="card" style={{padding:12, flex:1, minWidth:260}}>
                      <b>Approved males (click to toggle)</b>
                      <div className="stack" style={{marginTop:8}}>
                        {verifiedMales.map(m => (
                          <button key={m.uid}
                            className={`btn ${assignedSet.has(m.uid) ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={()=>{
                              setAssigned(prev => assignedSet.has(m.uid) ? prev.filter(x=>x!==m.uid) : [...prev, m.uid])
                            }}
                            style={{justifyContent:'flex-start'}}
                          >
                            {m.name || m.uid}
                          </button>
                        ))}
                        {verifiedMales.length === 0 ? <div style={{color:'var(--muted)'}}>No approved males yet.</div> : null}
                      </div>
                    </div>

                    <div className="card" style={{padding:12, flex:1, minWidth:260}}>
                      <b>Girl’s likes in this round</b>
                      <div className="stack" style={{marginTop:8}}>
                        {likes.map(l => (
                          <div key={l.id} className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                            <div>Liked male: <code>{l.likedUserUid}</code></div>
                            <button className="btn btn-primary" onClick={()=>promoteLike(l.likedUserUid)}>Promote to match</button>
                          </div>
                        ))}
                        {likes.length === 0 ? <div style={{color:'var(--muted)'}}>No likes yet.</div> : null}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}