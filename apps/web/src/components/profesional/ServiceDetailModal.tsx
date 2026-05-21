'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { resolveAssetUrl } from '@/utils/assetUrl';
import type { PublicService } from '@/types/professional';
import {
  formatServiceDuration,
  formatServicePaymentType,
  formatServicePrice,
} from '@/components/profesional/public-page/servicePresentation';

type ServiceDetailModalProps = {
  isOpen: boolean;
  service: PublicService | null;
  fallbackCategoryName?: string | null;
  onClose: () => void;
  onSelectService: () => void;
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

export default function ServiceDetailModal({
  isOpen,
  service,
  fallbackCategoryName,
  onClose,
  onSelectService,
}: ServiceDetailModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    setImageFailed(false);
  }, [service?.id, service?.imageUrl]);

  if (!isOpen || !service) {
    return null;
  }

  const imageSrc = normalizeImageSrc(service.imageUrl);
  const serviceCategory = service.categoryName?.trim() || fallbackCategoryName?.trim() || '';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(18,49,38,0.36)] backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Cerrar detalle del servicio"
      />
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-[600px] overflow-y-auto rounded-[22px] border border-[color:var(--border-soft)] bg-white p-4 shadow-[var(--shadow-lift)] sm:rounded-[24px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
              Servicio
            </p>
            <h3 className="mt-1 break-words text-2xl font-semibold text-[color:var(--ink)] [overflow-wrap:anywhere]">
              {service.name || 'Servicio'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)]"
          >
            Cerrar
          </button>
        </div>

        <div className="relative mt-4 h-44 w-full overflow-hidden rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] sm:h-52">
          {imageSrc && !imageFailed ? (
            <Image
              src={imageSrc}
              alt={service.name || 'Servicio'}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
              Sin imagen
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Duracion
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-[color:var(--ink)] [overflow-wrap:anywhere]">
              {formatServiceDuration(service.duration)}
            </p>
          </div>
          <div className="rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Precio
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-[color:var(--primary)] [overflow-wrap:anywhere]">
              {formatServicePrice(service.price)}
            </p>
          </div>
        </div>

        {serviceCategory ? (
          <div className="mt-3 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Categoría
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-[color:var(--ink)] [overflow-wrap:anywhere]">
              {serviceCategory}
            </p>
          </div>
        ) : null}

        <div className="mt-3 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Modalidad de pago
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-[color:var(--ink)] [overflow-wrap:anywhere]">
            {formatServicePaymentType(service.paymentType)}
          </p>
        </div>

        <div className="mt-4 rounded-[14px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Descripcion
          </p>
          <p className="mt-1 break-words text-sm text-[color:var(--ink-muted)] [overflow-wrap:anywhere]">
            {service.description?.trim() || 'Sin descripcion cargada.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onSelectService}
          className="mt-5 w-full rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[color:var(--primary-strong)] hover:shadow-[var(--shadow-card)]"
        >
          Seleccionar servicio
        </button>
      </div>
    </div>
  );
}
