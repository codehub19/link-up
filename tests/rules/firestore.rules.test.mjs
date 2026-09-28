// Firestore security rules tests. Run with:  npm run test:rules
// (starts the Firestore emulator, runs these tests, stops it)
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, writeBatch, increment, serverTimestamp, Timestamp, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore'

let env
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dateu-rules',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host, port: Number(port) },
  })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

const as = (uid) => env.authenticatedContext(uid).firestore()
const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))
const person = (extra = {}) => ({ name: 'Test User', gender: 'male', userType: 'college', isProfileComplete: true, ...extra })

const yearsAgo = (y) => { const d = new Date(); d.setFullYear(d.getFullYear() - y); return d.toISOString().slice(0, 10) }

test('sign-up: under-18 date of birth is rejected, adults are allowed', async () => {
  await assertFails(setDoc(doc(as('kid'), 'users/kid'), { name: 'Kid', dob: yearsAgo(16) }))
  await assertSucceeds(setDoc(doc(as('adult'), 'users/adult'), { name: 'Adult', dob: yearsAgo(19) }))
  await assertFails(updateDoc(doc(as('adult'), 'users/adult'), { dob: yearsAgo(17) }))
})

test('users cannot hide/unhide themselves or make themselves admin', async () => {
  await seed((db) => setDoc(doc(db, 'users/u1'), person({ underReview: true })))
  await assertFails(updateDoc(doc(as('u1'), 'users/u1'), { underReview: false }))
  await assertFails(updateDoc(doc(as('u1'), 'users/u1'), { isAdmin: true }))
  await assertSucceeds(updateDoc(doc(as('u1'), 'users/u1'), { bio: 'hello' }))
})

test('private data (email, Instagram) is only readable by its owner', async () => {
  await seed((db) => setDoc(doc(db, 'userPrivate/u1'), { email: 'a@b.com', instagramId: 'me' }))
  await assertSucceeds(getDoc(doc(as('u1'), 'userPrivate/u1')))
  await assertFails(getDoc(doc(as('u2'), 'userPrivate/u1')))
})

test('public profiles cannot hold contact details or Instagram', async () => {
  await seed((db) => setDoc(doc(db, 'users/u1'), person()))
  await assertFails(updateDoc(doc(as('u1'), 'users/u1'), { email: 'a@b.com' }))
  await assertFails(updateDoc(doc(as('u1'), 'users/u1'), { instagramId: 'me' }))
})

const request = (from, to, extra = {}) => setDoc(doc(as(from), `friendRequests/${from}_${to}`), { from, to, status: 'pending', createdAt: serverTimestamp(), ...extra })

test('friend requests: allowed normally, blocked either way is refused', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/a'), person())
    await setDoc(doc(db, 'users/b'), person())
    await setDoc(doc(db, 'users/c'), person())
    await setDoc(doc(db, 'userBlocks/c'), { uid: 'c', uids: ['a'] })
  })
  await assertSucceeds(request('a', 'b'))
  await assertFails(request('a', 'c'))   // c blocked a
  await assertFails(request('c', 'a'))   // c blocked a, so c can't request a either
})

test('friend requests: "verified students only" and "only my gender" are enforced', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/her'), person({ gender: 'female', requestsFrom: 'verified' }))
    await setDoc(doc(db, 'users/she'), person({ gender: 'female', friendsAudience: 'same' }))
    await setDoc(doc(db, 'users/unverified'), person({ gender: 'male' }))
    await setDoc(doc(db, 'users/verified'), person({ gender: 'male', collegeId: { verified: true } }))
    await setDoc(doc(db, 'users/girl'), person({ gender: 'female' }))
  })
  await assertFails(request('unverified', 'her'))
  await assertSucceeds(request('verified', 'her'))
  await assertFails(request('verified', 'she'))
  await assertSucceeds(request('girl', 'she'))
})

test('friend requests: people under review cannot be requested', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/a'), person())
    await setDoc(doc(db, 'users/hidden'), person({ underReview: true }))
  })
  await assertFails(request('a', 'hidden'))
})

test('events: going must move the count by exactly one', async () => {
  const end = Timestamp.fromMillis(Date.now() + 86_400_000)
  await seed((db) => setDoc(doc(db, 'events/e1'), { title: 'E', status: 'published', attendeeCount: 0, capacity: 1, startAt: end, endAt: end }))
  const db = as('a')
  const b = writeBatch(db)
  b.set(doc(db, 'events/e1/attendees/a'), { uid: 'a', name: 'A', lookingForBuddy: false })
  b.update(doc(db, 'events/e1'), { attendeeCount: increment(1) })
  await assertSucceeds(b.commit())
  // Full now (capacity 1)
  const db2 = as('b')
  const b2 = writeBatch(db2)
  b2.set(doc(db2, 'events/e1/attendees/b'), { uid: 'b', name: 'B', lookingForBuddy: false })
  b2.update(doc(db2, 'events/e1'), { attendeeCount: increment(1) })
  await assertFails(b2.commit())
  // Can't register without counting
  await assertFails(setDoc(doc(as('c'), 'events/e1/attendees/c'), { uid: 'c', name: 'C' }))
})

test('reports: anyone can report, only the reporter and admins can read it', async () => {
  await seed((db) => setDoc(doc(db, 'users/admin'), person({ isAdmin: true })))
  await assertSucceeds(setDoc(doc(as('r'), 'reports/x'), { reporterUid: 'r', reportedUid: 'z', threadId: 't', reason: 'spam', createdAt: serverTimestamp() }))
  await assertSucceeds(getDoc(doc(as('r'), 'reports/x')))
  await assertFails(getDoc(doc(as('z'), 'reports/x')))
  await assertSucceeds(getDoc(doc(as('admin'), 'reports/x')))
})

test('groups: join/leave only yourself; only members post; "I\'m in" only adds yourself', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/a'), person())
    await setDoc(doc(db, 'users/b'), person())
    await setDoc(doc(db, 'groups/g1'), { name: 'Gym', active: true, memberUids: ['b'], memberCount: 1 })
  })
  const post = (uid) => addDoc(collection(as(uid), 'groups/g1/posts'), { authorUid: uid, authorName: 'X', text: 'Gym at 7?', inUids: [], inCount: 0, createdAt: serverTimestamp() })
  await assertFails(post('a')) // not a member yet
  await assertFails(updateDoc(doc(as('a'), 'groups/g1'), { memberUids: arrayUnion('a', 'z'), memberCount: increment(2) }))
  await assertFails(updateDoc(doc(as('a'), 'groups/g1'), { memberUids: arrayRemove('b'), memberCount: increment(-1) }))
  await assertSucceeds(updateDoc(doc(as('a'), 'groups/g1'), { memberUids: arrayUnion('a'), memberCount: increment(1) }))
  const ref = await post('a')
  await assertSucceeds(Promise.resolve(ref))
  const p = doc(as('b'), `groups/g1/posts/${ref.id}`)
  await assertFails(updateDoc(p, { inUids: arrayUnion('b', 'z'), inCount: increment(2) }))
  await assertSucceeds(updateDoc(p, { inUids: arrayUnion('b'), inCount: increment(1) }))
  await assertFails(updateDoc(doc(as('b'), `groups/g1/posts/${ref.id}`), { text: 'edited' }))
  await assertSucceeds(updateDoc(doc(as('a'), 'groups/g1'), { memberUids: arrayRemove('a'), memberCount: increment(-1) }))
})

test('photo reviews are admin-only', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/admin'), person({ isAdmin: true }))
    await setDoc(doc(db, 'photoReviews/p1'), { uid: 'a', url: 'x', status: 'pending' })
  })
  await assertFails(getDoc(doc(as('a'), 'photoReviews/p1')))
  await assertSucceeds(getDoc(doc(as('admin'), 'photoReviews/p1')))
})

test('rounds are admin-only; calls: you can only write your own connection report', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/admin'), person({ isAdmin: true }))
    await setDoc(doc(db, 'matchingRounds/r1'), { isActive: true, participatingMales: [], assignedGirlsToBoys: { x: ['y'] } })
    await setDoc(doc(db, 'randomCalls/c1'), { participants: ['a', 'b'], callerUid: 'a', calleeUid: 'b', status: 'active' })
  })
  await assertFails(getDoc(doc(as('a'), 'matchingRounds/r1')))
  await assertFails(updateDoc(doc(as('a'), 'matchingRounds/r1'), { participatingMales: ['a'] }))
  await assertSucceeds(getDoc(doc(as('admin'), 'matchingRounds/r1')))
  await assertSucceeds(updateDoc(doc(as('a'), 'randomCalls/c1'), { 'media.a': { ok: true, relay: false } }))
  await assertFails(updateDoc(doc(as('a'), 'randomCalls/c1'), { 'media.b': { ok: false } }))
})
