import { useAuthSession } from '../../../context/auth/AuthSessionContext';

export const useClientSession = () => {
  const session = useAuthSession();

  return {
    clientProfile: session.clientProfile,
    hasLoaded: session.hasLoaded,
    isAuthenticated: session.isAuthenticated,
    isClient: session.role === 'client',
    refreshProfile: session.refreshProfile,
    logout: session.logout,
  };
};
