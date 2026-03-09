# Petfolio Known Issues

This document tracks known bugs, limitations, and architectural debt in the current version of Petfolio.

## Open Bugs

### weightHistory Table Empty in DB

**Symptoms:** When a user adds a weight entry, the `pets.weight` column updates correctly in the DB, but the `weightHistory` table remains empty. Weight history entries restore correctly after re-login because they persist in AsyncStorage, not the database.

**Cause:** `addWeightMutation.mutateAsync()` in `pet-store.tsx` silently fails. The error is caught and logged but never surfaces. The `addWeightEntry` DB function works correctly when called directly (verified via manual SQL insert). Likely a date serialization or superjson transport issue between client and server.

**Impact:** Weight history is not backed up to cloud. If user clears local data, weight history is lost.

**Priority:** Medium

---

### PDF Viewer Not Working on Web

**Symptoms:** Viewing a PDF document on web shows "React Native WebView does not support this platform."

**Cause:** `react-native-webview` does not support the web platform. The `components/pdf-viewer.tsx` component has no web fallback.

**Workaround:** PDFs work in Expo Go (opens externally) and standalone builds.

**Priority:** Low (most users on mobile)

---

### Mobile Safari Sign-In Session Not Persisted

**Symptoms:** Sign-in completes on mobile Safari but session cookie is not recognized on subsequent requests.

**Cause:** Third-party cookie blocking. The API server (port 3000) and frontend (port 8081) are on different subdomains. Mobile Safari blocks cross-subdomain cookies by default.

**Workaround:** Use desktop Chrome for web testing. Native builds use token-based auth (SecureStore) which avoids this issue.

**Priority:** Low (affects only mobile web preview, not production)

---

### Vaccinations May Not Restore from Cloud on Login

**Symptoms:** After clearing local data and re-logging in, vaccinations that exist in the DB may not appear in the UI.

**Cause:** Not fully diagnosed. The `restoreFromCloud` function maps vaccinations using `petIdMap.get(v.petId)` where `v.petId` is the numeric DB pet ID. If the petIdMap is not built correctly, the mapping fails silently.

**Priority:** Medium

---

### Cloud Sync: Pet Profile Changes May Not Persist

**Symptoms:** Editing a pet's profile (name, breed, etc.) may not persist to the server DB after logout/login cycle.

**Cause:** The `updatePet` function in `pet-store.tsx` calls `upsertPetMutation` but the mutation may fail silently if the data shape doesn't match the server's expected input.

**Priority:** Medium (tracked in todo.md v3.8)

---

## Platform Limitations

### Expo Go OAuth Not Supported

OAuth provider rejects `exp://` URL scheme. Users must use web preview or build a standalone app for sign-in.

**Status:** Cannot be fixed — OAuth provider restriction.

### Alert.alert() on Web

`Alert.alert()` does not work on web. All confirmation dialogs must use `lib/confirm.ts` which wraps `window.confirm()` on web.

**Status:** Resolved for all known instances. New code must use `confirmAction()` from `lib/confirm.ts`.

### Pressable className

NativeWind's `className` prop does not work on `Pressable` components. Always use the `style` prop for Pressable.

**Status:** Globally disabled via `lib/_core/nativewind-pressable.ts`.

### Date Picker in Expo Go

Native iOS date picker doesn't work properly in Expo Go. Custom date picker (`components/custom-date-picker.tsx`) with scrollable wheels is used instead.

**Status:** Resolved with custom component.

## Architectural Debt

### petId Mapping Inconsistency

Some DB tables use numeric `petId` (FK to `pets.id`), others use string `petLocalId` (matches `pets.localId`). This creates complexity in the `restoreFromCloud` function which must build a mapping between the two. New tables should prefer `petLocalId` for consistency with the client-side model.

### Concierge Message Restore Uses Raw Fetch

`concierge-store.tsx` restores messages using raw `fetch()` instead of the tRPC client because the `getMessages` query requires a dynamic `requestLocalId` parameter that can't be set up as a static hook for multiple requests. This bypasses superjson deserialization.

### Two Separate Stores

Pet data and concierge data are in separate React Context stores (`pet-store.tsx` and `concierge-store.tsx`). Both independently manage AsyncStorage persistence and cloud sync. Vet providers exist in both stores (concierge-store for the concierge UI, pet-store for the pet profile sync). This creates potential data divergence.

---

*Last updated: March 9, 2026*
