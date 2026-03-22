import { useCallback } from 'react';
import { useProfessionalNotificationsRefresh } from '@/context/ProfessionalNotificationsContext';
import { listProfessionalNotifications } from '@/services/professionalNotifications';
import { useNotificationPreview } from '@/hooks/useNotificationPreview';
import type { ProfessionalNotificationItem } from '@/types/notification';

type UseProfessionalNotificationPreviewOptions = {
  enabled?: boolean;
  size?: number;
};

export const useProfessionalNotificationPreview = ({
  enabled = false,
  size = 6,
}: UseProfessionalNotificationPreviewOptions = {}) => {
  const { refreshToken } = useProfessionalNotificationsRefresh();

  const fetchFn = useCallback(
    (params: { page: number; size: number }) => listProfessionalNotifications(params),
    [],
  );

  return useNotificationPreview<ProfessionalNotificationItem>({
    enabled,
    size,
    refreshToken,
    fetchFn,
  });
};
