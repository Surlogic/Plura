import api from '@/services/api';
import type {
  ProfessionalNotificationItem,
  ProfessionalNotificationListParams,
  ProfessionalNotificationListResponse,
  ProfessionalNotificationUnreadCountResponse,
} from '@/types/notification';

export const getProfessionalNotificationUnreadCount = async () => {
  const response = await api.get<ProfessionalNotificationUnreadCountResponse>(
    '/profesional/notificaciones/unread-count',
  );
  return response.data;
};

export const listProfessionalNotifications = async (
  params: ProfessionalNotificationListParams = {},
) => {
  const response = await api.get<ProfessionalNotificationListResponse>(
    '/profesional/notificaciones',
    {
      params,
    },
  );
  return response.data;
};

export const getProfessionalNotification = async (notificationId: string) => {
  const response = await api.get<ProfessionalNotificationItem>(
    `/profesional/notificaciones/${notificationId}`,
  );
  return response.data;
};

export const markProfessionalNotificationAsRead = async (notificationId: string) => {
  await api.patch(`/profesional/notificaciones/${notificationId}/read`);
};

export const markAllProfessionalNotificationsAsRead = async () => {
  await api.patch('/profesional/notificaciones/read-all');
};
