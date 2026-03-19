'use client';

import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getClientBookingTimeline } from '@/services/clientBookings';
import type { ClientBookingTimelineItem } from '@/types/clientBookingTimeline';

type UseClientBookingTimelineOptions = {
  bookingId?: string | null;
  refreshToken?: number;
};

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const useClientBookingTimeline = ({
  bookingId,
  refreshToken = 0,
}: UseClientBookingTimelineOptions) => {
  const mountedRef = useRef(true);
  const [items, setItems] = useState<ClientBookingTimelineItem[]>([]);
  const [resolvedBookingId, setResolvedBookingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!bookingId) {
      setItems([]);
      setResolvedBookingId(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await getClientBookingTimeline(bookingId);
      if (!mountedRef.current) return;
      setItems(response.items);
      setResolvedBookingId(response.bookingId);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setItems([]);
      setResolvedBookingId(null);
      setError(
        extractApiMessage(
          requestError,
          'No pudimos cargar la actividad de esta reserva.',
        ),
      );
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [bookingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!bookingId || refreshToken === 0) return;
    void refresh();
  }, [bookingId, refresh, refreshToken]);

  return {
    bookingId: resolvedBookingId,
    items,
    isLoading,
    error,
    refresh,
  };
};
