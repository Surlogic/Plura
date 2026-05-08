import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfessionalNotificationPreview } from '@/hooks/useProfessionalNotificationPreview';
import { useProfessionalNotificationUnreadCount } from '@/hooks/useProfessionalNotificationUnreadCount';
import { DashboardIcon } from '@/components/profesional/dashboard/DashboardUI';
import { cn } from '@/components/ui/cn';
import ProfessionalNotificationDropdown from '@/components/profesional/notifications/ProfessionalNotificationDropdown';

type ProfessionalNotificationBellProps = {
  onNavigate: (href: string) => void;
  className?: string;
};

const formatBadgeCount = (count: number) => {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
};

export default function ProfessionalNotificationBell({
  onNavigate,
  className,
}: ProfessionalNotificationBellProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldLoadCount, setShouldLoadCount] = useState(false);
  const {
    count,
    isLoading: isCountLoading,
    error: countError,
    refresh: refreshCount,
  } = useProfessionalNotificationUnreadCount({
    enabled: shouldLoadCount,
  });
  const {
    items,
    total,
    isLoading,
    error,
  } = useProfessionalNotificationPreview({
    enabled: isOpen,
    size: 6,
  });

  useEffect(() => {
    if (shouldLoadCount) return undefined;
    if (typeof window === 'undefined') return undefined;

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const reveal = () => setShouldLoadCount(true);

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => reveal(), { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(reveal, 900);
    }

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [shouldLoadCount]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const openPanel = useCallback(async () => {
    setIsOpen((previous) => !previous);
    if (!isOpen) {
      setShouldLoadCount(true);
      await refreshCount();
    }
  }, [isOpen, refreshCount]);

  const handleViewAll = () => {
    setIsOpen(false);
    onNavigate('/profesional/notificaciones');
  };

  const badgeCount = formatBadgeCount(count);
  const hasUnread = count > 0;
  const hasCountError = Boolean(countError);
  const showSyncDot = isCountLoading && !hasUnread && !hasCountError;

  return (
    <div ref={rootRef} className={cn('relative mt-3', className)}>
      <button
        type="button"
        onClick={() => void openPanel()}
        onPointerEnter={() => setShouldLoadCount(true)}
        onFocus={() => setShouldLoadCount(true)}
        className={cn(
          'group flex min-h-[44px] w-full items-center justify-between rounded-[9px] border px-2.5 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          isOpen
            ? 'border-[#D4F3EC] bg-[#ECFDF5] text-[#0F766E]'
            : 'border-transparent bg-transparent text-[color:var(--ink)] hover:border-[#E2E8F0] hover:bg-[#F8FAFC]',
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Abrir notificaciones"
        aria-busy={showSyncDot}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition',
              isOpen ? 'bg-white text-[#0F766E]' : 'text-[color:var(--ink)] group-hover:bg-white',
            )}
          >
            <DashboardIcon name="notificaciones" className="h-[15px] w-[15px]" />
            {badgeCount ? (
              <span className="absolute -right-2 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--primary)] px-1 py-0.5 text-[0.55rem] font-semibold leading-none text-white">
                {badgeCount}
              </span>
            ) : showSyncDot ? (
              <span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[color:var(--primary)]/18">
                <span className="m-auto h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--primary)]" />
              </span>
            ) : null}
          </span>

          <div className="min-w-0">
            <p className="truncate text-[0.84rem] font-medium leading-5 text-current">Notificaciones</p>
            <p className="truncate text-[0.7rem] leading-4 text-[color:var(--ink-muted)]">
              {hasUnread
                ? `${count} sin leer`
                : hasCountError
                  ? 'Sin sincronizar ahora'
                  : 'Todo al dia'}
            </p>
          </div>
        </div>

        <span
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[color:var(--ink-muted)] transition group-hover:bg-white',
            isOpen && 'rotate-180 text-[color:var(--primary)]',
          )}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m5 7 5 6 5-6" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <ProfessionalNotificationDropdown
          items={items}
          total={total}
          unreadCount={count}
          isLoading={isLoading}
          error={error}
          onViewAll={handleViewAll}
          onNavigateToItem={(href) => {
            setIsOpen(false);
            onNavigate(href);
          }}
        />
      ) : null}
    </div>
  );
}
