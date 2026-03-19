'use client';

import { cn } from '@/components/ui/cn';
import type {
  ProfessionalNotificationEventType,
  ProfessionalNotificationStatus,
} from '@/types/notification';
import {
  PROFESSIONAL_NOTIFICATION_STATUS_OPTIONS,
  PROFESSIONAL_NOTIFICATION_TYPE_OPTIONS,
} from '@/utils/notifications';

type NotificationTypeFilter = 'ALL' | ProfessionalNotificationEventType;

type ProfessionalNotificationsToolbarProps = {
  status: ProfessionalNotificationStatus;
  type: NotificationTypeFilter;
  total: number;
  isRefreshing: boolean;
  hasActiveFilters: boolean;
  onStatusChange: (status: ProfessionalNotificationStatus) => void;
  onTypeChange: (type: NotificationTypeFilter) => void;
  onResetFilters: () => void;
};

export default function ProfessionalNotificationsToolbar({
  status,
  type,
  total,
  isRefreshing,
  hasActiveFilters,
  onStatusChange,
  onTypeChange,
  onResetFilters,
}: ProfessionalNotificationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5 border-b border-[color:var(--border-soft)] pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {PROFESSIONAL_NOTIFICATION_STATUS_OPTIONS.map((option) => {
          const isActive = option.value === status;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                isActive
                  ? 'border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] text-[color:var(--primary-strong)]'
                  : 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--ink)]',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[color:var(--ink-muted)]">
            <span>Evento</span>
            <select
              value={type}
              onChange={(event) => onTypeChange(event.target.value as NotificationTypeFilter)}
              className="min-w-[220px] rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              {PROFESSIONAL_NOTIFICATION_TYPE_OPTIONS.map((option) => (
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
              className="rounded-full px-2 py-1 text-xs font-semibold text-[color:var(--primary)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        <p className="text-xs text-[color:var(--ink-muted)]">
          {isRefreshing ? 'Actualizando resultados...' : `${total} resultado${total === 1 ? '' : 's'}`}
        </p>
      </div>
    </div>
  );
}
