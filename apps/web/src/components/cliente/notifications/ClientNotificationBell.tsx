import { useEffect, useRef, useState } from 'react';
import { useClientNotificationPreview } from '@/hooks/useClientNotificationPreview';
import { useClientNotificationUnreadCount } from '@/hooks/useClientNotificationUnreadCount';
import { cn } from '@/components/ui/cn';
import ClientNotificationDropdown from '@/components/cliente/notifications/ClientNotificationDropdown';

type ClientNotificationBellProps = {
  onNavigate: (href: string) => void;
  className?: string;
};

const formatBadgeCount = (count: number) => {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
};

export default function ClientNotificationBell({
  onNavigate,
  className,
}: ClientNotificationBellProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldLoadCount, setShouldLoadCount] = useState(false);
  const {
    count,
    isLoading: isCountLoading,
    error: countError,
    refresh: refreshCount,
  } = useClientNotificationUnreadCount({
    enabled: shouldLoadCount,
  });
  const {
    items,
    total,
    isLoading,
    error,
  } = useClientNotificationPreview({
    enabled: isOpen,
    size: 5,
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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const togglePanel = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setShouldLoadCount(true);
      await refreshCount();
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    onNavigate('/cliente/notificaciones');
  };

  const badgeCount = formatBadgeCount(count);
  const hasUnread = count > 0;
  const hasCountError = Boolean(countError);
  const showSyncDot = isCountLoading && !hasUnread && !hasCountError;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => void togglePanel()}
        onPointerEnter={() => setShouldLoadCount(true)}
        onFocus={() => setShouldLoadCount(true)}
        className={cn(
          'relative inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold text-[#0E2A47] shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB6A6]',
          isOpen
            ? 'border-[#BFEDE7] bg-[#F0FDFA]'
            : 'border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] hover:bg-[color:var(--surface-hover)]',
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Abrir notificaciones"
        aria-busy={showSyncDot}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 4.75a4.25 4.25 0 0 0-4.25 4.25v2.08c0 .73-.2 1.45-.57 2.08l-1.1 1.82a1 1 0 0 0 .86 1.52h10.12a1 1 0 0 0 .86-1.52l-1.1-1.82a4.17 4.17 0 0 1-.57-2.08V9A4.25 4.25 0 0 0 12 4.75Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 18.25a2.25 2.25 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        <span className="sr-only">
          {hasUnread ? `${count} notificaciones sin leer` : 'Sin notificaciones sin leer'}
        </span>

        {badgeCount ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#0E7490] px-1.5 py-1 text-[0.62rem] font-semibold leading-none text-white shadow-sm">
            {badgeCount}
          </span>
        ) : showSyncDot ? (
          <span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[#1FB6A6]/20">
            <span className="m-auto h-1.5 w-1.5 animate-pulse rounded-full bg-[#1FB6A6]" />
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <ClientNotificationDropdown
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
