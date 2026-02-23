import Link from 'next/link';
import BusinessCard from './BusinessCard';

const businesses = [
  { name: 'Atelier Glow', category: 'Salón de belleza', rating: '4.9' },
  { name: 'Barbería Sur', category: 'Barbería', rating: '4.8' },
  { name: 'Studio Aura', category: 'Cosmetología', rating: '4.9' },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export default function TopBusinesses() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Top locales y profesionales
          </h2>
          <button className="text-sm font-semibold text-[#1FB6A6]">
            Ver todos
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => {
            const slug = slugify(business.name);
            return (
              <Link key={business.name} href={`/profesional/pagina/${slug}`} className="block">
                <BusinessCard {...business} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
