import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatDuration, formatPrice } from '@/utils/reservarHelpers';
import type {
  PublicProfessionalPage,
  PublicProfessionalService,
} from '@/services/publicBookings';
import { getReservationPaymentDetails } from '@/components/reservation/paymentDetails';
import {
  buildPublicBusinessImageStyle,
  buildPublicBusinessLogoStyle,
  resolvePublicBusinessMedia,
} from '@/utils/publicBusinessMedia';

type ReservationSummaryCardProps = {
  canSubmit: boolean;
  isLoadingContext: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onEditDay: () => void;
  onEditService: () => void;
  onEditTime: () => void;
  policyDescription: string;
  professional: PublicProfessionalPage | null;
  requiresAuthentication: boolean;
  saveError: string | null;
  saveMessage: string | null;
  selectedDateLabel: string;
  selectedService: PublicProfessionalService | null;
  selectedTime: string | null;
};

export default function ReservationSummaryCard({
  canSubmit,
  isLoadingContext,
  isSaving,
  onCancel,
  onConfirm,
  onEditDay,
  onEditService,
  onEditTime,
  policyDescription,
  professional,
  requiresAuthentication,
  saveError,
  saveMessage,
  selectedDateLabel,
  selectedService,
  selectedTime,
}: ReservationSummaryCardProps) {
  const displayName = professional?.fullName || 'Profesional';
  const media = useMemo(
    () =>
      resolvePublicBusinessMedia({
        bannerMedia: professional?.bannerMedia,
        bannerUrl: professional?.bannerUrl,
        logoMedia: professional?.logoMedia,
        logoUrl: professional?.logoUrl,
        name: displayName,
        photoUrls: professional?.photos || [],
      }),
    [
      displayName,
      professional?.bannerMedia,
      professional?.bannerUrl,
      professional?.logoMedia,
      professional?.logoUrl,
      professional?.photos,
    ],
  );
  const mediaKey = media.mainImageCandidates.map((candidate) => candidate.key).join('|');
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setMainImageIndex(0);
    setLogoFailed(false);
  }, [mediaKey, media.logo?.src]);

  const activeImage = media.mainImageCandidates[mainImageIndex] ?? null;
  const showLogoImage = Boolean(media.logo?.src) && !logoFailed;
  const paymentDetails = getReservationPaymentDetails(selectedService);

  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Paso 5
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
            Confirmar y reservar
          </h2>
        </div>
        <Badge variant="accent" className="normal-case tracking-normal">
          Paso final
        </Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-[color:var(--ink-muted)]">
        Este es el cierre del flujo. La reserva se crea con el backend actual y conserva su estado
        operativo real.
      </p>

      {requiresAuthentication ? (
        <div className="mt-4 rounded-[20px] border border-[color:var(--accent-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
          <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
            Al tocar el botón principal se abre una pantalla de acceso para crear tu cuenta o
            iniciar sesión sin salir de esta reserva.
          </p>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]">
        <div className="relative h-44 w-full border-b border-[color:var(--border-soft)] bg-white">
          {activeImage ? (
            <Image
              src={activeImage.src}
              alt={`Marca de ${displayName}`}
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
              className="object-cover"
              style={buildPublicBusinessImageStyle(activeImage)}
              onError={() =>
                setMainImageIndex((current) => Math.min(current + 1, media.mainImageCandidates.length))
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#102033_0%,#17324e_58%,rgba(16,185,129,0.24)_100%)] text-sm font-semibold uppercase tracking-[0.2em] text-white">
              {media.initials}
            </div>
          )}
          <div className="absolute bottom-4 left-4">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] border border-white/90 bg-white text-base font-semibold text-[color:var(--ink)] shadow-[0_20px_36px_-28px_rgba(15,23,42,0.5)]">
              {showLogoImage ? (
                <Image
                  src={media.logo!.src}
                  alt={`Logo de ${displayName}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                  style={buildPublicBusinessLogoStyle(media.logo)}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                media.initials
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Profesional
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
              {professional?.fullName || 'Cargando profesional...'}
            </p>
            {professional?.location ? (
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{professional.location}</p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-[20px] border border-[color:var(--border-soft)] bg-white p-4">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Servicio
              </p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                {selectedService?.name || 'Sin seleccionar'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Duración
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                  {formatDuration(selectedService?.duration)}
                </p>
              </div>
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Precio
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--primary)]">
                  {formatPrice(selectedService?.price)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Día y hora
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-[color:var(--ink)]">
                {selectedDateLabel}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                {selectedTime || 'Elegí un horario para completar la reserva'}
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-soft)] bg-white p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Pago
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
              {paymentDetails.paymentTypeLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">
              {paymentDetails.paymentTypeDescription}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  {paymentDetails.payNowLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                  {paymentDetails.payNowAmount}
                </p>
              </div>
              {paymentDetails.remainingLabel && paymentDetails.remainingAmount ? (
                <div className="rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                    {paymentDetails.remainingLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                    {paymentDetails.remainingAmount}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-soft)] bg-white p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Estado operativo
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">
              {paymentDetails.pendingNotice}
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-soft)] bg-white p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Política de cancelación
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">
              {policyDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={onEditService} disabled={isSaving}>
          Editar servicio
        </Button>
        <Button type="button" variant="secondary" onClick={onEditDay} disabled={isSaving}>
          Editar día
        </Button>
        <Button type="button" variant="secondary" onClick={onEditTime} disabled={isSaving}>
          Editar horario
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onConfirm}
          disabled={!canSubmit || isSaving || isLoadingContext}
        >
          {isSaving ? 'Preparando reserva...' : paymentDetails.ctaLabel}
        </Button>

        <Button
          type="button"
          variant="quiet"
          size="lg"
          className="w-full justify-start text-[#B45309]"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar reserva
        </Button>

        {saveMessage ? (
          <p className="rounded-[18px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)]/55 px-4 py-3 text-sm font-medium text-[color:var(--success)]">
            {saveMessage}
          </p>
        ) : null}

        {saveError ? (
          <p className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
            {saveError}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
