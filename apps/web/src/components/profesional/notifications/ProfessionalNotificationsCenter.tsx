'use client';

import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import ProfessionalNotificationsList from '@/components/profesional/notifications/ProfessionalNotificationsList';
import ProfessionalNotificationsToolbar from '@/components/profesional/notifications/ProfessionalNotificationsToolbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useProfessionalNotificationInbox } from '@/hooks/useProfessionalNotificationInbox';
import { useProfessionalNotificationUnreadCount } from '@/hooks/useProfessionalNotificationUnreadCount';

const formatInboxMeta = (count: number, isLoading: boolean) => {
  if (isLoading) return 'Actualizando contador';
  if (count === 0) return 'Todo al día';
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
  const bookingNotificationsCount = items.filter(
    (item) => item.category === 'BOOKING' || item.type.startsWith('BOOKING_'),
  ).length;
  const paymentNotificationsCount = items.filter(
    (item) => item.category === 'PAYMENT' || item.type.startsWith('PAYMENT_'),
  ).length;

  return (
    <>
      <DashboardPageHeader
        eyebrow="ACTIVIDAD"
        title="Notificaciones"
        description="Revisá novedades de reservas, pagos y cambios."
        meta={(
          <>
            <DashboardHeaderBadge tone={hasUnread ? 'warning' : 'success'}>
              {formatInboxMeta(unreadCount, isUnreadCountLoading)}
            </DashboardHeaderBadge>
            <DashboardHeaderBadge>
              {total} en historial
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
            {hasUnread ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => void markAllAsRead()}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? 'Marcando...' : 'Marcar todas como leídas'}
              </Button>
            ) : null}
            <Button href="/profesional/dashboard/reservas" variant="secondary">
              Ver reservas
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Sin leer"
          value={`${unreadCount}`}
          detail="Pendientes de revisar"
          icon="notificaciones"
          tone={hasUnread ? 'warm' : 'default'}
        />
        <DashboardStatCard
          label="Total"
          value={`${total}`}
          detail="Eventos en historial"
          icon="analytics"
          tone="default"
        />
        <DashboardStatCard
          label="Reservas"
          value={`${bookingNotificationsCount}`}
          detail="Eventos de turnos"
          icon="reservas"
          tone="default"
        />
        <DashboardStatCard
          label="Pagos"
          value={`${paymentNotificationsCount}`}
          detail="Eventos de cobro"
          icon="plan"
          tone="default"
        />
      </div>

      <Card className="p-5 sm:p-6">
        <DashboardSectionHeading
          eyebrow="HISTORIAL"
          title="Actividad"
          description="Filtrá por estado o evento, revisá el contexto y marcá lecturas."
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
