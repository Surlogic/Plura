import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../services/api';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
} from '../services/session';
import { ProfessionalProfile } from '../types/professional';
import { logWarn } from '../services/logger';

type ClientProfile = {
  id: string;
  fullName: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  role?: string;
};

type AuthRole = 'professional' | 'client' | null;

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

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

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

  const refreshProfile = async () => {
    try {
      const token = await getAccessToken();

      if (!token || token === 'null' || token === 'undefined') {
        resetState();
        return;
      }

      try {
        const professionalResponse = await api.get<ProfessionalProfile>('/auth/me/profesional');
        setProfessionalState(professionalResponse.data);
        return;
      } catch {
        const clientResponse = await api.get<ClientProfile>('/auth/me/cliente');
        setClientState(clientResponse.data);
      }
    } catch (error) {
      logWarn('auth-session', 'error cargando sesion autenticada', error);
      resetState();
    } finally {
      setHasLoaded(true);
    }
  };

  const logout = async () => {
    const refreshToken = await getRefreshToken();

    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch (error) {
      logWarn('auth-session', 'error cerrando sesion en backend', error);
    } finally {
      await clearSession();
      resetState();
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    void refreshProfile();
  }, []);

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

/**
 * Compatibilidad backward-compatible.
 * Mantener mientras existan imports viejos en la app.
 */
export const ProfessionalProfileProvider = AuthSessionProvider;
export const useProfessionalProfileContext = useAuthSession;
