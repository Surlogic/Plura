'use client';

import Card from '@/components/ui/Card';
import type {
  ClientNotificationEventType,
  ClientNotificationItem,
  ClientNotificationStatus,
} from '@/types/clientNotification';
import { getClientNotificationsEmptyStateCopy } from '@/utils/clientNotifications';
import ClientNotificationInboxItem from '@/components/cliente/notifications/ClientNotificationInboxItem';

type NotificationTypeFilter = 'ALL' | ClientNotificationEventType;

type ClientNotificationsListProps = {
  items: ClientNotificationItem[];
  total: number;
  status: ClientNotificationStatus;
  type: NotificationTypeFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  actionError: string | null;
  actionMessage: string | null;
  markingNotificationId: string | null;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onMarkAsRead: (notificationId: string) => void;
};

const LoadingState = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="rounded-[24px] border border-[#E2E7EC] bg-[#F8FAFC] px-5 py-5"
      >
        <div className="h-4 w-40 animate-pulse rounded-full bg-[#E2E8F0]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[#E2E8F0]" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-[#E2E8F0]" />
        <div className="mt-5 h-9 w-32 animate-pulse rounded-full bg-[#E2E8F0]" />
      </div>
    ))}
  </div>
);

export default function ClientNotificationsList({
  items,
  total,
  status,
  type,
  isLoading,
  isRefreshing,
  isLoadingMore,
  error,
  actionError,
  actionMessage,
  markingNotificationId,
  hasMore,
  onRetry,
  onLoadMore,
  onMarkAsRead,
}: ClientNotificationsListProps) {
  const emptyState = getClientNotificationsEmptyStateCopy({
    status,
    type,
  });

  return (
    <div className="space-y-4 pt-5" aria-busy={isLoading || isRefreshing}>
      {actionMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[20px] border border-[#BFEDE7] bg-[#F0FDFA] px-4 py-3 text-sm text-[#115E59]"
        >
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]"
        >
          {actionError}
        </div>
      ) : null}

      {isRefreshing && items.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[18px] border border-[#DCE4EC] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]"
        >
          Actualizando notificaciones...
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error && items.length === 0 ? (
        <Card tone="soft" className="border-[#FECACA] bg-[#FEF2F2] p-6">
          <p className="text-sm font-semibold text-[#B91C1C]">
            No pudimos cargar tu centro de notificaciones.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#B91C1C]/90">
            Probá actualizar para volver a consultar tu actividad reciente.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex rounded-full border border-[#DCE4EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              Reintentar
            </button>
          </div>
        </Card>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <Card tone="soft" className="border-dashed px-6 py-8 text-center">
          <p className="text-sm font-semibold text-[#0E2A47]">{emptyState.title}</p>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            {emptyState.description}
          </p>
        </Card>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <ClientNotificationInboxItem
              key={item.id}
              item={item}
              isMarkingAsRead={markingNotificationId === item.id}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 && hasMore ? (
        <div className="flex flex-col items-center gap-3 pt-2">
          <p className="text-xs text-[#64748B]">
            Mostrando {items.length} de {total} notificaciones.
          </p>
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex rounded-full border border-[#DCE4EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? 'Cargando...' : 'Cargar mas notificaciones'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
