import Image from 'next/image';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
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
            Elegi lo que queres reservar
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            La seleccion mantiene el flujo actual de reserva y actualiza el rail lateral con los
            detalles del servicio.
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
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {visibleItems.map((item) => {
            const imageSrc = normalizeImageSrc(item.service.imageUrl);
            const isSelected = selectedServiceIndex === item.index;
            return (
              <article
                key={item.service.id ?? `${item.categoryLabel}-${item.index}`}
                className={`rounded-[28px] border p-5 transition ${
                  isSelected
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]/55 shadow-[0_24px_60px_-44px_rgba(10,122,67,0.34)]'
                    : 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]/85 hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:bg-white hover:shadow-[var(--shadow-card)]'
                }`}
              >
                <div className="flex gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-[color:var(--border-soft)] bg-white">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={item.service.name || 'Servicio'}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                        Sin foto
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
                    <h3 className="mt-3 text-xl font-semibold text-[color:var(--ink)]">
                      {item.service.name}
                    </h3>
                    {item.service.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--ink-muted)]">
                        {item.service.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-faint)]">
                        Sin descripcion cargada.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                      Duracion
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-[color:var(--ink)]">
                      {formatServiceDuration(item.service.duration)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                      Precio
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-[color:var(--primary)]">
                      {formatServicePrice(item.service.price)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant={isSelected ? 'primary' : 'secondary'}
                    className="flex-1"
                    onClick={() => onSelectService(item.index)}
                  >
                    {isSelected ? 'Seleccionado' : 'Agregar'}
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    className="flex-1 border border-[color:var(--border-soft)] bg-white"
                    onClick={() => onOpenServiceDetail(item.index)}
                  >
                    Ver detalle
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
