import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { PublicService } from '@/types/professional';
import {
  formatServiceDuration,
  formatServicePaymentType,
  formatServicePrice,
  resolveServiceCategoryLabel,
} from '@/components/profesional/public-page/servicePresentation';

export type QuickSlotGroup = {
  label: 'Hoy' | 'Mañana';
  dateKey: string;
  slots: string[];
};

type PublicBookingSidebarProps = {
  fallbackCategoryName?: string | null;
  hasInteractedWithServices: boolean;
  isLoadingQuickSlots: boolean;
  isPreview?: boolean;
  onActivateQuickSlots: () => void;
  onReserve: (date?: string, time?: string) => void;
  quickSlotGroups: QuickSlotGroup[];
  selectedService: PublicService | null;
};

export default function PublicBookingSidebar({
  fallbackCategoryName,
  hasInteractedWithServices,
  isLoadingQuickSlots,
  isPreview = false,
  onActivateQuickSlots,
  onReserve,
  quickSlotGroups,
  selectedService,
}: PublicBookingSidebarProps) {
  const serviceCategory = resolveServiceCategoryLabel(selectedService, fallbackCategoryName);

  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Reserva
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
            Elegi tu turno
          </h2>
        </div>
        <Badge variant="accent" className="normal-case tracking-normal">
          Paso 1
        </Badge>
      </div>

      {selectedService ? (
        <>
          <div className="mt-6 rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Servicio elegido
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
                  {selectedService.name}
                </h3>
              </div>
              <Badge variant="neutral" className="normal-case tracking-normal">
                {serviceCategory}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Duracion
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[color:var(--ink)]">
                  {formatServiceDuration(selectedService.duration)}
                </p>
              </div>
              <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Precio
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[color:var(--primary)]">
                  {formatServicePrice(selectedService.price)}
                </p>
              </div>
              <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Modalidad
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[color:var(--ink)]">
                  {formatServicePaymentType(selectedService.paymentType)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[color:var(--border-soft)] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Proximos horarios
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">
                  La seleccion final y el checkout siguen en el flujo de reserva actual.
                </p>
              </div>
              {hasInteractedWithServices && !isPreview ? (
                <button
                  type="button"
                  onClick={onActivateQuickSlots}
                  className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Actualizar
                </button>
              ) : null}
            </div>

            {isPreview ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-4 text-sm text-[color:var(--ink-muted)]">
                Los horarios se habilitan cuando la pagina esta publicada.
              </div>
            ) : !hasInteractedWithServices ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-4 text-sm text-[color:var(--ink-muted)]">
                  Selecciona un servicio para cargar sus horarios cercanos.
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={onActivateQuickSlots}>
                  Ver proximos horarios
                </Button>
              </div>
            ) : isLoadingQuickSlots ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-4 text-sm text-[color:var(--ink-muted)]">
                Buscando horarios disponibles...
              </div>
            ) : quickSlotGroups.every((group) => group.slots.length === 0) ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-4 text-sm text-[color:var(--ink-muted)]">
                No encontramos turnos cercanos para este servicio.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {quickSlotGroups.map((group) => (
                  <div key={group.dateKey}>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">
                      {group.label}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.slots.length > 0 ? (
                        group.slots.map((slot) => (
                          <button
                            key={`${group.dateKey}-${slot}`}
                            type="button"
                            onClick={() => onReserve(group.dateKey, slot)}
                            className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-white"
                          >
                            {slot}
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-[color:var(--ink-faint)]">Sin turnos</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-[24px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-5 py-8 text-sm text-[color:var(--ink-muted)]">
          Este profesional todavia no publico servicios.
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        disabled={!selectedService}
        onClick={() => onReserve()}
      >
        Continuar con la reserva
      </Button>
    </Card>
  );
}
