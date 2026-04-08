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
import { extractRoleFromAccessToken, type BackendAuthRole } from '../../services/authToken';

export type ClientProfile = {
  id: string;
  fullName: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  role?: string;
};

export type AuthRole = 'professional' | 'client' | null;

interface AuthSessionContextValue {
  profile: ProfessionalProfile | null;
  clientProfile: ClientProfile | null;
  role: AuthRole;
  isAuthenticated: boolean;
  hasLoaded: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

const resolveAuthenticatedRole = (
  professionalProfile: ProfessionalProfile | null,
  currentClientProfile: ClientProfile | null,
): AuthRole => {
  if (professionalProfile) return 'professional';
  if (currentClientProfile) return 'client';
  return null;
};

const isUnauthorizedSessionError = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 401 || error.response?.status === 403;
};

const canFallbackToClientProfile = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 403 || error.response?.status === 404;
};

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const refreshProfilePromiseRef = useRef<Promise<void> | null>(null);

  const resetState = () => {
    setProfile(null);
    setClientProfile(null);
    setRole(null);
  };

  const setProfessionalState = (professionalProfile: ProfessionalProfile) => {
    setProfile(professionalProfile);
    setClientProfile(null);
    setRole('professional');
  };

  const setClientState = (nextClientProfile: ClientProfile) => {
    setClientProfile(nextClientProfile);
    setProfile(null);
    setRole('client');
  };

  const loadProfileForRole = useCallback(async (backendRole: BackendAuthRole) => {
    if (backendRole === 'PROFESSIONAL') {
      const professionalResponse = await api.get<ProfessionalProfile>('/auth/me/profesional');
      setProfessionalState(professionalResponse.data);
      return;
    }

    const clientResponse = await api.get<ClientProfile>('/auth/me/cliente');
    setClientState(clientResponse.data);
  }, []);

  const performRefreshProfile = useCallback(async () => {
    try {
      const token = await getAccessToken();

      if (!token || token === 'null' || token === 'undefined') {
        resetState();
        return;
      }

      const hintedRole = extractRoleFromAccessToken(token);

      try {
        if (hintedRole) {
          await loadProfileForRole(hintedRole);
          return;
        }

        try {
          await loadProfileForRole('PROFESSIONAL');
          return;
        } catch (error) {
          if (!canFallbackToClientProfile(error)) {
            throw error;
          }
        }

        await loadProfileForRole('USER');
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
    const logoutRedirect =
      role === 'professional'
        ? '/(auth)/login-professional'
        : role === 'client'
          ? '/(auth)/login-client'
          : '/';

    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch (error) {
      logWarn('auth-session', 'error cerrando sesion en backend', error);
    } finally {
      await clearSession();
      resetState();
      setHasLoaded(true);
      router.replace(logoutRedirect);
    }
  }, [role]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return (
    <AuthSessionContext.Provider
      value={{
        profile,
        clientProfile,
        role,
        isAuthenticated: Boolean(resolveAuthenticatedRole(profile, clientProfile)),
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
