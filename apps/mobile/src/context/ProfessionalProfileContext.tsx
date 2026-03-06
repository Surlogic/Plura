import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { getProfessionalToken, clearProfessionalToken } from '../services/session';
import { ProfessionalProfile } from '../types/professional'; // Ajusta la ruta a tus tipos si es necesario
import { logWarn } from '../services/logger';

type ClientProfile = {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
};

interface ContextProps {
  profile: ProfessionalProfile | null;
  clientProfile: ClientProfile | null;
  role: 'professional' | 'client' | null;
  isAuthenticated: boolean;
  hasLoaded: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const ProfessionalProfileContext = createContext<ContextProps | undefined>(undefined);

export const ProfessionalProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [role, setRole] = useState<'professional' | 'client' | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refreshProfile = async () => {
    try {
      const token = await getProfessionalToken();
      
      // Si no hay token válido, cortamos acá
      if (!token || token === "null" || token === "undefined") {
        setProfile(null);
        setClientProfile(null);
        setRole(null);
        setHasLoaded(true); // <- APAGA LA RUEDITA
        return;
      }

      try {
        const professionalResponse = await api.get<ProfessionalProfile>('/auth/me/profesional');
        setProfile(professionalResponse.data);
        setClientProfile(null);
        setRole('professional');
        return;
      } catch {
        const clientResponse = await api.get<ClientProfile>('/auth/me/cliente');
        setClientProfile(clientResponse.data);
        setProfile(null);
        setRole('client');
      }
      
    } catch (error) {
      logWarn('profile', 'error cargando perfil', error);
      // Si hay error (ej. timeout o token vencido), borramos el perfil
      setProfile(null); 
      setClientProfile(null);
      setRole(null);
    } finally {
      // ESTO ES CLAVE: Pase lo que pase, apaga la ruedita cargando
      setHasLoaded(true); 
    }
  };

  const logout = async () => {
    await clearProfessionalToken();
    setProfile(null);
    setClientProfile(null);
    setRole(null);
  };

  // Cargar el perfil automáticamente al abrir la app
  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <ProfessionalProfileContext.Provider
      value={{
        profile,
        clientProfile,
        role,
        isAuthenticated: Boolean(profile || clientProfile),
        hasLoaded,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </ProfessionalProfileContext.Provider>
  );
};

export const useProfessionalProfileContext = () => {
  const context = useContext(ProfessionalProfileContext);
  if (!context) throw new Error('Debe usarse dentro de un Provider');
  return context;
};