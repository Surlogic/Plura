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

type UnreadCountState = {
  count: number;
  error: Error | null;
  isLoading: boolean;
  hasLoaded: boolean;
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

const initialUnreadState: UnreadCountState = {
  count: 0,
  error: null,
  isLoading: false,
  hasLoaded: false,
};

export function ProfessionalNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [unreadState, setUnreadState] = useState<UnreadCountState>(initialUnreadState);
  const unreadCountRequestRef = useRef<Promise<void> | null>(null);

  const publishChange = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (unreadCountRequestRef.current) {
      return unreadCountRequestRef.current;
    }

    const request = (async () => {
      setUnreadState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await getProfessionalNotificationUnreadCount();
        setUnreadState({ count: response.count, error: null, isLoading: false, hasLoaded: true });
      } catch (error) {
        setUnreadState((prev) => ({
          ...prev,
          error: error instanceof Error
            ? error
            : new Error('No se pudo cargar el contador de notificaciones.'),
          isLoading: false,
          hasLoaded: true,
        }));
      } finally {
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
      unreadCount: unreadState.count,
      unreadCountError: unreadState.error,
      isUnreadCountLoading: unreadState.isLoading,
      hasUnreadCountLoaded: unreadState.hasLoaded,
      refreshUnreadCount,
    }),
    [unreadState, refreshUnreadCount],
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
