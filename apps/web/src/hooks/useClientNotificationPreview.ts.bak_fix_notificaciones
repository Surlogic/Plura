import { useCallback } from 'react';
import { useClientNotificationsRefresh } from '@/context/ClientNotificationsContext';
import { listClientNotifications } from '@/services/clientNotifications';
import { useNotificationPreview } from '@/hooks/useNotificationPreview';
import type { ClientNotificationItem } from '@/types/clientNotification';

type UseClientNotificationPreviewOptions = {
  enabled?: boolean;
  size?: number;
};

export const useClientNotificationPreview = ({
  enabled = false,
  size = 5,
}: UseClientNotificationPreviewOptions = {}) => {
  const { refreshToken } = useClientNotificationsRefresh();

  const fetchFn = useCallback(
    (params: { page: number; size: number }) => listClientNotifications(params),
    [],
  );

  return useNotificationPreview<ClientNotificationItem>({
    enabled,
    size,
    refreshToken,
    fetchFn,
  });
};
