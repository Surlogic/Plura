import { useEffect, useMemo, useState } from 'react';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import ClientShell from '@/components/cliente/ClientShell';
import DashboardHero from '@/components/dashboard/DashboardHero';
import CategoryChips from '@/components/dashboard/CategoryChips';
import NextBookingSection from '@/components/dashboard/NextBookingSection';
import SuggestedSection from '@/components/dashboard/SuggestedSection';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useCategories } from '@/hooks/useCategories';
import { usePublicProfessionals } from '@/hooks/usePublicProfessionals';
import {
  getClientNextBooking,
  type ClientDashboardNextBooking,
} from '@/services/clientBookings';

export default function ClienteInicioPage() {
  const { profile } = useClientProfile();
  const { refreshProfile } = useClientProfileContext();
  const { categories } = useCategories();
  const { professionals, isLoading } = usePublicProfessionals();
  const [nextBooking, setNextBooking] = useState<ClientDashboardNextBooking | null>(null);
  const displayName = profile?.fullName || 'Cliente';

  useEffect(() => {
    let isCancelled = false;

    getClientNextBooking()
      .then((response) => {
        if (isCancelled) return;
        setNextBooking(response);
      })
      .catch(() => {
        if (isCancelled) return;
        setNextBooking(null);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const suggestions = useMemo(
    () =>
      professionals.slice(0, 8).map((professional) => ({
        id: professional.id,
        slug: professional.slug,
        name: professional.fullName,
        category: professional.categories?.[0]?.name || professional.rubro,
      })),
    [professionals],
  );

  return (
    <ClientShell name={displayName} active="inicio">
      <main className="space-y-14">
        <DashboardHero name={displayName} location="" />
        {profile && !profile.emailVerified ? (
          <EmailVerificationPanel
            email={profile.email}
            emailVerified={profile.emailVerified}
            onStatusChanged={refreshProfile}
            tone="client"
            variant="banner"
            title="Verificá tu email para asegurar tu cuenta"
            description="Confirmá tu casilla principal desde acá mismo. No bloquea el uso de Plura, pero deja mejor preparada tu cuenta para recuperaciones y avisos importantes."
          />
        ) : null}
        <CategoryChips categories={categories} />
        <NextBookingSection booking={nextBooking} />
        <SuggestedSection suggestions={suggestions} isLoading={isLoading} />
      </main>
    </ClientShell>
  );
}
