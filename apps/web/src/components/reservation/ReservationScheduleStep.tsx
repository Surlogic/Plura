import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ToggleChip from '@/components/ui/ToggleChip';
import {
  dayLabelsShort,
  weekOrder,
  type WorkDayKey,
} from '@/utils/reservarHelpers';

type ReservationCalendarCell =
  | {
      empty: true;
      key: string;
    }
  | {
      date: Date;
      dateKey: string;
      dayKey: WorkDayKey;
      empty: false;
      key: string;
    };

type ReservationScheduleStepProps = {
  calendarCells: ReservationCalendarCell[];
  calendarTitle: string;
  isLoadingSlots: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onEditService: () => void;
  onSelectDate: (dateKey: string) => void;
  onSelectTime: (time: string) => void;
  selectedDate: string | null;
  selectedDateLabel: string;
  selectedServiceName?: string | null;
  selectedTime: string | null;
  serviceDurationLabel: string;
  slots: string[];
};

export default function ReservationScheduleStep({
  calendarCells,
  calendarTitle,
  isLoadingSlots,
  onCancel,
  onContinue,
  onEditService,
  onSelectDate,
  onSelectTime,
  selectedDate,
  selectedDateLabel,
  selectedServiceName,
  selectedTime,
  serviceDurationLabel,
  slots,
}: ReservationScheduleStepProps) {
  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Paso 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
            Elegi fecha y horario
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            Selecciona el dia disponible y luego el horario en la misma etapa para avanzar directo
            a la revision final.
          </p>
        </div>

        <div className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]">
          {selectedServiceName || 'Servicio confirmado'}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <section className="rounded-[26px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Fecha elegida
              </p>
              <p className="mt-2 text-lg font-semibold capitalize text-[color:var(--ink)]">
                {selectedDateLabel}
              </p>
            </div>
            <span className="text-xs font-semibold capitalize text-[color:var(--ink-muted)]">
              {calendarTitle}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[0.68rem] font-semibold text-[color:var(--ink-faint)]">
            {weekOrder.map((day) => (
              <div key={day}>{dayLabelsShort[day]}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              if (cell.empty) {
                return <div key={cell.key} className="h-[72px]" />;
              }

              const isSelected = selectedDate === cell.dateKey;
              const dayNumber = String(cell.date.getDate()).padStart(2, '0');
              const monthLabel = cell.date.toLocaleDateString('es-AR', { month: 'short' });

              return (
                <ToggleChip
                  key={cell.key}
                  onClick={() => onSelectDate(cell.dateKey)}
                  selected={isSelected}
                  tone="soft"
                  shape="tile"
                >
                  <span className="text-base font-semibold">{dayNumber}</span>
                  <span className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                    {monthLabel}
                  </span>
                </ToggleChip>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Horario elegido
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
                {selectedTime || 'Elegi una hora'}
              </p>
            </div>
            <span className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-muted)]">
              {serviceDurationLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {!selectedDate ? (
              <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-white px-4 py-5 text-sm text-[color:var(--ink-muted)]">
                Elegi primero una fecha para ver los horarios disponibles.
              </div>
            ) : isLoadingSlots ? (
              <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-white px-4 py-5 text-sm text-[color:var(--ink-muted)]">
                Cargando horarios disponibles...
              </div>
            ) : slots.length === 0 ? (
              <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-white px-4 py-5 text-sm text-[color:var(--ink-muted)]">
                No encontramos horarios para este dia. Proba con otra fecha.
              </div>
            ) : (
              slots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <ToggleChip
                    key={slot}
                    onClick={() => onSelectTime(slot)}
                    selected={isSelected}
                    tone="solid"
                    className="rounded-[16px]"
                  >
                    {slot}
                  </ToggleChip>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onContinue}
          disabled={!selectedDate || !selectedTime}
          className="sm:min-w-[220px]"
        >
          Continuar
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onEditService}>
          Editar servicio
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="lg"
          onClick={onCancel}
          className="justify-start text-[#B45309]"
        >
          Cancelar reserva
        </Button>
      </div>
    </Card>
  );
}
