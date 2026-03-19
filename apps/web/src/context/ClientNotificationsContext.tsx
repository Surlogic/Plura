'use client';

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

type ClientNotificationsContextValue = {
  refreshToken: number;
  publishChange: () => void;
  unreadCount: number;
  unreadCountError: Error | null;
  isUnreadCountLoading: boolean;
  hasUnreadCountLoaded: boolean;
  refreshUnreadCount: () => Promise<void>;
};

const ClientNotificationsContext =
  createContext<ClientNotificationsContextValue | null>(null);

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

  const value = useMemo(
    () => ({
      refreshToken,
      publishChange,
      unreadCount,
      unreadCountError,
      isUnreadCountLoading,
      hasUnreadCountLoaded,
      refreshUnreadCount,
    }),
    [
      refreshToken,
      publishChange,
      unreadCount,
      unreadCountError,
      isUnreadCountLoading,
      hasUnreadCountLoaded,
      refreshUnreadCount,
    ],
  );

  return (
    <ClientNotificationsContext.Provider value={value}>
      {children}
    </ClientNotificationsContext.Provider>
  );
}

export const useClientNotificationsContext = () => {
  const context = useContext(ClientNotificationsContext);
  if (!context) {
    throw new Error(
      'useClientNotificationsContext must be used within ClientNotificationsProvider',
    );
  }
  return context;
};
