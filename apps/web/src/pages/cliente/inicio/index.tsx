import { useEffect, useMemo, useState } from 'react';
import ClientShell from '@/components/cliente/ClientShell';
import DashboardHero from '@/components/dashboard/DashboardHero';
import AvailableNowSection from '@/components/dashboard/AvailableNowSection';
import CategoryChips from '@/components/dashboard/CategoryChips';
import NextBookingSection from '@/components/dashboard/NextBookingSection';
import FavoritesSection from '@/components/dashboard/FavoritesSection';
import SuggestedSection from '@/components/dashboard/SuggestedSection';
import { useClientProfile } from '@/hooks/useClientProfile';
import { usePublicProfessionals } from '@/hooks/usePublicProfessionals';
import {
  getClientNextBooking,
  type ClientDashboardNextBooking,
} from '@/services/clientBookings';

const categories = [
  {
    id: 'cat-1',
    label: 'Unas',
    query: 'Unas',
    image: 'https://source.unsplash.com/900x1200/?manicure,nails',
    accent: 'rgba(15,23,42,0.72)',
  },
  {
    id: 'cat-2',
    label: 'Cabello',
    query: 'Peluqueria',
    image: 'https://source.unsplash.com/900x1200/?hair,salon',
    accent: 'rgba(2,132,199,0.68)',
  },
  {
    id: 'cat-3',
    label: 'Barberia',
    query: 'Barberia',
    image: 'https://source.unsplash.com/900x1200/?barber,shop',
    accent: 'rgba(100,116,139,0.72)',
  },
  {
    id: 'cat-4',
    label: 'Cejas',
    query: 'Cosmetologia',
    image: 'https://source.unsplash.com/900x1200/?eyebrow,beauty',
    accent: 'rgba(17,24,39,0.72)',
  },
  {
    id: 'cat-5',
    label: 'Spa',
    query: 'Spa',
    image: 'https://source.unsplash.com/900x1200/?spa,wellness',
    accent: 'rgba(20,184,166,0.68)',
  },
  {
    id: 'cat-6',
    label: 'Masajes',
    query: 'Spa',
    image: 'https://source.unsplash.com/900x1200/?massage,therapy',
    accent: 'rgba(8,145,178,0.68)',
  },
  {
    id: 'cat-7',
    label: 'Faciales',
    query: 'Cosmetologia',
    image: 'https://source.unsplash.com/900x1200/?facial,skincare',
    accent: 'rgba(251,146,60,0.64)',
  },
  {
    id: 'cat-8',
    label: 'Makeup',
    query: 'Maquillaje',
    image: 'https://source.unsplash.com/900x1200/?makeup,beauty',
    accent: 'rgba(168,85,247,0.6)',
  },
];

export default function ClienteInicioPage() {
  const { profile } = useClientProfile();
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

  const availableNow = useMemo(
    () =>
      professionals.slice(0, 4).map((professional) => ({
        id: professional.id,
        slug: professional.slug,
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
        slug: professional.slug,
        name: professional.fullName,
        category: professional.rubro,
      })),
    [professionals],
  );

  return (
    <ClientShell name={displayName} active="inicio">
      <main className="space-y-12">
        <DashboardHero name={displayName} location="" />
        <NextBookingSection booking={nextBooking} />
        <CategoryChips categories={categories} />
        <SuggestedSection suggestions={suggestions} isLoading={isLoading} />
        <AvailableNowSection items={availableNow} isLoading={isLoading} />
        <FavoritesSection favorites={[]} />
      </main>
    </ClientShell>
  );
}
