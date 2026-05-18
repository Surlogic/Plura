import { useAuthSession } from '../../../context/auth/AuthSessionContext';

export const useClientSession = () => {
  const session = useAuthSession();

  return {
    clientProfile: session.clientProfile,
    activeContext: session.activeContext,
    contexts: session.contexts,
    hasLoaded: session.hasLoaded,
    isAuthenticated: session.isAuthenticated,
    isClient: session.role === 'client',
    refreshProfile: session.refreshProfile,
    logout: session.logout,
  };
};
