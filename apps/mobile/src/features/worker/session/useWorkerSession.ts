import { useAuthSession } from '../../../context/auth/AuthSessionContext';

export const useWorkerSession = () => {
  const session = useAuthSession();
  return {
    workerSummary: session.workerSummary,
    activeContext: session.activeContext,
    contexts: session.contexts,
    hasLoaded: session.hasLoaded,
    isAuthenticated: session.isAuthenticated,
    isWorker: session.role === 'worker',
    refreshProfile: session.refreshProfile,
    logout: session.logout,
  };
};
