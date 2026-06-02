# Architecture — Tertoct

## Overview

Tertoct is a SaaS platform built with Next.js + Firebase focused on training management, check-ins, plans, classes, payments, and user progress tracking.

The project follows a server-oriented architecture using:

* Next.js App Router
* Firebase Authentication
* Cloud Firestore
* Route Handlers (private APIs with Admin SDK)
* Centralized security middleware (`src/proxy.ts`)
* RBAC authorization
* Firestore Security Rules

The system prioritizes:

* server-side security;
* role isolation;
* domain logic in one place (APIs + shared utils);
* production hardening;
* automated tests (unit + rules + E2E);
* low operational complexity.

---

# Core Stack

| Layer         | Technology                                      |
| ------------- | ----------------------------------------------- |
| Frontend      | Next.js 16 App Router, React 19                 |
| Backend       | Next.js Route Handlers (Node.js runtime)        |
| Auth          | Firebase Authentication + HTTPOnly cookie       |
| Database      | Cloud Firestore                                 |
| Hosting       | Vercel                                          |
| Security      | CSP + Middleware + Origin checks + Firestore Rules |
| Styling       | Tailwind CSS v4                                 |
| Validation    | Zod + `validateBody` helper                     |
| Sanitization  | isomorphic-dompurify (`stripHtml` / `sanitizeHtml`) |
| State         | React hooks + server-fetched initial data       |
| Unit tests    | Jest + ts-jest                                  |
| E2E tests     | Playwright + Firebase emulators                 |
| Rules tests   | `@firebase/rules-unit-testing`                  |
| Observability | Custom server observability layer               |

---

# High-Level Architecture

```txt
Browser
  ↓
Next.js App Router (RSC + Client Components)
  ↓
Central Security Middleware (src/proxy.ts)
  ↓
Route Handlers / Server Components
  ↓
lib/auth (session, RBAC) + lib/validations (Zod)
  ↓
Service Layer (client Firestore reads + API mutations)
  ↓
Firestore  ←→  Firestore Rules (client SDK reads only for domain writes)
```

**Write path for domain data:** client calls `/api/private/*` → Admin SDK transaction → Firestore.  
**Read path:** client SDK (with rules) or server Admin SDK (landing cache).

---

# Architectural Principles

## 1. Server-first Security

Authentication and authorization are validated primarily on the server.

The client is never trusted for:

* roles;
* ownership;
* permissions;
* check-in / payment / plan mutations.

Critical validations happen through:

* middleware (`proxy.ts`);
* private route handlers (`getPrivateRouteContext` + `requireRole`);
* shared domain utils (payment, check-in dates, cancel window);
* Firestore rules (client read isolation).

---

## 2. Defense in Depth

```txt
Browser
 → CSP (nonce)
 → Secure Headers
 → Middleware (auth + RBAC paths)
 → Origin check on mutations (isTrustedMutationRequest)
 → Private API (Zod + rate limit + Admin transactions)
 → Firestore Rules (client SDK)
```

---

## 3. RBAC (Role-Based Access Control)

Roles:

```txt
admin | coach | student
```

Enforcement layers:

| Layer | Module | Responsibility |
| ----- | ------ | ---------------- |
| Edge / middleware | `src/proxy.ts`, `lib/auth/authorization.ts` | Path prefixes (`/dashboard/admin`, `/dashboard/coach`, …) |
| API routes | `lib/auth/privateRoute.ts` | Cookie session + `requireRole()` per handler |
| Firestore Rules | `firestore.rules` | `currentRole()`, ownership, coach/student reads |

Session role resolution (`getPrivateRouteContext`):

1. Custom claims on ID token (`role`, or `admin` / `coach` / `student` booleans).
2. Fallback: read `users/{uid}.role` from Firestore when claims are missing.

---

# Project Structure

```txt
src/
├── app/
│   ├── api/
│   │   ├── auth/          # cookie, verify
│   │   └── private/       # checkins, classes, plans, users, feedback, …
│   ├── dashboard/
│   ├── page.tsx           # landing (server)
│   └── HomeClient.tsx     # landing (client shell)
│
├── components/
│   ├── auth/              # AuthProvider, session sync, sign-in
│   ├── dashboard/         # coach + student dashboards
│   ├── landing/           # hero, plans, coaches, feedback wall, …
│   └── ui/
│
├── lib/
│   ├── auth/              # verifyToken, privateRoute, rate limits, admin
│   ├── firebase/          # client SDK, emulators, redirect
│   ├── firestore/         # refs, mappers
│   ├── security/          # origin allowlist (mutations)
│   ├── validations/       # Zod schemas + validateRoute
│   ├── server/            # cachedLandingData (unstable_cache)
│   ├── observability/
│   ├── utils/             # domain helpers (payment, check-in, dates, …)
│   └── types.ts           # shared TypeScript types
│
├── services/              # Firestore listeners/queries + API mutation wrappers
├── security/              # firestore.rules.test.ts
└── proxy.ts               # security middleware entry

e2e/                       # Playwright specs + emulator seed
firestore.rules              # client SDK authorization
jest.config.js               # unit coverage thresholds (80%+)
docs/architecture.md
```

---

# Authentication Flow

## Login Flow

```txt
Client (Google sign-in)
  ↓
Firebase Authentication → ID Token
  ↓
POST /api/auth/cookie → HTTPOnly authToken cookie
  ↓
proxy.ts validates token on protected routes
  ↓
Dashboard / private APIs
```

## Session Model

* Firebase Auth on the client (`AuthProvider`, `useAuthSession`).
* HTTPOnly cookie (`authToken`) for server/middleware/API.
* `verifyToken` with `checkRevoked` enabled in production (`getVerifyTokenOptions()`); disabled on emulators/dev unless `FIREBASE_CHECK_REVOKED=true`.
* Private API role: Firestore `users.role` overrides JWT claims when the profile exists.
* `POST /api/auth/refresh-claims` syncs custom claims from Firestore; client refreshes ID token + session cookie after login.
* Coach 30-day check-in counts: `GET /api/private/checkins/counts` (server aggregation) instead of a client listener on all check-ins.
* Check-in blocked when `users.active === false`.
* Cookie flags: `httpOnly`, `secure` (prod), `sameSite`.

Client auth extras:

* Redirect vs popup sign-in (mobile / emulator detection).
* Cookie sync state for session alignment.
* E2E bridge (`E2eAuthBridge`) when running against emulators.

---

# Security Architecture

## Central Security Middleware

File: `src/proxy.ts`

Responsibilities:

* authentication validation;
* RBAC for dashboard/API path prefixes (`isAuthorizedForPath`);
* CSP with per-request nonce;
* security headers;
* proxy-level rate limiting (`lib/proxy/proxyRateLimit.ts`);
* observability hooks on anomalies.

---

## Mutation Origin Protection

File: `lib/security/origin.ts`

`isTrustedMutationRequest(req)` validates `Origin` / `Referer` against `ALLOWED_ORIGINS` (supports full URLs, bare hostnames, www/apex pairs, ngrok in development).

Used by private write routes and auth cookie routes to block cross-site mutations.

---

## Content Security Policy (CSP)

Dynamic CSP with nonce-based scripts:

```txt
script-src 'self' 'nonce-<dynamic>' 'strict-dynamic'
```

---

## Security Headers

```txt
Strict-Transport-Security
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy
```

---

## Rate Limiting

| Scope | Implementation |
| ----- | -------------- |
| Middleware | `lib/proxy/proxyRateLimit.ts` |
| Auth routes | `rateLimitMemory` / `rateLimit` + client identifier |
| Private APIs | `enforcePrivateApiRateLimit` (`lib/auth/privateApiRateLimit.ts`) |
| Firestore | `_rateLimits` collection (rules-backed) |

---

# Landing Page

Public home (`/`) is a hybrid RSC + client page.

```txt
app/page.tsx (Server Component)
  ↓
getLandingPlansAndCoaches()  ← lib/server/cachedLandingData.ts
  ↓ (Admin SDK, unstable_cache; bypass cache when FIRESTORE_EMULATOR_HOST)
HomeClient (Client Component)
  ↓
components/landing/*  (Hero, Plans, Coaches, Feedback, Contact, …)
```

* Plans and coach cards are loaded server-side for SEO and first paint.
* Authenticated users are redirected to `/dashboard`.
* Guest sees Google sign-in and seeded/public catalog data.
* Styles and motion live in `app/globals.css` (landing-specific tokens/animations).

---

# Firestore Architecture

## Collections

```txt
users
publicProfiles
plans
classes
checkins
checkinCounters
classCheckinCounters
feedbacks
_rateLimits
```

---

## Check-in and classes (domain model)

Check-ins tie a **student**, **plan**, and **gym class (turma)** to a calendar day.

| Collection | Document id | Purpose |
| ---------- | ----------- | ------- |
| `checkins` | `{userId}_{classId}_{classDateKey}` | One check-in per student per turma per day |
| `checkinCounters` | `{userId}_{weekKey}` | Weekly quota (`classesPerWeek` on plan); `weekKey` = Monday ISO date |
| `classCheckinCounters` | `{classId}_{classDateKey}` | Daily capacity per turma |

### Create check-in (`POST /api/private/checkins`)

Transaction (Admin SDK) enforces:

* Student role; trusted origin; rate limit; Zod body (`planId`, `classId`, optional `classDateKey`).
* Active user + active plan; **`isPaymentOverdue`** blocks check-in.
* Turma active; valid `startTime` / `checkinDeadlineTime` / `capacity`; deadline before start.
* `classDateKey` (YYYY-MM-DD); no past dates; deadline only enforced for today.
* No duplicate `(user, class, date)`; weekly limit; turma capacity.
* Updates `checkinCounters` and `classCheckinCounters`.

Timezone: turma `utcOffsetMinutes` (default −180, America/São_Paulo) via `lib/utils/dateKey.ts` and `lib/utils/time.ts`.

### Cancel check-in (`DELETE /api/private/checkins/[checkinId]`)

* Student-only; reverses counters in a transaction.
* Cancel window: until **1 hour before class start** (`lib/utils/checkinCancel.ts` → `canCancelCheckIn`).
* Client calls `checkinService.cancelCheckIn` → private API (no direct Firestore delete).

### Client reads

* **Students:** own `checkins`, active `classes`, `classCheckinCounters`.
* **Coaches:** student `checkins`, `classes`, counters, `users` (students).

### Client writes

Domain mutations (**check-in, cancel, classes, plans, user payment fields**) go through **private APIs only**. Rules block direct client writes on those paths.

---

## Payment model

Student payment state on `users`:

| Field | Purpose |
| ----- | ------- |
| `paymentDueDay` | Day of month (1–31) |
| `monthlyPaymentPaid` | Coach toggle |
| `paymentValidUntil` | Optional explicit grace end |

Logic: `lib/utils/payment.ts`

* `isPaymentOverdue(profile)` — used in check-in API and coach dashboard filters.
* `isUnpaidPastDue(dueDay)` — calendar rules including “day 1 after due 28” case.
* `endOfDueDayInMonth` — clamps due day in short months.

Coaches update payment fields via `PATCH /api/private/users/[userId]` (actions: `toggle-payment`, `set-payment-day`, …). Rules allow coaches to touch only whitelisted user keys (`canCoachUpdateUser`).

---

## Security Rules

Firestore Rules are the **final authorization layer for client SDK access**.

`firestore.rules` (streamlined):

* Role helpers: `isAdmin`, `isCoach`, `isStudent`, `currentUserPlanId`, `planIsActive`.
* **Users:** self-create as student; coach/admin updates with field allowlists; payment fields coach-writable.
* **Check-ins / counters / classes / plans:** read rules per role; **writes denied** where Admin API owns mutations.
* **Feedbacks:** read/write rules per ownership.

Write-heavy domain logic is **not** duplicated in rules; it lives in private APIs (Zod + transactions + shared utils).

Rules are tested in `src/security/firestore.rules.test.ts`.

---

# API Architecture

## Segmentation

```txt
/api/auth/*       # cookie, verify (rate-limited)
/api/private/*    # domain mutations + coach/admin operations
```

The marketing page is `app/page.tsx` (not under `/api`).  
Landing feedbacks call `fetchPublicFeedbacks()` (`/api/public/feedbacks`); that route is **not implemented yet** — the client fails open to an empty list. Create/delete still use `/api/private/feedback`.

---

## Private API standard pipeline

Every sensitive handler follows:

```txt
isTrustedMutationRequest(req)     # POST/PATCH/DELETE
  ↓
getPrivateRouteContext()          # cookie → verifyToken → role
  ↓
requireRole(context, [...])        # 403 if role mismatch
  ↓
enforcePrivateApiRateLimit(...)   # optional per route
  ↓
validateBody(req, zodSchema)      # when body present
  ↓
Admin SDK transaction / update
```

---

## Private routes (current)

```txt
POST   /api/private/checkins
DELETE /api/private/checkins/[checkinId]

POST            /api/private/classes
PATCH/DELETE    /api/private/classes/[classId]

POST            /api/private/plans
PATCH/DELETE    /api/private/plans/[planId]
POST            /api/private/plans/[planId]/toggle

PATCH           /api/private/users/[userId]   # assign-plan, payment, phone, toggle-active, …

POST            /api/private/feedback
DELETE          /api/private/feedback/[feedbackId]

DELETE          /api/private/clearRateLimits   # bearer secret (dev/ops)
```

## Public routes

```txt
GET    /api/public/feedbacks   # landing feedback wall (Admin SDK read)
```

---

# Validation Layer

Location: `src/lib/validations/`

| Module | Schemas |
| ------ | ------- |
| `plan.ts` | `PlanCreateSchema`, `PlanUpdateSchema` (HTML stripped/sanitized) |
| `user.ts` | `UserCreateSchema`, `UserUpdateSchema`, `UserRoleSchema` |
| `checkIn.ts` | `CheckInCreateSchema` |
| `sanitize.ts` | `stripHtml`, `sanitizeHtml` |
| `validateRoute.ts` | `validateBody(req, schema)` → `{ data }` or `400` |

Check-in creation schema for the live API is inline in `checkins/route.ts` (`planId`, `classId`, `classDateKey?`).

---

# Domain Utilities (`lib/utils`)

Shared pure logic used by APIs and dashboards:

| Module | Responsibility |
| ------ | -------------- |
| `payment.ts` | Overdue detection, due-day calendar |
| `checkinDate.ts` | Weekday-only date keys, allowed dates for UI, labels |
| `checkinCancel.ts` | Cancel deadline (1h before start), `canCancelCheckIn` |
| `dateKey.ts` | `getDateKeyForOffset`, `utcDateAtLocalTime` |
| `time.ts` | `parseHHmm` / `formatHHmm` for class schedules |
| `date.ts` | `startOfWeek`, `toDate` (Firestore timestamps) |
| `weekFilters.ts` | Business week Mon–Fri filters for coach views |
| `checkins.ts` | `aggregateCheckinsByClass` (coach analytics) |
| `studentFilter.ts` | Coach student list filters (payment, search) |
| `withMinDuration.ts` | Minimum toast visibility on mutations |

---

# Service Layer

Location: `src/services/`

| Service | Role |
| ------- | ---- |
| `checkinService` | Fetch/listen check-ins; **create/cancel via private API** |
| `classService` | Listen turmas/counters; CRUD via private API |
| `planService` | Plan CRUD/toggle via private API |
| `userService` | Assign plan, payment day, toggle payment/active, phone |
| `dashboardService` | Coach/student snapshots, date-range check-in queries |
| `landingService` | Types/helpers for landing coach cards |
| `feedbackService` | Feedback wall + private API |
| `plansQueryService` | Single-plan fetch |
| `userProfileService` | Profile reads/writes |

Pattern:

* **Reads:** Firestore client SDK (`onSnapshot` / `getDocs`) through `lib/firestore/refs` + `mappers`.
* **Writes:** `fetch('/api/private/...')` only.

---

# Observability

`lib/observability/serverObservability.ts`

* structured logging;
* anomaly tracking (`trackStatusAnomaly`);
* error capture (`captureServerError`);
* security-relevant events in middleware.

---

# Testing Architecture

## Unit tests (Jest)

```bash
npm test
npm run test:coverage   # ≥80% global threshold
```

**Coverage scope** (`jest.config.js`):

* `src/lib/utils/**`
* `src/services/**`
* `src/lib/firebase.ts`
* `src/lib/auth/authorization.ts`, `privateRoute.ts`
* `src/lib/validations/**` (excluding barrel-only `index.ts` where applicable)

**Also tested (outside coverage collection):** `proxy.test.ts`, auth route tests, `origin.test.ts`, component auth helpers.

Domain-critical suites added/expanded on this branch: payment, check-in cancel/dates, RBAC, private route context, class/check-in services, validations.

## Firestore Rules tests

```bash
npm test -- src/security/firestore.rules.test.ts
```

Uses `@firebase/rules-unit-testing` against `firestore.rules`.

## End-to-end tests (Playwright)

```bash
npm run test:e2e      # firebase emulators:exec + playwright
npm run test:e2e:ui
```

| Path | Role |
| ---- | ---- |
| `e2e/guest.spec.ts` | Landing, redirect without session |
| `e2e/student.spec.ts` | Student dashboard / check-in flows |
| `e2e/coach.spec.ts` | Coach dashboard |
| `e2e/auth.setup.ts` | Authenticated storage state |
| `e2e/seed-emulator.ts` | Seed data for tertoct-e2e project |

Config: `playwright.config.ts`, env via `.env.example` / emulator hosts.

---

# Rendering Strategy

| Route | Pattern |
| ----- | ------- |
| `/` | RSC loads plans/coaches → `HomeClient` |
| `/dashboard` | Client dashboards (`CoachDashboard`, `StudentDashboard`) |
| `/api/*` | Route Handlers, `runtime = nodejs` on Admin routes |

Security-sensitive operations remain server-side.

---

# Performance Strategy

* Server-side landing cache (`unstable_cache`, revalidate 300s).
* Emulator bypass: no cache when `FIRESTORE_EMULATOR_HOST` is set (E2E/dev).
* Client-side sorting where composite indexes are avoided (e.g. active classes by `startTime`).
* Minimal client trust; no permission logic in browser for writes.

---

# Production Readiness

Current foundation:

* RBAC (middleware + APIs + rules)
* CSP + secure headers + origin checks
* Private APIs with Admin transactions
* Payment gating on check-in
* Check-in cancel with counter rollback
* Firestore Rules + rules unit tests
* Jest domain coverage (~93% statements on covered modules)
* Playwright E2E with emulators
* Observability hooks

Maturity:

```txt
Structured SaaS / production-ready foundation with tested domain core
```

---

# Known Technical Debts

## Firestore Rules `get()` cost

Rules still use `get()` for role/plan lookups. Possible future optimizations: denormalized role claims, slimmer rule paths.

## Observability at scale

In-process anomaly tracking may need Sentry/OpenTelemetry for multi-region serverless.

## API route unit tests

Private check-in **route handlers** are covered indirectly via utils + services; dedicated handler tests with mocked Admin SDK would close the last gap.

## Public feedback read endpoint

`feedbackService.fetchPublicFeedbacks` expects `GET /api/public/feedbacks`; implement a read-only route (or server action) so the landing feedback wall works without anonymous Firestore reads.

---

# Environment Configuration

* `.env.example` documents required variables (`ALLOWED_ORIGINS`, Firebase keys, emulator hosts).
* Local E2E: Firebase emulators + Playwright (`tertoct-e2e` project).
* `npm run seed` / `npm run notify` for Firestore seed and plan-expiry notifications (scripts).

---

# Summary

Tertoct is a structured SaaS architecture with:

* centralized security middleware and origin-aware mutations;
* private Admin APIs as the single write path for check-ins, turmas, plans, and payments;
* shared domain utilities tested under Jest;
* Firestore Rules focused on read isolation and coach/student boundaries;
* a modular landing experience with server-cached catalog data;
* automated tests at unit, rules, and E2E layers.

The design keeps business rules in TypeScript (APIs + `lib/utils`), avoids duplicating them in Firestore Rules, and remains maintainable for medium-scale production workloads.
