'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type {
  ProfessionalNotificationEventType,
  ProfessionalNotificationItem,
  ProfessionalNotificationStatus,
} from '@/types/notification';
import { getProfessionalNotificationsEmptyStateCopy } from '@/utils/notifications';
import ProfessionalNotificationInboxItem from '@/components/profesional/notifications/ProfessionalNotificationInboxItem';

type NotificationTypeFilter = 'ALL' | ProfessionalNotificationEventType;

type ProfessionalNotificationsListProps = {
  items: ProfessionalNotificationItem[];
  total: number;
  status: ProfessionalNotificationStatus;
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
        className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-5 py-5"
      >
        <div className="h-4 w-40 animate-pulse rounded-full bg-[color:var(--border-soft)]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[color:var(--border-soft)]" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-[color:var(--border-soft)]" />
        <div className="mt-5 h-9 w-32 animate-pulse rounded-full bg-[color:var(--border-soft)]" />
      </div>
    ))}
  </div>
);

export default function ProfessionalNotificationsList({
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
}: ProfessionalNotificationsListProps) {
  const emptyState = getProfessionalNotificationsEmptyStateCopy({
    status,
    type,
  });

  return (
    <div className="space-y-4 pt-5" aria-busy={isLoading || isRefreshing}>
      {actionMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {actionError}
        </div>
      ) : null}

      {isRefreshing && items.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-xs text-[color:var(--ink-muted)]"
        >
          Actualizando notificaciones...
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error && items.length === 0 ? (
        <Card tone="soft" className="border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-semibold text-rose-700">
            No pudimos cargar el centro de notificaciones.
          </p>
          <p className="mt-2 text-sm leading-6 text-rose-700/90">
            Probá actualizar para volver a consultar el inbox profesional.
          </p>
          <div className="mt-4">
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        </Card>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <Card tone="soft" className="border-dashed px-6 py-8 text-center">
          <p className="text-sm font-semibold text-[color:var(--ink)]">{emptyState.title}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">
            {emptyState.description}
          </p>
        </Card>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <ProfessionalNotificationInboxItem
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
          <p className="text-xs text-[color:var(--ink-muted)]">
            Mostrando {items.length} de {total} notificaciones.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Cargando...' : 'Cargar mas notificaciones'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
