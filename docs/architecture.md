# Architecture — Tertoct

## Overview

Tertoct is a SaaS platform built with Next.js + Firebase focused on training management, check-ins, plans, classes, and user progress tracking.

The project follows a server-oriented architecture using:

* Next.js App Router
* Firebase Authentication
* Firestore
* Route Handlers
* Centralized security middleware
* RBAC authorization
* Firestore Security Rules

The system prioritizes:

* server-side security;
* role isolation;
* scalable Firebase structure;
* production hardening;
* low operational complexity.

---

# Core Stack

| Layer         | Technology                         |
| ------------- | ---------------------------------- |
| Frontend      | Next.js 15 App Router              |
| Backend       | Next.js Route Handlers             |
| Auth          | Firebase Authentication            |
| Database      | Cloud Firestore                    |
| Hosting       | Vercel                             |
| Security      | CSP + Middleware + Firestore Rules |
| Styling       | TailwindCSS                        |
| Validation    | Zod                                |
| State         | React hooks/server state           |
| Observability | Custom server observability layer  |

---

# High-Level Architecture

```txt
Client
  ↓
Next.js App Router
  ↓
Central Security Middleware (proxy.ts)
  ↓
Route Handlers / Server Components
  ↓
Service Layer
  ↓
Firestore
```

---

# Architectural Principles

## 1. Server-first Security

Authentication and authorization are validated primarily on the server.

The client is never trusted for:

* roles;
* ownership;
* permissions;
* sensitive operations.

All critical validations happen through:

* middleware;
* route handlers;
* Firestore rules.

---

## 2. Defense in Depth

Security exists in multiple layers:

```txt
Browser
 → CSP
 → Secure Headers
 → Middleware
 → Route Validation
 → Firestore Rules
```

Even if one layer fails, others still protect the system.

---

## 3. RBAC (Role-Based Access Control)

The platform uses role-based authorization.

Current roles:

```txt
admin
coach
student
```

Permissions are validated:

* in middleware;
* in APIs;
* in Firestore Rules.

---

# Project Structure

```txt
src/
├── app/
│   ├── api/
│   │   ├── private/
│   │   └── public/
│   ├── dashboard/
│   └── auth/
│
├── components/
│
├── lib/
│   ├── auth/
│   ├── firebase/
│   ├── security/
│   ├── validations/
│   ├── observability/
│   └── utils/
│
├── services/
│
├── hooks/
│
├── types/
│
└── proxy.ts
```

---

# Authentication Flow

## Login Flow

```txt
Client Login
  ↓
Firebase Authentication
  ↓
ID Token
  ↓
HTTPOnly Session Cookie
  ↓
Middleware Validation
  ↓
Authorized Request
```

---

## Session Model

The system uses:

* Firebase Auth session;
* secure cookies;
* server-side validation.

Cookies are configured with:

```txt
httpOnly
secure
sameSite
```

The client does not directly manage permissions.

---

# Security Architecture

## Central Security Middleware

The file:

```txt
src/proxy.ts
```

acts as the centralized security gateway.

Responsibilities:

* authentication validation;
* RBAC validation;
* route protection;
* CSP generation;
* nonce generation;
* rate limiting;
* security headers;
* request filtering.

Although named `proxy.ts`, it effectively acts as the application's security middleware.

---

## Content Security Policy (CSP)

The project uses dynamic CSP with nonce-based scripts.

Example approach:

```txt
script-src 'self' 'nonce-<dynamic>' 'strict-dynamic'
```

Current protections include:

* nonce propagation;
* prevention of inline script execution;
* prevention of unauthorized third-party scripts;
* clickjacking protection.

---

## Security Headers

Implemented headers include:

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

Rate limiting is enforced in middleware level.

Current implementation includes:

* request tracking;
* 429 blocking;
* Firestore-backed limits;
* endpoint protection.

Protected especially for:

* auth routes;
* sensitive APIs;
* write-heavy operations.

---

# Firestore Architecture

## Collections

Main collections:

```txt
users
plans
classes
checkins
feedbacks
_rateLimits
```

---

## Security Rules

Firestore Rules are used as the final authorization layer.

Rules validate:

* authentication;
* ownership;
* roles;
* resource relationships;
* access isolation.

---

## Data Isolation

Users can only access data they are authorized to read.

Isolation occurs through:

* ownership checks;
* role checks;
* coach/student relationship checks.

---

# API Architecture

## API Segmentation

The API structure is divided into:

```txt
/api/public
/api/private
```

---

## Private APIs

Examples:

```txt
/api/private/checkins
/api/private/classes
/api/private/plans
/api/private/users
/api/private/feedback
/api/private/clearRateLimits
```

These routes require:

* valid session;
* middleware validation;
* RBAC authorization.

---

# Validation Layer

Input validation is centralized using Zod schemas.

Validation occurs before:

* database writes;
* business logic;
* Firestore operations.

This reduces:

* malformed data;
* runtime errors;
* invalid payloads.

---

# Service Layer

Business logic is partially isolated into:

```txt
src/services/
```

Responsibilities include:

* Firestore interaction;
* domain logic;
* reusable operations;
* orchestration.

The architecture is moving toward stronger separation between:

```txt
controllers
services
repositories
```

---

# Observability

The project includes a lightweight observability layer.

Current capabilities:

* structured logging;
* anomaly tracking;
* error capture;
* request monitoring;
* security event logging.

Main modules include:

```txt
serverObservability.ts
```

---

# Rendering Strategy

The application uses a hybrid rendering approach.

Depending on the route:

* Server Components;
* Client Components;
* Route Handlers;
* SSR;
* streaming patterns.

Security-sensitive operations remain server-side.

---

# Performance Strategy

Current optimization strategies include:

* App Router architecture;
* route segmentation;
* modular services;
* middleware centralization;
* selective caching;
* minimized client-side auth logic.

Future improvements planned:

* aggregation caching;
* React cache;
* unstable_cache;
* edge caching.

---

# Production Readiness

The project already includes:

* RBAC;
* CSP hardening;
* secure headers;
* middleware protection;
* Firestore Rules;
* rate limiting;
* validation layer;
* observability foundation.

Current maturity level:

```txt
Structured SaaS / Production-ready foundation
```

---

# Known Technical Debts

## Firestore Rules Complexity

Rules still contain multiple nested `get()` operations.

Potential impacts:

* higher latency;
* increased cost;
* evaluation complexity.

Future optimization may include:

* denormalized permissions;
* cached ownership metadata;
* aggregation documents.

---

## Observability Scalability

Current anomaly tracking may not scale perfectly in serverless environments.

Future improvements:

* Sentry;
* OpenTelemetry;
* Redis/Upstash metrics;
* centralized dashboards.

---

# Future Evolution

Planned architectural evolution:

```txt
Current
  ↓
Service-oriented modular architecture
  ↓
Repository pattern
  ↓
Centralized DTOs
  ↓
Advanced observability
  ↓
Distributed caching
```

---

# Summary

The project evolved from a simple Firebase MVP into a structured SaaS architecture with:

* centralized security;
* layered authorization;
* hardened middleware;
* production-oriented Firestore rules;
* scalable API organization;
* server-first security model.

The current architecture is coherent, maintainable, and suitable for medium-scale production workloads.
