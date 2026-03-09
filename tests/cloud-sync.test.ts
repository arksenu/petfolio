import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const petStorePath = path.resolve(__dirname, '../lib/pet-store.tsx');
const petStoreSource = fs.readFileSync(petStorePath, 'utf-8');

const routersPath = path.resolve(__dirname, '../server/routers.ts');
const routersSource = fs.readFileSync(routersPath, 'utf-8');

const dbPath = path.resolve(__dirname, '../server/db.ts');
const dbSource = fs.readFileSync(dbPath, 'utf-8');

const schemaPath = path.resolve(__dirname, '../drizzle/schema.ts');
const schemaSource = fs.readFileSync(schemaPath, 'utf-8');

describe('Cloud sync: medications', () => {
  it('schema has medications table with doseLog JSON column', () => {
    expect(schemaSource).toContain('export const medications = mysqlTable');
    expect(schemaSource).toContain('doseLog: json("doseLog")');
  });

  it('db.ts has upsertMedication and deleteMedication functions', () => {
    expect(dbSource).toContain('export async function upsertMedication');
    expect(dbSource).toContain('export async function deleteMedication');
    expect(dbSource).toContain('export async function getUserMedications');
  });

  it('routers.ts has medications.upsert and medications.delete endpoints', () => {
    expect(routersSource).toContain('medications: router({');
    expect(routersSource).toMatch(/medications:.*upsert:.*protectedProcedure/s);
    expect(routersSource).toMatch(/medications:.*delete:.*protectedProcedure/s);
  });

  it('pet-store.tsx has upsertMedMutation and deleteMedMutation hooks', () => {
    expect(petStoreSource).toContain('trpc.medications.upsert.useMutation()');
    expect(petStoreSource).toContain('trpc.medications.delete.useMutation()');
  });

  it('addMedication calls upsertMedMutation when authenticated', () => {
    // The addMedication function should call upsertMedMutation.mutateAsync
    const addMedSection = petStoreSource.slice(
      petStoreSource.indexOf('async function addMedication'),
      petStoreSource.indexOf('async function updateMedication')
    );
    expect(addMedSection).toContain('upsertMedMutation.mutateAsync');
  });

  it('updateMedication calls upsertMedMutation when authenticated', () => {
    const updateMedSection = petStoreSource.slice(
      petStoreSource.indexOf('async function updateMedication'),
      petStoreSource.indexOf('async function deleteMedication')
    );
    expect(updateMedSection).toContain('upsertMedMutation.mutateAsync');
  });

  it('deleteMedication calls deleteMedMutation when authenticated', () => {
    const deleteMedSection = petStoreSource.slice(
      petStoreSource.indexOf('async function deleteMedication'),
      petStoreSource.indexOf('function getMedicationsForPet')
    );
    expect(deleteMedSection).toContain('deleteMedMutation.mutateAsync');
  });

  it('logDose syncs updated medication with doseLog to cloud', () => {
    const logDoseStart = petStoreSource.indexOf('async function logDose');
    const logDoseEnd = petStoreSource.indexOf('// Clear all local data', logDoseStart);
    const logDoseSection = petStoreSource.slice(logDoseStart, logDoseEnd);
    expect(logDoseSection.length).toBeGreaterThan(100);
    expect(logDoseSection).toContain('upsertMedMutation.mutateAsync');
    expect(logDoseSection).toContain('doseLog: updatedMed.doseLog');
  });

  it('syncWithCloud includes medications loop', () => {
    const syncStart = petStoreSource.indexOf('const syncWithCloud = useCallback');
    const syncSection = petStoreSource.slice(
      syncStart,
      petStoreSource.indexOf('// Pet actions', syncStart)
    );
    expect(syncSection).toContain('for (const med of state.medications)');
    expect(syncSection).toContain('upsertMedMutation.mutateAsync');
  });

  it('restoreFromCloud maps medications from cloud data', () => {
    const restoreSection = petStoreSource.slice(
      petStoreSource.indexOf('restoreFromCloud'),
      petStoreSource.indexOf('const syncWithCloud')
    );
    expect(restoreSection).toContain('cloudData.medications');
    expect(restoreSection).toContain('medications,');
  });
});

describe('Cloud sync: vet providers', () => {
  it('schema has vetProviders table', () => {
    expect(schemaSource).toContain('export const vetProviders = mysqlTable');
  });

  it('db.ts has upsertProvider and deleteProvider functions', () => {
    expect(dbSource).toContain('export async function upsertProvider');
    expect(dbSource).toContain('export async function deleteProvider');
  });

  it('routers.ts has providers.upsert and providers.delete endpoints', () => {
    expect(routersSource).toContain('providers: router({');
  });

  it('pet-store.tsx has upsertProviderMutation hook', () => {
    expect(petStoreSource).toContain('trpc.providers.upsert.useMutation()');
    expect(petStoreSource).toContain('trpc.providers.delete.useMutation()');
  });

  it('updatePet syncs vet providers to cloud', () => {
    const updatePetSection = petStoreSource.slice(
      petStoreSource.indexOf('async function updatePet'),
      petStoreSource.indexOf('async function deletePet')
    );
    expect(updatePetSection).toContain('upsertProviderMutation.mutateAsync');
    expect(updatePetSection).toContain('updatedPet.vetProviders');
  });

  it('syncWithCloud includes vet providers loop', () => {
    const syncStart = petStoreSource.indexOf('const syncWithCloud = useCallback');
    const syncSection = petStoreSource.slice(
      syncStart,
      petStoreSource.indexOf('// Pet actions', syncStart)
    );
    expect(syncSection).toContain('pet.vetProviders');
    expect(syncSection).toContain('upsertProviderMutation.mutateAsync');
  });

  it('restoreFromCloud maps providers from cloud data', () => {
    const restoreSection = petStoreSource.slice(
      petStoreSource.indexOf('restoreFromCloud'),
      petStoreSource.indexOf('const syncWithCloud')
    );
    expect(restoreSection).toContain('cloudData.providers');
    expect(restoreSection).toContain('petsWithProviders');
  });
});

describe('Cloud sync: weight history', () => {
  it('addWeightEntry also syncs pet weight field to cloud', () => {
    const addWeightSection = petStoreSource.slice(
      petStoreSource.indexOf('async function addWeightEntry'),
      petStoreSource.indexOf('async function deleteWeightEntry')
    );
    // Should call upsertPetMutation to sync the pet's current weight
    expect(addWeightSection).toContain('upsertPetMutation.mutateAsync');
    // Should also call addWeightMutation for the weight history entry
    expect(addWeightSection).toContain('addWeightMutation.mutateAsync');
  });
});

describe('Cloud sync: sync.getData returns all entity types', () => {
  it('getUserSyncData fetches providers and medications', () => {
    expect(dbSource).toContain('userProviders');
    expect(dbSource).toContain('userMeds');
    const syncDataInterface = dbSource.slice(
      dbSource.indexOf('export interface SyncData'),
      dbSource.indexOf('export async function getUserSyncData')
    );
    expect(syncDataInterface).toContain('providers: VetProvider[]');
    expect(syncDataInterface).toContain('medications: MedicationRow[]');
  });
});
