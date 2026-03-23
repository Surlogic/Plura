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
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++activeRequestRef.current;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchFn({ page: 0, size });
      if (activeRequestRef.current !== requestId) return;
      setItems(response.items);
      setTotal(response.total);
    } catch (unknownError) {
      if (activeRequestRef.current !== requestId) return;
      setError(
        unknownError instanceof Error
          ? unknownError
          : new Error('No se pudieron cargar las notificaciones recientes.'),
      );
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [fetchFn, size]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    return () => {
      activeRequestRef.current += 1;
    };
  }, [enabled, refresh, refreshToken]);

  return { items, total, isLoading, error, refresh };
}
