'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { resolveAssetUrl } from '@/utils/assetUrl';
import type { PublicService } from '@/types/professional';

type ServiceDetailModalProps = {
  isOpen: boolean;
  service: PublicService | null;
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
  onClose,
  onSelectService,
}: ServiceDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !service) {
    return null;
  }

  const imageSrc = normalizeImageSrc(service.imageUrl);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#0B1D2A]/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Cerrar detalle del servicio"
      />
      <div className="relative w-full max-w-[600px] rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.22)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.35em] text-[#94A3B8]">
              Servicio
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[#0E2A47]">
              {service.name || 'Servicio'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC]"
          >
            Cerrar
          </button>
        </div>

        <div className="relative mt-4 h-52 w-full overflow-hidden rounded-[16px] border border-[#D9E2EC] bg-[#F8FAFC]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={service.name || 'Servicio'}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
              Sin imagen
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#94A3B8]">
              Duracion
            </p>
            <p className="mt-1 text-sm font-semibold text-[#0E2A47]">
              {formatServiceDuration(service.duration)}
            </p>
          </div>
          <div className="rounded-[14px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#94A3B8]">
              Precio
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1FB6A6]">
              {formatServicePrice(service.price)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-[14px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#94A3B8]">
            Modalidad de pago
          </p>
          <p className="mt-1 text-sm font-semibold text-[#0E2A47]">
            {formatPaymentType(service.paymentType)}
          </p>
        </div>

        <div className="mt-4 rounded-[14px] border border-[#E2E7EC] bg-white px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#94A3B8]">
            Descripcion
          </p>
          <p className="mt-1 text-sm text-[#64748B]">
            {service.description?.trim() || 'Sin descripcion cargada.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onSelectService}
          className="mt-5 w-full rounded-full bg-[#0B1D2A] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Seleccionar servicio
        </button>
      </div>
    </div>
  );
}
