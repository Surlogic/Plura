import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { AxiosRequestConfig } from 'axios';
import { cachedGet } from '@/services/cachedGet';
import { invalidateCachedGet } from '@/services/cachedGet';
import {
  clearAuthAccessToken,
  subscribeAuthSessionChange,
} from '@/services/session';
import { isAuthSessionError } from '@/lib/auth/sessionErrors';
import type { ClientProfile } from '@/types/client';

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated' | 'error';

type ClientProfileContextValue = {
  profile: ClientProfile | null;
  isLoading: boolean;
  hasLoaded: boolean;
  authStatus: AuthStatus;
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
};

type ProfileState = {
  profile: ClientProfile | null;
  isLoading: boolean;
  hasLoaded: boolean;
  authStatus: AuthStatus;
};

type ProfileAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; profile: ClientProfile }
  | { type: 'LOAD_AUTH_ERROR' }
  | { type: 'LOAD_NETWORK_ERROR' }
  | { type: 'CLEAR' }
  | { type: 'RESET_SESSION' };

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  hasLoaded: false,
  authStatus: 'unknown',
};

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'LOAD_START':
      return state.isLoading ? state : { ...state, isLoading: true };
    case 'LOAD_SUCCESS':
      return { profile: action.profile, isLoading: false, hasLoaded: true, authStatus: 'authenticated' };
    case 'LOAD_AUTH_ERROR':
      return { profile: null, isLoading: false, hasLoaded: true, authStatus: 'unauthenticated' };
    case 'LOAD_NETWORK_ERROR':
      return {
        ...state,
        isLoading: false,
        hasLoaded: true,
        authStatus: state.authStatus === 'authenticated' ? 'authenticated' : 'error',
      };
    case 'CLEAR':
      return { profile: null, isLoading: false, hasLoaded: true, authStatus: 'unauthenticated' };
    case 'RESET_SESSION':
      return initialState;
    default:
      return state;
  }
}

const CLIENT_PROFILE_ENDPOINT = '/auth/me/cliente';

const ClientProfileContext =
  createContext<ClientProfileContextValue | null>(null);

export function ClientProfileProvider({
  children,
  autoLoad = false,
  skipRefreshOnAutoLoad = false,
  clearStoredSessionOnAutoLoadAuthError = false,
}: {
  children: ReactNode;
  autoLoad?: boolean;
  skipRefreshOnAutoLoad?: boolean;
  clearStoredSessionOnAutoLoadAuthError?: boolean;
}) {
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const loadGenerationRef = useRef(0);

  const clearProfile = useCallback(() => {
    loadGenerationRef.current += 1;
    invalidateCachedGet(CLIENT_PROFILE_ENDPOINT);
    dispatch({ type: 'CLEAR' });
  }, []);

  const refreshProfile = useCallback(async () => {
    const loadGeneration = loadGenerationRef.current;
    dispatch({ type: 'LOAD_START' });
    try {
      const response = await cachedGet<ClientProfile>(
        CLIENT_PROFILE_ENDPOINT,
        undefined,
        { ttlMs: 15000 },
      );
      if (loadGeneration !== loadGenerationRef.current) return;
      dispatch({ type: 'LOAD_SUCCESS', profile: response.data });
    } catch (error) {
      if (loadGeneration !== loadGenerationRef.current) return;
      if (isAuthSessionError(error)) {
        dispatch({ type: 'LOAD_AUTH_ERROR' });
      } else {
        dispatch({ type: 'LOAD_NETWORK_ERROR' });
      }
    }
  }, []);

  const autoLoadProfile = useCallback(async () => {
    const loadGeneration = loadGenerationRef.current;
    dispatch({ type: 'LOAD_START' });
    try {
      const response = await cachedGet<ClientProfile>(
        CLIENT_PROFILE_ENDPOINT,
        { skipAuthRefresh: skipRefreshOnAutoLoad } as AxiosRequestConfig,
        { ttlMs: 15000 },
      );
      if (loadGeneration !== loadGenerationRef.current) return;
      dispatch({ type: 'LOAD_SUCCESS', profile: response.data });
    } catch (error) {
      if (loadGeneration !== loadGenerationRef.current) return;
      if (isAuthSessionError(error)) {
        if (clearStoredSessionOnAutoLoadAuthError) {
          clearAuthAccessToken();
        }
        dispatch({ type: 'LOAD_AUTH_ERROR' });
      } else {
        dispatch({ type: 'LOAD_NETWORK_ERROR' });
      }
    }
  }, [clearStoredSessionOnAutoLoadAuthError, skipRefreshOnAutoLoad]);

  useEffect(() => {
    if (!autoLoad || state.hasLoaded || state.isLoading) return;
    void autoLoadProfile();
  }, [autoLoad, autoLoadProfile, state.hasLoaded, state.isLoading]);

  useEffect(() => {
    return subscribeAuthSessionChange(({ snapshot }) => {
      loadGenerationRef.current += 1;
      invalidateCachedGet(CLIENT_PROFILE_ENDPOINT);
      dispatch({ type: 'RESET_SESSION' });

      const activeRole = snapshot.contextSelectionPending ? null : snapshot.role;
      if (autoLoad && activeRole === 'CLIENT') {
        void autoLoadProfile();
      }
    });
  }, [autoLoad, autoLoadProfile]);

  const value = useMemo(
    () => ({
      profile: state.profile,
      isLoading: state.isLoading,
      hasLoaded: state.hasLoaded,
      authStatus: state.authStatus,
      refreshProfile,
      clearProfile,
    }),
    [state, refreshProfile, clearProfile],
  );

  return (
    <ClientProfileContext.Provider value={value}>
      {children}
    </ClientProfileContext.Provider>
  );
}

export const useClientProfileContext = () => {
  const context = useContext(ClientProfileContext);
  if (!context) {
    throw new Error(
      'useClientProfileContext must be used within ClientProfileProvider',
    );
  }
  return context;
};
