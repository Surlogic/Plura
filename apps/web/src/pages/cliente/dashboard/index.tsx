import { useMemo } from 'react';
import Footer from '@/components/shared/Footer';
import ClientDashboardNavbar from '@/components/dashboard/ClientDashboardNavbar';
import DashboardHero from '@/components/dashboard/DashboardHero';
import AvailableNowSection from '@/components/dashboard/AvailableNowSection';
import CategoryChips from '@/components/dashboard/CategoryChips';
import NextBookingSection from '@/components/dashboard/NextBookingSection';
import FavoritesSection from '@/components/dashboard/FavoritesSection';
import SuggestedSection from '@/components/dashboard/SuggestedSection';
import { useClientProfile } from '@/hooks/useClientProfile';
import { usePublicProfessionals } from '@/hooks/usePublicProfessionals';

const categories = [
  { id: 'cat-1', label: 'Uñas', query: 'Uñas' },
  { id: 'cat-2', label: 'Cabello', query: 'Peluquería' },
  { id: 'cat-3', label: 'Barbería', query: 'Barbería' },
  { id: 'cat-4', label: 'Cejas', query: 'Cosmetología' },
  { id: 'cat-5', label: 'Spa', query: 'Spa' },
  { id: 'cat-6', label: 'Masajes', query: 'Spa' },
  { id: 'cat-7', label: 'Faciales', query: 'Cosmetología' },
  { id: 'cat-8', label: 'Makeup', query: 'Maquillaje' },
];

export default function ClienteDashboardPage() {
  const { profile } = useClientProfile();
  const { professionals, isLoading } = usePublicProfessionals();
  const displayName = profile?.fullName || 'Cliente';

  const availableNow = useMemo(
    () =>
      professionals.slice(0, 4).map((professional) => ({
        id: professional.id,
        name: professional.fullName,
        category: professional.rubro,
        location: professional.location ?? undefined,
      })),
    [professionals],
  );

  const suggestions = useMemo(
    () =>
      professionals.slice(4, 8).map((professional) => ({
        id: professional.id,
        name: professional.fullName,
        category: professional.rubro,
      })),
    [professionals],
  );

  return (
    <div className="relative min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_60%)]" />
      <div className="relative z-10">
        <ClientDashboardNavbar name={displayName} />
        <main className="mx-auto w-full max-w-[1400px] space-y-14 px-4 pb-24 pt-10 sm:px-6 lg:px-10">
          <DashboardHero name={displayName} location="" />

          <AvailableNowSection items={availableNow} isLoading={isLoading} />

          <CategoryChips categories={categories} />

          <NextBookingSection booking={null} />

          <FavoritesSection favorites={[]} />

          <SuggestedSection suggestions={suggestions} isLoading={isLoading} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
