Tertoct Check-in SaaS is a **Next.js + Firebase** web application to manage boxing gym plans, students, classes and check-ins.

### Stack

- **Frontend**: Next.js App Router (TypeScript, Tailwind)
- **Auth**: Firebase Authentication (Google only)
- **Database**: Cloud Firestore
- **Security**: Firestore Security Rules (`firestore.rules`) + server-side RBAC in API routes

### Running locally

1. Install dependencies:

```bash
npm install
```

2. Configure Firebase environment variables in a `.env.local` file (start from `.env.example`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Server/admin (API routes, landing cache)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Optional
ALLOWED_ORIGINS=
TRUST_PROXY_HEADERS=false
```

3. Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000`.

### E2E tests (Playwright + Firebase emulators)

Requires [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`).

```bash
npm run test:e2e
```

On first run (or after upgrading `@playwright/test`), browsers are installed automatically via `pretest:e2e`. To install manually: `npm run playwright:install`.

### Firestore data model

- `users/{uid}`: profile, `role` (`admin | coach | student`), `planId`, payment fields, `active`
- `publicProfiles/{uid}`: public coach/student card data for landing and dashboards
- `plans/{planId}`: `name`, `price`, `classesPerWeek`, `description`, `active`
- `classes/{classId}`: turmas with schedule, capacity and check-in deadline
- `checkins/{id}`: `userId`, `planId`, optional `classId`, `classDateKey`, timestamps
- `checkinCounters/{id}`: weekly check-in counts per user
- `classCheckinCounters/{id}`: per-class occupancy counters
- `feedbacks/{id}`: student messages shown on the landing page

### Roles and permissions

- **Student**
  - Logs in with Google
  - Has a single `planId`
  - Can create check-ins for own user and active plan (with payment gating)
  - UI limits check-ins per week to `classesPerWeek`
- **Coach/Admin**
  - Manage plans and classes
  - Assign / remove plans from students
  - View weekly check-in counts, expirations and feedback moderation

Permissions are enforced by Firestore rules and private API routes (`getPrivateRouteContext()` + `requireRole()`). Deploy rules with:

```bash
firebase deploy --only firestore:rules
```

### Seed script (plans)

Uses Application Default Credentials — never commit service account JSON (`*-prod.json` is gitignored).

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# or set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
npm run seed
```

For the emulator: `export FIRESTORE_EMULATOR_HOST=localhost:8080` before `npm run seed`.

### Documentation

- `docs/architecture.md` — system design, flows and API surface
- `docs/PRODUCTION_READINESS.md` — deploy checklist and quality gates
