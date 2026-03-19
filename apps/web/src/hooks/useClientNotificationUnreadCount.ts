import { useEffect } from 'react';
import { useClientNotificationsContext } from '@/context/ClientNotificationsContext';

export const useClientNotificationUnreadCount = () => {
  const {
    refreshToken,
    unreadCount,
    unreadCountError,
    isUnreadCountLoading,
    hasUnreadCountLoaded,
    refreshUnreadCount,
  } = useClientNotificationsContext();

  useEffect(() => {
    if (hasUnreadCountLoaded || isUnreadCountLoading) return;
    void refreshUnreadCount();
  }, [hasUnreadCountLoaded, isUnreadCountLoading, refreshUnreadCount]);

  useEffect(() => {
    if (refreshToken === 0 || !hasUnreadCountLoaded) return;
    void refreshUnreadCount();
  }, [refreshToken, hasUnreadCountLoaded, refreshUnreadCount]);

  return {
    count: unreadCount,
    isLoading: isUnreadCountLoading,
    error: unreadCountError,
    refresh: refreshUnreadCount,
  };
};
