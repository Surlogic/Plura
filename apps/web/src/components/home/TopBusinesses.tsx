import { memo } from 'react';
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
  isLoading?: boolean;
};

export default memo(function TopBusinesses({ professionals, isLoading = false }: TopBusinessesProps) {
  const items = professionals.slice(0, 3);

  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeading
          title="Profesionales destacados"
          description="Una selección corta para orientarte rápido y seguir explorando en el perfil o en búsqueda."
          action={<Button href="/explorar" variant="quiet">Ver explorar</Button>}
        />
        {isLoading ? (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            Cargando profesionales destacados...
          </Card>
        ) : items.length === 0 ? (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            Todavía no hay profesionales destacados.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((business) => {
              const slug = business.slug || slugify(business.name);
              return (
                <BusinessCard
                  key={business.id}
                  name={business.name}
                  category={business.category}
                  rating={business.rating}
                  reviewsCount={business.reviewsCount}
                  bannerUrl={business.bannerUrl}
                  bannerMedia={business.bannerMedia}
                  logoUrl={business.logoUrl}
                  logoMedia={business.logoMedia}
                  fallbackPhotoUrl={business.fallbackPhotoUrl}
                  imageUrl={business.imageUrl}
                  href={`/profesional/pagina/${slug}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
});
