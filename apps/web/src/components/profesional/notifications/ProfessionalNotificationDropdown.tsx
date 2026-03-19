import type { ProfessionalNotificationItem } from '@/types/notification';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import {
  formatProfessionalNotificationTimestamp,
  getProfessionalNotificationActionLabel,
  getProfessionalNotificationActionLink,
  getProfessionalNotificationCategoryLabel,
  getProfessionalNotificationDropdownEmptyCopy,
  getProfessionalNotificationDropdownErrorCopy,
  getProfessionalNotificationTypeLabel,
  professionalNotificationSeverityDotClassName,
  professionalNotificationSeveritySurfaceClassName,
} from '@/utils/notifications';

type ProfessionalNotificationDropdownProps = {
  items: ProfessionalNotificationItem[];
  total: number;
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  onViewAll: () => void;
  onNavigateToItem: (href: string) => void;
};

const LoadingState = () => (
  <div className="space-y-2.5">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-3"
      >
        <div className="h-3 w-20 animate-pulse rounded-full bg-[color:var(--border-soft)]" />
        <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-[color:var(--border-soft)]" />
        <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-[color:var(--border-soft)]" />
      </div>
    ))}
  </div>
);

export default function ProfessionalNotificationDropdown({
  items,
  total,
  unreadCount,
  isLoading,
  error,
  onViewAll,
  onNavigateToItem,
}: ProfessionalNotificationDropdownProps) {
  const emptyCopy = getProfessionalNotificationDropdownEmptyCopy();
  const errorCopy = getProfessionalNotificationDropdownErrorCopy();

  return (
    <Card
      tone="glass"
      padding="none"
      className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-[24px] border-[color:var(--border-soft)] bg-[color:var(--surface)]/96 shadow-[0_24px_54px_rgba(15,23,42,0.18)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-[color:var(--border-soft)] px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ink)]">Notificaciones</p>
          <p className="mt-0.5 text-xs text-[color:var(--ink-muted)]">
            {unreadCount > 0
              ? `${unreadCount} sin leer`
              : 'Sin pendientes por revisar'}
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-full px-2 py-1 text-xs font-semibold text-[color:var(--primary)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        >
          Ver inbox
        </button>
      </div>

      <div className="max-h-[440px] overflow-y-auto px-3 py-3">
        {isLoading ? <LoadingState /> : null}

        {!isLoading && error ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p className="font-semibold">{errorCopy.title}</p>
            <p className="mt-1 leading-5">{errorCopy.description}</p>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[color:var(--ink)]">{emptyCopy.title}</p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--ink-muted)]">
              {emptyCopy.description}
            </p>
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const severityDot =
                professionalNotificationSeverityDotClassName[item.severity] ||
                professionalNotificationSeverityDotClassName.INFO;
              const severitySurface =
                professionalNotificationSeveritySurfaceClassName[item.severity] ||
                professionalNotificationSeveritySurfaceClassName.INFO;
              const isUnread = !item.readAt;
              const categoryLabel = getProfessionalNotificationCategoryLabel(item.category);
              const actionLink = getProfessionalNotificationActionLink(item.actionUrl);
              const actionLabel = getProfessionalNotificationActionLabel(item);

              return (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-[18px] border px-3.5 py-3 transition',
                    isUnread
                      ? 'border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)]/40'
                      : 'border-[color:var(--border-soft)] bg-white/90',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', severityDot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-[color:var(--ink)]">
                          {item.title}
                        </p>
                        {isUnread ? (
                          <span className="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--primary)]" />
                        ) : null}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--ink-muted)]">
                        {item.body}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] font-medium text-[color:var(--ink-faint)]">
                        <span>{formatProfessionalNotificationTimestamp(item.createdAt)}</span>
                        <span className={cn('rounded-full border px-2 py-0.5 uppercase tracking-[0.08em]', severitySurface)}>
                          {getProfessionalNotificationTypeLabel(item.type)}
                        </span>
                        {item.bookingId ? (
                          <span className="rounded-full border border-[color:var(--border-soft)] bg-white px-2 py-0.5">
                            Reserva #{item.bookingId}
                          </span>
                        ) : null}
                        {categoryLabel ? (
                          <span className="rounded-full border border-[color:var(--border-soft)] bg-white px-2 py-0.5 uppercase tracking-[0.08em]">
                            {categoryLabel}
                          </span>
                        ) : null}
                      </div>

                      {actionLink ? (
                        <div className="mt-3 flex justify-end">
                          {actionLink.external ? (
                            <a
                              href={actionLink.href}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                            >
                              {actionLabel}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigateToItem(actionLink.href)}
                              className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                            >
                              {actionLabel}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]/75 px-4 py-3">
        <p className="text-xs text-[color:var(--ink-muted)]">
          {total > items.length
            ? `Mostrando ${items.length} de ${total} eventos`
            : `${items.length} eventos recientes`}
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={onViewAll}>
          Ver inbox
        </Button>
      </div>
    </Card>
  );
}
