import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { PublicProfessionalPage, PublicProfessionalService } from '@/services/publicBookings';
import { getPaymentTypeLabel } from '@/utils/bookings';
import { formatDuration, formatPrice } from '@/utils/reservarHelpers';

type ReservationReviewStepProps = {
  onCancel: () => void;
  onContinue: () => void;
  onEditDay: () => void;
  onEditService: () => void;
  onEditTime: () => void;
  professional: PublicProfessionalPage | null;
  selectedDateLabel: string;
  selectedService: PublicProfessionalService | null;
  selectedTime: string | null;
};

export default function ReservationReviewStep({
  onCancel,
  onContinue,
  onEditDay,
  onEditService,
  onEditTime,
  professional,
  selectedDateLabel,
  selectedService,
  selectedTime,
}: ReservationReviewStepProps) {
  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Paso 4
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
            Revisá tu turno
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            Confirmá que el servicio, el día y la hora estén bien antes de pasar al paso final.
          </p>
        </div>

        <Badge variant="accent" className="w-fit normal-case tracking-normal">
          {professional?.fullName || 'Profesional'}
        </Badge>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Servicio
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
            {selectedService?.name || 'Sin servicio seleccionado'}
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
            {selectedService?.description?.trim() || 'Sin descripción adicional.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="neutral" className="normal-case tracking-normal">
              {formatDuration(selectedService?.duration)}
            </Badge>
            <Badge variant="info" className="normal-case tracking-normal">
              {getPaymentTypeLabel(selectedService?.paymentType)}
            </Badge>
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Turno elegido
          </p>
          <div className="mt-3 space-y-3 text-sm text-[color:var(--ink-muted)]">
            <p>
              Día:
              <span className="ml-2 font-semibold capitalize text-[color:var(--ink)]">
                {selectedDateLabel}
              </span>
            </p>
            <p>
              Hora:
              <span className="ml-2 font-semibold text-[color:var(--ink)]">
                {selectedTime || 'Sin horario seleccionado'}
              </span>
            </p>
            <p>
              Precio:
              <span className="ml-2 font-semibold text-[color:var(--primary)]">
                {formatPrice(selectedService?.price)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={onEditService}>
          Editar servicio
        </Button>
        <Button type="button" variant="secondary" onClick={onEditDay}>
          Editar día
        </Button>
        <Button type="button" variant="secondary" onClick={onEditTime}>
          Editar horario
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="primary" size="lg" onClick={onContinue} className="sm:min-w-[220px]">
          Continuar
        </Button>
        <Button type="button" variant="quiet" size="lg" onClick={onCancel} className="justify-start text-[#B45309]">
          Cancelar reserva
        </Button>
      </div>
    </Card>
  );
}
