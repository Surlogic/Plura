import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  DEFAULT_PUSH_NOTIFICATIONS_STATE,
  disablePushNotifications,
  getStoredPushNotificationsState,
  requestPushNotificationPermission,
  syncPushNotificationPermission,
  type PushNotificationsState,
} from '../services/pushNotifications';

export const usePushNotifications = () => {
  const [settings, setSettings] = useState<PushNotificationsState>(DEFAULT_PUSH_NOTIFICATIONS_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const stored = await getStoredPushNotificationsState();
      if (!isMounted) return;
      setSettings(stored);

      const next = await syncPushNotificationPermission();
      if (!isMounted) return;
      setSettings(next);
      setIsLoading(false);
    };

    void hydrate();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void syncPushNotificationPermission().then((next) => {
        if (!isMounted) return;
        setSettings(next);
      });
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const requestPermission = async () => {
    setIsRefreshing(true);
    try {
      const next = await requestPushNotificationPermission();
      setSettings(next);
      return next;
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const disablePush = async () => {
    setIsRefreshing(true);
    try {
      const next = await disablePushNotifications();
      setSettings(next);
      return next;
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  return {
    settings,
    isLoading,
    isRefreshing,
    isEnabled: settings.pushReminders && settings.permissionStatus === 'granted',
    requestPermission,
    disablePush,
    syncPermission: syncPushNotificationPermission,
  };
};
