# Sync Bug Diagnosis

## DB State for userId=1 (dariomazhara87)
- Pets: 2 (Draco weight=93, TEST weight=null) — pet creation works, weight on pet record updates
- Vaccinations: 0 — NOT syncing for this user
- Documents: 0
- Reminders: 0
- Weight History: 0
- Vet Providers: 0

## DB State for userId=690006 (leizaro.fei)
- Vaccinations: 1 (Rabies 3 year, petId=90001)
- This user's data IS syncing for vaccinations

## DB State for userId=210004 (kolomanjo)
- Vaccinations: 1 (Rabies 3 year, petId=30001)

## Issues identified:

### 1. Pet weight field on pet record
- Draco has weight=93.00 in DB. User says weights are empty.
- User may be referring to weight HISTORY entries (weightHistory table), not the pet.weight field.
- weightHistory table is completely empty for all users → addWeightEntry cloud sync is failing silently.

### 2. Vet providers
- vetProviders table is empty for ALL users → upsert is failing or not being called.
- Need to check if addProvider in pet-store calls cloud sync.

### 3. Vaccinations for userId=1
- 0 vaccinations in DB for userId=1, but user says they added vaccinations.
- Could be: (a) the upsert failed silently, or (b) the user was on a different account.

### 4. restoreFromCloud
- The sync.getData endpoint returns pets, documents, vaccinations, reminders, weightHistory.
- It does NOT return vet providers or medications → these are never restored from cloud.
- The MERGE_CLOUD_DATA reducer likely doesn't handle providers.

## Root causes to check:
1. Does syncWithCloud upload vet providers? → NO, it only uploads pets, docs, vax, reminders, weight
2. Does restoreFromCloud fetch providers? → NO, getUserSyncData doesn't include providers
3. Are individual entity mutations (addVaccination, addWeightEntry, etc.) calling cloud sync?
4. Is the restoreFromCloud properly mapping petId (DB int) to localId (string)?
