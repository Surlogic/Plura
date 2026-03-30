import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import type { PublicProfessionalPage, PublicProfessionalService } from '@/services/publicBookings';
import { getPaymentTypeLabel } from '@/utils/bookings';
import { formatDuration, formatPrice } from '@/utils/reservarHelpers';

type ReservationProgressSidebarProps = {
  currentStep: number;
  policyDescription: string;
  professional: PublicProfessionalPage | null;
  selectedDateLabel: string | null;
  selectedService: PublicProfessionalService | null;
  selectedTime: string | null;
};

const stepTitles: Record<number, string> = {
  1: 'Confirmar servicio',
  2: 'Elegir día',
  3: 'Elegir horario',
  4: 'Revisar turno',
  5: 'Confirmar y reservar',
};

export default function ReservationProgressSidebar({
  currentStep,
  policyDescription,
  professional,
  selectedDateLabel,
  selectedService,
  selectedTime,
}: ReservationProgressSidebarProps) {
  const contactPhone = professional?.phoneNumber?.trim() || professional?.phone?.trim() || '';
  const contactEmail = professional?.email?.trim() || '';
  const location = professional?.location?.trim() || professional?.address?.trim() || '';

  return (
    <div className="space-y-4">
      <Card
        tone="default"
        className="rounded-[28px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Paso actual
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
              {stepTitles[currentStep] || stepTitles[1]}
            </h2>
          </div>
          <Badge variant="accent" className="normal-case tracking-normal">
            Paso {currentStep} de 5
          </Badge>
        </div>

        <div className="mt-5 space-y-4 rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Profesional
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
              {professional?.fullName || 'Cargando profesional...'}
            </p>
            {professional?.rubro ? (
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{professional.rubro}</p>
            ) : null}
          </div>

          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Servicio
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
              {selectedService?.name || 'Todavía no seleccionaste un servicio'}
            </p>
            {selectedService ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="neutral" className="normal-case tracking-normal">
                  {formatDuration(selectedService.duration)}
                </Badge>
                <Badge variant="info" className="normal-case tracking-normal">
                  {getPaymentTypeLabel(selectedService.paymentType)}
                </Badge>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Día
              </p>
              <p className="mt-1 text-sm capitalize text-[color:var(--ink)]">
                {selectedDateLabel || 'Elegí un día'}
              </p>
            </div>
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Hora
              </p>
              <p className="mt-1 text-sm text-[color:var(--ink)]">
                {selectedTime || 'Elegí un horario'}
              </p>
            </div>
          </div>

          {selectedService?.price ? (
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Precio publicado
              </p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--primary)]">
                {formatPrice(selectedService.price)}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        tone="default"
        className="rounded-[28px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]"
      >
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          Información útil
        </p>
        <div className="mt-4 space-y-3 text-sm text-[color:var(--ink-muted)]">
          {location ? (
            <p>
              Ubicación:
              <span className="ml-2 font-semibold text-[color:var(--ink)]">{location}</span>
            </p>
          ) : null}
          {contactPhone ? (
            <p>
              Teléfono:
              <span className="ml-2 font-semibold text-[color:var(--ink)]">{contactPhone}</span>
            </p>
          ) : null}
          {contactEmail ? (
            <p>
              Email:
              <span className="ml-2 font-semibold text-[color:var(--ink)]">{contactEmail}</span>
            </p>
          ) : null}
          <p>
            Política:
            <span className="ml-2 font-semibold text-[color:var(--ink)]">{policyDescription}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
