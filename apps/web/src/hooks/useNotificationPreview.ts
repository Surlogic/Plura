import { useCallback, useEffect, useRef, useState } from 'react';

type NotificationPreviewItem = { id: string | number; [key: string]: unknown };
type NotificationPreviewResponse<T> = { items: T[]; total: number };

type UseNotificationPreviewOptions<T extends NotificationPreviewItem> = {
  enabled?: boolean;
  size?: number;
  refreshToken: number;
  fetchFn: (params: { page: number; size: number }) => Promise<NotificationPreviewResponse<T>>;
};

export function useNotificationPreview<T extends NotificationPreviewItem>({
  enabled = false,
  size = 5,
  refreshToken,
  fetchFn,
}: UseNotificationPreviewOptions<T>) {
  const mountedRef = useRef(true);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchFn({ page: 0, size });
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
  }, [fetchFn, size]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh, refreshToken]);

  return { items, total, isLoading, error, refresh };
}
