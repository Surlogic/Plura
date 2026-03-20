import { useEffect, useRef } from 'react';
import { useClientNotificationsContext } from '@/context/ClientNotificationsContext';

export const useClientNotificationUnreadCount = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const {
    refreshToken,
    unreadCount,
    unreadCountError,
    isUnreadCountLoading,
    hasUnreadCountLoaded,
    refreshUnreadCount,
  } = useClientNotificationsContext();

  const lastRefreshTokenRef = useRef(refreshToken);

  useEffect(() => {
    if (!enabled) return;

    // Initial load: only fetch if we haven't loaded yet and aren't loading
    if (!hasUnreadCountLoaded && !isUnreadCountLoading) {
      void refreshUnreadCount();
      lastRefreshTokenRef.current = refreshToken;
      return;
    }

    // Subsequent refreshes: only fetch when refreshToken actually changed
    if (hasUnreadCountLoaded && refreshToken !== lastRefreshTokenRef.current) {
      lastRefreshTokenRef.current = refreshToken;
      void refreshUnreadCount();
    }
  }, [enabled, refreshToken, hasUnreadCountLoaded, isUnreadCountLoading, refreshUnreadCount]);

  return {
    count: unreadCount,
    isLoading: isUnreadCountLoading,
    error: unreadCountError,
    refresh: refreshUnreadCount,
  };
};
