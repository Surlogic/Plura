import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { KnownAuthSessionRole } from '@/services/session';

type LogoutTransitionContextValue = {
  isActive: boolean;
  role: KnownAuthSessionRole | null;
  startTransition: (role?: KnownAuthSessionRole | null) => void;
  finishTransition: () => void;
};

const LogoutTransitionContext = createContext<LogoutTransitionContextValue | null>(null);

export function LogoutTransitionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [role, setRole] = useState<KnownAuthSessionRole | null>(null);

  const startTransition = useCallback((nextRole?: KnownAuthSessionRole | null) => {
    setRole(nextRole ?? null);
    setIsActive(true);
  }, []);

  const finishTransition = useCallback(() => {
    setIsActive(false);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({
      isActive,
      role,
      startTransition,
      finishTransition,
    }),
    [finishTransition, isActive, role, startTransition],
  );

  return (
    <LogoutTransitionContext.Provider value={value}>
      {children}
    </LogoutTransitionContext.Provider>
  );
}

export const useLogoutTransitionContext = () => {
  const context = useContext(LogoutTransitionContext);
  if (!context) {
    throw new Error(
      'useLogoutTransitionContext must be used within LogoutTransitionProvider',
    );
  }
  return context;
};
