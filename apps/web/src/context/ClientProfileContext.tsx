import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { cachedGet } from '@/services/cachedGet';
import { invalidateCachedGet } from '@/services/cachedGet';
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
  | { type: 'CLEAR' };

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
}: {
  children: ReactNode;
  autoLoad?: boolean;
}) {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  const clearProfile = useCallback(() => {
    invalidateCachedGet(CLIENT_PROFILE_ENDPOINT);
    dispatch({ type: 'CLEAR' });
  }, []);

  const refreshProfile = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const response = await cachedGet<ClientProfile>(
        CLIENT_PROFILE_ENDPOINT,
        undefined,
        { ttlMs: 15000 },
      );
      dispatch({ type: 'LOAD_SUCCESS', profile: response.data });
    } catch (error) {
      if (isAuthSessionError(error)) {
        dispatch({ type: 'LOAD_AUTH_ERROR' });
      } else {
        dispatch({ type: 'LOAD_NETWORK_ERROR' });
      }
    }
  }, []);

  useEffect(() => {
    if (!autoLoad || state.hasLoaded || state.isLoading) return;
    void refreshProfile();
  }, [autoLoad, state.hasLoaded, state.isLoading, refreshProfile]);

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
