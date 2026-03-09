import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from './trpc';
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
  | { type: 'MERGE_CLOUD_DATA'; payload: { requests: ConciergeRequest[]; messagesByRequest: Record<string, ConciergeMessage[]> } }
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

    case 'MERGE_CLOUD_DATA':
      return {
        ...state,
        requests: action.payload.requests,
        messagesByRequest: {
          ...state.messagesByRequest,
          ...action.payload.messagesByRequest,
        },
      };

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
  // Clear all data
  clearAllData: () => Promise<void>;
}

const ConciergeContext = createContext<ConciergeContextValue | null>(null);

// ==================== PROVIDER ====================

export function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClearingRef = useRef(false);

  // tRPC mutations for cloud sync
  const createRequestMutation = trpc.concierge.createRequest.useMutation();
  const addMessageMutation = trpc.concierge.addMessage.useMutation();
  const listRequestsQuery = trpc.concierge.listRequests.useQuery(undefined, {
    enabled: false, // Only fetch manually
  });
  const getMessagesMutation = trpc.concierge.getMessages.useQuery(
    { requestLocalId: '' },
    { enabled: false }
  );

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

  // Restore concierge data from cloud when user signs in and local requests are empty
  useEffect(() => {
    if (isAuthenticated && state.initialized && state.requests.length === 0 && !isClearingRef.current) {
      restoreFromCloud();
    }
  }, [isAuthenticated, state.initialized, state.requests.length]);

  async function restoreFromCloud() {
    if (!isAuthenticated) return;

    try {
      const result = await listRequestsQuery.refetch();
      const cloudRequests = result.data;

      if (cloudRequests && cloudRequests.length > 0) {
        // Transform cloud requests to local format
        const requests: ConciergeRequest[] = cloudRequests.map((r: any) => ({
          id: r.localId,
          petId: r.petLocalId || undefined,
          petName: r.petName || undefined,
          status: r.status || 'active',
          preview: r.preview || '',
          messageCount: r.messageCount || 0,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
        }));

        // Fetch messages for each request
        const messagesByRequest: Record<string, ConciergeMessage[]> = {};
        for (const req of requests) {
          try {
            const msgResult = await fetch(
              `${getApiBaseUrl()}/api/trpc/concierge.getMessages?input=${encodeURIComponent(JSON.stringify({ json: { requestLocalId: req.id } }))}`,
              {
                credentials: 'include',
                headers: await getAuthHeaders(),
              }
            );
            if (msgResult.ok) {
              const msgData = await msgResult.json();
              const messages = msgData?.result?.data?.json || [];
              messagesByRequest[req.id] = messages.map((m: any) => ({
                id: m.localId,
                requestId: req.id,
                senderType: m.senderType || 'user',
                messageType: m.messageType || 'text',
                content: m.content || '',
                audioUrl: m.audioUrl || undefined,
                audioDuration: m.audioDuration || undefined,
                createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
              }));
            }
          } catch (msgErr) {
            console.error('[ConciergeStore] Failed to fetch messages for request:', req.id, msgErr);
          }
        }

        dispatch({
          type: 'MERGE_CLOUD_DATA',
          payload: { requests, messagesByRequest },
        });
      }
    } catch (error) {
      console.error('[ConciergeStore] Failed to restore from cloud:', error);
    }
  }

  // Persist on state changes
  useEffect(() => {
    if (state.initialized && !isClearingRef.current) {
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

    const message: ConciergeMessage | null = initialMessage ? {
      id: messageId,
      requestId: requestId,
      senderType: 'user',
      messageType,
      content: initialMessage,
      audioUrl: audioUrl || undefined,
      audioDuration: audioDuration || undefined,
      createdAt: now,
    } : null;

    if (message) {
      dispatch({ type: 'SET_MESSAGES', payload: { requestId, messages: [message] } });
    }

    // Sync to cloud
    if (isAuthenticated) {
      (async () => {
        try {
          await createRequestMutation.mutateAsync({
            localId: requestId,
            petLocalId: petId || null,
            petName: petName || null,
            status: 'active',
            preview: initialMessage?.substring(0, 200) || null,
          });

          if (message) {
            await addMessageMutation.mutateAsync({
              requestLocalId: requestId,
              localId: messageId,
              senderType: 'user',
              messageType,
              content: initialMessage!,
              audioUrl: audioUrl || null,
              audioDuration: audioDuration || null,
            });
          }
        } catch (error) {
          console.error('[ConciergeStore] Failed to sync request to cloud:', error);
        }
      })();
    }

    return request;
  }, [generateId, isAuthenticated, createRequestMutation, addMessageMutation]);

  // Add a message to an existing request
  const addMessage = useCallback((
    requestId: string,
    content: string,
    messageType: 'text' | 'voice' = 'text',
    audioUrl?: string,
    audioDuration?: number,
  ): ConciergeMessage => {
    const messageId = generateId();
    const message: ConciergeMessage = {
      id: messageId,
      requestId,
      senderType: 'user',
      messageType,
      content,
      audioUrl: audioUrl || undefined,
      audioDuration: audioDuration || undefined,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: { requestId, message } });

    // Sync to cloud
    if (isAuthenticated) {
      (async () => {
        try {
          await addMessageMutation.mutateAsync({
            requestLocalId: requestId,
            localId: messageId,
            senderType: 'user',
            messageType,
            content,
            audioUrl: audioUrl || null,
            audioDuration: audioDuration || null,
          });
        } catch (error) {
          console.error('[ConciergeStore] Failed to sync message to cloud:', error);
        }
      })();
    }

    return message;
  }, [generateId, isAuthenticated, addMessageMutation]);

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

  const clearAllData = useCallback(async () => {
    isClearingRef.current = true;
    dispatch({ type: 'CLEAR_ALL' });
    await AsyncStorage.removeItem(STORAGE_KEY);
    // Reset clearing flag after a tick
    setTimeout(() => { isClearingRef.current = false; }, 100);
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
    clearAllData,
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

// Helper to get API base URL (same as trpc.ts)
function getApiBaseUrl(): string {
  // Import dynamically to avoid circular deps
  try {
    const { getApiBaseUrl: getUrl } = require('@/constants/oauth');
    return getUrl();
  } catch {
    return 'http://127.0.0.1:3000';
  }
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const Auth = require('@/lib/_core/auth');
    const token = await Auth.getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
