# Cloud Sync Bug Analysis

## Symptom
Pet profile changes made on web preview are lost after logout/login cycle.
Initial pet creation syncs, but subsequent updates (name, breed, etc.) don't persist.

## Code Analysis

### What works:
- `addPet()` (line 495): dispatches ADD_PET + calls `upsertPetMutation.mutateAsync()` → syncs to cloud
- `deletePet()` (line 550): dispatches DELETE_PET + calls `deletePetMutation.mutateAsync()` → syncs to cloud
- `updatePet()` (line 527): dispatches UPDATE_PET + calls `upsertPetMutation.mutateAsync()` → syncs to cloud

### What should work but might not:
The `restoreFromCloud` (line 260) only runs when `state.pets.length === 0` (line 254).
After logout+login:
1. `clearAllData()` sets `isClearingRef.current = true`, dispatches CLEAR_ALL_DATA (pets=[])
2. After 100ms timeout, `isClearingRef.current = false`
3. Logout happens (user = null, isAuthenticated = false)
4. User logs back in → isAuthenticated = true
5. `restoreFromCloud` useEffect fires because `isAuthenticated && state.isInitialized && state.pets.length === 0 && !isClearingRef.current`
6. BUT: loadData() also runs on mount. If AsyncStorage was cleared, it initializes with empty arrays.
   If AsyncStorage was NOT fully cleared (race condition), it may load stale data.

### Potential issues:
1. The `isClearingRef.current = false` timeout (100ms) may fire BEFORE AsyncStorage.removeItem completes
   → saveData useEffect sees empty arrays, writes them back → OK
   → But if loadData runs again, it reads empty → OK
   
2. The restoreFromCloud condition `state.pets.length === 0` means if the user had local pets
   that weren't cleared, it won't restore from cloud.

3. **MOST LIKELY**: The upsertPet mutation may be failing silently. The `catch` block just logs
   `console.error('Failed to sync pet update to cloud:', error)` — the user never sees this.
   
4. **CHECK**: Is the tRPC client on web sending the auth cookie properly? The `credentials: "include"`
   is set in apiCall, but tRPC uses its own httpBatchLink. Need to verify tRPC link config.
