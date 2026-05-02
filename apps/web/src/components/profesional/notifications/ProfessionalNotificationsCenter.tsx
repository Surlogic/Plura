'use client';

import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
} from '@/components/profesional/dashboard/DashboardUI';
import ProfessionalNotificationsList from '@/components/profesional/notifications/ProfessionalNotificationsList';
import ProfessionalNotificationsToolbar from '@/components/profesional/notifications/ProfessionalNotificationsToolbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useProfessionalNotificationInbox } from '@/hooks/useProfessionalNotificationInbox';
import { useProfessionalNotificationUnreadCount } from '@/hooks/useProfessionalNotificationUnreadCount';

const formatInboxMeta = (count: number, isLoading: boolean) => {
  if (isLoading) return 'Actualizando contador';
  if (count === 0) return 'Todo al dia';
  if (count === 1) return '1 sin leer';
  return `${count} sin leer`;
};

export default function ProfessionalNotificationsCenter() {
  const {
    count: unreadCount,
    isLoading: isUnreadCountLoading,
  } = useProfessionalNotificationUnreadCount();
  const {
    filters,
    items,
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
    hasMore,
    setStatusFilter,
    setTypeFilter,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useProfessionalNotificationInbox();

  const hasUnread = unreadCount > 0 || unreadOnPage > 0;
  const hasActiveFilters = filters.status !== 'ALL' || filters.type !== 'ALL';

  return (
    <>
      <DashboardPageHeader
        eyebrow="Inbox profesional"
        title="Notificaciones operativas"
        description="Revisá eventos del negocio, filtrá rápido y marcá lecturas sin salir del dashboard."
        meta={(
          <>
            <DashboardHeaderBadge tone={hasUnread ? 'warning' : 'success'}>
              {formatInboxMeta(unreadCount, isUnreadCountLoading)}
            </DashboardHeaderBadge>
            <DashboardHeaderBadge>
              {total} en inbox
            </DashboardHeaderBadge>
            {hasActiveFilters ? (
              <DashboardHeaderBadge tone="accent">
                Filtros activos
              </DashboardHeaderBadge>
            ) : null}
          </>
        )}
        actions={(
          <>
            <Button
              type="button"
              variant="primary"
              onClick={() => void markAllAsRead()}
              disabled={!hasUnread || isMarkingAll}
            >
              {isMarkingAll ? 'Marcando...' : 'Marcar todas como leidas'}
            </Button>
            <Button href="/profesional/dashboard/reservas">
              Ver reservas
            </Button>
          </>
        )}
      />

      <Card className="p-5 sm:p-6">
        <DashboardSectionHeading
          eyebrow="Centro real"
          title="Actividad del negocio"
          description="El inbox conserva cada evento tal como llega desde backend. Podés filtrar por estado o evento, revisar el contexto y marcar lecturas sin salir del dashboard."
          action={(
            <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
              Actualizar
            </Button>
          )}
        />

        <div className="mt-5">
          <ProfessionalNotificationsToolbar
            status={filters.status}
            type={filters.type}
            total={total}
            isRefreshing={isRefreshing}
            hasActiveFilters={hasActiveFilters}
            onStatusChange={setStatusFilter}
            onTypeChange={setTypeFilter}
            onResetFilters={() => {
              setStatusFilter('ALL');
              setTypeFilter('ALL');
            }}
          />

          <ProfessionalNotificationsList
            items={items}
            total={total}
            status={filters.status}
            type={filters.type}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            isLoadingMore={isLoadingMore}
            error={error}
            actionError={actionError}
            actionMessage={actionMessage}
            markingNotificationId={markingNotificationId}
            hasMore={hasMore}
            onRetry={() => void refresh()}
            onLoadMore={() => void loadMore()}
            onMarkAsRead={(notificationId) => void markAsRead(notificationId)}
          />
        </div>
      </Card>
    </>
  );
}
