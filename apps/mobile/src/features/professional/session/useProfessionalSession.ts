import { useAuthSession } from '../../../context/auth/AuthSessionContext';

export const useProfessionalSession = () => {
  const session = useAuthSession();

  return {
    profile: session.profile,
    hasLoaded: session.hasLoaded,
    isAuthenticated: session.isAuthenticated,
    isProfessional: session.role === 'professional',
    refreshProfile: session.refreshProfile,
    logout: session.logout,
  };
};
