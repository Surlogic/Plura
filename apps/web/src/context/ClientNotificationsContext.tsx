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

type UnreadCountState = {
  count: number;
  error: Error | null;
  isLoading: boolean;
  hasLoaded: boolean;
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

const initialUnreadState: UnreadCountState = {
  count: 0,
  error: null,
  isLoading: false,
  hasLoaded: false,
};

const defaultRefreshContextValue: ClientNotificationsRefreshContextValue = {
  refreshToken: 0,
  publishChange: () => {},
};

const defaultDataContextValue: ClientNotificationsDataContextValue = {
  unreadCount: 0,
  unreadCountError: null,
  isUnreadCountLoading: false,
  hasUnreadCountLoaded: false,
  refreshUnreadCount: async () => {},
};

export function ClientNotificationsProvider({
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
        const response = await getClientNotificationUnreadCount();
        setUnreadState({ count: response.count, error: null, isLoading: false, hasLoaded: true });
      } catch (error) {
        setUnreadState((prev) => ({
          ...prev,
          error:
            error instanceof Error
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
    <ClientNotificationsRefreshContext.Provider value={refreshValue}>
      <ClientNotificationsDataContext.Provider value={dataValue}>
        {children}
      </ClientNotificationsDataContext.Provider>
    </ClientNotificationsRefreshContext.Provider>
  );
}

export const useClientNotificationsRefresh = () => {
  return useContext(ClientNotificationsRefreshContext) ?? defaultRefreshContextValue;
};

export const useClientNotificationsData = () => {
  return useContext(ClientNotificationsDataContext) ?? defaultDataContextValue;
};

export const useClientNotificationsContext = () => {
  const refresh = useClientNotificationsRefresh();
  const data = useClientNotificationsData();
  return { ...refresh, ...data };
};
