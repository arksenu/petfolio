# Petfolio Development Context

This document provides comprehensive context for future Manus instances working on this project. Read this before making changes.

## Project Overview

Petfolio is a pet health records management app. Users can track multiple pets, store documents (vet records, lab results, prescriptions), manage vaccinations with expiration tracking, log medications with dosing schedules, and set reminders. The app supports optional cloud sync when users sign in.

## Architecture Summary

### Frontend (Expo/React Native)

The app uses Expo SDK 54 with Expo Router for file-based navigation. Key architectural decisions:

1. **State Management**: Uses React Context (`PetProvider` in `lib/pet-store.tsx`) with `useReducer` for all pet data. This is a large file (~900 lines) that handles:
   - Local state for pets, documents, vaccinations, medications, reminders, weight history
   - AsyncStorage persistence
   - Cloud sync operations via tRPC
   - Action dispatching for all CRUD operations

2. **Authentication**: Managed by `AuthProvider` in `lib/auth-context.tsx`:
   - Web: Cookie-based auth (cookies set by API server)
   - Native: Token-based auth (stored in SecureStore)
   - OAuth flow differs by platform (see OAuth section below)

3. **Styling**: NativeWind (Tailwind CSS for React Native). Theme colors defined in `theme.config.js`. Use semantic tokens like `bg-background`, `text-foreground`, `bg-primary`.

4. **Navigation Structure**:
   ```
   (tabs)/
     index.tsx        → Home (pet list)
     settings.tsx     → Settings
   pet/[id].tsx       → Pet profile with tabs (Records, Vaccinations, Medications, Reminders)
   add-*.tsx          → Form screens
   account.tsx        → User account (sign in/out)
   login.tsx          → OAuth login screen
   ```

### Backend (Express + tRPC)

Located in `server/` directory:

1. **API Server** (`server/_core/index.ts`): Express server on port 3000 with CORS enabled
2. **tRPC Router** (`server/routers.ts`): Defines all API procedures for sync operations
3. **Database** (`server/db.ts`): Drizzle ORM operations for PostgreSQL
4. **OAuth** (`server/_core/oauth.ts`): OAuth callback handlers and session management
5. **Cookies** (`server/_core/cookies.ts`): Cookie domain extraction for cross-subdomain auth

### Database Schema

Located in `drizzle/schema.ts`. Tables:
- `users` - User accounts (id, openId, name, email, loginMethod, lastSignedIn)
- `pets` - Pet records linked to users
- `documents` - Document records linked to pets
- `vaccinations` - Vaccination records linked to pets
- `medications` - Medication records linked to pets
- `reminders` - Reminder records linked to pets
- `weightHistory` - Weight tracking linked to pets

## Critical Implementation Details

### OAuth Flow

**Web Platform:**
1. User clicks "Sign In" → redirects to Manus OAuth portal
2. User authenticates → redirected to `/api/oauth/callback` on API server (3000)
3. Server exchanges code for token, creates session JWT, sets cookie with domain `.sg1.manus.computer`
4. Server redirects to frontend (8081)
5. Frontend calls `/api/auth/me` with cookie → gets user info

**Native Platform (Expo Go limitation):**
- OAuth DOES NOT WORK in Expo Go because the OAuth provider rejects the `exp://` scheme
- Users see a warning message on the login screen explaining this
- For native OAuth to work, must build standalone app with custom scheme (`manus{timestamp}://`)

**Mobile Web Issue (UNRESOLVED):**
- Sign-in completes but session cookie not recognized on subsequent requests
- Likely third-party cookie blocking issue
- Cookie domain is set correctly (`.sg1.manus.computer`) but mobile browsers may block it
- Desktop Chrome works fine, mobile Chrome/Safari have issues

### Cloud Sync Logic

In `lib/pet-store.tsx`:

1. **Upload**: When authenticated, CRUD operations call `syncToCloud()` which uses tRPC mutations
2. **Download**: On sign-in, `restoreFromCloud()` fetches all user data if local state is empty
3. **Merge**: `MERGE_CLOUD_DATA` action merges cloud data with local state

Key sync functions:
- `syncPetToCloud()` - Syncs a single pet
- `syncDocumentToCloud()` - Syncs a document (uploads file to S3 first if local)
- `restoreFromCloud()` - Fetches all data from cloud on sign-in

### Document Storage

Documents can be:
1. **Local**: Stored on device (file:// or ph:// URIs)
2. **Remote**: Uploaded to S3 when signed in (https:// URLs)

The `syncDocumentToCloud()` function handles uploading local files to S3 via the `file.upload` tRPC mutation.

### Date Picker

Custom date picker implementation in `components/custom-date-picker.tsx` because:
- Native iOS date picker doesn't work properly in Expo Go
- Uses three scrollable wheels (month, day, year)
- Handles date constraints (min/max dates)

### PDF Viewer

`components/pdf-viewer.tsx` uses different strategies:
- **Native**: WebView with Google Docs viewer for remote PDFs, or opens externally for local files
- **Web**: Currently broken - WebView doesn't work on web platform

## Known Bugs to Fix

### High Priority

1. **Delete buttons not working (web)**: All delete icons (pet, document, vaccination, medication, reminder) do nothing on web. The handlers likely use `Alert.alert()` which doesn't work on web. Need to use `window.confirm()` or a custom modal for web.

2. **PDF viewer on web**: `react-native-webview` doesn't support web. Need to implement an iframe-based viewer or use `react-pdf` library.

3. **Log Dose button**: Same issue as delete - likely using `Alert.alert()`.

4. **Mobile web sign-in**: Cookie not being stored/read. May need to implement token-based auth for mobile web (store in localStorage instead of cookies).

### Medium Priority

5. **Settings features not implemented**: Export Data, Privacy, Delete All Data buttons are placeholders.

6. **QR code generation**: Share screen has QR option but not implemented.

7. **PDF export**: Share screen has PDF export option but not implemented.

## File Locations for Common Tasks

| Task | File(s) |
|------|---------|
| Add new pet field | `lib/pet-store.tsx` (type + reducer), `app/add-pet.tsx` (form) |
| Add new screen | `app/` directory, update navigation if needed |
| Modify theme colors | `theme.config.js` |
| Add tab bar icon | `components/ui/icon-symbol.tsx` (add mapping first!) |
| Add API endpoint | `server/routers.ts` |
| Modify database schema | `drizzle/schema.ts`, then run `pnpm db:push` |
| Fix web-specific issue | Check for `Platform.OS === 'web'` conditions |

## Testing Approach

1. **Unit tests**: Located in `tests/` directory, run with `pnpm test`
2. **Web preview**: Best for testing auth flow and cloud sync
3. **Expo Go**: Best for testing native features (camera, haptics)
4. **Manual testing**: Check both light and dark modes

## Environment Details

- **Metro (frontend)**: Port 8081, URL pattern `https://8081-{sandboxid}.{region}.manus.computer`
- **API server**: Port 3000, URL pattern `https://3000-{sandboxid}.{region}.manus.computer`
- **Database**: PostgreSQL via Drizzle ORM
- **File storage**: S3-compatible storage via Manus platform

## Common Pitfalls

1. **Pressable className**: Never use `className` on Pressable components - use `style` prop instead (NativeWind limitation)

2. **Alert.alert on web**: Doesn't work - use `window.confirm()` or custom modal

3. **WebView on web**: Doesn't render anything - need platform-specific implementation

4. **Cookie domain**: Must include region subdomain (`.sg1.manus.computer`) for cross-subdomain sharing

5. **Icon mapping**: Must add icon to `components/ui/icon-symbol.tsx` BEFORE using in tab bar

6. **Date picker**: Don't use native date picker in Expo Go - use custom component

## Recommended Next Steps

1. Fix delete functionality by replacing `Alert.alert()` with web-compatible dialogs
2. Implement web PDF viewer using iframe or react-pdf
3. Fix Log Dose button
4. Investigate mobile web auth (may need localStorage-based tokens)
5. Implement Export Data, Privacy, Delete All Data in settings

## Useful Commands

```bash
pnpm dev          # Start both Metro and API server
pnpm test         # Run unit tests
pnpm db:push      # Apply database schema changes
pnpm check        # TypeScript type checking
```

---

*Last updated: January 29, 2026*
