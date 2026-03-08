# Petfolio TODO

## Core Setup
- [x] Update theme colors (teal accent)
- [x] Configure icon mappings
- [x] Set up navigation structure

## Authentication
- [ ] Sign up screen with email/password
- [ ] Sign in screen
- [ ] Google OAuth integration
- [ ] Auth state management

## Home Dashboard
- [x] Pet cards list with FlatList
- [x] Pet card component (photo, name, species, reminder badge)
- [x] Empty state for no pets
- [x] Floating action button to add pet

## Pet Management
- [x] Add pet screen with form
- [x] Edit pet screen
- [x] Pet photo picker (camera/gallery)
- [x] Delete pet functionality

## Pet Profile
- [x] Profile header with pet photo and details
- [x] Tab navigation (Records, Vaccinations, Reminders)
- [x] Edit pet details button

## Records Tab
- [x] Document list with category filters
- [x] Document card component
- [x] Add document screen
- [x] Camera capture for documents
- [x] Gallery upload for documents
- [x] Category selector dropdown
- [ ] Document preview

## Vaccinations Tab
- [x] Vaccination list with status indicators
- [x] Vaccination card component
- [x] Status color logic (green/yellow/red)
- [x] Add vaccination screen
- [x] Vaccine type dropdown with common vaccines
- [x] Auto-calculate expiration dates
- [ ] Edit vaccination
- [ ] Attach document to vaccination

## Reminders Tab
- [x] Reminder list
- [x] Add custom reminder
- [x] Toggle reminder on/off
- [ ] Push notification setup for reminders

## Sharing
- [x] Share profile screen
- [x] Generate shareable link with duration
- [ ] QR code generation
- [ ] PDF export of records

## Settings
- [x] Settings screen layout
- [ ] Account management section
- [ ] Notification preferences
- [ ] Data export option
- [ ] Delete account option

## Branding
- [x] Generate custom app logo
- [x] Update app configuration


## Bug Fixes
- [x] Fix date picker not showing on mobile devices (add-pet, add-document, add-vaccination, add-reminder screens)

## New Features (v1.1)
- [x] Document viewer - tap to view uploaded images/PDFs full screen
- [x] Push notifications for reminders
- [x] Push notifications for vaccination expiration warnings
- [x] User authentication (sign up, sign in)
- [ ] Cloud sync with backend database

## Bug Fixes (v1.2)
- [x] Fix date picker - date wheel not visible in modal on iOS
- [x] Enable PDF and document file uploads (not just images)
- [x] Add PDF viewer for viewing uploaded PDF documents

## Bug Fixes (v1.3)
- [x] Create fully custom date picker with scrollable wheels (native picker not working in Expo Go)
- [x] Build in-app PDF viewer using WebView instead of external app

## Bug Fixes (v1.4)
- [x] Fix date picker - greyed out items due to minimumDate constraint on date of birth
- [x] Fix date picker - wheels don't snap to values properly
- [x] Fix document viewer - loading forever for local files (images/PDFs stored on device)

## Features (v1.5)
- [x] In-app PDF viewer - display PDFs directly with scrolling support

## Features (v1.6)
- [x] Cloud sync - sync pet data to backend for signed-in users
- [x] Document search - search documents by title/category across all pets
- [x] Pet weight tracking - record weight history with visual chart

## Features (v1.7) - Medication Tracking
- [x] Medication data model (name, dosage, frequency, start/end dates, refill info)
- [x] Add medication screen with dosage schedule options
- [x] Medications tab on pet profile
- [x] Medication card with next dose indicator
- [x] Log dose taken functionality
- [x] Dose reminder notifications
- [x] Refill reminder notifications
- [x] Edit/delete medication functionality

## Bug Fixes & Features (v1.8)
- [x] Fix authentication state not updating after sign-in (Settings -> Account still shows "not signed in")
- [x] Implement server-side document upload to S3 storage
- [x] Update document viewer to use remote URLs for reliable PDF/image viewing
- [x] Fix image/document display on real iOS devices (now uses cloud storage when signed in)

## Bug Fixes (v1.9)
- [x] Remove react-native-pdf (not compatible with Expo Go) and use WebView-based PDF viewer
- [x] Fix Sign Out button not working on desktop (use window.confirm for web platform)
- [x] Handle Expo Go OAuth redirect_uri limitation gracefully (show warning message)
- [x] Fix PDF viewer to work on all platforms (web, iOS, Android)

## Bug Fixes (v2.0)
- [x] Fix sign out to ask user whether to keep or clear local data
- [x] Fix mobile web sign in (page unavailable error) - dynamic frontend URL from request hostname
- [x] Investigate Expo Go sign in possibility - NOT POSSIBLE: OAuth provider rejects 'exp://' scheme used by Expo Go. Users must use web preview or build standalone app.
- [x] Fix delete pet button not working (desktop/mobile web) - replaced Alert.alert with cross-platform confirm
- [x] Fix delete document/vaccination/medication/reminder buttons not working - cross-platform confirm
- [ ] Fix PDF viewer on web (WebView not supported on web platform)
- [x] Fix Log Dose button not working for medications - cross-platform confirmChoice
- [x] Fix cloud sync restore - pet data not restored after sign out (clear data) and sign back in
- [x] Fix mobile web sign-in session not recognized after OAuth callback (cookie domain now includes region subdomain)
- [ ] Fix mobile Safari sign-in - session cookie not stored/read after OAuth (SameSite/third-party cookie issue)

## Concierge Features (v3.0)
- [x] Add concierge types to shared/pet-types.ts
- [x] Add concierge database tables (requests, messages, vet_providers)
- [x] Add concierge server API endpoints
- [x] Add concierge request store (local + cloud)
- [x] Build Requests tab with request list
- [x] Build New Request screen (text + voice)
- [x] Build Request Thread screen (iMessage-style chat)
- [x] Build voice recording and transcription
- [x] Add push notifications for concierge responses (local + push token support)
- [x] Add Vet/Provider association on pet profile
- [x] Add provider management (add/edit/delete)
- [x] Fix voice recording button not visible - added Type/Voice toggle to new request screen

## Audio Recording & Admin API (v3.2)
- [x] Wire up actual expo-audio recording in new request screen
- [x] Wire up actual expo-audio recording in chat thread screen
- [x] Upload audio recordings to S3
- [x] Integrate server-side voice transcription (voiceTranscription.ts)
- [x] Build admin API endpoints (list pending requests, respond to requests, update status)
- [x] Trigger push notification when admin responds (via notifyOwner + local notification on client sync)

## Dev Workflow (v3.3)
- [x] Add dev-only auth bypass for local Expo Go testing (EXPO_PUBLIC_DEV_SESSION_TOKEN)

## Bug Fixes (v3.4)
- [x] Fix login.tsx router.replace called during render (move redirect to useEffect)

## Bug Fixes (v3.5)
- [x] Fix delete pet not working on web preview (replaced Alert.alert with cross-platform confirmAction)
- [x] Fix sign out with "clear local data" not actually clearing data (race condition fix + concierge clear)
- [x] Fix web preview showing wrong account after switching (web fetchUser always calls API, logout clears all stores)

## Bug Fixes (v3.6)
- [x] Fix sign out with "clear local data" still not clearing pet data on web preview (restoreFromCloud race + logout ordering)
- [x] Fix web preview always signing in as dariomazhara87 — expected behavior: Manus OAuth is single-identity tied to Manus account
