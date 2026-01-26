import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pet,
  PetDocument,
  Vaccination,
  Reminder,
  WeightEntry,
  generateId,
} from '@/shared/pet-types';
import {
  scheduleReminderNotification,
  scheduleVaccinationWarnings,
  cancelReminderNotifications,
  cancelVaccinationNotifications,
} from './notifications';
import { trpc } from './trpc';
import { useAuth } from '@/hooks/use-auth';

// Storage keys
const STORAGE_KEYS = {
  PETS: 'petfolio_pets',
  DOCUMENTS: 'petfolio_documents',
  VACCINATIONS: 'petfolio_vaccinations',
  REMINDERS: 'petfolio_reminders',
  WEIGHT_HISTORY: 'petfolio_weight_history',
  LAST_SYNC: 'petfolio_last_sync',
};

// State type
interface PetState {
  pets: Pet[];
  documents: PetDocument[];
  vaccinations: Vaccination[];
  reminders: Reminder[];
  weightHistory: WeightEntry[];
  isLoading: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

// Action types
type PetAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LAST_SYNC'; payload: string }
  | { type: 'INITIALIZE'; payload: Partial<PetState> }
  | { type: 'ADD_PET'; payload: Pet }
  | { type: 'UPDATE_PET'; payload: Pet }
  | { type: 'DELETE_PET'; payload: string }
  | { type: 'ADD_DOCUMENT'; payload: PetDocument }
  | { type: 'UPDATE_DOCUMENT'; payload: PetDocument }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'ADD_VACCINATION'; payload: Vaccination }
  | { type: 'UPDATE_VACCINATION'; payload: Vaccination }
  | { type: 'DELETE_VACCINATION'; payload: string }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'UPDATE_REMINDER'; payload: Reminder }
  | { type: 'DELETE_REMINDER'; payload: string }
  | { type: 'TOGGLE_REMINDER'; payload: string }
  | { type: 'ADD_WEIGHT_ENTRY'; payload: WeightEntry }
  | { type: 'DELETE_WEIGHT_ENTRY'; payload: string }
  | { type: 'MERGE_CLOUD_DATA'; payload: Partial<PetState> };

// Initial state
const initialState: PetState = {
  pets: [],
  documents: [],
  vaccinations: [],
  reminders: [],
  weightHistory: [],
  isLoading: true,
  isInitialized: false,
  isSyncing: false,
  lastSyncTime: null,
};

// Reducer
function petReducer(state: PetState, action: PetAction): PetState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'SET_LAST_SYNC':
      return { ...state, lastSyncTime: action.payload };
    case 'INITIALIZE':
      return { ...state, ...action.payload, isLoading: false, isInitialized: true };
    case 'MERGE_CLOUD_DATA':
      // Merge cloud data with local data, preferring newer entries
      return { ...state, ...action.payload, isSyncing: false };
    case 'ADD_PET':
      return { ...state, pets: [...state.pets, action.payload] };
    case 'UPDATE_PET':
      return {
        ...state,
        pets: state.pets.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'DELETE_PET':
      return {
        ...state,
        pets: state.pets.filter((p) => p.id !== action.payload),
        documents: state.documents.filter((d) => d.petId !== action.payload),
        vaccinations: state.vaccinations.filter((v) => v.petId !== action.payload),
        reminders: state.reminders.filter((r) => r.petId !== action.payload),
        weightHistory: state.weightHistory.filter((w) => w.petId !== action.payload),
      };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map((d) => (d.id === action.payload.id ? action.payload : d)),
      };
    case 'DELETE_DOCUMENT':
      return { ...state, documents: state.documents.filter((d) => d.id !== action.payload) };
    case 'ADD_VACCINATION':
      return { ...state, vaccinations: [...state.vaccinations, action.payload] };
    case 'UPDATE_VACCINATION':
      return {
        ...state,
        vaccinations: state.vaccinations.map((v) => (v.id === action.payload.id ? action.payload : v)),
      };
    case 'DELETE_VACCINATION':
      return { ...state, vaccinations: state.vaccinations.filter((v) => v.id !== action.payload) };
    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.payload] };
    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.payload) };
    case 'TOGGLE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.payload ? { ...r, isEnabled: !r.isEnabled } : r
        ),
      };
    case 'ADD_WEIGHT_ENTRY':
      return { ...state, weightHistory: [action.payload, ...state.weightHistory] };
    case 'DELETE_WEIGHT_ENTRY':
      return { ...state, weightHistory: state.weightHistory.filter((w) => w.id !== action.payload) };
    default:
      return state;
  }
}

// Context type
interface PetContextType {
  state: PetState;
  // Pet actions
  addPet: (pet: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Pet>;
  updatePet: (pet: Pet) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  getPet: (id: string) => Pet | undefined;
  // Document actions
  addDocument: (doc: Omit<PetDocument, 'id' | 'createdAt'>) => Promise<PetDocument>;
  updateDocument: (doc: PetDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  getDocument: (id: string) => PetDocument | undefined;
  getDocumentsForPet: (petId: string) => PetDocument[];
  searchDocuments: (query: string) => PetDocument[];
  // Vaccination actions
  addVaccination: (vax: Omit<Vaccination, 'id' | 'createdAt'>) => Promise<Vaccination>;
  updateVaccination: (vax: Vaccination) => Promise<void>;
  deleteVaccination: (id: string) => Promise<void>;
  getVaccinationsForPet: (petId: string) => Vaccination[];
  // Reminder actions
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => Promise<Reminder>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  getRemindersForPet: (petId: string) => Reminder[];
  // Weight history actions
  addWeightEntry: (entry: Omit<WeightEntry, 'id' | 'createdAt'>) => Promise<WeightEntry>;
  deleteWeightEntry: (id: string) => Promise<void>;
  getWeightHistoryForPet: (petId: string) => WeightEntry[];
  // Sync actions
  syncWithCloud: () => Promise<void>;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

// Provider component
export function PetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(petReducer, initialState);
  const { isAuthenticated, user } = useAuth();
  
  // tRPC mutations for cloud sync
  const upsertPetMutation = trpc.pets.upsert.useMutation();
  const deletePetMutation = trpc.pets.delete.useMutation();
  const upsertDocMutation = trpc.documents.upsert.useMutation();
  const deleteDocMutation = trpc.documents.delete.useMutation();
  const upsertVaxMutation = trpc.vaccinations.upsert.useMutation();
  const deleteVaxMutation = trpc.vaccinations.delete.useMutation();
  const upsertReminderMutation = trpc.reminders.upsert.useMutation();
  const deleteReminderMutation = trpc.reminders.delete.useMutation();
  const addWeightMutation = trpc.weight.add.useMutation();
  const deleteWeightMutation = trpc.weight.delete.useMutation();

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (state.isInitialized) {
      saveData();
    }
  }, [state.pets, state.documents, state.vaccinations, state.reminders, state.weightHistory, state.isInitialized]);

  async function loadData() {
    try {
      const [petsJson, docsJson, vaxJson, remindersJson, weightJson, lastSync] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PETS),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.VACCINATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
        AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      ]);

      dispatch({
        type: 'INITIALIZE',
        payload: {
          pets: petsJson ? JSON.parse(petsJson) : [],
          documents: docsJson ? JSON.parse(docsJson) : [],
          vaccinations: vaxJson ? JSON.parse(vaxJson) : [],
          reminders: remindersJson ? JSON.parse(remindersJson) : [],
          weightHistory: weightJson ? JSON.parse(weightJson) : [],
          lastSyncTime: lastSync,
        },
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      dispatch({ type: 'INITIALIZE', payload: {} });
    }
  }

  async function saveData() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(state.pets)),
        AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(state.documents)),
        AsyncStorage.setItem(STORAGE_KEYS.VACCINATIONS, JSON.stringify(state.vaccinations)),
        AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(state.reminders)),
        AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_HISTORY, JSON.stringify(state.weightHistory)),
      ]);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  // Cloud sync function
  const syncWithCloud = useCallback(async () => {
    if (!isAuthenticated || state.isSyncing) return;
    
    dispatch({ type: 'SET_SYNCING', payload: true });
    
    try {
      // Upload local data to cloud
      for (const pet of state.pets) {
        await upsertPetMutation.mutateAsync({
          localId: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed || null,
          dateOfBirth: pet.dateOfBirth ? new Date(pet.dateOfBirth) : null,
          weight: pet.weight?.toString() || null,
          weightUnit: pet.weightUnit,
          photoUri: pet.photoUri || null,
          microchipNumber: pet.microchipNumber || null,
        });
      }
      
      for (const doc of state.documents) {
        await upsertDocMutation.mutateAsync({
          petLocalId: doc.petId,
          localId: doc.id,
          title: doc.title,
          category: doc.category,
          date: new Date(doc.date),
          fileUri: doc.fileUri || null,
          fileType: doc.fileType,
          fileName: doc.fileName || null,
          notes: doc.notes || null,
        });
      }
      
      for (const vax of state.vaccinations) {
        await upsertVaxMutation.mutateAsync({
          petLocalId: vax.petId,
          localId: vax.id,
          name: vax.name,
          dateAdministered: new Date(vax.dateAdministered),
          expirationDate: vax.expirationDate ? new Date(vax.expirationDate) : null,
          veterinarian: vax.veterinarian || null,
          notes: vax.notes || null,
        });
      }
      
      for (const reminder of state.reminders) {
        await upsertReminderMutation.mutateAsync({
          petLocalId: reminder.petId,
          localId: reminder.id,
          title: reminder.title,
          date: new Date(reminder.date),
          time: reminder.time || null,
          isEnabled: reminder.isEnabled,
          notificationId: reminder.notificationId || null,
        });
      }
      
      for (const entry of state.weightHistory) {
        await addWeightMutation.mutateAsync({
          petLocalId: entry.petId,
          localId: entry.id,
          weight: entry.weight.toString(),
          weightUnit: entry.weightUnit,
          date: new Date(entry.date),
          notes: entry.notes || null,
        });
      }
      
      const syncTime = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, syncTime);
      dispatch({ type: 'SET_LAST_SYNC', payload: syncTime });
      dispatch({ type: 'SET_SYNCING', payload: false });
    } catch (error) {
      console.error('Sync failed:', error);
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [isAuthenticated, state.isSyncing, state.pets, state.documents, state.vaccinations, state.reminders, state.weightHistory]);

  // Pet actions
  async function addPet(petData: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pet> {
    const now = new Date().toISOString();
    const pet: Pet = {
      ...petData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_PET', payload: pet });
    
    // Sync to cloud if authenticated
    if (isAuthenticated) {
      try {
        await upsertPetMutation.mutateAsync({
          localId: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed || null,
          dateOfBirth: pet.dateOfBirth ? new Date(pet.dateOfBirth) : null,
          weight: pet.weight?.toString() || null,
          weightUnit: pet.weightUnit,
          photoUri: pet.photoUri || null,
          microchipNumber: pet.microchipNumber || null,
        });
      } catch (error) {
        console.error('Failed to sync pet to cloud:', error);
      }
    }
    
    return pet;
  }

  async function updatePet(pet: Pet): Promise<void> {
    const updatedPet = { ...pet, updatedAt: new Date().toISOString() };
    dispatch({ type: 'UPDATE_PET', payload: updatedPet });
    
    if (isAuthenticated) {
      try {
        await upsertPetMutation.mutateAsync({
          localId: updatedPet.id,
          name: updatedPet.name,
          species: updatedPet.species,
          breed: updatedPet.breed || null,
          dateOfBirth: updatedPet.dateOfBirth ? new Date(updatedPet.dateOfBirth) : null,
          weight: updatedPet.weight?.toString() || null,
          weightUnit: updatedPet.weightUnit,
          photoUri: updatedPet.photoUri || null,
          microchipNumber: updatedPet.microchipNumber || null,
        });
      } catch (error) {
        console.error('Failed to sync pet update to cloud:', error);
      }
    }
  }

  async function deletePet(id: string): Promise<void> {
    // Cancel all notifications for this pet's reminders and vaccinations
    const petReminders = state.reminders.filter((r) => r.petId === id);
    const petVaccinations = state.vaccinations.filter((v) => v.petId === id);
    
    for (const reminder of petReminders) {
      await cancelReminderNotifications(reminder.id);
    }
    for (const vaccination of petVaccinations) {
      await cancelVaccinationNotifications(vaccination.id);
    }
    
    dispatch({ type: 'DELETE_PET', payload: id });
    
    if (isAuthenticated) {
      try {
        await deletePetMutation.mutateAsync({ localId: id });
      } catch (error) {
        console.error('Failed to delete pet from cloud:', error);
      }
    }
  }

  function getPet(id: string): Pet | undefined {
    return state.pets.find((p) => p.id === id);
  }

  // Document actions
  async function addDocument(docData: Omit<PetDocument, 'id' | 'createdAt'>): Promise<PetDocument> {
    const doc: PetDocument = {
      ...docData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_DOCUMENT', payload: doc });
    
    if (isAuthenticated) {
      try {
        await upsertDocMutation.mutateAsync({
          petLocalId: doc.petId,
          localId: doc.id,
          title: doc.title,
          category: doc.category,
          date: new Date(doc.date),
          fileUri: doc.fileUri || null,
          fileType: doc.fileType,
          fileName: doc.fileName || null,
          notes: doc.notes || null,
        });
      } catch (error) {
        console.error('Failed to sync document to cloud:', error);
      }
    }
    
    return doc;
  }

  async function updateDocument(doc: PetDocument): Promise<void> {
    dispatch({ type: 'UPDATE_DOCUMENT', payload: doc });
    
    if (isAuthenticated) {
      try {
        await upsertDocMutation.mutateAsync({
          petLocalId: doc.petId,
          localId: doc.id,
          title: doc.title,
          category: doc.category,
          date: new Date(doc.date),
          fileUri: doc.fileUri || null,
          fileType: doc.fileType,
          fileName: doc.fileName || null,
          notes: doc.notes || null,
        });
      } catch (error) {
        console.error('Failed to sync document update to cloud:', error);
      }
    }
  }

  async function deleteDocument(id: string): Promise<void> {
    dispatch({ type: 'DELETE_DOCUMENT', payload: id });
    
    if (isAuthenticated) {
      try {
        await deleteDocMutation.mutateAsync({ localId: id });
      } catch (error) {
        console.error('Failed to delete document from cloud:', error);
      }
    }
  }

  function getDocumentsForPet(petId: string): PetDocument[] {
    return state.documents.filter((d) => d.petId === petId);
  }

  function getDocument(id: string): PetDocument | undefined {
    return state.documents.find((d) => d.id === id);
  }

  function searchDocuments(query: string): PetDocument[] {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return state.documents.filter((doc) => {
      const pet = state.pets.find((p) => p.id === doc.petId);
      return (
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.category.toLowerCase().includes(lowerQuery) ||
        (doc.notes && doc.notes.toLowerCase().includes(lowerQuery)) ||
        (pet && pet.name.toLowerCase().includes(lowerQuery))
      );
    });
  }

  // Vaccination actions
  async function addVaccination(vaxData: Omit<Vaccination, 'id' | 'createdAt'>): Promise<Vaccination> {
    const vax: Vaccination = {
      ...vaxData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_VACCINATION', payload: vax });
    
    // Schedule vaccination warning notifications
    const pet = state.pets.find((p) => p.id === vaxData.petId);
    if (pet) {
      await scheduleVaccinationWarnings(vax, pet.name);
    }
    
    if (isAuthenticated) {
      try {
        await upsertVaxMutation.mutateAsync({
          petLocalId: vax.petId,
          localId: vax.id,
          name: vax.name,
          dateAdministered: new Date(vax.dateAdministered),
          expirationDate: vax.expirationDate ? new Date(vax.expirationDate) : null,
          veterinarian: vax.veterinarian || null,
          notes: vax.notes || null,
        });
      } catch (error) {
        console.error('Failed to sync vaccination to cloud:', error);
      }
    }
    
    return vax;
  }

  async function updateVaccination(vax: Vaccination): Promise<void> {
    dispatch({ type: 'UPDATE_VACCINATION', payload: vax });
    
    // Reschedule vaccination warning notifications
    const pet = state.pets.find((p) => p.id === vax.petId);
    if (pet) {
      await scheduleVaccinationWarnings(vax, pet.name);
    }
    
    if (isAuthenticated) {
      try {
        await upsertVaxMutation.mutateAsync({
          petLocalId: vax.petId,
          localId: vax.id,
          name: vax.name,
          dateAdministered: new Date(vax.dateAdministered),
          expirationDate: vax.expirationDate ? new Date(vax.expirationDate) : null,
          veterinarian: vax.veterinarian || null,
          notes: vax.notes || null,
        });
      } catch (error) {
        console.error('Failed to sync vaccination update to cloud:', error);
      }
    }
  }

  async function deleteVaccination(id: string): Promise<void> {
    await cancelVaccinationNotifications(id);
    dispatch({ type: 'DELETE_VACCINATION', payload: id });
    
    if (isAuthenticated) {
      try {
        await deleteVaxMutation.mutateAsync({ localId: id });
      } catch (error) {
        console.error('Failed to delete vaccination from cloud:', error);
      }
    }
  }

  function getVaccinationsForPet(petId: string): Vaccination[] {
    return state.vaccinations.filter((v) => v.petId === petId);
  }

  // Reminder actions
  async function addReminder(reminderData: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder> {
    const reminder: Reminder = {
      ...reminderData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_REMINDER', payload: reminder });
    
    // Schedule reminder notification if enabled
    if (reminder.isEnabled) {
      const pet = state.pets.find((p) => p.id === reminderData.petId);
      if (pet) {
        await scheduleReminderNotification(reminder, pet.name);
      }
    }
    
    if (isAuthenticated) {
      try {
        await upsertReminderMutation.mutateAsync({
          petLocalId: reminder.petId,
          localId: reminder.id,
          title: reminder.title,
          date: new Date(reminder.date),
          time: reminder.time || null,
          isEnabled: reminder.isEnabled,
          notificationId: reminder.notificationId || null,
        });
      } catch (error) {
        console.error('Failed to sync reminder to cloud:', error);
      }
    }
    
    return reminder;
  }

  async function updateReminder(reminder: Reminder): Promise<void> {
    dispatch({ type: 'UPDATE_REMINDER', payload: reminder });
    
    // Reschedule or cancel notification based on enabled state
    if (reminder.isEnabled) {
      const pet = state.pets.find((p) => p.id === reminder.petId);
      if (pet) {
        await scheduleReminderNotification(reminder, pet.name);
      }
    } else {
      await cancelReminderNotifications(reminder.id);
    }
    
    if (isAuthenticated) {
      try {
        await upsertReminderMutation.mutateAsync({
          petLocalId: reminder.petId,
          localId: reminder.id,
          title: reminder.title,
          date: new Date(reminder.date),
          time: reminder.time || null,
          isEnabled: reminder.isEnabled,
          notificationId: reminder.notificationId || null,
        });
      } catch (error) {
        console.error('Failed to sync reminder update to cloud:', error);
      }
    }
  }

  async function deleteReminder(id: string): Promise<void> {
    await cancelReminderNotifications(id);
    dispatch({ type: 'DELETE_REMINDER', payload: id });
    
    if (isAuthenticated) {
      try {
        await deleteReminderMutation.mutateAsync({ localId: id });
      } catch (error) {
        console.error('Failed to delete reminder from cloud:', error);
      }
    }
  }

  async function toggleReminder(id: string): Promise<void> {
    const reminder = state.reminders.find((r) => r.id === id);
    if (reminder) {
      const newEnabledState = !reminder.isEnabled;
      dispatch({ type: 'TOGGLE_REMINDER', payload: id });
      
      if (newEnabledState) {
        const pet = state.pets.find((p) => p.id === reminder.petId);
        if (pet) {
          await scheduleReminderNotification({ ...reminder, isEnabled: true }, pet.name);
        }
      } else {
        await cancelReminderNotifications(id);
      }
      
      if (isAuthenticated) {
        try {
          await upsertReminderMutation.mutateAsync({
            petLocalId: reminder.petId,
            localId: reminder.id,
            title: reminder.title,
            date: new Date(reminder.date),
            time: reminder.time || null,
            isEnabled: newEnabledState,
            notificationId: reminder.notificationId || null,
          });
        } catch (error) {
          console.error('Failed to sync reminder toggle to cloud:', error);
        }
      }
    }
  }

  function getRemindersForPet(petId: string): Reminder[] {
    return state.reminders.filter((r) => r.petId === petId);
  }

  // Weight history actions
  async function addWeightEntry(entryData: Omit<WeightEntry, 'id' | 'createdAt'>): Promise<WeightEntry> {
    const entry: WeightEntry = {
      ...entryData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_WEIGHT_ENTRY', payload: entry });
    
    // Also update the pet's current weight
    const pet = state.pets.find((p) => p.id === entryData.petId);
    if (pet) {
      const updatedPet = {
        ...pet,
        weight: entryData.weight,
        weightUnit: entryData.weightUnit,
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_PET', payload: updatedPet });
    }
    
    if (isAuthenticated) {
      try {
        await addWeightMutation.mutateAsync({
          petLocalId: entry.petId,
          localId: entry.id,
          weight: entry.weight.toString(),
          weightUnit: entry.weightUnit,
          date: new Date(entry.date),
          notes: entry.notes || null,
        });
      } catch (error) {
        console.error('Failed to sync weight entry to cloud:', error);
      }
    }
    
    return entry;
  }

  async function deleteWeightEntry(id: string): Promise<void> {
    dispatch({ type: 'DELETE_WEIGHT_ENTRY', payload: id });
    
    if (isAuthenticated) {
      try {
        await deleteWeightMutation.mutateAsync({ localId: id });
      } catch (error) {
        console.error('Failed to delete weight entry from cloud:', error);
      }
    }
  }

  function getWeightHistoryForPet(petId: string): WeightEntry[] {
    return state.weightHistory
      .filter((w) => w.petId === petId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const value: PetContextType = {
    state,
    addPet,
    updatePet,
    deletePet,
    getPet,
    addDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getDocumentsForPet,
    searchDocuments,
    addVaccination,
    updateVaccination,
    deleteVaccination,
    getVaccinationsForPet,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    getRemindersForPet,
    addWeightEntry,
    deleteWeightEntry,
    getWeightHistoryForPet,
    syncWithCloud,
  };

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

// Hook to use pet context
export function usePetStore() {
  const context = useContext(PetContext);
  if (context === undefined) {
    throw new Error('usePetStore must be used within a PetProvider');
  }
  return context;
}
