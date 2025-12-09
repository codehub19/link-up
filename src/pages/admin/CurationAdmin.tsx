import React, { useEffect, useMemo, useState } from 'react'
import AdminGuard from './AdminGuard'
import {
  getActiveRound,
  getRoundPhase,
  setRoundPhase,
  getAssignedGirlsForBoy,
  getAssignedBoysForGirl,
  assignGirlsToBoy,
  assignBoysToGirl,
  getPhaseTimes,
} from '../../services/rounds'
import { listFemaleUsers } from '../../services/admin'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { listLikesByGirl, getBoysWhoLikedGirl } from '../../services/likes'
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
  gender?: 'male' | 'female'
  userType?: 'college' | 'general'
  datingPreference?: 'college_only' | 'open_to_all'
}

export default function CurationAdmin() {
  const [activeRound, setActiveRound] = useState<any | null>(null)
  const [phase, setPhase] = useState<'boys' | 'girls'>('boys')
  const [girls, setGirls] = useState<UserLite[]>([])
  const [boys, setBoys] = useState<UserLite[]>([])
  const [filter, setFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserLite | null>(null)
  const [assigned, setAssigned] = useState<string[]>([])
  const [likes, setLikes] = useState<any[]>([])
  const [likedUsers, setLikedUsers] = useState<UserLite[]>([])
  const [phaseTimes, setPhaseTimesState] = useState<{ boys?: any, girls?: any }>({})
  const roundId = activeRound?.id

  // NEW: Keep track of previously matched UIDs for this selected user
  const [previouslyMatchedUids, setPreviouslyMatchedUids] = useState<Set<string>>(new Set())

  // Load active round, phase, and phase times
  useEffect(() => {
    (async () => {
      const r = await getActiveRound()
      setActiveRound(r)
      if (r) {
        const ph = await getRoundPhase(r.id)
        setPhase(ph)
        const roundSnap = await getDoc(doc(db, 'matchingRounds', r.id))
        const males: string[] = (roundSnap.data() as any)?.participatingMales || []
        const malesProfiles: UserLite[] = []
        for (const uid of males) {
          const u = await getDoc(doc(db, 'users', uid))
          if (u.exists()) {
            const data = u.data() as any
            if (data?.gender === 'male') {
              malesProfiles.push({ uid, ...(data as any) })
            }
          }
        }
        setBoys(malesProfiles)
        // Load phase times
        const pt = await getPhaseTimes(r.id)
        setPhaseTimesState(pt)
      }
      const gs = await listFemaleUsers()
      setGirls(gs as any)
    })()
  }, [])

  // Load assignments and likes for selected user based on phase
  useEffect(() => {
    (async () => {
      if (!roundId || !selectedUser) {
        setAssigned([])
        setLikes([])
        setLikedUsers([])
        setPreviouslyMatchedUids(new Set())
        return
      }
      if (phase === 'boys' && selectedUser.gender === 'male') {
        // Boys round: assign girls to boy
        const assignedGirls = await getAssignedGirlsForBoy(roundId, selectedUser.uid)
        setAssigned(assignedGirls)
        setLikedUsers([]) // not relevant

        // NEW: Find previously matched girls for this boy
        const matchesSnap = await getDocs(query(
          collection(db, 'matches'),
          where('participants', 'array-contains', selectedUser.uid)
        ))
        const prevMatchedGirls = matchesSnap.docs
          .map(doc => doc.data())
          .filter(m => m.roundId !== roundId)
          .map(m => m.participants.find((uid: string) => uid !== selectedUser.uid))
          .filter(uid => !!uid)
        setPreviouslyMatchedUids(new Set(prevMatchedGirls))

      } else if (phase === 'girls' && selectedUser.gender === 'female') {
        // Girls round: assign boys (from likes) to girl
        const assignedBoys = await getAssignedBoysForGirl(roundId, selectedUser.uid)
        setAssigned(assignedBoys)
        // Get boys who liked this girl
        const likedBoyUids = await getBoysWhoLikedGirl(roundId, selectedUser.uid)
        const likedProfiles: UserLite[] = []
        for (const uid of likedBoyUids) {
          const u = await getDoc(doc(db, 'users', uid))
          if (u.exists()) {
            const data = u.data() as any
            if (data?.gender === 'male') {
              likedProfiles.push({ uid, ...(data as any) })
            }
          }
        }
        setLikedUsers(likedProfiles)

        // NEW: Find previously matched boys for this girl
        const matchesSnap = await getDocs(query(
          collection(db, 'matches'),
          where('participants', 'array-contains', selectedUser.uid)
        ))
        const prevMatchedBoys = matchesSnap.docs
          .map(doc => doc.data())
          .filter(m => m.roundId !== roundId)
          .map(m => m.participants.find((uid: string) => uid !== selectedUser.uid))
          .filter(uid => !!uid)
        setPreviouslyMatchedUids(new Set(prevMatchedBoys))

      } else {
        setAssigned([])
        setLikedUsers([])
        setPreviouslyMatchedUids(new Set())
      }
    })()
  }, [roundId, selectedUser, phase])

  async function persistAssignments() {
    if (!roundId || !selectedUser) return
    if (phase === 'boys' && selectedUser.gender === 'male') {
      await assignGirlsToBoy(roundId, selectedUser.uid, assigned)
    } else if (phase === 'girls' && selectedUser.gender === 'female') {
      await assignBoysToGirl(roundId, selectedUser.uid, assigned)
    }
    alert('Assignments saved')
  }

  async function promoteLike(boyUid: string) {
    if (!roundId || !selectedUser) return
    await callAdminPromoteMatch({ roundId, boyUid, girlUid: selectedUser.uid })
    alert('Match created')
  }

  // Phase switcher
  async function handlePhaseSwitch(newPhase: 'boys' | 'girls') {
    // Only allow switching to girls phase if boys phase has ended
    if (!roundId) return
    if (newPhase === 'girls') {
      if (!phaseTimes.boys?.endAt) {
        alert('Please set Boys round end time before starting Girls round.')
        return
      }
    }
    await setRoundPhase(roundId, newPhase)
    setPhase(newPhase)
    setSelectedUser(null)
    setAssigned([])
    setLikedUsers([])
    setPreviouslyMatchedUids(new Set())
  }

  const assignedSet = useMemo(() => new Set(assigned), [assigned])

  // Filter users to display in left panel
  const filteredUsers = useMemo(() => {
    if (phase === 'boys') {
      return boys.filter(b =>
        (b.name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (b.instagramId || '').toLowerCase().includes(filter.toLowerCase())
      )
    } else {
      return girls.filter(g =>
        (g.name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (g.instagramId || '').toLowerCase().includes(filter.toLowerCase())
      )
    }
  }, [boys, girls, filter, phase])

  // Filter candidates based on Dating Preference
  const filteredCandidates = useMemo(() => {
    let candidates = phase === 'boys' ? girls : likedUsers

    if (!selectedUser) return []

    // If selected user is a student who wants "College Only"
    // Filter out General users from the candidates
    if (selectedUser.userType !== 'general' && selectedUser.datingPreference === 'college_only') {
      candidates = candidates.filter(c => c.userType !== 'general')
    }

    // If selected user is General, they are open to all (default)
    // But we might want to check if the candidate (college student) is open to general?
    // The requirement says: "if they select anyone option then show their profile to general users too else keep them seperate"
    // This implies:
    // - If Student is 'college_only', they should NOT see General users (Handled above)
    // - If Student is 'college_only', General users should NOT see them (Handled here)

    // Reverse check: Filter out candidates who are 'college_only' students if the selected user is 'general'
    if (selectedUser.userType === 'general') {
      candidates = candidates.filter(c =>
        !(c.userType !== 'general' && c.datingPreference === 'college_only')
      )
    }

    return candidates
  }, [phase, girls, likedUsers, selectedUser])

  return (
    <AdminGuard>
      <div className="container">
        <div className="card" style={{ padding: 24, margin: '24px auto', maxWidth: 1300 }}>
          <AdminHeader current="curation" />
          <h2 style={{ marginTop: 0 }}>Round Curation</h2>
          {!activeRound ? (
            <p>No active round</p>
          ) : (
            <p style={{ color: 'var(--muted)' }}>
              Active round: <b>{roundId}</b> | Current phase: <b>{phase.toUpperCase()}</b>
              <span style={{ marginLeft: 20 }}>
                <button
                  className={`btn ${phase === 'boys' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handlePhaseSwitch('boys')}
                  disabled={phase === 'boys'}
                >
                  Boys Round
                </button>
                <button
                  className={`btn ${phase === 'girls' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handlePhaseSwitch('girls')}
                  disabled={phase === 'girls'}
                  style={{ marginLeft: 8 }}
                >
                  Girls Round
                </button>
              </span>
              {/* Show phase times */}
              <div style={{ marginTop: 8 }}>
                <span><b>Boys Round:</b> {phaseTimes.boys?.startAt ? new Date(phaseTimes.boys.startAt.seconds * 1000).toLocaleString() : '--'} to {phaseTimes.boys?.endAt ? new Date(phaseTimes.boys.endAt.seconds * 1000).toLocaleString() : '--'}</span>
                <span style={{ marginLeft: 12 }}><b>Girls Round:</b> {phaseTimes.girls?.startAt ? new Date(phaseTimes.girls.startAt.seconds * 1000).toLocaleString() : '--'} to {phaseTimes.girls?.endAt ? new Date(phaseTimes.girls.endAt.seconds * 1000).toLocaleString() : '--'}</span>
              </div>
            </p>
          )}

          <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: 16, width: 340, maxHeight: 560, overflow: 'auto' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b>{phase === 'boys' ? 'Boys' : 'Girls'}</b>
                <input
                  className="input"
                  placeholder="Search by name or insta"
                  style={{ maxWidth: 180 }}
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
              <div className="stack">
                {filteredUsers.map(u => (
                  <button
                    key={u.uid}
                    className={`btn ${selectedUser?.uid === u.uid ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSelectedUser(prev => prev?.uid === u.uid ? null : u)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 28, height: 28, borderRadius: 999, overflow: 'hidden', background: '#f3f3f3' }}>
                        {u.photoUrl ? <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      </div>
                      <div>
                        <div>{u.name || u.uid}</div>
                        <small style={{ color: 'var(--muted)' }}>@{u.instagramId}</small>
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          {u.userType === 'general' && <span className="tag" style={{ fontSize: 9, padding: '1px 4px', background: '#eee' }}>Gen</span>}
                          {u.datingPreference === 'college_only' && <span className="tag" style={{ fontSize: 9, padding: '1px 4px', background: '#eef' }}>Col-Only</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16, flex: 1, minWidth: 420 }}>
              {!selectedUser ? (
                <p>Select a {phase === 'boys' ? 'boy' : 'girl'} to curate</p>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 56, height: 56, borderRadius: 999, overflow: 'hidden', background: '#f3f3f3' }}>
                        {selectedUser.photoUrl ? <img src={selectedUser.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{selectedUser.name || selectedUser.uid}</div>
                        <div style={{ color: 'var(--muted)' }}>
                          @{selectedUser.instagramId} {selectedUser.college ? `• ${selectedUser.college}` : ''}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {selectedUser.userType === 'general'
                            ? <span className="tag" style={{ background: '#eee' }}>General User</span>
                            : <span className="tag" style={{ background: '#eef' }}>Student</span>
                          }
                          <span className="tag" style={{ marginLeft: 6, background: selectedUser.datingPreference === 'college_only' ? '#ffe' : '#efe' }}>
                            Prefers: {selectedUser.datingPreference === 'college_only' ? 'College Only' : 'Everyone'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={persistAssignments}>Save assignments</button>
                  </div>

                  <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                    <div className="card" style={{ padding: 12, flex: 1, minWidth: 320 }}>
                      <b>
                        {phase === 'boys'
                          ? 'Assign girls to this boy (toggle to assign)'
                          : 'Assign boys to this girl (from her likes, toggle to assign)'}
                      </b>
                      <div className="grid cols-2" style={{ gap: 8, marginTop: 8 }}>
                        {filteredCandidates.map(u => (
                          <div key={u.uid} className={`card ${assignedSet.has(u.uid) ? 'selected' : ''}`} style={{ padding: 10 }}>
                            <div className="row" style={{ gap: 10 }}>
                              <div className="avatar" style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
                                {u.photoUrl ? <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{u.name || u.uid}</div>
                                <small style={{ color: 'var(--muted)' }}>@{u.instagramId}{u.college ? ` • ${u.college}` : ''}</small>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                  {u.userType === 'general' && <span className="tag" style={{ fontSize: 10, padding: '1px 4px', background: '#eee' }}>Gen</span>}
                                  {u.datingPreference === 'college_only' && <span className="tag" style={{ fontSize: 10, padding: '1px 4px', background: '#eef' }}>Col-Only</span>}
                                </div>
                                {u.bio ? <div style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)' }}>{u.bio}</div> : null}
                                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                  {(u.interests ?? []).slice(0, 4).map(i => <span key={i} className="tag">{i}</span>)}
                                </div>
                                {/* NEW: Previously matched tag */}
                                {previouslyMatchedUids.has(u.uid) && (
                                  <span className="tag" style={{ background: '#feecb7', color: '#b77c00', marginLeft: 8 }}>
                                    Matched in previous round
                                  </span>
                                )}
                              </div>
                              <div>
                                <input
                                  type="checkbox"
                                  checked={assignedSet.has(u.uid)}
                                  onChange={() => {
                                    setAssigned(prev => assignedSet.has(u.uid) ? prev.filter(x => x !== u.uid) : [...prev, u.uid])
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredCandidates.length === 0
                          ? <div style={{ color: 'var(--muted)' }}>
                            {phase === 'boys'
                              ? 'No girls available (check filters).'
                              : 'No boys liked this girl yet (or filtered out).'}
                          </div>
                          : null}
                      </div>
                    </div>

                    {phase === 'girls' && (
                      <div className="card" style={{ padding: 12, flex: 1, minWidth: 320 }}>
                        <b>Girl’s likes (this round)</b>
                        <div className="grid cols-2" style={{ gap: 8, marginTop: 8 }}>
                          {likedUsers.map(u => (
                            <div key={u.uid} className="card" style={{ padding: 10 }}>
                              <div className="row" style={{ gap: 10 }}>
                                <div className="avatar" style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
                                  {u.photoUrl ? <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{u.name || u.uid}</div>
                                  <small style={{ color: 'var(--muted)' }}>@{u.instagramId}{u.college ? ` • ${u.college}` : ''}</small>
                                </div>
                                <div>
                                  <button className="btn btn-primary" onClick={() => promoteLike(u.uid)}>Promote</button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {likedUsers.length === 0
                            ? <div style={{ color: 'var(--muted)' }}>No likes yet.</div>
                            : null}
                        </div>
                      </div>
                    )}
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