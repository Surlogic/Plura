import { useEffect, useRef, useState } from 'react';
import { useClientNotificationsContext } from '@/context/ClientNotificationsContext';
import { listClientNotifications } from '@/services/clientNotifications';
import type { ClientNotificationItem } from '@/types/clientNotification';

type UseClientNotificationPreviewOptions = {
  enabled?: boolean;
  size?: number;
};

export const useClientNotificationPreview = ({
  enabled = false,
  size = 5,
}: UseClientNotificationPreviewOptions = {}) => {
  const { refreshToken } = useClientNotificationsContext();
  const mountedRef = useRef(true);
  const [items, setItems] = useState<ClientNotificationItem[]>([]);
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
      const response = await listClientNotifications({
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
