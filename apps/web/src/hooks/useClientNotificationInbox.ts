'use client';

import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClientNotificationsContext } from '@/context/ClientNotificationsContext';
import {
  listClientNotifications,
  markAllClientNotificationsAsRead,
  markClientNotificationAsRead,
} from '@/services/clientNotifications';
import type {
  ClientNotificationEventType,
  ClientNotificationItem,
  ClientNotificationStatus,
} from '@/types/clientNotification';

type NotificationTypeFilter = 'ALL' | ClientNotificationEventType;

type NotificationFilters = {
  status: ClientNotificationStatus;
  type: NotificationTypeFilter;
};

const PAGE_SIZE = 10;

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const dedupeNotifications = (
  current: ClientNotificationItem[],
  incoming: ClientNotificationItem[],
) => {
  const existingIds = new Set(current.map((item) => item.id));
  const nextItems = incoming.filter((item) => !existingIds.has(item.id));
  return [...current, ...nextItems];
};

export const useClientNotificationInbox = () => {
  const { publishChange } = useClientNotificationsContext();
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const itemsRef = useRef<ClientNotificationItem[]>([]);
  const pageRef = useRef(0);
  const [filters, setFilters] = useState<NotificationFilters>({
    status: 'ALL',
    type: 'ALL',
  });
  const [items, setItems] = useState<ClientNotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const loadNotifications = useCallback(
    async ({ append = false }: { append?: boolean } = {}) => {
      const nextPage = append ? pageRef.current + 1 : 0;
      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;

      if (append) {
        setIsLoadingMore(true);
      } else if (itemsRef.current.length > 0) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await listClientNotifications({
          page: nextPage,
          size: PAGE_SIZE,
          ...(filters.status !== 'ALL' ? { status: filters.status } : {}),
          ...(filters.type !== 'ALL' ? { types: [filters.type] } : {}),
        });

        if (!mountedRef.current || requestIdRef.current !== currentRequestId) {
          return;
        }

        setItems((currentItems) =>
          append ? dedupeNotifications(currentItems, response.items) : response.items,
        );
        setPage(response.page);
        setTotal(response.total);
      } catch (requestError) {
        if (!mountedRef.current || requestIdRef.current !== currentRequestId) {
          return;
        }

        setError(
          extractApiMessage(
            requestError,
            'No se pudieron cargar tus notificaciones.',
          ),
        );
        if (!append) {
          setItems([]);
          setPage(0);
          setTotal(0);
        }
      } finally {
        if (!mountedRef.current || requestIdRef.current !== currentRequestId) {
          return;
        }

        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [filters.status, filters.type],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const setStatusFilter = useCallback((status: ClientNotificationStatus) => {
    setFilters((current) => ({
      ...current,
      status,
    }));
  }, []);

  const setTypeFilter = useCallback((type: NotificationTypeFilter) => {
    setFilters((current) => ({
      ...current,
      type,
    }));
  }, []);

  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const loadMore = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || items.length >= total) {
      return;
    }

    await loadNotifications({ append: true });
  }, [isLoading, isRefreshing, isLoadingMore, items.length, loadNotifications, total]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const notification = itemsRef.current.find((item) => item.id === notificationId);
      if (!notification || notification.readAt) {
        return;
      }

      setActionError(null);
      setActionMessage(null);
      setMarkingNotificationId(notificationId);

      // Optimistic update: mark as read locally before the API call
      const previousReadAt = notification.readAt;
      const nowIso = new Date().toISOString();
      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, readAt: nowIso } : item,
        ),
      );

      try {
        await markClientNotificationAsRead(notificationId);
        publishChange();
        if (!mountedRef.current) return;
        setActionMessage('Notificacion marcada como leida.');
      } catch (requestError) {
        if (!mountedRef.current) return;
        // Revert optimistic update on failure
        setItems((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, readAt: previousReadAt } : item,
          ),
        );
        setActionError(
          extractApiMessage(requestError, 'No se pudo marcar la notificacion como leida.'),
        );
      } finally {
        if (mountedRef.current) {
          setMarkingNotificationId(null);
        }
      }
    },
    [publishChange],
  );

  const markAllAsRead = useCallback(async () => {
    if (isMarkingAll) return;

    setActionError(null);
    setActionMessage(null);
    setIsMarkingAll(true);

    // Optimistic update: mark all as read locally
    const nowIso = new Date().toISOString();
    const previousItems = itemsRef.current;
    setItems((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: nowIso })),
    );

    try {
      await markAllClientNotificationsAsRead();
      publishChange();
      if (!mountedRef.current) return;
      setActionMessage('Todas las notificaciones quedaron marcadas como leidas.');
    } catch (requestError) {
      if (!mountedRef.current) return;
      // Revert optimistic update on failure
      setItems(previousItems);
      setActionError(
        extractApiMessage(requestError, 'No se pudieron marcar todas las notificaciones.'),
      );
    } finally {
      if (mountedRef.current) {
        setIsMarkingAll(false);
      }
    }
  }, [isMarkingAll, publishChange]);

  const unreadOnPage = useMemo(
    () => items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0),
    [items],
  );

  return {
    filters,
    items,
    page,
    total,
    unreadOnPage,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    actionError,
    actionMessage,
    markingNotificationId,
    isMarkingAll,
    hasMore: items.length < total,
    setStatusFilter,
    setTypeFilter,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
};
