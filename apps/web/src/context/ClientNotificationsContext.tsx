import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getClientNotificationUnreadCount } from '@/services/clientNotifications';

type ClientNotificationsRefreshContextValue = {
  refreshToken: number;
  publishChange: () => void;
};

type ClientNotificationsDataContextValue = {
  unreadCount: number;
  unreadCountError: Error | null;
  isUnreadCountLoading: boolean;
  hasUnreadCountLoaded: boolean;
  refreshUnreadCount: () => Promise<void>;
};

const ClientNotificationsRefreshContext =
  createContext<ClientNotificationsRefreshContextValue | null>(null);

const ClientNotificationsDataContext =
  createContext<ClientNotificationsDataContextValue | null>(null);

export function ClientNotificationsProvider({
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
        const response = await getClientNotificationUnreadCount();
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
    <ClientNotificationsRefreshContext.Provider value={refreshValue}>
      <ClientNotificationsDataContext.Provider value={dataValue}>
        {children}
      </ClientNotificationsDataContext.Provider>
    </ClientNotificationsRefreshContext.Provider>
  );
}

export const useClientNotificationsRefresh = () => {
  const context = useContext(ClientNotificationsRefreshContext);
  if (!context) {
    throw new Error(
      'useClientNotificationsRefresh must be used within ClientNotificationsProvider',
    );
  }
  return context;
};

export const useClientNotificationsData = () => {
  const context = useContext(ClientNotificationsDataContext);
  if (!context) {
    throw new Error(
      'useClientNotificationsData must be used within ClientNotificationsProvider',
    );
  }
  return context;
};

export const useClientNotificationsContext = () => {
  const refresh = useClientNotificationsRefresh();
  const data = useClientNotificationsData();
  return { ...refresh, ...data };
};
