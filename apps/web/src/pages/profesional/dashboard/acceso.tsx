'use client';

import ProfessionalAccountAccessPanel from '@/components/profesional/dashboard/ProfessionalAccountAccessPanel';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import {
  DashboardHeaderBadge,
  DashboardPageHeader,
} from '@/components/profesional/dashboard/DashboardUI';
import { useAuthLogout } from '@/hooks/useAuthLogout';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

export default function ProfesionalAccessPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const { isLoggingOut, logout } = useAuthLogout();

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  return (
    <ProfessionalDashboardShell profile={profile} active="Acceso">
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Cuenta"
          title="Acceso y sesión"
          description="Revisá tu identidad de acceso al dashboard y cerrá sesión desde un lugar dedicado."
          meta={
            <DashboardHeaderBadge tone="accent">
              Dashboard profesional
            </DashboardHeaderBadge>
          }
        />

        {showSkeleton ? (
          <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="h-5 w-48 rounded-full bg-[#E2E7EC]" />
            <div className="mt-4 space-y-3">
              <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
              <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
              <div className="h-24 w-full rounded-[18px] bg-[#F1F5F9]" />
            </div>
          </div>
        ) : (
          <ProfessionalAccountAccessPanel
            profile={profile}
            isLoggingOut={isLoggingOut}
            onLogout={() => {
              void logout('PROFESSIONAL');
            }}
          />
        )}
      </div>
    </ProfessionalDashboardShell>
  );
}
