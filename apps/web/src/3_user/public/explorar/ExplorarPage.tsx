import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ExploreFilters from '@/components/explorar/ExploreFilters';
import ExploreCard from '@/components/explorar/ExploreCard';

const places = [
  {
    name: 'Atelier Glow',
    category: 'Salón de belleza',
    rating: '4.9',
    price: 'Desde $9.500',
    available: true,
  },
  {
    name: 'Barbería Sur',
    category: 'Barbería',
    rating: '4.8',
    price: 'Desde $6.200',
    available: true,
  },
  {
    name: 'Studio Aura',
    category: 'Cosmetología',
    rating: '4.9',
    price: 'Desde $8.900',
    available: false,
  },
  {
    name: 'Nail District',
    category: 'Uñas',
    rating: '4.7',
    price: 'Desde $5.400',
    available: true,
  },
  {
    name: 'Zen Spa',
    category: 'Spa',
    rating: '4.8',
    price: 'Desde $12.000',
    available: false,
  },
  {
    name: 'Lumiere Studio',
    category: 'Maquillaje',
    rating: '4.9',
    price: 'Desde $7.800',
    available: true,
  },
  {
    name: 'Nova Beauty',
    category: 'Peluquería',
    rating: '4.7',
    price: 'Desde $6.900',
    available: false,
  },
  {
    name: 'Aura Skin',
    category: 'Cosmetología',
    rating: '4.8',
    price: 'Desde $10.200',
    available: true,
  },
];

export default function ExplorarPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <Navbar />
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
            <span className="text-sm text-[#6B7280]">48 locales</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {places.map((place) => (
              <ExploreCard key={place.name} {...place} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
