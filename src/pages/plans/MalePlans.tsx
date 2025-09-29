import Navbar from '../../../components/Navbar'
import { callJoinMatchingRound } from '../../../firebase'
import { useAuth } from '../../../state/AuthContext'
import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'

type Round = {
  roundId: string
  isActive: boolean
  startDate?: any
  endDate?: any
}

export default function MalePlans() {
  const { profile } = useAuth()
  const [activeRound, setActiveRound] = useState<Round | null>(null)
  const price = 199
  const nav = useNavigate()

  useEffect(() => {
    const fetchActiveRound = async () => {
      const q = query(collection(db, 'matchingRounds'), where('isActive', '==', true), limit(1))
      const snaps = await getDocs(q)
      if (!snaps.empty) setActiveRound(snaps.docs[0].data() as Round)
      else setActiveRound(null)
    }
    fetchActiveRound()
  }, [])

  const purchase = async () => {
    if (!activeRound) return toast.error('No active round right now')
    try {
      const res: any = await callJoinMatchingRound({ roundId: activeRound.roundId })
      if (res?.data?.status === 'ok') toast.success('You have joined the next matching round!')
      else toast.success('Requested to join the matching round')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to join round')
    }
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Plans</h2>
        <div className="grid cols-3">
          <div className="card plan">
            <div className="card-body">
              <h3>Join the Next Matching Round</h3>
              <p>Get your profile featured to hundreds of girls across Delhi NCR. If someone likes your profile, you'll see them in your "My Matches" section.</p>
              <div className="price">₹{price}</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-primary" onClick={() => nav(`/pay?planId=basic&amount=199`)}>
                Purchase Plan
              </button>
              <div className="muted">
                After purchase, you will be added to round: {activeRound?.roundId ?? '—'}
              </div>
              <div className="muted">
                Manage matches in <Link to="/dashboard/matches">My Matches</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}