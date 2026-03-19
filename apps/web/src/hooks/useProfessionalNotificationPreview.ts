import { useEffect, useRef, useState } from 'react';
import { useProfessionalNotificationsContext } from '@/context/ProfessionalNotificationsContext';
import { listProfessionalNotifications } from '@/services/professionalNotifications';
import type { ProfessionalNotificationItem } from '@/types/notification';

type UseProfessionalNotificationPreviewOptions = {
  enabled?: boolean;
  size?: number;
};

export const useProfessionalNotificationPreview = ({
  enabled = false,
  size = 6,
}: UseProfessionalNotificationPreviewOptions = {}) => {
  const { refreshToken } = useProfessionalNotificationsContext();
  const mountedRef = useRef(true);
  const [items, setItems] = useState<ProfessionalNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await listProfessionalNotifications({
        page: 0,
        size,
      });
      if (!mountedRef.current) return;
      setItems(response.items);
      setTotal(response.total);
    } catch (unknownError) {
      if (!mountedRef.current) return;
      setError(
        unknownError instanceof Error
          ? unknownError
          : new Error('No se pudieron cargar las notificaciones recientes.'),
      );
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, size, refreshToken]);

  return {
    items,
    total,
    isLoading,
    error,
    refresh,
  };
};
