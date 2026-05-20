'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { useProfessionalCoreAccessGate } from '@/hooks/useProfessionalCoreAccessGate';
import type { ProfessionalProfile } from '@/types/professional';

type ProfessionalDashboardShellProps = {
  active: string;
  profile?: ProfessionalProfile | null;
  children: ReactNode;
  className?: string;
  containedViewport?: boolean;
  contentClassName?: string;
  maxWidthClassName?: string;
};

export default function ProfessionalDashboardShell({
  active,
  profile,
  children,
  className,
  containedViewport = false,
  contentClassName,
  maxWidthClassName = 'max-w-none',
}: ProfessionalDashboardShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  useProfessionalCoreAccessGate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSidebarHidden(window.localStorage.getItem('plura:professional-sidebar-hidden') === 'true');
  }, []);

  const updateSidebarHidden = (nextValue: boolean) => {
    setIsSidebarHidden(nextValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('plura:professional-sidebar-hidden', String(nextValue));
    }
  };

  return (
    <div
      className={cn(
        'app-shell min-h-screen bg-[#F8FAFC] text-[#0F172A]',
        containedViewport && 'lg:h-screen lg:overflow-hidden',
      )}
    >
      <div className={cn('flex min-h-screen', containedViewport && 'lg:h-screen lg:min-h-0')}>
        {!isSidebarHidden ? (
          <aside className="hidden w-[244px] shrink-0 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
            <div className="h-full overflow-y-auto overscroll-contain">
              <ProfesionalSidebar
                profile={profile}
                active={active}
                onRequestHide={() => updateSidebarHidden(true)}
              />
            </div>
          </aside>
        ) : null}

        {isSidebarHidden ? (
          <div className="hidden border-r border-[#E2E8F0] bg-white px-3 py-4 lg:block">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => updateSidebarHidden(false)}
            >
              Mostrar menú
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col bg-[#F8FAFC]',
            containedViewport && 'lg:min-h-0 lg:overflow-hidden',
            className,
          )}
        >
          <div className="border-b border-[#E2E8F0] bg-white px-4 py-3 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[#E2E8F0] bg-white lg:hidden">
              <ProfesionalSidebar profile={profile} active={active} />
            </div>
          ) : null}

          <main
            className={cn(
              'flex w-full flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-7 lg:py-5 xl:px-8',
              containedViewport && 'lg:min-h-0 lg:overflow-hidden',
              maxWidthClassName,
              contentClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
