import api from '@/services/api';
import type {
  ClientNotificationItem,
  ClientNotificationListParams,
  ClientNotificationListResponse,
  ClientNotificationUnreadCountResponse,
} from '@/types/clientNotification';

export const getClientNotificationUnreadCount = async () => {
  const response = await api.get<ClientNotificationUnreadCountResponse>(
    '/cliente/notificaciones/unread-count',
  );
  return response.data;
};

export const listClientNotifications = async (
  params: ClientNotificationListParams = {},
) => {
  const response = await api.get<ClientNotificationListResponse>(
    '/cliente/notificaciones',
    {
      params,
    },
  );
  return response.data;
};

export const getClientNotification = async (notificationId: string) => {
  const response = await api.get<ClientNotificationItem>(
    `/cliente/notificaciones/${notificationId}`,
  );
  return response.data;
};

export const markClientNotificationAsRead = async (notificationId: string) => {
  await api.patch(`/cliente/notificaciones/${notificationId}/read`);
};

export const markAllClientNotificationsAsRead = async () => {
  await api.patch('/cliente/notificaciones/read-all');
};
