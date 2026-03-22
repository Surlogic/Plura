import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getProfessionalNotificationUnreadCount } from '@/services/professionalNotifications';

type ProfessionalNotificationsRefreshContextValue = {
  refreshToken: number;
  publishChange: () => void;
};

type ProfessionalNotificationsDataContextValue = {
  unreadCount: number;
  unreadCountError: Error | null;
  isUnreadCountLoading: boolean;
  hasUnreadCountLoaded: boolean;
  refreshUnreadCount: () => Promise<void>;
};

const ProfessionalNotificationsRefreshContext =
  createContext<ProfessionalNotificationsRefreshContextValue | null>(null);

const ProfessionalNotificationsDataContext =
  createContext<ProfessionalNotificationsDataContextValue | null>(null);

export function ProfessionalNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadCountError, setUnreadCountError] = useState<Error | null>(null);
  const [isUnreadCountLoading, setIsUnreadCountLoading] = useState(false);
  const [hasUnreadCountLoaded, setHasUnreadCountLoaded] = useState(false);
  const unreadCountRequestRef = useRef<Promise<void> | null>(null);

  const publishChange = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (unreadCountRequestRef.current) {
      return unreadCountRequestRef.current;
    }

    const request = (async () => {
      setIsUnreadCountLoading(true);
      setUnreadCountError(null);
      try {
        const response = await getProfessionalNotificationUnreadCount();
        setUnreadCount(response.count);
      } catch (error) {
        setUnreadCountError(
          error instanceof Error
            ? error
            : new Error('No se pudo cargar el contador de notificaciones.'),
        );
      } finally {
        setHasUnreadCountLoaded(true);
        setIsUnreadCountLoading(false);
        unreadCountRequestRef.current = null;
      }
    })();

    unreadCountRequestRef.current = request;
    return request;
  }, []);

  const refreshValue = useMemo(
    () => ({ refreshToken, publishChange }),
    [refreshToken, publishChange],
  );

  const dataValue = useMemo(
    () => ({
      unreadCount,
      unreadCountError,
      isUnreadCountLoading,
      hasUnreadCountLoaded,
      refreshUnreadCount,
    }),
    [unreadCount, unreadCountError, isUnreadCountLoading, hasUnreadCountLoaded, refreshUnreadCount],
  );

  return (
    <ProfessionalNotificationsRefreshContext.Provider value={refreshValue}>
      <ProfessionalNotificationsDataContext.Provider value={dataValue}>
        {children}
      </ProfessionalNotificationsDataContext.Provider>
    </ProfessionalNotificationsRefreshContext.Provider>
  );
}

export const useProfessionalNotificationsRefresh = () => {
  const context = useContext(ProfessionalNotificationsRefreshContext);
  if (!context) {
    throw new Error(
      'useProfessionalNotificationsRefresh must be used within ProfessionalNotificationsProvider',
    );
  }
  return context;
};

export const useProfessionalNotificationsData = () => {
  const context = useContext(ProfessionalNotificationsDataContext);
  if (!context) {
    throw new Error(
      'useProfessionalNotificationsData must be used within ProfessionalNotificationsProvider',
    );
  }
  return context;
};

export const useProfessionalNotificationsContext = () => {
  const refresh = useProfessionalNotificationsRefresh();
  const data = useProfessionalNotificationsData();
  return { ...refresh, ...data };
};
