'use client';

import ClientNotificationsList from '@/components/cliente/notifications/ClientNotificationsList';
import ClientNotificationsToolbar from '@/components/cliente/notifications/ClientNotificationsToolbar';
import Card from '@/components/ui/Card';
import { useClientNotificationInbox } from '@/hooks/useClientNotificationInbox';
import { useClientNotificationUnreadCount } from '@/hooks/useClientNotificationUnreadCount';

const formatInboxMeta = (count: number, isLoading: boolean) => {
  if (isLoading) return 'Actualizando contador';
  if (count === 0) return 'Todo al dia';
  if (count === 1) return '1 sin leer';
  return `${count} sin leer`;
};

export default function ClientNotificationsCenter() {
  const {
    count: unreadCount,
    isLoading: isUnreadCountLoading,
  } = useClientNotificationUnreadCount();
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
  } = useClientNotificationInbox();

  const hasUnread = unreadCount > 0 || unreadOnPage > 0;
  const hasActiveFilters = filters.status !== 'ALL' || filters.type !== 'ALL';

  return (
    <>
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Notificaciones</p>
            <h1 className="text-3xl font-semibold text-[#0E2A47]">Tu actividad reciente</h1>
            <p className="max-w-2xl text-sm text-[#64748B]">
              Revisá reservas, pagos y cambios operativos en un solo lugar. El inbox conserva cada evento tal como llega desde backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#DCE4EC] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#0E2A47]">
              {formatInboxMeta(unreadCount, isUnreadCountLoading)}
            </span>
            <span className="rounded-full border border-[#DCE4EC] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#0E2A47]">
              {total} en inbox
            </span>
            {hasActiveFilters ? (
              <span className="rounded-full border border-[#DCE4EC] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                Filtros activos
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={!hasUnread || isMarkingAll}
            className="inline-flex rounded-full bg-[#0E2A47] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isMarkingAll ? 'Marcando...' : 'Marcar todas como leidas'}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex rounded-full border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            Actualizar
          </button>
        </div>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Centro real</p>
          <h2 className="text-xl font-semibold text-[#0E2A47]">Historial de notificaciones</h2>
          <p className="text-sm text-[#64748B]">
            Filtrá por estado o evento, revisá el contexto y marcá lecturas sin salir del área cliente.
          </p>
        </div>

        <div className="mt-5">
          <ClientNotificationsToolbar
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

          <ClientNotificationsList
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
