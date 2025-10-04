import { getFunctions, httpsCallable } from 'firebase/functions'

export async function createOrder(planId: string, amount: number) {
  const fns = getFunctions()
  const fn = httpsCallable(fns, 'createRazorpayOrder')
  const res: any = await fn({ planId, amount })
  return res.data as { orderId: string; amount: number; currency: string; keyId: string }
}

export async function verifyPayment(params: {
  orderId: string
  paymentId: string
  signature: string
  planId: string
  amount: number
}) {
  const fns = getFunctions()
  const fn = httpsCallable(fns, 'verifyRazorpayPayment')
  const res: any = await fn(params)
  return res.data as { success: boolean; paymentDocId: string }
}