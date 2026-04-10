# Petfolio Known Issues

This document tracks known bugs, limitations, and architectural debt in the current version of Petfolio.

## Open Bugs

### Cloud Sync Mutations Fail Silently

**Symptoms:** Weight entries, pet profile edits, and other mutations update locally but may silently fail to sync to the cloud database. The data appears to save (it persists in AsyncStorage) but is lost if the user clears local data.

**Cause:** Cloud sync calls in `pet-store.tsx` are wrapped in try/catch blocks that log errors to console but never propagate them to the UI. The functions always return success regardless of whether the server mutation succeeded.

**Affected operations:**
- Adding weight entries (`addWeightEntry`)
- Updating pet profiles (`updatePet`)
- Other mutations following the same pattern in `pet-store.tsx`

**Impact:** Data not backed up to cloud. User has no indication of sync failure.

**Priority:** Medium

---

### Vaccinations May Not Restore from Cloud

**Symptoms:** After clearing local data and re-logging in, vaccinations that exist in the DB may not appear in the UI.

**Cause:** The `restoreFromCloud` function maps vaccinations using `petIdMap.get(v.petId)` and falls back to `v.localId` if the mapping fails. If the petIdMap is incomplete, vaccinations can get assigned to the wrong pet or silently dropped.

**Priority:** Medium

---

## Platform Limitations

### Expo Go OAuth Not Supported

OAuth provider rejects `exp://` URL scheme. Users must build a standalone app for sign-in. Use "Continue Without Account" for local development.

**Status:** Cannot be fixed — OAuth provider restriction.

### Mobile Safari Sign-In Session Not Persisted

Sign-in completes on mobile Safari but session cookie is not recognized on subsequent requests. The API server (port 3000) and frontend (port 8081) are on different subdomains, and Safari blocks cross-subdomain cookies. Native builds use token-based auth (SecureStore) which avoids this. Only affects mobile web preview, not production.

**Status:** Known limitation — will be resolved during auth migration.

---

## Architectural Debt

### petId Mapping Inconsistency

Some DB tables use numeric `petId` (FK to `pets.id`), others use string `petLocalId` (matches `pets.localId`). The `medications` table has both. This creates complexity in `restoreFromCloud` which must build a mapping between the two. New tables should prefer `petLocalId` for consistency with the client-side model.

### Concierge Message Restore Uses Raw Fetch

`concierge-store.tsx` fetches messages using raw `fetch()` instead of the tRPC client because `getMessages` requires a dynamic `requestLocalId` parameter that can't be set up as a static hook for multiple requests. This bypasses superjson deserialization.

### Two Separate Stores

Pet data and concierge data are in separate React Context stores (`pet-store.tsx` and `concierge-store.tsx`). Both independently manage AsyncStorage persistence and cloud sync. Vet providers exist in both stores, creating potential data divergence.

---

*Last updated: April 2026*
