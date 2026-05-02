import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import api from '../../services/api';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
} from '../../services/session';
import type { ProfessionalProfile } from '../../types/professional';
import { logWarn } from '../../services/logger';
import {
  extractContextFromAccessToken,
  extractRoleFromAccessToken,
  type AuthContextType,
  type BackendAuthRole,
} from '../../services/authToken';
import {
  fetchAuthMe,
  type AuthContextDescriptor,
} from '../../services/authContext';
import { fetchWorkerSummary, type WorkerSummary } from '../../services/workerDashboard';

export type ClientProfile = {
  id: string;
  fullName: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  role?: string;
};

export type AuthRole = 'professional' | 'client' | 'worker' | null;

interface AuthSessionContextValue {
  profile: ProfessionalProfile | null;
  clientProfile: ClientProfile | null;
  workerSummary: WorkerSummary | null;
  role: AuthRole;
  activeContext: AuthContextDescriptor | null;
  contexts: AuthContextDescriptor[];
  isAuthenticated: boolean;
  hasLoaded: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

const isUnauthorizedSessionError = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 401 || error.response?.status === 403;
};

const canFallbackToClientProfile = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 403 || error.response?.status === 404;
};

const resolveRoleFromContext = (
  ctx: AuthContextType | null,
  backendRole: BackendAuthRole | null,
): AuthRole => {
  if (ctx === 'WORKER') return 'worker';
  if (ctx === 'PROFESSIONAL') return 'professional';
  if (ctx === 'CLIENT') return 'client';
  if (backendRole === 'PROFESSIONAL') return 'professional';
  if (backendRole === 'USER') return 'client';
  return null;
};

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [workerSummary, setWorkerSummary] = useState<WorkerSummary | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [activeContext, setActiveContext] = useState<AuthContextDescriptor | null>(null);
  const [contexts, setContexts] = useState<AuthContextDescriptor[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const refreshProfilePromiseRef = useRef<Promise<void> | null>(null);

  const resetState = () => {
    setProfile(null);
    setClientProfile(null);
    setWorkerSummary(null);
    setRole(null);
    setActiveContext(null);
    setContexts([]);
  };

  const loadProfileForRole = useCallback(async (nextRole: AuthRole) => {
    if (nextRole === 'professional') {
      const response = await api.get<ProfessionalProfile>('/auth/me/profesional');
      setProfile(response.data);
      setClientProfile(null);
      setWorkerSummary(null);
      setRole('professional');
      return;
    }
    if (nextRole === 'worker') {
      const summary = await fetchWorkerSummary();
      setWorkerSummary(summary);
      setProfile(null);
      setClientProfile(null);
      setRole('worker');
      return;
    }
    const response = await api.get<ClientProfile>('/auth/me/cliente');
    setClientProfile(response.data);
    setProfile(null);
    setWorkerSummary(null);
    setRole('client');
  }, []);

  const performRefreshProfile = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token || token === 'null' || token === 'undefined') {
        resetState();
        return;
      }

      const ctxFromToken = extractContextFromAccessToken(token);
      const backendRole = extractRoleFromAccessToken(token);
      const desiredRole = resolveRoleFromContext(ctxFromToken, backendRole);

      try {
        const me = await fetchAuthMe();
        setActiveContext(me.activeContext ?? null);
        setContexts(Array.isArray(me.contexts) ? me.contexts : []);
      } catch (error) {
        if (isUnauthorizedSessionError(error)) {
          await clearSession();
          resetState();
          return;
        }
        logWarn('auth-session', 'no se pudo cargar /auth/me, sigo con fallback', error);
      }

      try {
        if (desiredRole) {
          await loadProfileForRole(desiredRole);
          return;
        }
        try {
          await loadProfileForRole('professional');
          return;
        } catch (error) {
          if (!canFallbackToClientProfile(error)) {
            throw error;
          }
        }
        await loadProfileForRole('client');
      } catch (error) {
        if (isUnauthorizedSessionError(error)) {
          await clearSession();
          resetState();
          return;
        }
        logWarn('auth-session', 'error cargando sesion autenticada', error);
      }
    } catch (error) {
      logWarn('auth-session', 'error cargando sesion autenticada', error);
    }
  }, [loadProfileForRole]);

  const refreshProfile = useCallback(async () => {
    if (refreshProfilePromiseRef.current) {
      return refreshProfilePromiseRef.current;
    }
    const request = performRefreshProfile().finally(() => {
      setHasLoaded(true);
      refreshProfilePromiseRef.current = null;
    });
    refreshProfilePromiseRef.current = request;
    return request;
  }, [performRefreshProfile]);

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch (error) {
      logWarn('auth-session', 'error cerrando sesion en backend', error);
    } finally {
      await clearSession();
      resetState();
      setHasLoaded(true);
      router.replace('/');
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return (
    <AuthSessionContext.Provider
      value={{
        profile,
        clientProfile,
        workerSummary,
        role,
        activeContext,
        contexts,
        isAuthenticated: Boolean(role),
        hasLoaded,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('Debe usarse dentro de un Provider');
  return context;
};
