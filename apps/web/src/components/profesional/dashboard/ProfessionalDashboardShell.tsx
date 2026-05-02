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
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[244px] shrink-0 border-r border-[color:var(--border-soft)] bg-[#F8FAFC] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active={active} />
          </div>
        </aside>

        <div className={cn('flex min-w-0 flex-1 flex-col', className)}>
          <div className="border-b border-[color:var(--border-soft)] px-4 py-3 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)] lg:hidden">
              <ProfesionalSidebar profile={profile} active={active} />
            </div>
          ) : null}

          <main
            className={cn(
              'mx-auto flex w-full flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-7 lg:py-3',
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
