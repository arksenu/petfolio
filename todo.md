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
