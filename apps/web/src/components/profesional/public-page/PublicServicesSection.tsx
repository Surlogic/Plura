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
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Servicios disponibles
          </p>
          <h2 className="mt-2 break-words text-3xl font-semibold text-[color:var(--ink)] [overflow-wrap:anywhere]">
            Elegí tu opción ideal…
          </h2>
        </div>
        <Badge
          variant="neutral"
          className="w-fit max-w-full break-words whitespace-normal normal-case tracking-normal [overflow-wrap:anywhere]"
        >
          {serviceItems.length} {serviceItems.length === 1 ? 'servicio disponible' : 'servicios disponibles'}
        </Badge>
      </div>

      {categories.length > 1 ? (
        <div className="mt-5 flex min-w-0 flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`max-w-full break-words rounded-full border px-4 py-2 text-left text-sm font-semibold transition [overflow-wrap:anywhere] ${
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
        <div className="mt-5 overflow-hidden rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface)]">
          {visibleItems.map((item) => {
            const imageSrc = normalizeImageSrc(item.service.imageUrl);
            const canRenderImage = Boolean(imageSrc) && !failedImages.includes(imageSrc);
            return (
              <article
                key={item.service.id ?? `${item.categoryLabel}-${item.index}`}
                className="grid gap-3 border-b border-[color:var(--border-soft)] bg-[color:var(--surface)] px-4 py-4 transition last:border-b-0 hover:bg-[color:var(--surface-soft)]/55 lg:grid-cols-[minmax(0,1.6fr)_110px_110px_220px] lg:items-center lg:px-5"
              >
                <div className="flex min-w-0 gap-4">
                  <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] sm:block">
                    {canRenderImage ? (
                      <Image
                        src={imageSrc}
                        alt={item.service.name || 'Servicio'}
                        fill
                        sizes="64px"
                        className="object-cover"
                        onError={() =>
                          setFailedImages((prev) => (prev.includes(imageSrc) ? prev : [...prev, imageSrc]))
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                        Foto
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="neutral"
                        className="max-w-full break-words whitespace-normal normal-case tracking-normal [overflow-wrap:anywhere]"
                      >
                        {item.categoryLabel}
                      </Badge>
                      <Badge variant="info" className="normal-case tracking-normal">
                        {formatServicePaymentType(item.service.paymentType)}
                      </Badge>
                    </div>
                    <h3 className="mt-3 break-words text-lg font-semibold text-[color:var(--ink)] [overflow-wrap:anywhere]">
                      {item.service.name}
                    </h3>
                    {item.service.description ? (
                      <p className="mt-1.5 line-clamp-2 break-words text-sm leading-6 text-[color:var(--ink-muted)] [overflow-wrap:anywhere]">
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

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-self-end">
                  <Button
                    type="button"
                    variant="quiet"
                    className="w-full justify-center border border-[color:var(--border-soft)] bg-white sm:w-auto"
                    onClick={() => onOpenServiceDetail(item.index)}
                  >
                    Ver detalle
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full justify-center sm:w-auto"
                    onClick={() => onReserveService(item.index)}
                  >
                    Reservar
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
