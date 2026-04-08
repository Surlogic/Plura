import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';
import { extractRoleFromAccessToken } from './authToken';
import {
  getClientPreferences,
  updateClientPreferences,
  type ClientPreferenceState,
  type PushPermissionStatus,
} from './clientFeatures';
import { logWarn } from './logger';
import { getAccessToken } from './session';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export type PushNotificationsState = {
  permissionStatus: PushPermissionStatus;
  canAskAgain: boolean;
  pushReminders: boolean;
  pushToken: string | null;
  updatedAt: string | null;
};

export const DEFAULT_PUSH_NOTIFICATIONS_STATE: PushNotificationsState = {
  permissionStatus: 'undetermined',
  canAskAgain: true,
  pushReminders: false,
  pushToken: null,
  updatedAt: null,
};

const toState = (preferences: ClientPreferenceState): PushNotificationsState => ({
  permissionStatus: preferences.pushPermissionStatus ?? 'undetermined',
  canAskAgain: preferences.pushPermissionCanAskAgain ?? true,
  pushReminders: preferences.pushReminders,
  pushToken: preferences.pushToken ?? null,
  updatedAt: preferences.pushPermissionUpdatedAt ?? null,
});

const getExpoProjectId = () => (
  Constants.easConfig?.projectId
  ?? Constants.expoConfig?.extra?.eas?.projectId
  ?? null
);

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

type SyncPermissionStateOptions = {
  enablePushRemindersOnGrant: boolean;
};

const syncPushTokenWithBackend = async (pushToken: string, enabled: boolean) => {
  const normalizedToken = pushToken.trim();
  if (!normalizedToken) return;

  const accessToken = await getAccessToken();
  if (!accessToken || extractRoleFromAccessToken(accessToken) !== 'USER') {
    return;
  }

  try {
    await api.put('/cliente/notificaciones/push-token', {
      pushToken: normalizedToken,
      platform: Platform.OS,
      enabled,
    });
  } catch (error) {
    logWarn('push-notifications', 'no se pudo sincronizar el push token con backend', error);
  }
};

const resolvePushToken = async (fallbackToken: string | null) => {
  if (Platform.OS === 'web') return fallbackToken;

  const projectId = getExpoProjectId();
  if (!projectId) return fallbackToken;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? fallbackToken;
  } catch {
    return fallbackToken;
  }
};

const persistPermissionState = async (
  permissionStatus: PushPermissionStatus,
  canAskAgain: boolean,
) => {
  const preferences = await getClientPreferences();
  const existingPushToken = preferences.pushToken?.trim() || null;

  if (permissionStatus !== 'granted' && existingPushToken) {
    await syncPushTokenWithBackend(existingPushToken, false);
  }

  const next = await updateClientPreferences({
    pushReminders: permissionStatus === 'granted',
    pushPermissionStatus: permissionStatus,
    pushPermissionCanAskAgain: canAskAgain,
    pushPermissionUpdatedAt: new Date().toISOString(),
    pushToken: permissionStatus === 'granted' ? preferences.pushToken ?? null : null,
  });

  return toState(next);
};

const syncPermissionState = async (
  permissions: Notifications.NotificationPermissionsStatus,
  options: SyncPermissionStateOptions,
) => {
  const permissionStatus = permissions.status as PushPermissionStatus;

  if (permissionStatus !== 'granted') {
    return persistPermissionState(permissionStatus, permissions.canAskAgain);
  }

  const preferences = await getClientPreferences();
  const previousPushToken = preferences.pushToken?.trim() || null;
  const resolvedPushToken = await resolvePushToken(previousPushToken);
  const pushToken = resolvedPushToken?.trim() || null;
  const pushReminders = options.enablePushRemindersOnGrant ? true : preferences.pushReminders;

  if (previousPushToken && previousPushToken !== pushToken) {
    await syncPushTokenWithBackend(previousPushToken, false);
  }
  if (pushToken) {
    await syncPushTokenWithBackend(pushToken, pushReminders);
  }
  const next = await updateClientPreferences({
    pushReminders,
    pushPermissionStatus: permissionStatus,
    pushPermissionCanAskAgain: permissions.canAskAgain,
    pushPermissionUpdatedAt: new Date().toISOString(),
    pushToken,
  });

  return toState(next);
};

export const getStoredPushNotificationsState = async (): Promise<PushNotificationsState> => {
  const preferences = await getClientPreferences();
  return {
    ...DEFAULT_PUSH_NOTIFICATIONS_STATE,
    ...toState(preferences),
  };
};

export const syncPushNotificationPermission = async (): Promise<PushNotificationsState> => {
  try {
    await ensureAndroidChannel();
    const permissions = await Notifications.getPermissionsAsync();
    return await syncPermissionState(permissions, {
      enablePushRemindersOnGrant: false,
    });
  } catch {
    return getStoredPushNotificationsState();
  }
};

export const requestPushNotificationPermission = async (): Promise<PushNotificationsState> => {
  try {
    await ensureAndroidChannel();
    const permissions = await Notifications.requestPermissionsAsync();
    return await syncPermissionState(permissions, {
      enablePushRemindersOnGrant: true,
    });
  } catch {
    return getStoredPushNotificationsState();
  }
};

export const disablePushNotifications = async (): Promise<PushNotificationsState> => {
  const preferences = await getClientPreferences();
  const existingPushToken = preferences.pushToken?.trim() || null;
  if (existingPushToken) {
    await syncPushTokenWithBackend(existingPushToken, false);
  }
  const next = await updateClientPreferences({
    pushReminders: false,
  });
  return toState(next);
};
