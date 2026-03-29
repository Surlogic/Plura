import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { resolveAssetUrl } from '@/utils/assetUrl';
import { getPaymentTypeLabel } from '@/utils/bookings';
import { formatDuration, formatPrice } from '@/utils/reservarHelpers';
import type {
  PublicProfessionalPage,
  PublicProfessionalService,
} from '@/services/publicBookings';

type ReservationFlowHeaderProps = {
  currentStep: number;
  isLoading?: boolean;
  professional: PublicProfessionalPage | null;
  selectedService: PublicProfessionalService | null;
};

const stepLabels = [
  'Servicio',
  'Fecha',
  'Horario',
  'Confirmacion',
] as const;

const resolveImage = (value?: string | null) => {
  if (!value) return '';
  return resolveAssetUrl(value) || '';
};

export default function ReservationFlowHeader({
  currentStep,
  isLoading = false,
  professional,
  selectedService,
}: ReservationFlowHeaderProps) {
  const displayName = professional?.fullName || 'Profesional';
  const location = professional?.location?.trim() || '';
  const logoUrl = resolveImage(professional?.logoUrl);
  const serviceImageUrl = resolveImage(selectedService?.imageUrl);
  const coverImage = logoUrl || serviceImageUrl;

  return (
    <Card
      tone="default"
      padding="none"
      className="overflow-hidden rounded-[36px] border-white/80 bg-white/96 shadow-[0_30px_90px_-52px_rgba(15,23,42,0.3)]"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(160deg,#f7fbf8_0%,#edf4ef_52%,#e6efea_100%)] px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
        <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[radial-gradient(circle_at_top_right,rgba(10,122,67,0.12),transparent_58%)] lg:block" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Badge variant="neutral" className="tracking-[0.18em]">
              Flujo de reserva
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--ink)] sm:text-[2.5rem]">
              Completá tu turno en un solo flujo
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-muted)] sm:text-base">
              Elegí servicio, fecha y horario con una vista clara. La confirmación y el checkout, si
              aplica, quedan resueltos desde esta pantalla.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Badge variant="info" className="normal-case tracking-normal">
                {displayName}
              </Badge>
              {professional?.rubro ? (
                <Badge variant="neutral" className="normal-case tracking-normal">
                  {professional.rubro}
                </Badge>
              ) : null}
              {location ? (
                <Badge variant="neutral" className="normal-case tracking-normal">
                  {location}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="relative min-w-0 rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.3)] backdrop-blur lg:w-[360px]">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)]">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={selectedService?.name || displayName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                    Plura
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                  {isLoading ? 'Cargando' : 'Seleccion actual'}
                </p>
                <p className="mt-2 truncate text-base font-semibold text-[color:var(--ink)]">
                  {selectedService?.name || 'Elegí un servicio para empezar'}
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                  {selectedService
                    ? `${formatDuration(selectedService.duration)} · ${formatPrice(selectedService.price)}`
                    : 'Todavía no seleccionaste el servicio.'}
                </p>
                {selectedService ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="accent" className="normal-case tracking-normal">
                      {getPaymentTypeLabel(selectedService.paymentType)}
                    </Badge>
                    {selectedService.categoryName ? (
                      <Badge variant="neutral" className="normal-case tracking-normal">
                        {selectedService.categoryName}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;

            return (
              <div
                key={label}
                className={`rounded-[22px] border px-4 py-4 transition ${
                  isCurrent
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]/50'
                    : isCompleted
                      ? 'border-[color:var(--success-soft)] bg-[color:var(--success-soft)]/55'
                      : 'border-[color:var(--border-soft)] bg-white/82'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrent
                        ? 'bg-[color:var(--primary)] text-white'
                        : isCompleted
                          ? 'bg-[color:var(--success)] text-white'
                          : 'bg-[color:var(--surface-soft)] text-[color:var(--ink)]'
                    }`}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </span>
                  <div>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                      Paso {stepNumber}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">{label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
