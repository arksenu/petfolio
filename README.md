# Petfolio

A mobile app for managing pet health records, vaccinations, medications, and documents. Built with React Native, Expo SDK 54, and TypeScript.

## Features

- **Pet Management**: Add, edit, and manage multiple pets with photos and details
- **Document Storage**: Upload and organize vet records, lab results, prescriptions, and insurance documents
- **Vaccination Tracking**: Track vaccinations with automatic expiration warnings (green/yellow/red status)
- **Medication Management**: Log medications with dosage schedules and refill reminders
- **Reminders**: Set custom reminders for appointments and care tasks
- **Weight Tracking**: Record weight history with visual charts
- **Cloud Sync**: Sync data across devices when signed in (optional)
- **Sharing**: Generate shareable links for pet profiles

## Tech Stack

- **Framework**: React Native 0.81 with Expo SDK 54
- **Language**: TypeScript 5.9
- **Styling**: NativeWind 4 (Tailwind CSS for React Native)
- **Navigation**: Expo Router 6
- **State Management**: React Context + useReducer with AsyncStorage persistence
- **Backend**: Express.js with tRPC
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: OAuth via Manus platform

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Tab navigator screens
    index.tsx           # Home dashboard (pet list)
    settings.tsx        # Settings screen
  pet/[id].tsx          # Pet profile with tabs
  add-pet.tsx           # Add/edit pet form
  add-document.tsx      # Document upload
  add-vaccination.tsx   # Vaccination form
  add-medication.tsx    # Medication form
  add-reminder.tsx      # Reminder form
  account.tsx           # User account management
  login.tsx             # Sign in screen

components/             # Reusable UI components
  screen-container.tsx  # SafeArea wrapper
  pet-card.tsx          # Pet list item
  document-card.tsx     # Document list item
  pdf-viewer.tsx        # PDF viewing component
  custom-date-picker.tsx # Cross-platform date picker

lib/                    # Core utilities
  pet-store.tsx         # Pet data state management
  auth-context.tsx      # Authentication state
  trpc.ts               # API client

server/                 # Backend API
  _core/                # Server infrastructure
  routers.ts            # tRPC API routes
  db.ts                 # Database operations

drizzle/                # Database schema
  schema.ts             # Table definitions
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Expo Go app (for mobile testing)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Testing

- **Web Preview**: Open the Metro URL in browser (best for sign-in testing)
- **Expo Go**: Scan QR code with Expo Go app (best for native features)
- **Standalone**: Run `expo prebuild` and build through Xcode/Android Studio

## Environment Variables

The following environment variables are configured automatically:

- `EXPO_PUBLIC_OAUTH_PORTAL_URL` - OAuth portal URL
- `EXPO_PUBLIC_OAUTH_SERVER_URL` - OAuth server URL
- `EXPO_PUBLIC_APP_ID` - Application ID
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Session token signing secret

## Known Issues

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for current bugs and limitations.

Key issues:
- Delete buttons don't work on web (need web-compatible confirmation dialogs)
- PDF viewer doesn't work on web (WebView not supported)
- OAuth sign-in not available in Expo Go (scheme restriction)
- Mobile browser sign-in has cookie issues on some browsers

## Development Notes

### Platform Differences

| Feature | Web | Expo Go | Standalone |
|---------|-----|---------|------------|
| Sign In | ✅ | ❌ | ✅ |
| Cloud Sync | ✅ | ❌ | ✅ |
| Camera | ❌ | ✅ | ✅ |
| Haptics | ❌ | ✅ | ✅ |
| PDF View | ❌ | ✅ (external) | ✅ |

### State Management

Pet data is managed through a React Context provider (`PetProvider`) with:
- Local persistence via AsyncStorage
- Optional cloud sync when authenticated
- Automatic restore from cloud on sign-in

### Authentication Flow

1. Web: OAuth redirect to Manus portal → callback sets cookie → redirect to app
2. Native: Deep link to OAuth portal → callback via custom scheme → token stored in SecureStore

## License

Private - Manus Platform
