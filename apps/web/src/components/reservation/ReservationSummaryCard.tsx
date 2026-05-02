import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getReservationPaymentDetails } from '@/components/reservation/paymentDetails';
import type {
  PublicProfessionalPage,
  PublicProfessionalService,
} from '@/services/publicBookings';
import {
  buildPublicBusinessLogoStyle,
  resolvePublicBusinessMedia,
} from '@/utils/publicBusinessMedia';
import { formatDuration, formatPrice } from '@/utils/reservarHelpers';

type ReservationSummaryCardProps = {
  canSubmit: boolean;
  isLoadingContext: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onEditSchedule: () => void;
  onEditService: () => void;
  policyDescription: string;
  professional: PublicProfessionalPage | null;
  requiresAuthentication: boolean;
  saveError: string | null;
  saveMessage: string | null;
  selectedDateLabel: string;
  selectedService: PublicProfessionalService | null;
  selectedTime: string | null;
};

const SummaryItem = ({
  label,
  value,
  accent = false,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) => (
  <div className="space-y-1">
    <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
      {label}
    </dt>
    <dd className={`text-sm font-medium ${accent ? 'text-[color:var(--primary)]' : 'text-[color:var(--ink)]'}`}>
      {value}
    </dd>
  </div>
);

export default function ReservationSummaryCard({
  canSubmit,
  isLoadingContext,
  isSaving,
  onCancel,
  onConfirm,
  onEditSchedule,
  onEditService,
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
  const paymentDetails = getReservationPaymentDetails(selectedService);
  const media = useMemo(
    () =>
      resolvePublicBusinessMedia({
        logoMedia: professional?.logoMedia,
        logoUrl: professional?.logoUrl,
        name: displayName,
        photoUrls: professional?.photos || [],
      }),
    [
      displayName,
      professional?.logoMedia,
      professional?.logoUrl,
      professional?.photos,
    ],
  );
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [media.logo?.src]);

  const showLogoImage = Boolean(media.logo?.src) && !logoFailed;
  const location = professional?.location?.trim() || professional?.address?.trim() || 'A confirmar';
  const priceLabel = formatPrice(selectedService?.price);

  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-5 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)] sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[color:var(--border-soft)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Paso 3
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold text-[color:var(--ink)] sm:text-[2rem]">
            Revisa tu reserva
          </h2>
          <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
            Confirma los datos y termina la reserva.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="accent" className="normal-case tracking-normal">
            Paso final
          </Badge>
          <Badge variant="neutral" className="normal-case tracking-normal">
            {paymentDetails.paymentTypeLabel}
          </Badge>
        </div>
      </div>

      {requiresAuthentication ? (
        <div className="mt-4 rounded-[18px] border border-[color:var(--accent-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--ink-muted)]">
          Al confirmar, se abre el acceso embebido para iniciar sesión o crear tu cuenta sin salir
          de esta reserva.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-start">
        <section className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[color:var(--border-soft)] bg-white text-sm font-semibold text-[color:var(--ink)]">
              {showLogoImage ? (
                <Image
                  src={media.logo!.src}
                  alt={`Logo de ${displayName}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                  style={buildPublicBusinessLogoStyle(media.logo)}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                media.initials
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                Profesional
              </p>
              <p className="mt-1 truncate text-base font-semibold text-[color:var(--ink)]">
                {displayName}
              </p>
              {professional?.rubro ? (
                <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{professional.rubro}</p>
              ) : null}
            </div>
          </div>

          <dl className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <SummaryItem
              label="Servicio"
              value={selectedService?.name || 'Sin servicio seleccionado'}
            />
            <SummaryItem
              label="Precio"
              value={priceLabel}
              accent
            />
            <SummaryItem
              label="Fecha"
              value={selectedDateLabel}
            />
            <SummaryItem
              label="Hora"
              value={selectedTime || 'Sin horario seleccionado'}
            />
            <SummaryItem
              label="Duración"
              value={formatDuration(selectedService?.duration)}
            />
            <SummaryItem
              label="Ubicación"
              value={location}
            />
          </dl>

          {selectedService?.description?.trim() ? (
            <div className="mt-5 border-t border-[color:var(--border-soft)] pt-4">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                Detalle del servicio
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">
                {selectedService.description.trim()}
              </p>
            </div>
          ) : null}
        </section>

        <aside className="rounded-[24px] border border-[color:var(--border-soft)] bg-white p-4 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.28)] sm:p-5">
          <div className="border-b border-[color:var(--border-soft)] pb-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
              Resumen de pago
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
              {paymentDetails.payNowAmount}
            </p>
            <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
              {paymentDetails.payNowLabel}
            </p>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[color:var(--ink-muted)]">Modalidad</span>
              <span className="text-right font-medium text-[color:var(--ink)]">
                {paymentDetails.paymentTypeLabel}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-[color:var(--ink-muted)]">Precio publicado</span>
              <span className="text-right font-medium text-[color:var(--ink)]">{priceLabel}</span>
            </div>

            {paymentDetails.prepaidLabel && paymentDetails.prepaidAmount ? (
              <div className="flex items-start justify-between gap-3">
                <span className="text-[color:var(--ink-muted)]">{paymentDetails.prepaidLabel}</span>
                <span className="text-right font-medium text-[color:var(--ink)]">
                  {paymentDetails.prepaidAmount}
                </span>
              </div>
            ) : null}

            {paymentDetails.processingFeeLabel && paymentDetails.processingFeeAmount ? (
              <div className="flex items-start justify-between gap-3">
                <span className="text-[color:var(--ink-muted)]">
                  {paymentDetails.processingFeeLabel}
                </span>
                <span className="text-right font-medium text-[color:var(--ink)]">
                  {paymentDetails.processingFeeAmount}
                </span>
              </div>
            ) : null}

            {paymentDetails.remainingLabel && paymentDetails.remainingAmount ? (
              <div className="flex items-start justify-between gap-3 border-t border-[color:var(--border-soft)] pt-3">
                <span className="text-[color:var(--ink-muted)]">{paymentDetails.remainingLabel}</span>
                <span className="text-right font-semibold text-[color:var(--ink)]">
                  {paymentDetails.remainingAmount}
                </span>
              </div>
            ) : null}
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

            <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
              {paymentDetails.pendingNotice}
            </p>

            <p className="text-xs leading-5 text-[color:var(--ink-faint)]">
              Política de cancelación: {policyDescription}
            </p>
          </div>

          <div className="mt-4 flex flex-col items-start gap-1.5 border-t border-[color:var(--border-soft)] pt-4">
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={onEditService}
              disabled={isSaving}
              className="h-auto rounded-none px-0 py-0 text-sm font-medium text-[color:var(--ink-muted)] hover:bg-transparent hover:text-[color:var(--ink)]"
            >
              Editar servicio
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={onEditSchedule}
              disabled={isSaving}
              className="h-auto rounded-none px-0 py-0 text-sm font-medium text-[color:var(--ink-muted)] hover:bg-transparent hover:text-[color:var(--ink)]"
            >
              Editar fecha y horario
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="h-auto rounded-none px-0 py-0 text-sm font-medium text-[#B45309] hover:bg-transparent hover:text-[#92400E]"
            >
              Cancelar reserva
            </Button>
          </div>
        </aside>
      </div>

      {saveMessage ? (
        <p className="mt-4 rounded-[18px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)]/55 px-4 py-3 text-sm font-medium text-[color:var(--success)]">
          {saveMessage}
        </p>
      ) : null}

      {saveError ? (
        <p className="mt-4 rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
          {saveError}
        </p>
      ) : null}
    </Card>
  );
}
