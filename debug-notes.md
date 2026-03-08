# Bug Investigation Notes

## Bug 1: Delete pet not working on web
- `handleDelete` in `pet/[id].tsx` uses `Alert.alert()` which does NOT work on web
- Known issue already documented in KNOWN_ISSUES.md
- Need to add Platform.OS === "web" check and use window.confirm() instead
- Same issue affects: deleteDocument, deleteVaccination, deleteReminder, deleteMedication, logDose, handleDeleteAccount in settings

## Bug 2: Sign out "clear local data" not clearing
- Need to check the sign out flow in settings.tsx and auth-context.tsx
- The logout function needs to also clear AsyncStorage keys for pet data

## Bug 3: Web preview wrong account after switching
- On web, auth is cookie-based (app_session_id cookie)
- The cookie domain is `.us2.manus.computer` - shared across 8081 and 3000 subdomains
- After sign out + sign in with different account, the cookie updates but:
  - localStorage `manus-runtime-user-info` may be stale
  - The pet-store may not re-fetch from cloud with new user's data
- Need to check if fetchUser properly clears old user info and reloads
