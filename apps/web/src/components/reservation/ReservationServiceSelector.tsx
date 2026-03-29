import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { resolveAssetUrl } from '@/utils/assetUrl';
import { getPaymentTypeLabel } from '@/utils/bookings';
import { formatDuration, formatPrice } from '@/utils/reservarHelpers';
import type { PublicProfessionalService } from '@/services/publicBookings';

type ReservationServiceSelectorProps = {
  activeCategory: string;
  categories: string[];
  onCategoryChange: (category: string) => void;
  onSelectService: (serviceId: string) => void;
  selectedServiceId: string | null;
  services: PublicProfessionalService[];
};

const resolveImage = (value?: string | null) => {
  if (!value) return '';
  return resolveAssetUrl(value) || '';
};

export default function ReservationServiceSelector({
  activeCategory,
  categories,
  onCategoryChange,
  onSelectService,
  selectedServiceId,
  services,
}: ReservationServiceSelectorProps) {
  const visibleServices = activeCategory
    ? services.filter((service) => (service.categoryName?.trim() || 'Servicios') === activeCategory)
    : services;

  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Paso 1
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
            Elegí el servicio
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            Cambiá de servicio dentro de este flujo sin volver al perfil público. El horario se
            actualiza según la selección activa.
          </p>
        </div>

        <Badge variant="neutral" className="w-fit normal-case tracking-normal">
          {services.length} {services.length === 1 ? 'servicio disponible' : 'servicios disponibles'}
        </Badge>
      </div>

      {categories.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-[var(--shadow-card)]'
                    : 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)] hover:-translate-y-0.5 hover:bg-white'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      ) : null}

      {visibleServices.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-5 py-8 text-sm text-[color:var(--ink-muted)]">
          No hay servicios visibles en esta categoría.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[26px] border border-[color:var(--border-soft)] bg-white">
          {visibleServices.map((service) => {
            const isSelected = service.id === selectedServiceId;
            const imageUrl = resolveImage(service.imageUrl);
            const categoryLabel = service.categoryName?.trim() || 'Servicios';

            return (
              <article
                key={service.id}
                className={`grid gap-4 border-b border-[color:var(--border-soft)] px-4 py-4 transition last:border-b-0 sm:grid-cols-[minmax(0,1fr)_112px_118px_150px] sm:items-center sm:px-5 ${
                  isSelected
                    ? 'bg-[color:var(--primary-soft)]/45'
                    : 'bg-white hover:bg-[color:var(--surface-soft)]/55'
                }`}
              >
                <div className="flex min-w-0 gap-4">
                  <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] sm:block">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={service.name || 'Servicio'}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                        Foto
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" className="normal-case tracking-normal">
                        {categoryLabel}
                      </Badge>
                      <Badge variant="info" className="normal-case tracking-normal">
                        {getPaymentTypeLabel(service.paymentType)}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[color:var(--ink)]">
                      {service.name}
                    </h3>
                    {service.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[color:var(--ink-muted)]">
                        {service.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm leading-6 text-[color:var(--ink-faint)]">
                        Sin descripción adicional cargada.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-1 sm:justify-self-start">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                    Duración
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">
                    {formatDuration(service.duration)}
                  </p>
                </div>

                <div className="grid gap-1 sm:justify-self-start">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                    Precio
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--primary)]">
                    {formatPrice(service.price)}
                  </p>
                </div>

                <div className="sm:justify-self-end">
                  <Button
                    type="button"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => onSelectService(service.id)}
                    className="w-full sm:w-auto"
                  >
                    {isSelected ? 'Seleccionado' : 'Elegir'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
