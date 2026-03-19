import { useEffect } from 'react';
import { useProfessionalNotificationsContext } from '@/context/ProfessionalNotificationsContext';

export const useProfessionalNotificationUnreadCount = () => {
  const {
    refreshToken,
    unreadCount,
    unreadCountError,
    isUnreadCountLoading,
    hasUnreadCountLoaded,
    refreshUnreadCount,
  } = useProfessionalNotificationsContext();

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
