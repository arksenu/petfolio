# Petfolio Migration & Unification Plan

*Last updated: March 15, 2026*

---

## Table of Contents

1. [Current State](#1-current-state)
2. [How the Two Apps Communicate Today](#2-how-the-two-apps-communicate-today)
3. [Problems with the Current Architecture](#3-problems-with-the-current-architecture)
4. [Target Architecture](#4-target-architecture)
5. [Migration Plan](#5-migration-plan)
   - Phase 1: Database Migration
   - Phase 2: File Storage Migration
   - Phase 3: Auth Migration
   - Phase 4: Server Hosting
6. [Repo Unification Plan](#6-repo-unification-plan)
7. [Migration Checklist](#7-migration-checklist)

---

## 1. Current State

### Two Separate Repos

**Petfolio iOS App** (`github.com/arksenu/petfolio`)
- Expo/React Native iOS app for pet owners
- Features: pet profiles, medical records, vaccinations, medications, weight tracking, document storage, concierge messaging
- Backend: Express + tRPC + Drizzle ORM
- Built inside Manus.ai, now being developed locally

**Concierge Admin Webapp** (`github.com/arksenu/concierge`)
- React (Vite) web app for staff/employees
- Features: view user requests, respond to messages, manage request statuses, file attachments
- Backend: Express + tRPC + Drizzle ORM (separate server)
- Also built inside Manus.ai

### Manus Infrastructure Dependencies

Both repos currently rely on Manus.ai for:

| Service | What It Does | Env Vars |
|---------|-------------|----------|
| **Database** | MySQL (TiDB) hosting | `DATABASE_URL`, `PETFOLIO_DATABASE_URL` (concierge) |
| **Auth/OAuth** | User authentication via Manus OAuth server | `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` |
| **File Storage** | S3-compatible storage via Manus Forge API | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` |
| **Voice Transcription** | Whisper API proxied through Forge | Same Forge API vars |
| **Push Notifications** | Owner notifications via Forge | Same Forge API vars |
| **Server Hosting** | Both backends hosted on Manus servers | Manus deployment infrastructure |

---

## 2. How the Two Apps Communicate Today

The two apps do **not** call each other's APIs. They communicate entirely through a **shared MySQL database**:

```
┌──────────────────┐                              ┌──────────────────┐
│  Petfolio iOS    │                              │  Concierge       │
│  App             │                              │  Webapp          │
│                  │                              │                  │
│  User creates    │    WRITES TO                 │  Admin sees      │
│  a request  ─────┼──────────────┐               │  the request ◄──┼──┐
│                  │              │               │                  │  │
│  User sends      │              ▼               │  Admin sends     │  │
│  a message  ─────┼───►  ┌──────────────┐        │  a reply  ───────┼──┼──┐
│                  │      │              │        │                  │  │  │
│  User polls      │      │  Shared      │        │  Admin updates   │  │  │
│  every 10s  ◄────┼────  │  MySQL DB    │  ──────┼► request status  │  │  │
│  for new msgs    │      │              │        │                  │  │  │
│                  │      │  Tables:     │        │                  │  │  │
└──────────────────┘      │  - concierge │        └──────────────────┘  │  │
                          │    Requests  │  ◄──────────────────────────┘  │
                          │  - concierge │                                │
                          │    Messages  │  ◄─────────────────────────────┘
                          │  - message   │
                          │    Attach.   │
                          └──────────────┘
```

**The database is the only integration point.** Both apps have their own Express/tRPC backend, and both connect to the same MySQL instance. The iOS app writes user messages and polls for admin responses. The concierge webapp reads user messages and writes admin responses. They never talk to each other directly.

### What Each Backend Handles

**Petfolio backend** (runs on port 3000):
- All pet management CRUD (pets, documents, vaccinations, medications, weight, reminders, providers)
- User-side concierge endpoints (create request, add message, list requests, get messages)
- Admin endpoints (list requests, get messages, respond, update status)
- File uploads via Forge API
- Voice transcription via Forge API
- OAuth login flow
- Full data sync for cloud backup

**Concierge backend** (separate server):
- Admin auth (separate users table for admin sessions)
- Concierge management (list requests, respond, update status, assign)
- File attachment uploads via Forge API
- Dashboard statistics
- Connects to **two databases**: its own DB (admin users) and the Petfolio DB (shared concierge tables)

### The Duplication Problem

Both backends have their own copies of:
- The concierge tRPC routes (list requests, get messages, respond, update status)
- The Drizzle schema for concierge tables
- The Forge API storage client
- The OAuth flow
- Session/cookie management

This means changes to the concierge message format, for example, need to be made in both repos.

---

## 3. Problems with the Current Architecture

### Shared Database Communication

| Problem | Impact |
|---------|--------|
| **Tight coupling** | Both apps depend on the exact same table structure. Changing a column in one repo can silently break the other. |
| **No real-time messaging** | The iOS app polls every 10 seconds. Users see a delay before receiving admin responses. |
| **No push notifications for messages** | There's no event that fires when a new message is written. The Forge notification API exists but isn't wired to message creation. |
| **Duplicated business logic** | Both repos implement their own concierge routes, schema definitions, and storage clients. Bug fixes need to happen in two places. |
| **Schema drift risk** | Two separate Drizzle schemas defining the same tables. If one repo runs migrations the other doesn't expect, things break. |
| **No request validation between apps** | Nothing prevents one app from writing malformed data that the other can't read. |
| **Connection pool competition** | Both backends open their own connection pools to the same DB, competing for connections. |

### Manus Lock-In

| Problem | Impact |
|---------|--------|
| **No local auth** | Can't sign in when developing locally (OAuth requires Manus servers). Must use "Continue Without Account." |
| **No local file uploads** | File storage depends on Forge API, which requires Manus credentials. |
| **No independent deployment** | Can't deploy to your own infrastructure without replacing all Manus services. |
| **Vendor risk** | If Manus changes their API or shuts down, both apps stop working. |

---

## 4. Target Architecture

### What's Better: One Shared Backend API

Instead of both apps hitting the database directly, there should be **one backend** that both apps call:

```
┌──────────────────┐         ┌──────────────────┐
│  Petfolio iOS    │         │  Concierge       │
│  App             │         │  Webapp           │
│  (React Native)  │         │  (React SPA)     │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │  tRPC / HTTP               │  tRPC / HTTP
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────────┐
│              Shared Backend API                  │
│                                                  │
│  - Pet management endpoints                      │
│  - Concierge endpoints (user + admin)            │
│  - Auth (OAuth + sessions)                       │
│  - File upload/download                          │
│  - Voice transcription                           │
│  - WebSocket server (real-time messaging)        │
│  - Push notification triggers                    │
│                                                  │
│  Single Drizzle schema, single source of truth   │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
     ┌──────────────┐  ┌──────────────┐
     │   MySQL DB   │  │  S3 Storage  │
     │  (single)    │  │  (files)     │
     └──────────────┘  └──────────────┘
```

### Benefits

- **Single source of truth** for schema, business logic, and validation
- **Real-time messaging** via WebSockets — no more 10-second polling
- **Push notifications** triggered server-side when a concierge responds
- **One place to fix bugs** — no duplicated routes or schema
- **Independent deployment** on your own infrastructure
- **Local development works fully** — auth, storage, everything

---

## 5. Migration Plan

### Order of Operations

```
Phase 1: Database        ──►  Get your own DB running
Phase 2: File Storage    ──►  Replace Forge API with S3
Phase 3: Auth            ──►  Replace Manus OAuth
Phase 4: Server Hosting  ──►  Deploy backend independently
     │
     ▼
Phase 5: Repo Unification  ──►  Merge into monorepo with shared backend
```

Migrate first, unify second. Both repos stay on Manus until each phase is complete, so you always have a working fallback.

---

### Phase 1: Database Migration

**Goal:** Move from Manus-hosted MySQL to your own MySQL instance.

**Recommended providers:**
- **PlanetScale** — serverless MySQL, generous free tier, branching for schema changes
- **Railway** — simple MySQL hosting, $5/mo
- **Supabase** — Postgres (would require minor Drizzle dialect change), generous free tier

**Steps:**

1. Provision a new MySQL database
2. Export the Manus database:
   ```bash
   mysqldump -h <manus-host> -u <user> -p <database> > petfolio_backup.sql
   ```
3. Import into new database:
   ```bash
   mysql -h <new-host> -u <user> -p <database> < petfolio_backup.sql
   ```
4. Update `DATABASE_URL` in petfolio to point to new DB
5. Update `DATABASE_URL` and `PETFOLIO_DATABASE_URL` in concierge to point to new DB
6. Run `pnpm db:push` in both repos to verify schema matches
7. Test both apps — everything should work identically since only the connection string changed

**Risk:** Low. The apps don't care where the DB is, just that the connection string works.

---

### Phase 2: File Storage Migration

**Goal:** Replace Manus Forge API with standard S3-compatible storage.

**Recommended providers:**
- **Cloudflare R2** — S3-compatible, no egress fees, generous free tier
- **AWS S3** — industry standard, pay-per-use
- **Supabase Storage** — if using Supabase for DB

**Files to modify in petfolio:**
- `server/storage.ts` — replace Forge API calls with S3 SDK (e.g., `@aws-sdk/client-s3`)
- `server/routers.ts` — the `files.upload` endpoint (minor changes to use new storage client)

**Files to modify in concierge:**
- `server/_core/storage.ts` — same replacement

**Steps:**

1. Create an S3 bucket (or R2 bucket)
2. Install `@aws-sdk/client-s3` in both repos
3. Replace `storagePut()` and `storageGet()` functions:
   ```typescript
   // Before (Forge API)
   POST {forgeUrl}/v1/storage/upload?path={key}

   // After (S3)
   s3.putObject({ Bucket, Key, Body, ContentType })
   ```
4. Migrate existing files from Forge to new bucket (download and re-upload)
5. Update file URLs in the database (if URL format changes)
6. Remove `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` env vars
7. Add new env vars: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (or `R2_*` equivalents)

**Also affects:**
- Voice transcription (`server/_core/voiceTranscription.ts`) — currently uses Forge API to proxy Whisper. Replace with direct OpenAI Whisper API call (`OPENAI_API_KEY`).
- Notifications (`server/_core/notification.ts`) — currently uses Forge. Replace with a push notification service (Expo Push Notifications or Firebase Cloud Messaging).

---

### Phase 3: Auth Migration

**Goal:** Replace Manus OAuth with your own auth provider.

This is the biggest change. Options:

| Provider | Pros | Cons |
|----------|------|------|
| **Clerk** | Drop-in, great React/RN SDKs, social logins built in | Paid after free tier |
| **Supabase Auth** | Free, works with Supabase DB, social logins | More DIY for React Native |
| **Auth.js (NextAuth)** | Open source, flexible | Designed for Next.js, needs adapting for Express |
| **Firebase Auth** | Free, great mobile support | Google ecosystem lock-in |
| **Roll your own** | Full control | Most work, security risk if done wrong |

**Recommended: Clerk or Supabase Auth** — both handle social logins (Google, Apple) out of the box.

**Files to modify in petfolio:**
- `server/_core/sdk.ts` — replace Manus OAuth token exchange and user info fetch
- `server/_core/oauth.ts` — replace callback routes with new provider's flow
- `constants/oauth.ts` — update client-side OAuth URLs
- `app/login.tsx` — update login screen to use new provider
- `app/oauth/callback.tsx` — update callback handling
- `lib/_core/auth.ts` — update token storage if format changes

**Files to modify in concierge:**
- `server/_core/sdk.ts` — same replacement
- `server/_core/oauth.ts` — same replacement
- `client/src/const.ts` — update OAuth URLs
- `client/src/pages/Login.tsx` — update login page
- `client/src/hooks/useAuth.tsx` — update auth hook

**Steps:**

1. Set up auth provider (e.g., create Clerk project)
2. Configure social login providers (Google, Apple)
3. Replace server-side OAuth flow in both repos
4. Replace client-side login screens in both repos
5. Migrate existing users (export from Manus DB, import to new provider)
6. Remove Manus OAuth env vars (`OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`)

---

### Phase 4: Server Hosting

**Goal:** Deploy the backend(s) independently.

**Recommended providers:**
- **Railway** — easy deploy from GitHub, $5/mo, supports Node.js
- **Fly.io** — edge deployment, good free tier
- **Render** — simple, free tier available

**Steps:**

1. Push both repos to GitHub (already done)
2. Connect repos to hosting provider
3. Set environment variables on hosting platform
4. Configure custom domain (optional)
5. Update iOS app's API base URL (`EXPO_PUBLIC_API_BASE_URL`)
6. Update concierge webapp's API URL
7. Rebuild and deploy iOS app with new URL

At this point, both apps are fully off Manus.

---

## 6. Repo Unification Plan

**After** all Manus dependencies are removed, merge into one monorepo.

### Target Monorepo Structure

```
petfolio/
├── apps/
│   ├── mobile/              # Expo/React Native iOS app (current petfolio repo)
│   │   ├── app/             # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── constants/
│   │   └── ios/
│   │
│   └── concierge/           # React admin webapp (current concierge repo)
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── hooks/
│       └── public/
│
├── packages/
│   └── shared/              # Shared code between apps
│       ├── schema.ts        # Single Drizzle schema (source of truth)
│       ├── types.ts         # Shared TypeScript types
│       ├── const.ts         # Shared constants
│       └── trpc.ts          # tRPC router type exports
│
├── server/                  # Single shared backend
│   ├── _core/
│   │   ├── index.ts         # Express entry point
│   │   ├── auth.ts          # Auth (replaces both OAuth implementations)
│   │   ├── storage.ts       # S3 file storage
│   │   └── websocket.ts     # WebSocket server (NEW - real-time messaging)
│   ├── routers/
│   │   ├── pets.ts
│   │   ├── documents.ts
│   │   ├── concierge.ts     # Single concierge router (replaces duplicates)
│   │   └── admin.ts
│   └── db.ts                # Single DB connection
│
├── drizzle/                 # Single schema + migrations
│   └── schema.ts
│
├── package.json             # pnpm workspaces root
├── pnpm-workspace.yaml
└── turbo.json               # Turborepo config (optional)
```

### Unification Steps

1. **Create monorepo structure** with pnpm workspaces
2. **Move petfolio app** into `apps/mobile/`
3. **Move concierge app** into `apps/concierge/` (frontend only — strip its backend)
4. **Consolidate backends** — the petfolio backend already has all the routes. Delete the concierge backend and point the concierge webapp at the shared backend's tRPC endpoints.
5. **Extract shared code** into `packages/shared/` — schema, types, constants
6. **Remove duplicated code** — concierge's schema, storage client, OAuth flow, etc.
7. **Add WebSocket support** to the shared backend for real-time concierge messaging
8. **Wire up push notifications** — when a concierge responds, trigger a push notification to the user's device via Expo Push Notifications
9. **Update concierge webapp** to be a tRPC client of the shared backend (same as the iOS app)
10. **Test everything end-to-end**

### Key Benefit

After unification, adding a new field to a concierge message is one change in one file. The schema, the API, and both clients all share the same types. No more keeping two repos in sync.

---

## 7. Migration Checklist

### Phase 1: Database
- [ ] Provision new MySQL instance
- [ ] Export Manus database
- [ ] Import into new database
- [ ] Update `DATABASE_URL` in petfolio
- [ ] Update `DATABASE_URL` and `PETFOLIO_DATABASE_URL` in concierge
- [ ] Verify schema with `db:push`
- [ ] Test both apps end-to-end

### Phase 2: File Storage
- [ ] Create S3/R2 bucket
- [ ] Replace `storagePut`/`storageGet` in petfolio
- [ ] Replace storage client in concierge
- [ ] Replace voice transcription (direct OpenAI Whisper API)
- [ ] Replace notification service (Expo Push or FCM)
- [ ] Migrate existing files to new bucket
- [ ] Update file URLs in database
- [ ] Test file upload/download in both apps

### Phase 3: Auth
- [ ] Set up auth provider (Clerk/Supabase Auth)
- [ ] Configure social logins (Google, Apple)
- [ ] Replace server-side OAuth in petfolio
- [ ] Replace server-side OAuth in concierge
- [ ] Replace client-side login in petfolio iOS app
- [ ] Replace client-side login in concierge webapp
- [ ] Migrate existing users
- [ ] Test login flow in both apps

### Phase 4: Server Hosting
- [ ] Deploy petfolio backend to Railway/Fly.io
- [ ] Deploy concierge backend to Railway/Fly.io
- [ ] Configure environment variables
- [ ] Update API URLs in both frontends
- [ ] Rebuild iOS app with new API URL
- [ ] Verify everything works in production

### Phase 5: Repo Unification
- [ ] Set up pnpm workspaces monorepo
- [ ] Move iOS app to `apps/mobile/`
- [ ] Move concierge webapp to `apps/concierge/`
- [ ] Extract shared schema/types to `packages/shared/`
- [ ] Consolidate to single backend
- [ ] Delete concierge backend code
- [ ] Point concierge webapp at shared backend
- [ ] Add WebSocket support for real-time messaging
- [ ] Add push notifications for new messages
- [ ] End-to-end testing
- [ ] Archive old concierge repo
