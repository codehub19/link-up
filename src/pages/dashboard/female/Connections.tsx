import Navbar from '../../../components/Navbar'
import FemaleTabs from '../../../components/FemaleTabs'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../state/AuthContext'
import { Link } from 'react-router-dom'

type Match = {
  id: string
  participants: string[]
  boyUid: string
  girlUid: string
  status: 'confirmed'
}

type UserDoc = {
  uid: string
  name: string
  instagramId: string
  photoUrl?: string
  bio?: string
  interests?: string[]
}

export default function Connections() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [users, setUsers] = useState<Record<string, UserDoc>>({})

  useEffect(() => {
    if (!user) return
    const run = async () => {
      const ms = await getDocs(query(collection(db, 'matches'), where('participants', 'array-contains', user.uid)))
      const mds: Match[] = ms.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setMatches(mds)

      const ids = Array.from(new Set(mds.map((m) => (m.girlUid === user.uid ? m.boyUid : m.girlUid))))
      const snaps = await Promise.all(
        ids.map(async (uid) => {
          const r = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
          return r.docs[0]
        })
      )
      const map: Record<string, UserDoc> = {}
      for (const d of snaps) {
        if (d) {
          const data = d.data() as UserDoc
          map[data.uid] = data
        }
      }
      setUsers(map)
    }
    run()
  }, [user])

  if (!user) return null

  return (
    <>
      <Navbar />
      <div className="container">
        <FemaleTabs />
        <h2>My Connections</h2>
        <div className="grid cols-3">
          {matches.map((m) => {
            const peerUid = m.girlUid === user.uid ? m.boyUid : m.girlUid
            const other = users[peerUid]
            if (!other) return null
            return (
              <div key={m.id} className="card">
                <div className="card-media">
                  {other.photoUrl ? <img src={other.photoUrl} /> : <div className="media-placeholder" />}
                </div>
                <div className="card-body">
                  <div className="row">
                    <strong>{other.name}</strong>
                    <span>@{other.instagramId}</span>
                  </div>
                  <p className="bio">{other.bio}</p>
                  <div className="tags">
                    {(other.interests ?? []).map((i) => <span key={i} className="tag">{i}</span>)}
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    {/* Open chat with the correct peer */}
                    <Link className="btn primary" to={`/dashboard/chat?with=${encodeURIComponent(peerUid)}`}>
                      Chat
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {matches.length === 0 && <div className="empty">No connections yet. Likes you send will appear here if he selects you back.</div>}
      </div>
    </>
  )
}