'use client';

import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import type { ClientNotificationItem } from '@/types/clientNotification';
import {
  clientNotificationSeverityDotClassName,
  formatClientNotificationTimestamp,
  getClientNotificationActionLabel,
  getClientNotificationActionLink,
  getClientNotificationCategoryLabel,
  getClientNotificationTypeLabel,
} from '@/utils/clientNotifications';

type ClientNotificationInboxItemProps = {
  item: ClientNotificationItem;
  isMarkingAsRead: boolean;
  onMarkAsRead: (notificationId: string) => void;
};

const actionClassName =
  'inline-flex h-9 items-center justify-center rounded-full border border-[#DCE4EC] bg-white px-3.5 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB6A6]';

export default function ClientNotificationInboxItem({
  item,
  isMarkingAsRead,
  onMarkAsRead,
}: ClientNotificationInboxItemProps) {
  const isUnread = !item.readAt;
  const actionLink = getClientNotificationActionLink(item.actionUrl);
  const actionLabel = getClientNotificationActionLabel(item);
  const categoryLabel = getClientNotificationCategoryLabel(item.category);
  const severityDotClassName =
    clientNotificationSeverityDotClassName[item.severity] ||
    clientNotificationSeverityDotClassName.INFO;

  return (
    <article
      className={cn(
        'rounded-[24px] border px-4 py-4 transition sm:px-5',
        isUnread
          ? 'border-[#BFEDE7] bg-[#F0FDFA]'
          : 'border-[#E2E7EC] bg-white/96',
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', severityDotClassName)} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#DCE4EC] bg-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#0E2A47]">
                    {getClientNotificationTypeLabel(item.type)}
                  </span>
                  {categoryLabel ? (
                    <span className="rounded-full border border-[#DCE4EC] bg-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                      {categoryLabel}
                    </span>
                  ) : null}
                  {isUnread ? (
                    <span className="inline-flex items-center rounded-full bg-[#1FB6A6] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white">
                      Nueva
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 text-sm font-semibold text-[#0E2A47] sm:text-[0.98rem]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">{item.body}</p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="inline-flex rounded-full border border-[#DCE4EC] bg-white px-2.5 py-1 text-xs font-semibold text-[#64748B]">
                  {formatClientNotificationTimestamp(item.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isUnread ? (
            <button
              type="button"
              onClick={() => onMarkAsRead(item.id)}
              disabled={isMarkingAsRead}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#BFEDE7] bg-[#F0FDFA] px-3.5 text-xs font-semibold text-[#115E59] transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMarkingAsRead ? 'Marcando...' : 'Marcar leida'}
            </button>
          ) : null}

          {actionLink ? (
            actionLink.external ? (
              <a
                href={actionLink.href}
                target="_blank"
                rel="noreferrer noopener"
                className={actionClassName}
              >
                {actionLabel}
              </a>
            ) : (
              <Link href={actionLink.href} className={actionClassName}>
                {actionLabel}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
