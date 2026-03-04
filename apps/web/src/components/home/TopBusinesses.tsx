import Link from 'next/link';
import BusinessCard from './BusinessCard';
import type { HomeTopProfessional } from '@/types/home';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

type TopBusinessesProps = {
  professionals: HomeTopProfessional[];
};

export default function TopBusinesses({ professionals }: TopBusinessesProps) {
  const items = professionals.slice(0, 3);

  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Top locales y profesionales
          </h2>
          <Link href="/explorar" className="text-sm font-semibold text-[#1FB6A6]">
            Ver todos
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
            Todavía no hay profesionales destacados.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((business) => {
              const slug = business.slug || slugify(business.name);
              return (
                <Link
                  key={business.id}
                  href={`/profesional/pagina/${slug}`}
                  className="block"
                >
                  <BusinessCard
                    name={business.name}
                    category={business.category}
                    rating={business.rating}
                    imageUrl={business.imageUrl}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
