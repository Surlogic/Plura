'use client';

import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { ProfessionalNotificationItem } from '@/types/notification';
import {
  formatProfessionalNotificationAbsoluteTimestamp,
  formatProfessionalNotificationTimestamp,
  getProfessionalNotificationActionLabel,
  getProfessionalNotificationActionLink,
  getProfessionalNotificationCategoryLabel,
  getProfessionalNotificationTypeLabel,
  professionalNotificationSeverityDotClassName,
} from '@/utils/notifications';

type ProfessionalNotificationInboxItemProps = {
  item: ProfessionalNotificationItem;
  isMarkingAsRead: boolean;
  onMarkAsRead: (notificationId: string) => void;
};

const externalActionClassName =
  'inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3.5 text-xs font-semibold text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]';

export default function ProfessionalNotificationInboxItem({
  item,
  isMarkingAsRead,
  onMarkAsRead,
}: ProfessionalNotificationInboxItemProps) {
  const isUnread = !item.readAt;
  const actionLink = getProfessionalNotificationActionLink(item.actionUrl);
  const actionLabel = getProfessionalNotificationActionLabel(item);
  const severityDotClassName =
    professionalNotificationSeverityDotClassName[item.severity] ||
    professionalNotificationSeverityDotClassName.INFO;
  const categoryLabel = getProfessionalNotificationCategoryLabel(item.category);
  const timestampLabel = formatProfessionalNotificationTimestamp(item.createdAt);
  const absoluteTimestampLabel = formatProfessionalNotificationAbsoluteTimestamp(item.createdAt);

  return (
    <article
      className={cn(
        'rounded-[24px] border px-4 py-4 transition sm:px-5',
        isUnread
          ? 'border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)]/28'
          : 'border-[color:var(--border-soft)] bg-white/96',
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', severityDotClassName)} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isUnread ? 'info' : 'neutral'} className="px-2.5 py-1 text-[0.56rem] tracking-[0.14em]">
                    {getProfessionalNotificationTypeLabel(item.type)}
                  </Badge>
                  {categoryLabel ? (
                    <Badge className="px-2.5 py-1 text-[0.56rem] tracking-[0.14em]">
                      {categoryLabel}
                    </Badge>
                  ) : null}
                  {item.bookingId ? (
                    <Badge variant="accent" className="px-2.5 py-1 text-[0.56rem] tracking-[0.14em]">
                      Reserva #{item.bookingId}
                    </Badge>
                  ) : null}
                  {isUnread ? (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--primary)] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white">
                      Nueva
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 text-sm font-semibold text-[color:var(--ink)] sm:text-[0.98rem]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[color:var(--ink-muted)]">
                  {item.body}
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p
                  className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--ink-muted)]"
                  title={absoluteTimestampLabel || item.createdAt}
                >
                  {timestampLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isUnread ? (
            <Button
              type="button"
              size="sm"
              variant="quiet"
              onClick={() => onMarkAsRead(item.id)}
              disabled={isMarkingAsRead}
            >
              {isMarkingAsRead ? 'Marcando...' : 'Marcar leida'}
            </Button>
          ) : null}

          {actionLink ? (
            actionLink.external ? (
              <a
                href={actionLink.href}
                target="_blank"
                rel="noreferrer noopener"
                className={externalActionClassName}
              >
                {actionLabel}
              </a>
            ) : (
              <Link href={actionLink.href} className={externalActionClassName}>
                {actionLabel}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
