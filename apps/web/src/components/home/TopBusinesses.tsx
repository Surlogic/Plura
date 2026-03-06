import Link from 'next/link';
import BusinessCard from './BusinessCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
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
        <SectionHeading
          kicker="Destacados"
          title="Locales y profesionales con mejor presentación"
          description="Una selección visible y consistente para que el primer nivel de exploración no se sienta como una lista genérica."
          action={<Button href="/explorar">Ver todos</Button>}
        />
        {items.length === 0 ? (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            Todavía no hay profesionales destacados.
          </Card>
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
