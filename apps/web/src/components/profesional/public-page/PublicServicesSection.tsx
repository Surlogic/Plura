import Image from 'next/image';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
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
  serviceItems,
}: PublicServicesSectionProps) {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const visibleItems = activeCategory
    ? serviceItems.filter((item) => item.categoryLabel === activeCategory)
    : serviceItems;

  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Servicios disponibles
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
            Elegí tu opción ideal…
          </h2>
        </div>
        <Badge variant="neutral" className="w-fit normal-case tracking-normal">
          {serviceItems.length} {serviceItems.length === 1 ? 'servicio disponible' : 'servicios disponibles'}
        </Badge>
      </div>

      {categories.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2">
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
        <div className="mt-5 rounded-[20px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-5 py-8 text-sm text-[color:var(--ink-muted)]">
          No hay servicios cargados todavia.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleItems.map((item) => {
            const imageSrc = normalizeImageSrc(item.service.imageUrl);
            const canRenderImage = Boolean(imageSrc) && !failedImages.includes(imageSrc);
            return (
              <article
                key={item.service.id ?? `${item.categoryLabel}-${item.index}`}
                className="flex min-h-full flex-col overflow-hidden rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] shadow-[0_18px_48px_-42px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                <div className="relative aspect-[4/3] bg-[color:var(--surface-soft)]">
                  {canRenderImage ? (
                    <Image
                      src={imageSrc}
                      alt={item.service.name || 'Servicio'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      className="object-cover"
                      onError={() =>
                        setFailedImages((prev) => (prev.includes(imageSrc) ? prev : [...prev, imageSrc]))
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                      Foto del servicio
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral" className="normal-case tracking-normal">
                      {item.categoryLabel}
                    </Badge>
                    <Badge variant="info" className="normal-case tracking-normal">
                      {formatServicePaymentType(item.service.paymentType)}
                    </Badge>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold leading-6 text-[color:var(--ink)]">
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

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-4">
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                        Duración
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                        {formatServiceDuration(item.service.duration)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                        Precio
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--primary)]">
                        {formatServicePrice(item.service.price)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-5">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full justify-center"
                      onClick={() => onReserveService(item.index)}
                    >
                      Reservar
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      className="w-full justify-center border border-[color:var(--border-soft)] bg-white"
                      onClick={() => onOpenServiceDetail(item.index)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
