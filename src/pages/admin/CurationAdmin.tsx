import React, { useEffect, useMemo, useState } from 'react'
import AdminGuard from './AdminGuard'
import { getActiveRound } from '../../services/rounds'
import { listFemaleUsers } from '../../services/admin'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { getAssignments, setAssignments } from '../../services/assignments'
import { listLikesByGirl } from '../../services/likes'
import { callAdminPromoteMatch } from '../../firebase'
import AdminHeader from '../../components/admin/AdminHeader'

type UserLite = {
  uid: string
  name?: string
  instagramId?: string
  college?: string
  photoUrl?: string
  bio?: string
  interests?: string[]
}

export default function CurationAdmin(){
  const [activeRound, setActiveRound] = useState<any|null>(null)
  const [girls, setGirls] = useState<UserLite[]>([])
  const [filter, setFilter] = useState('')
  const [selectedGirl, setSelectedGirl] = useState<UserLite | null>(null)
  const [verifiedMales, setVerifiedMales] = useState<UserLite[]>([])
  const [assigned, setAssigned] = useState<string[]>([])
  const [likes, setLikes] = useState<any[]>([])
  const [likedMales, setLikedMales] = useState<UserLite[]>([])
  const roundId = activeRound?.id

  useEffect(()=>{ (async ()=>{
    const r = await getActiveRound()
    setActiveRound(r)
    if (r) {
      const roundSnap = await getDoc(doc(db, 'matchingRounds', r.id))
      const males: string[] = (roundSnap.data() as any)?.participatingMales || []
      const profiles: UserLite[] = []
      for (const uid of males) {
        const u = await getDoc(doc(db, 'users', uid))
        if (u.exists()) profiles.push({ uid, ...(u.data() as any) })
      }
      setVerifiedMales(profiles)
    }
    const gs = await listFemaleUsers()
    setGirls(gs as any)
  })() }, [])

  useEffect(()=>{ (async ()=>{
    if (!roundId || !selectedGirl) { setAssigned([]); setLikes([]); setLikedMales([]); return }
    const a = await getAssignments(roundId, selectedGirl.uid)
    setAssigned(a.maleCandidates || [])

    const l = await listLikesByGirl(roundId, selectedGirl.uid)
    setLikes(l)

    const uniqueBoyUids = Array.from(new Set((l || []).map((x: any) => x.likedUserUid)))
    const likedProfiles: UserLite[] = []
    for (const uid of uniqueBoyUids) {
      const u = await getDoc(doc(db, 'users', uid))
      if (u.exists()) likedProfiles.push({ uid, ...(u.data() as any) })
    }
    setLikedMales(likedProfiles)
  })() }, [roundId, selectedGirl])

  async function persistAssignments(){
    if (!roundId || !selectedGirl) return
    await setAssignments(roundId, selectedGirl.uid, assigned)
    alert('Assignments saved')
  }

  async function promoteLike(maleUid: string){
    if (!roundId || !selectedGirl) return
    await callAdminPromoteMatch({ roundId, boyUid: maleUid, girlUid: selectedGirl.uid })
    alert('Match created')
  }

  const assignedSet = useMemo(()=> new Set(assigned), [assigned])
  const filteredGirls = useMemo(
    () => girls.filter(g =>
      (g.name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (g.instagramId || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [girls, filter]
  )

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{padding:24, margin:'24px auto', maxWidth:1300}}>
          <AdminHeader current="curation" />
          <h2 style={{marginTop:0}}>Round Curation</h2>
          {!activeRound ? <p>No active round</p> : <p style={{color:'var(--muted)'}}>Active round: <b>{roundId}</b></p>}

          <div className="row" style={{gap:16, alignItems:'flex-start', flexWrap:'wrap'}}>
            <div className="card" style={{padding:16, width:340, maxHeight:560, overflow:'auto'}}>
              <div className="row" style={{justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <b>Girls</b>
                <input
                  className="input"
                  placeholder="Search by name or insta"
                  style={{maxWidth:180}}
                  value={filter}
                  onChange={(e)=> setFilter(e.target.value)}
                />
              </div>
              <div className="stack">
                {filteredGirls.map(g => (
                  <button
                    key={g.uid}
                    className={`btn ${selectedGirl?.uid === g.uid ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={()=> setSelectedGirl(prev => prev?.uid === g.uid ? null : g)}
                    style={{justifyContent:'flex-start'}}
                  >
                    <div className="row" style={{gap:10, alignItems:'center'}}>
                      <div className="avatar" style={{width:28, height:28, borderRadius:999, overflow:'hidden', background:'#f3f3f3'}}>
                        {g.photoUrl ? <img src={g.photoUrl} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : null}
                      </div>
                      <div>
                        <div>{g.name || g.uid}</div>
                        <small style={{color:'var(--muted)'}}>@{g.instagramId}</small>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{padding:16, flex:1, minWidth:420}}>
              {!selectedGirl ? <p>Select a girl to curate</p> : (
                <>
                  <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                    <div className="row" style={{gap:12, alignItems:'center'}}>
                      <div className="avatar" style={{width:56, height:56, borderRadius:999, overflow:'hidden', background:'#f3f3f3'}}>
                        {selectedGirl.photoUrl ? <img src={selectedGirl.photoUrl} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : null}
                      </div>
                      <div>
                        <div style={{fontWeight:700}}>{selectedGirl.name || selectedGirl.uid}</div>
                        <div style={{color:'var(--muted)'}}>@{selectedGirl.instagramId} {selectedGirl.college ? `• ${selectedGirl.college}` : ''}</div>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={persistAssignments}>Save assignments</button>
                  </div>

                  <div className="row" style={{gap:16, flexWrap:'wrap', marginTop:12}}>
                    <div className="card" style={{padding:12, flex:1, minWidth:320}}>
                      <b>Approved males (toggle to assign)</b>
                      <div className="grid cols-2" style={{gap:8, marginTop:8}}>
                        {verifiedMales.map(m => (
                          <div key={m.uid} className={`card ${assignedSet.has(m.uid) ? 'selected' : ''}`} style={{padding:10}}>
                            <div className="row" style={{gap:10}}>
                              <div className="avatar" style={{width:44, height:44, borderRadius:8, overflow:'hidden', background:'#f3f3f3'}}>
                                {m.photoUrl ? <img src={m.photoUrl} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : null}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:600}}>{m.name || m.uid}</div>
                                <small style={{color:'var(--muted)'}}>@{m.instagramId}{m.college ? ` • ${m.college}` : ''}</small>
                                {m.bio ? <div style={{fontSize:12, marginTop:6, color:'var(--muted)'}}>{m.bio}</div> : null}
                                <div className="row" style={{gap:6, flexWrap:'wrap', marginTop:6}}>
                                  {(m.interests ?? []).slice(0,4).map(i => <span key={i} className="tag">{i}</span>)}
                                </div>
                              </div>
                              <div>
                                <input
                                  type="checkbox"
                                  checked={assignedSet.has(m.uid)}
                                  onChange={()=>{
                                    setAssigned(prev => assignedSet.has(m.uid) ? prev.filter(x=>x!==m.uid) : [...prev, m.uid])
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {verifiedMales.length === 0 ? <div style={{color:'var(--muted)'}}>No approved males yet.</div> : null}
                      </div>
                    </div>

                    <div className="card" style={{padding:12, flex:1, minWidth:320}}>
                      <b>Girl’s likes (this round)</b>
                      <div className="grid cols-2" style={{gap:8, marginTop:8}}>
                        {likedMales.map(m => (
                          <div key={m.uid} className="card" style={{padding:10}}>
                            <div className="row" style={{gap:10}}>
                              <div className="avatar" style={{width:44, height:44, borderRadius:8, overflow:'hidden', background:'#f3f3f3'}}>
                                {m.photoUrl ? <img src={m.photoUrl} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : null}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:600}}>{m.name || m.uid}</div>
                                <small style={{color:'var(--muted)'}}>@{m.instagramId}{m.college ? ` • ${m.college}` : ''}</small>
                              </div>
                              <div>
                                <button className="btn btn-primary" onClick={()=>promoteLike(m.uid)}>Promote</button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {likedMales.length === 0 ? <div style={{color:'var(--muted)'}}>No likes yet.</div> : null}
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