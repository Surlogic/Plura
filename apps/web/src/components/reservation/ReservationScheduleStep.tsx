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

type ReservationDayStepProps = {
  calendarCells: ReservationCalendarCell[];
  calendarTitle: string;
  mode: 'day';
  onCancel: () => void;
  onContinue: () => void;
  onEditService: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDate: string | null;
  selectedDateLabel: string;
  selectedServiceName?: string | null;
};

type ReservationTimeStepProps = {
  isLoadingSlots: boolean;
  mode: 'time';
  onCancel: () => void;
  onEditDay: () => void;
  onSelectTime: (time: string) => void;
  selectedDateLabel: string;
  selectedServiceName?: string | null;
  selectedTime: string | null;
  serviceDurationLabel: string;
  slots: string[];
};

type ReservationScheduleStepProps = ReservationDayStepProps | ReservationTimeStepProps;

export default function ReservationScheduleStep(props: ReservationScheduleStepProps) {
  if (props.mode === 'day') {
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
              Elegí el día
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
              Primero confirmá el día. Los horarios aparecen recién en el próximo paso para que la
              elección sea más clara.
            </p>
          </div>

          <div className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]">
            {props.selectedServiceName || 'Servicio confirmado'}
          </div>
        </div>

        <section className="mt-6 rounded-[26px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Día elegido
              </p>
              <p className="mt-2 text-lg font-semibold capitalize text-[color:var(--ink)]">
                {props.selectedDateLabel}
              </p>
            </div>
            <span className="text-xs font-semibold capitalize text-[color:var(--ink-muted)]">
              {props.calendarTitle}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[0.68rem] font-semibold text-[color:var(--ink-faint)]">
            {weekOrder.map((day) => (
              <div key={day}>{dayLabelsShort[day]}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {props.calendarCells.map((cell) => {
              if (cell.empty) {
                return <div key={cell.key} className="h-[72px]" />;
              }

              const isSelected = props.selectedDate === cell.dateKey;
              const dayNumber = String(cell.date.getDate()).padStart(2, '0');
              const monthLabel = cell.date.toLocaleDateString('es-AR', { month: 'short' });

              return (
                <ToggleChip
                  key={cell.key}
                  onClick={() => props.onSelectDate(cell.dateKey)}
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={props.onContinue}
            disabled={!props.selectedDate}
            className="sm:min-w-[220px]"
          >
            Continuar
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={props.onEditService}>
            Editar servicio
          </Button>
          <Button
            type="button"
            variant="quiet"
            size="lg"
            onClick={props.onCancel}
            className="justify-start text-[#B45309]"
          >
            Cancelar reserva
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      tone="default"
      className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Paso 3
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
            Elegí el horario
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            Ahora sí, elegí el horario disponible para el día que acabás de confirmar.
          </p>
        </div>

        <div className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-semibold capitalize text-[color:var(--ink)]">
          {props.selectedDateLabel}
        </div>
      </div>

      <section className="mt-6 rounded-[26px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Horarios disponibles
            </p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
              {props.selectedTime || 'Elegí una hora'}
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-muted)]">
            {props.selectedServiceName || 'Servicio'} · {props.serviceDurationLabel}
          </span>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {props.isLoadingSlots ? (
            <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-white px-4 py-5 text-sm text-[color:var(--ink-muted)]">
              Cargando horarios disponibles...
            </div>
          ) : props.slots.length === 0 ? (
            <div className="col-span-full rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-white px-4 py-5 text-sm text-[color:var(--ink-muted)]">
              No encontramos horarios para este día. Probá con otra fecha.
            </div>
          ) : (
            props.slots.map((slot) => {
              const isSelected = props.selectedTime === slot;
              return (
                <ToggleChip
                  key={slot}
                  onClick={() => props.onSelectTime(slot)}
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="secondary" size="lg" onClick={props.onEditDay}>
          Editar día
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="lg"
          onClick={props.onCancel}
          className="justify-start text-[#B45309]"
        >
          Cancelar reserva
        </Button>
      </div>
    </Card>
  );
}
