'use client';

import { useState } from 'react';
import ProfessionalNotificationsCenter from '@/components/profesional/notifications/ProfessionalNotificationsCenter';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

export default function ProfesionalNotificationsPage() {
  const { profile } = useProfessionalProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active="Notificaciones" />
          </div>
        </aside>

        <div className="flex-1">
          <div className="px-4 pt-4 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/92 backdrop-blur-xl lg:hidden">
              <ProfesionalSidebar profile={profile} active="Notificaciones" />
            </div>
          ) : null}

          <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <ProfessionalNotificationsCenter />
          </main>
        </div>
      </div>
    </div>
  );
}
