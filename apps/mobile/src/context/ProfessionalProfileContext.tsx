import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { getProfessionalToken, clearProfessionalToken } from '../services/session';
import { ProfessionalProfile } from '../types/professional'; // Ajusta la ruta a tus tipos si es necesario

interface ContextProps {
  profile: ProfessionalProfile | null;
  hasLoaded: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const ProfessionalProfileContext = createContext<ContextProps | undefined>(undefined);

export const ProfessionalProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refreshProfile = async () => {
    try {
      const token = await getProfessionalToken();
      
      // Si no hay token válido, cortamos acá
      if (!token || token === "null" || token === "undefined") {
        setProfile(null);
        setHasLoaded(true); // <- APAGA LA RUEDITA
        return;
      }

      const response = await api.get('/auth/me/profesional');
      setProfile(response.data);
      
    } catch (error) {
      console.log('Error al cargar perfil:', error);
      // Si hay error (ej. timeout o token vencido), borramos el perfil
      setProfile(null); 
    } finally {
      // ESTO ES CLAVE: Pase lo que pase, apaga la ruedita cargando
      setHasLoaded(true); 
    }
  };

  const logout = async () => {
    await clearProfessionalToken();
    setProfile(null);
  };

  // Cargar el perfil automáticamente al abrir la app
  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <ProfessionalProfileContext.Provider value={{ profile, hasLoaded, refreshProfile, logout }}>
      {children}
    </ProfessionalProfileContext.Provider>
  );
};

export const useProfessionalProfileContext = () => {
  const context = useContext(ProfessionalProfileContext);
  if (!context) throw new Error('Debe usarse dentro de un Provider');
  return context;
};