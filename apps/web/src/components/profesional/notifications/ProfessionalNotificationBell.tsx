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
    <div ref={rootRef} className={cn('relative mt-2.5', className)}>
      <button
        type="button"
        onClick={() => void openPanel()}
        onPointerEnter={() => setShouldLoadCount(true)}
        onFocus={() => setShouldLoadCount(true)}
        className={cn(
          'group flex min-h-[42px] w-full items-center justify-between rounded-[8px] px-2 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          isOpen
            ? 'bg-[#ECFDF5] text-[#0F3D35]'
            : 'bg-transparent text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Abrir notificaciones"
        aria-busy={showSyncDot}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] transition',
              isOpen
                ? 'bg-white text-[#0F766E] shadow-[0_1px_2px_rgba(15,23,42,0.05)]'
                : 'text-[#64748B] group-hover:bg-white group-hover:text-[#0F172A]',
            )}
          >
            <DashboardIcon name="notificaciones" className="h-[15px] w-[15px]" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-[0.82rem] font-medium leading-4 text-current">Notificaciones</p>
            <p className="truncate text-[0.68rem] leading-4 text-[color:var(--ink-muted)]">
              {hasUnread
                ? `${count} sin leer`
                : hasCountError
                  ? 'Sin sincronizar ahora'
                  : 'Todo al dia'}
            </p>
          </div>
        </div>

        <span className="ml-2 inline-flex shrink-0 items-center gap-1.5">
          {badgeCount ? (
            <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#0F766E] px-1.5 py-0.5 text-[0.62rem] font-semibold leading-none text-white">
              {badgeCount}
            </span>
          ) : showSyncDot ? (
            <span className="inline-flex h-2 w-2 rounded-full bg-[color:var(--primary)]">
              <span className="h-2 w-2 animate-ping rounded-full bg-[color:var(--primary)] opacity-30" />
            </span>
          ) : null}
          <span
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] transition group-hover:bg-white',
              isOpen && 'rotate-180 text-[#0F766E]',
            )}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="m5 7 5 6 5-6" />
            </svg>
          </span>
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
