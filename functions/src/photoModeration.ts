import { isAdminRequest } from './adminAuth'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { sendPushToUsers } from './push'
import { notifyUser } from './notify'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const REGION = 'asia-south2'

/*
 * Profile photo moderation.
 *
 * Every new profile photo is checked with Google Cloud Vision SafeSearch
 * (enable "Cloud Vision API" once in Google Cloud Console for this project).
 *  - Clear nudity or gore  → removed from the profile at once, the user is told,
 *                            and it goes to Admin → Photo review.
 *  - Borderline            → stays up but goes to Admin → Photo review.
 * Results are cached in photoChecks/{hash of URL}, so putting a removed photo
 * back gets it removed again without another Vision call.
 */

type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'
type SafeSearch = { adult?: Likelihood; violence?: Likelihood; racy?: Likelihood; medical?: Likelihood; spoof?: Likelihood }
type Verdict = 'ok' | 'review' | 'block'

const LEVEL: Record<Likelihood, number> = { UNKNOWN: 0, VERY_UNLIKELY: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, VERY_LIKELY: 5 }

export function verdictFor(s: SafeSearch): Verdict {
  const adult = LEVEL[s.adult || 'UNKNOWN']
  const violence = LEVEL[s.violence || 'UNKNOWN']
  const racy = LEVEL[s.racy || 'UNKNOWN']
  if (adult >= 4 || violence >= 5) return 'block'
  if (adult >= 3 || violence >= 4 || racy >= 5) return 'review'
  return 'ok'
}

const hash = (url: string) => crypto.createHash('sha1').update(url).digest('hex')

/** "…/o/users%2Fabc%2Fprofile_images%2Fprofile_0.jpg?alt=media&token=…" → storage path */
function storagePath(url: string): string | null {
  const m = /\/o\/([^?]+)/.exec(url)
  return m ? decodeURIComponent(m[1]) : null
}

async function safeSearch(url: string): Promise<SafeSearch | null> {
  let content: string
  const path = storagePath(url)
  try {
    if (path) {
      const [buf] = await admin.storage().bucket().file(path).download()
      content = buf.toString('base64')
    } else {
      const res = await fetch(url)
      if (!res.ok) return null
      content = Buffer.from(await res.arrayBuffer()).toString('base64')
    }
  } catch (e: any) {
    logger.warn('photo download failed', { url, error: e?.message })
    return null
  }
  const token = await admin.credential.applicationDefault().getAccessToken()
  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content }, features: [{ type: 'SAFE_SEARCH_DETECTION' }] }] }),
  })
  if (!res.ok) {
    logger.error('Vision API failed (is the Cloud Vision API enabled?)', res.status, await res.text().catch(() => ''))
    return null
  }
  const json: any = await res.json()
  return (json?.responses?.[0]?.safeSearchAnnotation || null) as SafeSearch | null
}

async function adminUids() {
  const snap = await db.collection('users').where('isAdmin', '==', true).select().get()
  return snap.docs.map((d) => d.id)
}

/** Remove photo URLs from a user's profile; hides the profile if no photo is left. */
async function removePhotos(uid: string, bad: string[]) {
  const ref = db.collection('users').doc(uid)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const d = snap.data() || {}
    const urls: string[] = (Array.isArray(d.photoUrls) ? d.photoUrls : [d.photoUrl]).filter((u: any) => u && !bad.includes(u))
    tx.set(ref, {
      photoUrls: urls,
      photoUrl: urls[0] || null,
      // No photo left: their avatar is shown in Friends (dating needs a photo again)
      photoHidden: false,
      photoRemovedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })
}

export const onUserPhotosChanged = onDocumentWritten(
  { document: 'users/{uid}', region: REGION, memory: '512MiB' },
  async (event) => {
    const after = event.data?.after.data()
    if (!after) return
    const before = event.data?.before.data() || {}
    const uid = event.params.uid
    const list = (d: any): string[] => [...new Set([...(Array.isArray(d.photoUrls) ? d.photoUrls : []), d.photoUrl].filter((u) => typeof u === 'string' && u))]
    const old = new Set(list(before))
    const added = list(after).filter((u) => !old.has(u))

    if (!added.length) return

    const block: string[] = []
    let flagged = 0
    for (const url of added) {
      const checkRef = db.collection('photoChecks').doc(hash(url))
      const cached = await checkRef.get()
      let verdict: Verdict
      let scores: SafeSearch | null = null
      if (cached.exists) {
        // An admin decision wins over the automatic one
        verdict = (cached.get('decision') || cached.get('verdict')) as Verdict
      } else {
        scores = await safeSearch(url)
        if (!scores) continue // Vision not set up / failed: let it through rather than block people
        verdict = verdictFor(scores)
        await checkRef.set({ uid, url, verdict, scores, checkedAt: admin.firestore.FieldValue.serverTimestamp() })
        if (verdict !== 'ok') {
          await db.collection('photoReviews').doc(hash(url)).set({
            uid, url, verdict, scores, name: after.name || null,
            status: verdict === 'block' ? 'removed' : 'pending', reviewed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          flagged++
        }
      }
      if (verdict === 'block') block.push(url)
    }

    if (block.length) {
      await removePhotos(uid, block)
      await notifyUser(uid, {
        title: 'A photo was removed',
        body: 'One of your profile photos looks like it breaks our Community Guidelines (no nudity or violence), so we removed it. Please add a different photo.',
        link: '/dashboard/edit-profile',
      })
      logger.info('removed profile photos', { uid, count: block.length })
    } else if (after.photoHidden === true) {
      await event.data!.after.ref.set({ photoHidden: false }, { merge: true })
    }

    if (flagged) {
      const admins = await adminUids()
      await sendPushToUsers(admins, 'Photo to review', `${after.name || 'A user'}'s new photo was flagged`, '/admin/photos').catch(() => 0)
    }
  }
)

/** Admin decision on a flagged photo: 'approve' (put it back / keep it) or 'remove'. */
export const reviewPhoto = onCall({ region: REGION }, async (req) => {
  if (!(await isAdminRequest(req))) throw new HttpsError('permission-denied', 'Admin only')
  const { id, decision } = (req.data || {}) as { id?: string; decision?: 'approve' | 'remove' }
  if (!id || (decision !== 'approve' && decision !== 'remove')) throw new HttpsError('invalid-argument', 'id and decision required')

  const reviewRef = db.collection('photoReviews').doc(id)
  const review = (await reviewRef.get()).data()
  if (!review) throw new HttpsError('not-found', 'Review not found')
  const { uid, url } = review as { uid: string; url: string }

  await db.collection('photoChecks').doc(id).set({ decision: decision === 'approve' ? 'ok' : 'block', decidedBy: req.auth!.uid }, { merge: true })

  if (decision === 'remove') {
    await removePhotos(uid, [url])
    if (review.status !== 'removed') {
      await notifyUser(uid, {
        title: 'A photo was removed',
        body: 'One of your profile photos breaks our Community Guidelines, so we removed it. Please add a different photo.',
        link: '/dashboard/edit-profile',
      })
    }
    // Delete the file only if it's still this photo (the same path may hold a newer upload)
    const path = storagePath(url)
    const token = /[?&]token=([^&]+)/.exec(url)?.[1]
    if (path && token) {
      const file = admin.storage().bucket().file(path)
      const [meta] = await file.getMetadata().catch(() => [null as any])
      const tokens = String(meta?.metadata?.firebaseStorageDownloadTokens || '').split(',')
      if (tokens.includes(token)) await file.delete().catch(() => { })
    }
  } else if (review.status === 'removed') {
    // Wrongly removed: put it back if they haven't replaced it
    const ref = db.collection('users').doc(uid)
    const d = (await ref.get()).data() || {}
    const urls: string[] = Array.isArray(d.photoUrls) ? d.photoUrls : []
    if (!urls.includes(url) && urls.length < 6) {
      await ref.set({ photoUrls: [...urls, url], photoUrl: d.photoUrl || url, photoHidden: false }, { merge: true })
    }
    await notifyUser(uid, { title: 'Your photo is back', body: 'We double-checked a photo we removed and it’s fine — it’s back on your profile. Sorry about that!', link: '/dashboard/edit-profile' })
  }

  await reviewRef.set({ status: decision === 'approve' ? 'approved' : 'removed', decidedBy: req.auth!.uid, decidedAt: admin.firestore.FieldValue.serverTimestamp(), reviewed: true }, { merge: true })
  await db.collection('adminLogs').add({
    adminUid: req.auth!.uid, action: `photo_${decision}`, targetUid: uid, details: { id },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { })
  return { ok: true }
})
