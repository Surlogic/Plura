import { useMemo } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ExploreFilters from '@/components/explorar/ExploreFilters';
import ExploreCard from '@/components/explorar/ExploreCard';
import ClientDashboardNavbar from '@/components/dashboard/ClientDashboardNavbar';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { usePublicProfessionals } from '@/hooks/usePublicProfessionals';

export default function ExplorarPage() {
  const router = useRouter();
  const { profile, hasLoaded } = useClientProfileContext();
  const { professionals, isLoading, error } = usePublicProfessionals();
  const rawCategory = router.query.categoria;
  const normalizedCategory =
    typeof rawCategory === 'string' ? decodeURIComponent(rawCategory) : '';

  const categoryLookup: Record<string, string> = {
    unas: 'Uñas',
    cabello: 'Peluquería',
    barberia: 'Barbería',
    cejas: 'Cejas',
    spa: 'Spa',
    masajes: 'Masajes',
    faciales: 'Cosmetología',
    maquillaje: 'Maquillaje',
  };

  const activeCategory = useMemo(() => {
    if (!normalizedCategory) return '';
    const key = normalizedCategory.trim().toLowerCase();
    return categoryLookup[key] || normalizedCategory;
  }, [normalizedCategory]);

  const filteredPlaces = useMemo(() => {
    if (!activeCategory) return professionals;
    const needle = activeCategory.toLowerCase();
    return professionals.filter((place) =>
      place.rubro.toLowerCase().includes(needle),
    );
  }, [activeCategory, professionals]);

  const hasClientSession = hasLoaded && Boolean(profile);
  const displayName = profile?.fullName || 'Cliente';

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      {hasClientSession ? (
        <ClientDashboardNavbar name={displayName} />
      ) : (
        <Navbar />
      )}
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-24 pt-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6B7280]">
            Explorar
          </p>
          <h1 className="text-3xl font-semibold text-[#0E2A47] sm:text-4xl">
            Mapa de locales y profesionales
          </h1>
          <p className="max-w-2xl text-sm text-[#6B7280] sm:text-base">
            Visualizá disponibilidad y filtra por rubro para encontrar tu próximo turno.
          </p>
          {activeCategory ? (
            <span className="inline-flex rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-semibold text-[#F59E0B]">
              Filtrado por {activeCategory}
            </span>
          ) : null}
        </header>

        <ExploreFilters />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0E2A47]">Mapa</h2>
            <span className="text-sm text-[#6B7280]">Vista general</span>
          </div>
          <div className="rounded-[24px] border border-[#0E2A47]/10 bg-white p-4 shadow-sm">
            <div className="flex h-[360px] items-center justify-center rounded-[20px] bg-[#E9EEF2] text-sm text-[#6B7280] sm:h-[420px]">
              Mapa con locales
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0E2A47]">Resultados</h2>
            <span className="text-sm text-[#6B7280]">
              {isLoading ? 'Cargando...' : `${filteredPlaces.length} locales`}
            </span>
          </div>
          {error ? (
            <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
              {error}
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
              {isLoading
                ? 'Cargando profesionales...'
                : 'No hay resultados para mostrar.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlaces.map((place) => (
                <ExploreCard
                  key={place.id}
                  name={place.fullName}
                  category={place.rubro}
                  href={`/profesional/pagina/${encodeURIComponent(place.slug)}`}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
