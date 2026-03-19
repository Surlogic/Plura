'use client';

import { cn } from '@/components/ui/cn';
import type {
  ClientNotificationEventType,
  ClientNotificationStatus,
} from '@/types/clientNotification';
import {
  CLIENT_NOTIFICATION_STATUS_OPTIONS,
  CLIENT_NOTIFICATION_TYPE_OPTIONS,
} from '@/utils/clientNotifications';

type NotificationTypeFilter = 'ALL' | ClientNotificationEventType;

type ClientNotificationsToolbarProps = {
  status: ClientNotificationStatus;
  type: NotificationTypeFilter;
  total: number;
  isRefreshing: boolean;
  hasActiveFilters: boolean;
  onStatusChange: (status: ClientNotificationStatus) => void;
  onTypeChange: (type: NotificationTypeFilter) => void;
  onResetFilters: () => void;
};

export default function ClientNotificationsToolbar({
  status,
  type,
  total,
  isRefreshing,
  hasActiveFilters,
  onStatusChange,
  onTypeChange,
  onResetFilters,
}: ClientNotificationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5 border-b border-[#E2E7EC] pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {CLIENT_NOTIFICATION_STATUS_OPTIONS.map((option) => {
          const isActive = option.value === status;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB6A6]',
                isActive
                  ? 'border-[#BFEDE7] bg-[#F0FDFA] text-[#115E59]'
                  : 'border-[#DCE4EC] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0E2A47]',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <span>Evento</span>
            <select
              value={type}
              onChange={(event) => onTypeChange(event.target.value as NotificationTypeFilter)}
              className="min-w-[220px] rounded-full border border-[#DCE4EC] bg-white px-3 py-2 text-sm font-medium text-[#0E2A47] outline-none transition focus:border-[#1FB6A6] focus-visible:ring-2 focus-visible:ring-[#1FB6A6]"
            >
              {CLIENT_NOTIFICATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-full px-2 py-1 text-xs font-semibold text-[#0E7490] transition hover:bg-[#F0FDFA] hover:text-[#115E59] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB6A6]"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        <p className="text-xs text-[#64748B]">
          {isRefreshing ? 'Actualizando resultados...' : `${total} resultado${total === 1 ? '' : 's'}`}
        </p>
      </div>
    </div>
  );
}
