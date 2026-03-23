'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { resolveAssetUrl } from '@/utils/assetUrl';
import type { PublicService } from '@/types/professional';

type ServiceDetailModalProps = {
  isOpen: boolean;
  service: PublicService | null;
  fallbackCategoryName?: string | null;
  onClose: () => void;
  onSelectService: () => void;
};

const formatServiceDuration = (value?: string) => {
  if (!value) return 'Duracion a definir';
  const trimmed = value.trim();
  if (!trimmed) return 'Duracion a definir';
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes)) return trimmed;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) return `${hours} h`;
  return `${hours} h ${remaining} min`;
};

const formatServicePrice = (value?: string) => {
  if (!value) return 'Consultar';
  const trimmed = value.trim();
  if (!trimmed) return 'Consultar';
  if (trimmed.includes('$')) return trimmed;
  return `$${trimmed}`;
};

const formatPaymentType = (value?: string) => {
  const normalized = (value || '').trim().toUpperCase();
  if (normalized === 'DEPOSIT') return 'Seña online';
  if (normalized === 'FULL_PREPAY' || normalized === 'FULL') return 'Pago total online';
  return 'Pago en el lugar';
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

  if (!isOpen || !service) {
    return null;
  }

  const imageSrc = normalizeImageSrc(service.imageUrl);
  const serviceCategory = service.categoryName?.trim() || fallbackCategoryName?.trim() || '';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(18,49,38,0.36)] backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Cerrar detalle del servicio"
      />
      <div className="relative w-full max-w-[600px] rounded-[24px] border border-[color:var(--border-soft)] bg-white p-5 shadow-[var(--shadow-lift)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
              Servicio
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">
              {service.name || 'Servicio'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)]"
          >
            Cerrar
          </button>
        </div>

        <div className="relative mt-4 h-52 w-full overflow-hidden rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={service.name || 'Servicio'}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="h-full w-full object-cover"
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
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
              {formatServiceDuration(service.duration)}
            </p>
          </div>
          <div className="rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Precio
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--primary)]">
              {formatServicePrice(service.price)}
            </p>
          </div>
        </div>

        {serviceCategory ? (
          <div className="mt-3 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Categoría
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
              {serviceCategory}
            </p>
          </div>
        ) : null}

        <div className="mt-3 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Modalidad de pago
          </p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
            {formatPaymentType(service.paymentType)}
          </p>
        </div>

        <div className="mt-4 rounded-[14px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Descripcion
          </p>
          <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
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
