import Card from '@/components/ui/Card';
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
  isReady: boolean;
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
  isReady,
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
            Paso 2 y 3
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
            Elegí fecha y horario
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            La disponibilidad se recalcula según el servicio activo y te deja el resumen listo para
            confirmar.
          </p>
        </div>

        <div className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]">
          {selectedServiceName || 'Primero elegí un servicio'}
        </div>
      </div>

      {!isReady ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-5 py-10 text-sm text-[color:var(--ink-muted)]">
          Seleccioná un servicio para desbloquear el calendario y ver los horarios disponibles.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-[26px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Fecha
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
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => onSelectDate(cell.dateKey)}
                    className={`flex min-h-[72px] flex-col items-center justify-center rounded-[18px] border px-1.5 py-2 text-center transition ${
                      isSelected
                        ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--ink)] shadow-[var(--shadow-card)]'
                        : 'border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] hover:-translate-y-0.5 hover:bg-[color:var(--surface)]'
                    }`}
                  >
                    <span className="text-base font-semibold">{dayNumber}</span>
                    <span className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                      {monthLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[26px] border border-[color:var(--border-soft)] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Horario
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
                  {selectedTime || 'Elegí una hora'}
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-muted)]">
                {serviceDurationLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {isLoadingSlots ? (
                <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-5 text-sm text-[color:var(--ink-muted)]">
                  Cargando horarios disponibles...
                </div>
              ) : slots.length === 0 ? (
                <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-5 text-sm text-[color:var(--ink-muted)]">
                  No hay horarios disponibles para el día elegido.
                </div>
              ) : (
                slots.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => onSelectTime(slot)}
                      className={`rounded-[16px] border px-3 py-3 text-sm font-semibold transition ${
                        isSelected
                          ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-[var(--shadow-card)]'
                          : 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)] hover:-translate-y-0.5 hover:bg-white'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
