import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import { useState } from 'react'

export default function PaymentsAdminRepairButton({ uid }: { uid: string }) {
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      const fn = httpsCallable(functions, 'repairUserSubscription')
      const res: any = await fn({ uid })
      alert(res?.data?.repaired ? `Subscription repaired. Quota: ${res.data.totalQuota}` : (res?.data?.message || 'No change'))
    } catch (e: any) {
      alert(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }
  return <button className="btn" onClick={go} disabled={busy}>{busy ? 'Repairing…' : 'Repair subscription'}</button>
}