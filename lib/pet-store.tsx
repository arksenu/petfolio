import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pet,
  PetDocument,
  Vaccination,
  Reminder,
  generateId,
} from '@/shared/pet-types';

// Storage keys
const STORAGE_KEYS = {
  PETS: 'petfolio_pets',
  DOCUMENTS: 'petfolio_documents',
  VACCINATIONS: 'petfolio_vaccinations',
  REMINDERS: 'petfolio_reminders',
};

// State type
interface PetState {
  pets: Pet[];
  documents: PetDocument[];
  vaccinations: Vaccination[];
  reminders: Reminder[];
  isLoading: boolean;
  isInitialized: boolean;
}

// Action types
type PetAction =
  | { type: 'SET_LOADING'; payload: boolean }
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
  | { type: 'TOGGLE_REMINDER'; payload: string };

// Initial state
const initialState: PetState = {
  pets: [],
  documents: [],
  vaccinations: [],
  reminders: [],
  isLoading: true,
  isInitialized: false,
};

// Reducer
function petReducer(state: PetState, action: PetAction): PetState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'INITIALIZE':
      return { ...state, ...action.payload, isLoading: false, isInitialized: true };
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
  getDocumentsForPet: (petId: string) => PetDocument[];
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
}

const PetContext = createContext<PetContextType | undefined>(undefined);

// Provider component
export function PetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(petReducer, initialState);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (state.isInitialized) {
      saveData();
    }
  }, [state.pets, state.documents, state.vaccinations, state.reminders, state.isInitialized]);

  async function loadData() {
    try {
      const [petsJson, docsJson, vaxJson, remindersJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PETS),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.VACCINATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
      ]);

      dispatch({
        type: 'INITIALIZE',
        payload: {
          pets: petsJson ? JSON.parse(petsJson) : [],
          documents: docsJson ? JSON.parse(docsJson) : [],
          vaccinations: vaxJson ? JSON.parse(vaxJson) : [],
          reminders: remindersJson ? JSON.parse(remindersJson) : [],
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
      ]);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

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
    return pet;
  }

  async function updatePet(pet: Pet): Promise<void> {
    const updatedPet = { ...pet, updatedAt: new Date().toISOString() };
    dispatch({ type: 'UPDATE_PET', payload: updatedPet });
  }

  async function deletePet(id: string): Promise<void> {
    dispatch({ type: 'DELETE_PET', payload: id });
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
    return doc;
  }

  async function updateDocument(doc: PetDocument): Promise<void> {
    dispatch({ type: 'UPDATE_DOCUMENT', payload: doc });
  }

  async function deleteDocument(id: string): Promise<void> {
    dispatch({ type: 'DELETE_DOCUMENT', payload: id });
  }

  function getDocumentsForPet(petId: string): PetDocument[] {
    return state.documents.filter((d) => d.petId === petId);
  }

  // Vaccination actions
  async function addVaccination(vaxData: Omit<Vaccination, 'id' | 'createdAt'>): Promise<Vaccination> {
    const vax: Vaccination = {
      ...vaxData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_VACCINATION', payload: vax });
    return vax;
  }

  async function updateVaccination(vax: Vaccination): Promise<void> {
    dispatch({ type: 'UPDATE_VACCINATION', payload: vax });
  }

  async function deleteVaccination(id: string): Promise<void> {
    dispatch({ type: 'DELETE_VACCINATION', payload: id });
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
    return reminder;
  }

  async function updateReminder(reminder: Reminder): Promise<void> {
    dispatch({ type: 'UPDATE_REMINDER', payload: reminder });
  }

  async function deleteReminder(id: string): Promise<void> {
    dispatch({ type: 'DELETE_REMINDER', payload: id });
  }

  async function toggleReminder(id: string): Promise<void> {
    dispatch({ type: 'TOGGLE_REMINDER', payload: id });
  }

  function getRemindersForPet(petId: string): Reminder[] {
    return state.reminders.filter((r) => r.petId === petId);
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
    getDocumentsForPet,
    addVaccination,
    updateVaccination,
    deleteVaccination,
    getVaccinationsForPet,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    getRemindersForPet,
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
