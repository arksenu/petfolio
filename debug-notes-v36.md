# Bug Analysis v3.6

## Key Observation from Web Preview
Settings page shows "Account - Sign in to sync across devices" which means the user is NOT
authenticated on the web preview right now. The two pet profiles (Draco) are from localStorage.

This means:
1. The `app_session_id` cookie has expired or was cleared
2. The user needs to sign in again to test the account switching bug
3. The "clear local data" bug: the data persists in localStorage even after sign out

## Bug 1: Clear local data on sign out not working

The flow is: clearAllData() -> removes AsyncStorage items -> dispatch CLEAR_ALL_DATA
But the user says data persists. Possible causes:
- The `restoreFromCloud` useEffect fires after clear because `isAuthenticated` is still true
  during the clearAllData call (before logout() completes)
- Sequence: clearAllData() sets pets=[], then restoreFromCloud fires because
  isAuthenticated=true AND pets.length=0, which re-fetches from cloud and puts data back

THIS IS THE BUG. The restoreFromCloud useEffect:
```
if (isAuthenticated && state.isInitialized && state.pets.length === 0 && !state.isSyncing)
```
After clearAllData(), isAuthenticated is still true (logout hasn't been called yet).
state.pets.length is 0 (just cleared). So restoreFromCloud fires and re-downloads everything.

FIX: Add isClearingRef check to the restoreFromCloud useEffect, or call logout() BEFORE
clearAllData(), or add a separate flag to prevent restore during clear.

## Bug 2: Always signs in as dariomazhara87

Manus OAuth is tied to the Manus account. There's only one identity. When the user "signs in
with a different email", the OAuth flow still authenticates via the Manus session which is
always dariomazhara87@gmail.com. This is expected behavior for Manus OAuth - it's not a
multi-user auth system from the user's perspective within the Manus sandbox.

The user sees the Google account picker but the Manus OAuth server resolves to the same
Manus user regardless.
