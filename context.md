# Petfolio Development Context

This document provides comprehensive context for future Manus instances working on this project. Read this before making changes.

## Project Overview

Petfolio is a pet health records management app built with Expo SDK 54. Users can track multiple pets, store documents (vet records, lab results, prescriptions), manage vaccinations with expiration tracking, log medications with dosing schedules, track weight history, manage vet providers, and set reminders. A concierge feature allows users to submit requests (text or voice) that are handled by a human operator. The app supports optional cloud sync when users sign in via Manus OAuth.

## Architecture Summary

### Frontend (Expo/React Native)

Expo SDK 54 with Expo Router for file-based navigation. NativeWind (Tailwind CSS) for styling.

**State Management:**

| Store | File | Scope | Persistence |
|-------|------|-------|-------------|
| Pet data | `lib/pet-store.tsx` | Pets, documents, vaccinations, medications, reminders, weight history | AsyncStorage + tRPC cloud sync |
| Concierge | `lib/concierge-store.tsx` | Requests, messages, vet providers | AsyncStorage + tRPC cloud sync |
| Auth | `lib/auth-context.tsx` | User session, login state | SecureStore (native) / cookies (web) |
| Theme | `lib/theme-provider.tsx` | Light/dark mode | System preference |

**Navigation Structure:**

```
(tabs)/
  index.tsx              → Home (pet list)
  requests.tsx           → Concierge request list
  settings.tsx           → Settings
pet/[id].tsx             → Pet profile (Records, Vaccinations, Medications, Reminders tabs)
add-pet.tsx              → Add pet form
edit-pet/[id].tsx        → Edit pet form
add-document/[petId].tsx → Add document form
add-vaccination/[petId].tsx → Add vaccination form
add-medication/[petId].tsx  → Add medication form
add-reminder/[petId].tsx    → Add reminder form
weight-history/[petId].tsx  → Weight history + add entry
vet-providers/[petId].tsx   → Vet provider management
new-request.tsx          → New concierge request (text/voice)
request-thread/[id].tsx  → Concierge chat thread
share/[petId].tsx        → Share pet profile
search.tsx               → Document search
view-document/[id].tsx   → Document viewer
account.tsx              → User account (sign in/out)
login.tsx                → OAuth login screen
notification-settings.tsx → Notification preferences
dev/theme-lab.tsx        → Dev-only theme preview
oauth/callback.tsx       → OAuth callback handler
```

### Backend (Express + tRPC)

Located in `server/` directory. Express on port 3000, tRPC for type-safe API.

**Key server files:**

| File | Purpose |
|------|---------|
| `server/_core/index.ts` | Express server entry, CORS, tRPC middleware |
| `server/routers.ts` | All tRPC procedures (pets, documents, vaccinations, medications, reminders, weight, providers, concierge, voice, sync, file) |
| `server/db.ts` | Drizzle ORM database operations |
| `server/storage.ts` | S3 file upload/download |
| `server/_core/oauth.ts` | OAuth callback handlers, session JWT |
| `server/_core/cookies.ts` | Cookie domain extraction |
| `server/_core/voiceTranscription.ts` | Audio transcription via platform API |
| `server/_core/llm.ts` | LLM integration (built-in, no API key needed) |
| `server/_core/notification.ts` | Push notification delivery |

### Database Schema (MySQL via Drizzle ORM)

Located in `drizzle/schema.ts`. All tables use `localId` (varchar) for client-side sync mapping and `userId` (int) for ownership.

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, openId, name, email, role | Manus OAuth identity |
| `pets` | id, localId, userId, name, species, breed, weight | Pet profiles |
| `petDocuments` | id, localId, petId, userId, title, category, fileUri | Medical records, uses numeric petId |
| `vaccinations` | id, localId, petId, userId, name, dateAdministered, expirationDate | Uses numeric petId |
| `reminders` | id, localId, petId, userId, title, date, isEnabled | Uses numeric petId |
| `weightHistory` | id, localId, petId, userId, weight, date | Uses numeric petId |
| `medications` | id, localId, petId, userId, petLocalId, name, dosage, frequency, doseLog (JSON) | Has both petId and petLocalId |
| `vetProviders` | id, localId, userId, petLocalId, clinicName, phone, providerType | Uses petLocalId (string) |
| `conciergeRequests` | id, localId, userId, petLocalId, status, preview, messageCount | Uses petLocalId (string) |
| `conciergeMessages` | id, localId, requestId (numeric), userId, senderType, content, audioUrl | requestId references conciergeRequests.id |

**Critical: petId mapping inconsistency.** Some tables use numeric `petId` (FK to pets.id), others use string `petLocalId` (matches pets.localId). The `restoreFromCloud` function in pet-store.tsx builds a `petIdMap` (numeric → localId) to translate. When syncing TO cloud, the DB functions like `addWeightEntry` call `getPetByLocalId(userId, petLocalId)` to resolve the numeric petId.

### Cloud Sync Architecture

**Two stores, two sync patterns:**

1. **pet-store.tsx** (pets, documents, vaccinations, medications, reminders, weight):
   - Upload: Each CRUD function calls its tRPC mutation inline (e.g., `upsertPetMutation.mutateAsync(...)`)
   - `syncWithCloud()`: Full push of all data to server (called manually or on certain events)
   - `restoreFromCloud()`: Fetches all data via `sync.getData` query when user signs in and local data is empty
   - Errors are caught and logged, never block the UI

2. **concierge-store.tsx** (requests, messages):
   - Upload: `createRequest` and `addMessage` call tRPC mutations inline when authenticated
   - `restoreFromCloud()`: Fetches requests via `concierge.listRequests`, then fetches messages per request via raw fetch to `concierge.getMessages`
   - Triggers when authenticated + initialized + no local requests

### Authentication

**Web:** Cookie-based. OAuth callback sets `app_session_id` cookie on `.manus.computer` domain. Frontend calls `/api/auth/me` with cookie.

**Native:** Token-based. Stored in SecureStore. Sent as `Authorization: Bearer` header.

**OAuth flow:** Manus OAuth portal → `/api/oauth/callback` → JWT session → redirect to frontend.

**Limitation:** OAuth does NOT work in Expo Go (`exp://` scheme rejected). Dev bypass available via `EXPO_PUBLIC_DEV_SESSION_TOKEN`.

## File Locations for Common Tasks

| Task | File(s) |
|------|---------|
| Add new pet field | `shared/pet-types.ts` (type), `lib/pet-store.tsx` (reducer + CRUD), `drizzle/schema.ts` (DB), `server/routers.ts` (API) |
| Add new screen | `app/` directory (file-based routing) |
| Modify theme colors | `theme.config.js` |
| Add tab bar icon | `components/ui/icon-symbol.tsx` (add mapping FIRST) |
| Add API endpoint | `server/routers.ts` (procedure), `server/db.ts` (DB function) |
| Modify database schema | `drizzle/schema.ts`, then `pnpm db:push` |
| Fix web-specific issue | Check for `Platform.OS === 'web'` conditions |
| Cross-platform confirm | Use `lib/confirm.ts` (wraps Alert.alert for native, window.confirm for web) |
| File upload | `server/storage.ts` + `file.upload` tRPC mutation |
| Push notifications | `lib/notifications.ts` (client), `server/_core/notification.ts` (server) |

## Shared Types

All client-side data models are in `shared/pet-types.ts`. Key interfaces: `Pet`, `PetDocument`, `Vaccination`, `Medication`, `DoseLog`, `WeightEntry`, `Reminder`, `ConciergeRequest`, `ConciergeMessage`, `VetProvider`.

## Testing

- **Unit tests**: `tests/` directory, run with `pnpm test` (vitest)
- **Web preview**: Best for testing auth flow and cloud sync
- **Expo Go**: Best for testing native features (camera, haptics)
- **Current test suites**: auth.logout, cloud-sync, concierge, concierge-sync, notifications, voice-recording

## Commands

```bash
pnpm dev          # Start both Metro (8081) and API server (3000)
pnpm test         # Run vitest unit tests
pnpm check        # TypeScript type checking
pnpm db:push      # Generate + apply database migrations
```

---

*Last updated: March 9, 2026*
