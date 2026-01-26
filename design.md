# Petfolio - Mobile App Interface Design

## Overview
Petfolio is an owner-controlled digital portfolio for pet medical records, vaccinations, and documents. The app enables users to store, organize, and share their pet's complete health history with vets, boarders, and pet sitters.

## Design Direction
- **Style**: Clean, minimal UI following Apple Human Interface Guidelines
- **Background**: White/light background
- **Accent Color**: Teal (#0D9488) - professional, calming, health-related
- **Secondary Accent**: Coral (#F97316) for warnings and important actions
- **Layout**: Card-based layouts with prominent pet photos
- **Orientation**: Mobile portrait (9:16), optimized for one-handed usage

## Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| primary | #0D9488 (Teal) | #14B8A6 | Main accent, buttons, active states |
| background | #FFFFFF | #151718 | Screen backgrounds |
| surface | #F8FAFC | #1E2022 | Cards, elevated surfaces |
| foreground | #0F172A | #F1F5F9 | Primary text |
| muted | #64748B | #94A3B8 | Secondary text, labels |
| border | #E2E8F0 | #334155 | Dividers, card borders |
| success | #22C55E | #4ADE80 | Current vaccinations (>30 days) |
| warning | #F59E0B | #FBBF24 | Expiring soon (<30 days) |
| error | #EF4444 | #F87171 | Expired vaccinations |

## Screen List

### 1. Onboarding Flow
- **Splash Screen**: App logo with teal background
- **Welcome Screen**: App introduction with "Get Started" button
- **Sign Up Screen**: Email/password form with Google auth option
- **Sign In Screen**: Email/password form with Google auth option
- **Add First Pet Screen**: Prompt to add first pet after signup

### 2. Home Dashboard
- **Layout**: Full-screen with header and floating action button
- **Header**: "My Pets" title with settings icon
- **Content**: Scrollable list of pet cards
- **Pet Card**: Photo (circular), name, species, breed, next reminder badge
- **Empty State**: Illustration with "Add your first pet" prompt
- **FAB**: Plus icon to add new pet (bottom-right)

### 3. Pet Profile Screen
- **Header**: Large pet photo (editable), name, breed, age, weight
- **Info Bar**: Microchip number, species icon
- **Tab Navigation**: Records | Vaccinations | Reminders
- **Edit Button**: Top-right to edit pet details

### 4. Records Tab (within Pet Profile)
- **Filter Pills**: All, Vet Visit, Lab Results, Prescription, Insurance, Other
- **Record Cards**: Document thumbnail, title, category tag, date
- **Empty State**: "No records yet" with add button
- **Add Button**: Bottom FAB or header action

### 5. Vaccinations Tab (within Pet Profile)
- **Vaccination Cards**: 
  - Vaccine name (bold)
  - Date administered
  - Expiration date with status indicator
  - Status badge (green/yellow/red circle)
- **Status Logic**:
  - Green: >30 days until expiration
  - Yellow: <30 days until expiration
  - Red: Expired
- **Add Button**: Header action or FAB

### 6. Reminders Tab (within Pet Profile)
- **Reminder Cards**: Title, date/time, associated pet
- **Toggle**: Enable/disable individual reminders
- **Add Button**: Create custom reminder

### 7. Add/Edit Pet Screen
- **Photo Picker**: Camera or gallery option
- **Form Fields**:
  - Name (required)
  - Species (dropdown: Dog, Cat, Bird, Rabbit, Other)
  - Breed (text input)
  - Date of Birth (date picker)
  - Weight (number with unit selector)
  - Microchip Number (optional)
- **Save Button**: Bottom sticky button

### 8. Add Document Screen
- **Primary Actions**: 
  - Camera capture button (large, centered)
  - Upload from gallery button
- **Form Fields**:
  - Document title (text)
  - Category (dropdown: Vet Visit, Lab Results, Prescription, Insurance, Other)
  - Date (date picker)
  - Notes (multiline text)
- **Preview**: Thumbnail of captured/selected image

### 9. Add/Edit Vaccination Screen
- **Form Fields**:
  - Vaccine name (dropdown with common + custom):
    - Rabies, DHPP, Bordetella, Leptospirosis, Lyme, Canine Influenza
    - FVRCP, FeLV (cats)
    - Custom option
  - Date administered (date picker)
  - Expiration date (auto-calculated or manual)
  - Vet/Clinic name (text)
  - Attach document (optional)
- **Auto-calculation Logic**:
  - Rabies: +1 year or +3 years (selectable)
  - DHPP: +1 year
  - Bordetella: +6 months to +1 year
  - Others: Manual entry

### 10. Share Profile Screen
- **Options**:
  - Generate shareable link (duration selector: 24h, 7 days, 30 days)
  - Generate PDF export
  - Display QR code
- **Link Display**: Copyable link with expiration info
- **QR Code**: Large, scannable QR code
- **PDF Preview**: Option to preview before sharing

### 11. Settings Screen
- **Sections**:
  - Account: Profile info, change password
  - Notifications: Push notification preferences
  - Data: Export all data, import data
  - Danger Zone: Delete account
- **Version Info**: App version at bottom

## Key User Flows

### Flow 1: New User Onboarding
1. User opens app → Splash screen
2. Welcome screen → Tap "Get Started"
3. Sign Up screen → Enter email/password or Google auth
4. Add First Pet prompt → Tap "Add Pet"
5. Add Pet screen → Fill details → Save
6. Home Dashboard with first pet card

### Flow 2: Adding a Vaccination Record
1. Home Dashboard → Tap pet card
2. Pet Profile → Tap "Vaccinations" tab
3. Tap "+" button
4. Add Vaccination screen → Select vaccine type
5. Auto-populate expiration date
6. Optionally attach document
7. Save → Return to Vaccinations tab with new entry

### Flow 3: Capturing a Document
1. Pet Profile → Records tab → Tap "+"
2. Add Document screen → Tap camera button
3. Camera opens → Capture document
4. Preview image → Confirm
5. Fill category, date, notes
6. Save → Document appears in Records list

### Flow 4: Sharing Pet Profile
1. Pet Profile → Tap share icon (header)
2. Share Profile screen
3. Select "Generate Link" → Choose duration
4. Link generated → Copy or share
5. Recipient opens link → Read-only pet profile view

### Flow 5: Vaccination Reminder Notification
1. System checks vaccination expiration dates daily
2. 7 days before expiration → Push notification
3. 1 day before expiration → Push notification
4. User taps notification → Opens Pet Profile → Vaccinations tab

## Component Specifications

### Pet Card (Home Dashboard)
- Height: 100px
- Photo: 64x64px circular
- Name: 18px semibold
- Species/Breed: 14px muted
- Reminder badge: Pill shape, warning color if upcoming

### Vaccination Status Indicator
- Circle: 12px diameter
- Green (#22C55E): >30 days remaining
- Yellow (#F59E0B): 1-30 days remaining
- Red (#EF4444): Expired

### Tab Bar
- 3 tabs: Records, Vaccinations, Reminders
- Active: Teal underline, teal text
- Inactive: Muted text

### Floating Action Button
- Size: 56x56px
- Color: Primary (teal)
- Icon: Plus (white)
- Position: Bottom-right, 16px margin
- Shadow: Subtle elevation

## Navigation Structure

```
Tab Navigator (Main)
├── Home (Dashboard)
│   └── Pet Profile (Stack)
│       ├── Records Tab
│       │   └── Add Document
│       ├── Vaccinations Tab
│       │   └── Add/Edit Vaccination
│       ├── Reminders Tab
│       │   └── Add Reminder
│       └── Share Profile
├── Add Pet (Modal)
└── Settings
    ├── Account
    ├── Notifications
    └── Data Management
```

## Data Models

### Pet
- id: string
- name: string
- species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
- breed: string
- dateOfBirth: Date
- weight: { value: number, unit: 'kg' | 'lb' }
- microchipNumber?: string
- photoUri?: string
- createdAt: Date
- updatedAt: Date

### Document
- id: string
- petId: string
- title: string
- category: 'vet_visit' | 'lab_results' | 'prescription' | 'insurance' | 'other'
- fileUri: string
- date: Date
- notes?: string
- createdAt: Date

### Vaccination
- id: string
- petId: string
- vaccineName: string
- dateAdministered: Date
- expirationDate: Date
- vetClinicName?: string
- documentId?: string
- createdAt: Date

### Reminder
- id: string
- petId: string
- title: string
- date: Date
- isEnabled: boolean
- createdAt: Date
