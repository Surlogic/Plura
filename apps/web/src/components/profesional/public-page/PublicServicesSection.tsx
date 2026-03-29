import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { resolveAssetUrl } from '@/utils/assetUrl';
import type { PublicService } from '@/types/professional';
import {
  formatServiceDuration,
  formatServicePaymentType,
  formatServicePrice,
} from '@/components/profesional/public-page/servicePresentation';

export type PublicServiceItem = {
  categoryLabel: string;
  index: number;
  service: PublicService;
};

type PublicServicesSectionProps = {
  activeCategory: string;
  categories: string[];
  onCategoryChange: (category: string) => void;
  onOpenServiceDetail: (index: number) => void;
  onReserveService: (index: number) => void;
  onSelectService: (index: number) => void;
  selectedServiceIndex: number;
  serviceItems: PublicServiceItem[];
};

const normalizeImageSrc = (value?: string) => {
  if (!value) return '';
  const resolved = resolveAssetUrl(value);
  if (!resolved) return '';
  try {
    const parsed = new URL(resolved);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? resolved : '';
  } catch {
    return '';
  }
};

export default function PublicServicesSection({
  activeCategory,
  categories,
  onCategoryChange,
  onOpenServiceDetail,
  onReserveService,
  onSelectService,
  selectedServiceIndex,
  serviceItems,
}: PublicServicesSectionProps) {
  const visibleItems = activeCategory
    ? serviceItems.filter((item) => item.categoryLabel === activeCategory)
    : serviceItems;

  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)] sm:p-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Servicios
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
            Servicios disponibles
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            Esta pantalla presenta la oferta y deriva al flujo dedicado de reserva sin meter pasos operativos aca.
          </p>
        </div>
        <Badge variant="neutral" className="w-fit normal-case tracking-normal">
          {serviceItems.length} {serviceItems.length === 1 ? 'servicio disponible' : 'servicios disponibles'}
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

      {visibleItems.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-5 py-10 text-sm text-[color:var(--ink-muted)]">
          No hay servicios cargados todavia.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[26px] border border-[color:var(--border-soft)] bg-white">
          {visibleItems.map((item) => {
            const imageSrc = normalizeImageSrc(item.service.imageUrl);
            const isSelected = selectedServiceIndex === item.index;
            return (
              <article
                key={item.service.id ?? `${item.categoryLabel}-${item.index}`}
                className={`grid gap-4 border-b border-[color:var(--border-soft)] px-4 py-4 transition last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_110px_170px] sm:items-center sm:px-5 ${
                  isSelected
                    ? 'bg-[color:var(--primary-soft)]/45'
                    : 'bg-white hover:bg-[color:var(--surface-soft)]/55'
                }`}
              >
                <div className="flex min-w-0 gap-4">
                  <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] sm:block">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={item.service.name || 'Servicio'}
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
                        {item.categoryLabel}
                      </Badge>
                      <Badge variant="info" className="normal-case tracking-normal">
                        {formatServicePaymentType(item.service.paymentType)}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[color:var(--ink)]">
                      {item.service.name}
                    </h3>
                    {item.service.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[color:var(--ink-muted)]">
                        {item.service.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm leading-6 text-[color:var(--ink-faint)]">
                        Sin descripcion cargada.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-1 sm:justify-self-start">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                    Duracion
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">
                    {formatServiceDuration(item.service.duration)}
                  </p>
                </div>

                <div className="grid gap-1 sm:justify-self-start">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                    Precio
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--primary)]">
                    {formatServicePrice(item.service.price)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-self-end">
                  <Button
                    type="button"
                    variant="quiet"
                    className="border border-[color:var(--border-soft)] bg-white"
                    onClick={() => {
                      onSelectService(item.index);
                      onOpenServiceDetail(item.index);
                    }}
                  >
                    Ver detalle
                  </Button>
                  <Button
                    type="button"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => {
                      onSelectService(item.index);
                      onReserveService(item.index);
                    }}
                  >
                    {isSelected ? 'Reservar' : 'Elegir servicio'}
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
