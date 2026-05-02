'use client';

import ProfessionalNotificationsCenter from '@/components/profesional/notifications/ProfessionalNotificationsCenter';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

export default function ProfesionalNotificationsPage() {
  const { profile } = useProfessionalProfile();

  return (
    <ProfessionalDashboardShell
      profile={profile}
      active="Notificaciones"
      maxWidthClassName="max-w-6xl"
      contentClassName="gap-6"
    >
      <ProfessionalNotificationsCenter />
    </ProfessionalDashboardShell>
  );
}
