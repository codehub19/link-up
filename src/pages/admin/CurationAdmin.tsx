import React, { useEffect, useMemo, useState } from 'react'

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

    // Manually update hasMatched for referral tracking (since Cloud Fn might not do it)
    try {
      // We strictly update the 'referrals' collection now, not the user profile 'hasMatched'
      const { updateReferralMatchStatus } = await import('../../services/referrals')
      await updateReferralMatchStatus(boyUid)
      await updateReferralMatchStatus(selectedUser.uid)

    } catch (e) {
      console.error("Failed to update matching status locally", e)
    }

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
    <div className="admin-container">
      <div className="row stack-mobile" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0 }}>Round Curation</h2>
        {activeRound && (
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none' }}
              onClick={async () => {
                if (!window.confirm(`Auto-assign 3 random candidates to all unassigned ${phase === 'boys' ? 'boys' : 'girls'}?`)) return;
                try {
                  const { autoMatchUsers } = await import('../../services/rounds'); // Lazy import to avoid circular dep if any
                  const res = await autoMatchUsers(activeRound.id, phase);
                  alert(`Successfully auto-matched ${res.assignedUsersCount} users!`);
                  // Force refresh (a bit hacky, but effective)
                  window.location.reload();
                } catch (e: any) {
                  alert('Error: ' + e.message);
                }
              }}
            >
              🪄 Auto Match
            </button>
            <div style={{ width: 1, background: 'var(--admin-border)', margin: '0 8px' }}></div>
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
            >
              Girls Round
            </button>
          </div>
        )}
      </div>

      {!activeRound ? (
        <div className="admin-card">
          <p>No active round found.</p>
        </div>
      ) : (
        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* Column 1: List (Source) */}
          <div className="admin-card curation-list-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--admin-border)' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{phase === 'boys' ? 'Boys' : 'Girls'}</div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{filteredUsers.length} total</div>
              </div>
              <input
                className="input"
                placeholder="Search..."
                style={{ marginTop: 8 }}
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {filteredUsers.map(u => (
                <div
                  key={u.uid}
                  onClick={() => setSelectedUser(prev => prev?.uid === u.uid ? null : u)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedUser?.uid === u.uid ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: selectedUser?.uid === u.uid ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                    marginBottom: 4
                  }}
                >
                  <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                    <div className="avatar" style={{ width: 32, height: 32, borderRadius: 999, overflow: 'hidden', background: '#333', flexShrink: 0 }}>
                      {u.photoUrl ? <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--admin-text-main)' }}>{u.name || u.uid}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>@{u.instagramId}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Selected Profile */}
          <div className="stack" style={{ gap: 24 }}>
            {selectedUser ? (
              <div className="admin-card">
                <div className="row" style={{ gap: 16 }}>
                  <div className="avatar" style={{ width: 80, height: 80, borderRadius: 999, overflow: 'hidden', background: '#333', flexShrink: 0 }}>
                    {selectedUser.photoUrl ? <img src={selectedUser.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px 0', color: 'var(--admin-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUser.name}</h3>
                    <div className="row" style={{ gap: 8, color: 'var(--admin-text-muted)', fontSize: 14, flexWrap: 'wrap' }}>
                      <span>@{selectedUser.instagramId}</span>
                      <span>•</span>
                      <span>{selectedUser.gender}</span>
                      {selectedUser.college && <><span>•</span><span>{selectedUser.college}</span></>}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selectedUser.userType === 'general'
                        ? <span className="badge badge-neutral">General User</span>
                        : <span className="badge badge-info">Student</span>
                      }
                      <span className="badge badge-warning">
                        Prefers: {selectedUser.datingPreference === 'college_only' ? 'College Only' : 'Everyone'}
                      </span>
                    </div>
                    {selectedUser.bio && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--admin-text-muted)' }}>{selectedUser.bio}</p>}
                    {selectedUser.interests && (
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                        {selectedUser.interests.map(i => (
                          <span key={i} className="badge badge-neutral" style={{ background: 'rgba(255,255,255,0.05)' }}>{i}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--admin-border)', marginTop: 20, paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={persistAssignments}>
                    Save Assignments ({assigned.length})
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-card" style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                Select a user from the left list to view details and manage assignments.
              </div>
            )}

            {selectedUser && (
              <div className="admin-card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600 }}>
                    {phase === 'boys' ? 'Assign candidates (Girls)' : 'Candidates (Boys)'}
                  </div>
                </div>

                <div className="grid cols-2" style={{ gap: 12 }}>
                  {filteredCandidates.map(u => (
                    <div
                      key={u.uid}
                      className="admin-card"
                      style={{ padding: 12, border: assignedSet.has(u.uid) ? '1px solid var(--admin-accent)' : '1px solid var(--admin-border)', cursor: 'pointer' }}
                      onClick={() => {
                        setAssigned(prev => assignedSet.has(u.uid) ? prev.filter(x => x !== u.uid) : [...prev, u.uid])
                      }}
                    >
                      <div className="row" style={{ gap: 10 }}>
                        <div className="avatar" style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#333', flexShrink: 0 }}>
                          {u.photoUrl ? <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>@{u.instagramId}</div>
                          <div style={{ marginTop: 6 }} className="row">
                            {previouslyMatchedUids.has(u.uid) && (
                              <span className="badge badge-warning" style={{ fontSize: 10 }}>Previously Matched</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <input type="checkbox" checked={assignedSet.has(u.uid)} onChange={() => { }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <div style={{ gridColumn: '1/-1', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>
                      No candidates available based on preferences/likes.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Likes / Extra (Right Panel) */}
          <div className="stack" style={{ gap: 24 }}>
            <div className="admin-card">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                Round Info
              </div>
              <div className="stack" style={{ gap: 8, fontSize: 13 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Status</span>
                  <span className="badge badge-success">Active</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Phase</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{phase}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '8px 0' }} />
                <div>
                  <div style={{ color: 'var(--admin-text-muted)', marginBottom: 2 }}>Boys Phase</div>
                  <div>{phaseTimes.boys?.startAt ? new Date(phaseTimes.boys.startAt.seconds * 1000).toLocaleString() : '--'}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>to</div>
                  <div>{phaseTimes.boys?.endAt ? new Date(phaseTimes.boys.endAt.seconds * 1000).toLocaleString() : '--'}</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: 'var(--admin-text-muted)', marginBottom: 2 }}>Girls Phase</div>
                  <div>{phaseTimes.girls?.startAt ? new Date(phaseTimes.girls.startAt.seconds * 1000).toLocaleString() : '--'}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>to</div>
                  <div>{phaseTimes.girls?.endAt ? new Date(phaseTimes.girls.endAt.seconds * 1000).toLocaleString() : '--'}</div>
                </div>
              </div>
            </div>

            {phase === 'girls' && selectedUser && (
              <div className="admin-card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>
                  Likes Received (This Round)
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {likedUsers.map(u => (
                    <div key={u.uid} style={{ fontSize: 13, borderBottom: '1px solid var(--admin-border)', paddingBottom: 8 }}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="row" style={{ gap: 8 }}>
                          <div className="avatar" style={{ width: 24, height: 24, borderRadius: 999, overflow: 'hidden' }}>
                            {u.photoUrl && <img src={u.photoUrl} style={{ width: '100%' }} />}
                          </div>
                          <div>{u.name}</div>
                        </div>
                        <button className="btn btn-xs btn-primary" onClick={() => promoteLike(u.uid)}>Promote</button>
                      </div>
                    </div>
                  ))}
                  {likedUsers.length === 0 && <div style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No likes found.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
