Tertoct Check-in SaaS is a **Next.js + Firebase** web application to manage boxing gym plans, students and check-ins per week.

### Stack

- **Frontend**: Next.js App Router (TypeScript, Tailwind)
- **Auth**: Firebase Authentication (Google only)
- **Database**: Cloud Firestore
- **Security**: Firestore Security Rules (`firestore.rules`)

### Running locally

1. Install dependencies:

```bash
npm install
```

2. Configure Firebase environment variables in a `.env.local` file (you can start from `.env.example`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
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

- `users/{uid}`: `name`, `email`, `role` (`admin | coach | student`), `planId`, `active`, `createdAt`
- `plans/{planId}`: `name`, `price`, `classesPerWeek`, `description`, `active`, `createdAt`
- `checkins/{id}`: `userId`, `planId`, `createdAt`
- Future ready: `classes/{classId}`, `enrollments/{id}`, `payments/{id}`

### Roles and permissions

- **Student**
  - Logs in with Google
  - Has a single `planId`
  - Can create check-ins only for own user and active plan
  - UI limits check-ins per week to `classesPerWeek`
- **Coach/Admin**
  - Manage plans (create, activate/deactivate)
  - Assign / remove plans from students
  - View weekly check-in counts per student

Permissions are enforced by Firestore rules in `firestore.rules`. Deploy them with:

```bash
firebase deploy --only firestore:rules
```

### Production readiness

For a complete security/quality review, test coverage expectations and production deploy checklist, see:

- `docs/PRODUCTION_READINESS.md`
