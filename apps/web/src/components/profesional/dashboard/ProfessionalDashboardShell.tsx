'use client';

import { useState, type ReactNode } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { ProfessionalProfile } from '@/types/professional';

type ProfessionalDashboardShellProps = {
  active: string;
  profile?: ProfessionalProfile | null;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidthClassName?: string;
};

export default function ProfessionalDashboardShell({
  active,
  profile,
  children,
  className,
  contentClassName,
  maxWidthClassName = 'max-w-[1400px]',
}: ProfessionalDashboardShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-[linear-gradient(180deg,#F4F7FB_0%,var(--background)_18%,var(--background)_100%)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[252px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active={active} />
          </div>
        </aside>

        <div className={cn('flex min-w-0 flex-1 flex-col', className)}>
          <div className="px-4 pt-4 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/92 backdrop-blur-xl lg:hidden">
              <ProfesionalSidebar profile={profile} active={active} />
            </div>
          ) : null}

          <main
            className={cn(
              'mx-auto flex w-full flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-5',
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
