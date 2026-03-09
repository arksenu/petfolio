# Petfolio - Manus Project Instructions

Project: Petfolio - Pet Health Records Mobile App

Tech Stack: Expo SDK 54, React Native, TypeScript, NativeWind, tRPC, MySQL/Drizzle

## Before Starting Any Task

1. Read `context.md` for full technical architecture and implementation details
2. Read `KNOWN_ISSUES.md` for current bugs and platform limitations
3. Read `todo.md` for feature/bug tracking status
4. Read `design.md` for UI/UX specifications

## Key Architecture

- **State management**: `lib/pet-store.tsx` (pets, documents, vaccinations, medications, reminders, weight history — handles AsyncStorage persistence + tRPC cloud sync)
- **Concierge state**: `lib/concierge-store.tsx` (requests, messages, vet providers — handles AsyncStorage persistence + tRPC cloud sync)
- **Authentication**: `lib/auth-context.tsx` (cookie-based web, token-based native)
- **API**: `server/routers.ts` (tRPC endpoints for all entity types + admin concierge + voice transcription + file upload)
- **Database**: `drizzle/schema.ts` (MySQL schema via Drizzle ORM)
- **DB operations**: `server/db.ts` (all Drizzle query functions)
- **Shared types**: `shared/pet-types.ts` (all client-side interfaces: Pet, PetDocument, Vaccination, Medication, WeightEntry, Reminder, ConciergeRequest, ConciergeMessage, VetProvider)
- **Cross-platform confirm**: `lib/confirm.ts` (wraps Alert.alert for native, window.confirm for web — use this instead of Alert.alert)
- **Notifications**: `lib/notifications.ts` (client-side push notification scheduling and permissions)

## Platform Constraints

- OAuth does not work in Expo Go (`exp://` scheme rejected by provider). Dev bypass: `EXPO_PUBLIC_DEV_SESSION_TOKEN`.
- `Alert.alert()` does not work on web — use `confirmAction()` or `confirmChoice()` from `lib/confirm.ts`
- `react-native-webview` does not work on web — need platform-specific implementations
- Never use `className` on `Pressable` components — use `style` prop (globally disabled via `lib/_core/nativewind-pressable.ts`)
- Add icon mappings to `components/ui/icon-symbol.tsx` before using in tabs
- Mobile Safari blocks cross-subdomain cookies — token-based auth works on native, cookie auth works on desktop web only

## Database Notes

- Tables use two ID patterns: numeric `petId` (FK to `pets.id`) for older tables (documents, vaccinations, reminders, weightHistory) and string `petLocalId` (matches `pets.localId`) for newer tables (vetProviders, medications, conciergeRequests). The `restoreFromCloud` function in `pet-store.tsx` builds a `petIdMap` to translate between them.
- Schema changes: edit `drizzle/schema.ts`, then run `pnpm db:push`
- Database is MySQL, not PostgreSQL (despite some docs saying PostgreSQL)

## Cloud Sync Pattern

Both stores (`pet-store.tsx` and `concierge-store.tsx`) follow the same pattern:
1. **Local-first**: All CRUD operations update local state + AsyncStorage immediately
2. **Sync on write**: If authenticated, each CRUD function also calls its tRPC mutation (fire-and-forget with error catch)
3. **Restore on login**: When user signs in and local data is empty, `restoreFromCloud()` fetches all data from server
4. **Full sync**: `syncWithCloud()` in pet-store pushes all local data to server (used for initial upload or recovery)

Errors in cloud sync are caught and logged, never blocking the UI. This means data can silently fail to reach the server.

## Concierge Feature

Human-powered service layer. Users submit requests via chat (text or voice). Admin responds through server API endpoints. No AI automation — the owner handles requests manually.

- Admin endpoints: `server/routers.ts` under `admin` namespace (listPendingRequests, getRequestMessages, respondToRequest, updateRequestStatus)
- Voice: `expo-audio` recording → S3 upload → server-side transcription via `server/_core/voiceTranscription.ts`
- Push notifications: triggered when admin responds via `server/_core/notification.ts`

## Workflow

- Update `todo.md` before starting new features or bug fixes
- Mark items `[x]` in `todo.md` before saving checkpoints
- Test on desktop web preview for auth flows, Expo Go for native features
- Run `pnpm test` before checkpoints
- Run `pnpm check` to verify TypeScript

## Commands

```bash
pnpm dev          # Start both Metro (8081) and API server (3000)
pnpm test         # Run vitest unit tests
pnpm check        # TypeScript type checking
pnpm db:push      # Generate + apply database migrations
```
