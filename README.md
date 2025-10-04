# DateU College Matchmaking (Firebase + React)

A modern, curated matchmaking app for college students (Delhi NCR) built on Firebase:
- Google-only authentication
- Structured onboarding (gender, profile)
- Gender-specific dashboards
- Curated matching rounds
- Paid participation (male) — stubbed, function-backed join
- Mutual reveal with Cloud Functions

## Tech
- Vite + React + TypeScript
- Firebase Auth, Firestore, Storage, Cloud Functions (Node 18)
- Basic CSS styling inspired by cufy aesthetic

## Setup

1. Create a Firebase project, enable:
   - Authentication: Google provider
   - Firestore, Storage, Cloud Functions
2. Copy `.env.example` → `.env` and fill values.
3. Update `.firebaserc` with your project id.
4. Install deps:

```bash
npm i
(cd functions && npm i)
```

5. Deploy security rules and indexes:

```bash
firebase deploy --only firestore:rules,storage
firebase firestore:indexes:update firestore.indexes.json
```

6. Local dev:

```bash
npm run dev
```

Or with emulators:

```bash
# set VITE_USE_EMULATORS=true in .env
firebase emulators:start
```

7. Build & deploy hosting/functions:

```bash
npm run build
firebase deploy
```

## Data Model

- users/{uid}
- matchingRounds/{roundId}
- likes/{roundId}_{girlUid}_{boyUid}
- matches/{auto-id}

See `firestore.rules` and Functions for secure flows.

## Flows

- Onboarding: `/setup/gender` → `/setup/profile`
- Male Dashboard:
  - `/dashboard/plans`: Join next active round (stub payment → callable `joinMatchingRound`)
  - `/dashboard/matches`: Pending likes (Select & Reveal → callable `confirmMatch`), Confirmed
  - `/dashboard/edit-profile`
- Female Dashboard:
  - `/dashboard/round`: If active, see 5 male profiles, Like multiple
  - `/dashboard/connections`: Confirmed matches visible with name + Insta

## Payments

Button in Plans calls `joinMatchingRound`. Replace with Razorpay/Stripe:
- Create checkout, verify server-side, then call the function.
- Alternatively, have a server webhook mark entitlement and function add to the round.

## Notes

- The “5 profiles” selection currently takes the first 5 from `participatingMales`. Replace with a Cloud Function to randomize, paginate, and enforce one-view-per-round logic.
- Profile photos are public for simplicity; tighten Storage rules if needed.
- Add email verification or EDU domain restrictions as desired.