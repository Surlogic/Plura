'use client';

import { dayLabels } from '@/lib/professionalScheduleBuilder';
import type { WorkDayKey, WorkDaySchedule, WorkShift } from '@/types/professional';

type DayScheduleCardProps = {
  day: WorkDaySchedule;
  onToggleAvailable: (dayKey: WorkDayKey, checked: boolean) => void;
  onTogglePaused: (dayKey: WorkDayKey, checked: boolean) => void;
  onEditRange: (dayKey: WorkDayKey, range: WorkShift) => void;
  onRemoveRange: (dayKey: WorkDayKey, rangeId: string) => void;
  onCreateFromDay: (dayKey: WorkDayKey) => void;
};

export default function DayScheduleCard({
  day,
  onToggleAvailable,
  onTogglePaused,
  onEditRange,
  onRemoveRange,
  onCreateFromDay,
}: DayScheduleCardProps) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
            Día
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#0E2A47]">
            {dayLabels[day.day]}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0E2A47]">
            <input
              type="checkbox"
              checked={day.enabled}
              onChange={(event) => onToggleAvailable(day.day, event.target.checked)}
              className="h-4 w-4 accent-[#1FB6A6]"
            />
            Disponible
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0E2A47]">
            <input
              type="checkbox"
              checked={day.paused}
              onChange={(event) => onTogglePaused(day.day, event.target.checked)}
              className="h-4 w-4 accent-[#F59E0B]"
            />
            Pausado
          </label>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-[#0E2A47]">
            Franjas horarias
          </label>
          <p className="mt-1 text-xs text-[#64748B]">
            Podés definir varias franjas (ej: 09:00-12:00 y 14:00-19:00).
          </p>
          <div className="mt-3 space-y-3">
            {day.ranges.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-3 text-sm text-[#64748B]">
                Sin horarios definidos para este día.
              </div>
            ) : (
              day.ranges.map((range) => {
                return (
                  <div
                    key={range.id}
                    id={`range-${day.day}-${range.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[#0E2A47]">
                        {range.start} - {range.end}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Horario creado
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditRange(day.day, range)}
                        className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47]"
                        disabled={!day.enabled || day.paused}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveRange(day.day, range.id)}
                        className="rounded-full border border-[#F1B4B4] px-3 py-1 text-xs font-semibold text-[#C24141]"
                        disabled={!day.enabled || day.paused}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => onCreateFromDay(day.day)}
            disabled={!day.enabled || day.paused}
            className={`mt-3 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              !day.enabled || day.paused
                ? 'cursor-not-allowed border-[#E2E7EC] bg-[#F4F6F8] text-[#94A3B8]'
                : 'border-[#E2E7EC] bg-white text-[#0E2A47] hover:-translate-y-0.5 hover:shadow-sm'
            }`}
          >
            + Agregar franja horaria
          </button>
        </div>
      </div>
      {day.paused ? (
        <p className="mt-3 text-xs font-semibold text-[#F59E0B]">
          Día pausado: no se tomarán reservas.
        </p>
      ) : null}
    </div>
  );
}
