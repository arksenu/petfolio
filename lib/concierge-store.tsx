import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/use-auth';
import type { ConciergeRequest, ConciergeMessage, VetProvider } from '@/shared/pet-types';

const STORAGE_KEY = '@petfolio_concierge';

// ==================== STATE ====================

interface ConciergeState {
  requests: ConciergeRequest[];
  messagesByRequest: Record<string, ConciergeMessage[]>; // keyed by request id
  providers: Record<string, VetProvider[]>; // keyed by pet id
  isLoading: boolean;
  initialized: boolean;
}

const initialState: ConciergeState = {
  requests: [],
  messagesByRequest: {},
  providers: {},
  isLoading: false,
  initialized: false,
};

// ==================== ACTIONS ====================

type Action =
  | { type: 'INITIALIZE'; payload: Partial<ConciergeState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_REQUEST'; payload: ConciergeRequest }
  | { type: 'UPDATE_REQUEST'; payload: { id: string; updates: Partial<ConciergeRequest> } }
  | { type: 'ADD_MESSAGE'; payload: { requestId: string; message: ConciergeMessage } }
  | { type: 'SET_MESSAGES'; payload: { requestId: string; messages: ConciergeMessage[] } }
  | { type: 'SET_REQUESTS'; payload: ConciergeRequest[] }
  | { type: 'SET_PROVIDERS'; payload: { petId: string; providers: VetProvider[] } }
  | { type: 'ADD_PROVIDER'; payload: { petId: string; provider: VetProvider } }
  | { type: 'UPDATE_PROVIDER'; payload: { petId: string; provider: VetProvider } }
  | { type: 'DELETE_PROVIDER'; payload: { petId: string; providerId: string } }
  | { type: 'CLEAR_ALL' };

function reducer(state: ConciergeState, action: Action): ConciergeState {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, ...action.payload, initialized: true, isLoading: false };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_REQUEST':
      return {
        ...state,
        requests: [action.payload, ...state.requests],
      };

    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };

    case 'SET_REQUESTS':
      return { ...state, requests: action.payload };

    case 'ADD_MESSAGE': {
      const { requestId, message } = action.payload;
      const existing = state.messagesByRequest[requestId] || [];
      return {
        ...state,
        messagesByRequest: {
          ...state.messagesByRequest,
          [requestId]: [...existing, message],
        },
        // Update request preview and timestamp
        requests: state.requests.map(r =>
          r.id === requestId
            ? {
                ...r,
                preview: message.content.substring(0, 200),
                updatedAt: message.createdAt,
                messageCount: (r.messageCount || 0) + 1,
              }
            : r
        ),
      };
    }

    case 'SET_MESSAGES':
      return {
        ...state,
        messagesByRequest: {
          ...state.messagesByRequest,
          [action.payload.requestId]: action.payload.messages,
        },
      };

    case 'SET_PROVIDERS':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.payload.petId]: action.payload.providers,
        },
      };

    case 'ADD_PROVIDER': {
      const { petId, provider } = action.payload;
      const existing = state.providers[petId] || [];
      return {
        ...state,
        providers: {
          ...state.providers,
          [petId]: [...existing, provider],
        },
      };
    }

    case 'UPDATE_PROVIDER': {
      const { petId, provider } = action.payload;
      const existing = state.providers[petId] || [];
      return {
        ...state,
        providers: {
          ...state.providers,
          [petId]: existing.map(p => (p.id === provider.id ? provider : p)),
        },
      };
    }

    case 'DELETE_PROVIDER': {
      const { petId, providerId } = action.payload;
      const existing = state.providers[petId] || [];
      return {
        ...state,
        providers: {
          ...state.providers,
          [petId]: existing.filter(p => p.id !== providerId),
        },
      };
    }

    case 'CLEAR_ALL':
      return { ...initialState, initialized: true };

    default:
      return state;
  }
}

// ==================== CONTEXT ====================

interface ConciergeContextValue {
  state: ConciergeState;
  // Request actions
  createRequest: (petId?: string, petName?: string, initialMessage?: string, messageType?: 'text' | 'voice', audioUrl?: string, audioDuration?: number) => ConciergeRequest;
  addMessage: (requestId: string, content: string, messageType?: 'text' | 'voice', audioUrl?: string, audioDuration?: number) => ConciergeMessage;
  getMessages: (requestId: string) => ConciergeMessage[];
  // Provider actions
  getProviders: (petId: string) => VetProvider[];
  addProvider: (petId: string, provider: Omit<VetProvider, 'id' | 'createdAt' | 'updatedAt'>) => VetProvider;
  updateProvider: (petId: string, provider: VetProvider) => void;
  deleteProvider: (petId: string, providerId: string) => void;
}

const ConciergeContext = createContext<ConciergeContextValue | null>(null);

// ==================== PROVIDER ====================

export function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate unique IDs
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Persist to AsyncStorage (debounced)
  const persistState = useCallback((newState: ConciergeState) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const data = {
          requests: newState.requests,
          messagesByRequest: newState.messagesByRequest,
          providers: newState.providers,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('[ConciergeStore] Failed to persist:', e);
      }
    }, 300);
  }, []);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          dispatch({ type: 'INITIALIZE', payload: data });
        } else {
          dispatch({ type: 'INITIALIZE', payload: {} });
        }
      } catch (e) {
        console.warn('[ConciergeStore] Failed to load:', e);
        dispatch({ type: 'INITIALIZE', payload: {} });
      }
    })();
  }, []);

  // Persist on state changes
  useEffect(() => {
    if (state.initialized) {
      persistState(state);
    }
  }, [state, persistState]);

  // Create a new request with initial message
  const createRequest = useCallback((
    petId?: string,
    petName?: string,
    initialMessage?: string,
    messageType: 'text' | 'voice' = 'text',
    audioUrl?: string,
    audioDuration?: number,
  ): ConciergeRequest => {
    const now = new Date().toISOString();
    const requestId = generateId();
    const messageId = generateId();

    const request: ConciergeRequest = {
      id: requestId,
      petId: petId || undefined,
      petName: petName || undefined,
      status: 'active',
      preview: initialMessage?.substring(0, 200) || '',
      messageCount: initialMessage ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'ADD_REQUEST', payload: request });

    if (initialMessage) {
      const message: ConciergeMessage = {
        id: messageId,
        requestId: requestId,
        senderType: 'user',
        messageType,
        content: initialMessage,
        audioUrl: audioUrl || undefined,
        audioDuration: audioDuration || undefined,
        createdAt: now,
      };
      dispatch({ type: 'SET_MESSAGES', payload: { requestId, messages: [message] } });
    }

    return request;
  }, [generateId]);

  // Add a message to an existing request
  const addMessage = useCallback((
    requestId: string,
    content: string,
    messageType: 'text' | 'voice' = 'text',
    audioUrl?: string,
    audioDuration?: number,
  ): ConciergeMessage => {
    const message: ConciergeMessage = {
      id: generateId(),
      requestId,
      senderType: 'user',
      messageType,
      content,
      audioUrl: audioUrl || undefined,
      audioDuration: audioDuration || undefined,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: { requestId, message } });
    return message;
  }, [generateId]);

  // Get messages for a request
  const getMessages = useCallback((requestId: string): ConciergeMessage[] => {
    return state.messagesByRequest[requestId] || [];
  }, [state.messagesByRequest]);

  // Provider actions
  const getProviders = useCallback((petId: string): VetProvider[] => {
    return state.providers[petId] || [];
  }, [state.providers]);

  const addProvider = useCallback((
    petId: string,
    data: Omit<VetProvider, 'id' | 'createdAt' | 'updatedAt'>,
  ): VetProvider => {
    const now = new Date().toISOString();
    const provider: VetProvider = {
      ...data,
      id: generateId(),
      petId,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_PROVIDER', payload: { petId, provider } });
    return provider;
  }, [generateId]);

  const updateProvider = useCallback((petId: string, provider: VetProvider) => {
    const updated = { ...provider, updatedAt: new Date().toISOString() };
    dispatch({ type: 'UPDATE_PROVIDER', payload: { petId, provider: updated } });
  }, []);

  const deleteProvider = useCallback((petId: string, providerId: string) => {
    dispatch({ type: 'DELETE_PROVIDER', payload: { petId, providerId } });
  }, []);

  const value: ConciergeContextValue = {
    state,
    createRequest,
    addMessage,
    getMessages,
    getProviders,
    addProvider,
    updateProvider,
    deleteProvider,
  };

  return (
    <ConciergeContext.Provider value={value}>
      {children}
    </ConciergeContext.Provider>
  );
}

export function useConcierge(): ConciergeContextValue {
  const ctx = useContext(ConciergeContext);
  if (!ctx) throw new Error('useConcierge must be used within ConciergeProvider');
  return ctx;
}
