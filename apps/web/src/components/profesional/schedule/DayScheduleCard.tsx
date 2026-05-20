'use client';

import { dayLabels } from '@/lib/professionalScheduleBuilder';
import type { WorkDayKey, WorkDaySchedule, WorkShift } from '@/types/professional';

type DayScheduleCardProps = {
  day: WorkDaySchedule;
  pauseRanges?: Array<{ id: string; start: string; end: string }>;
  onToggleAvailable: (dayKey: WorkDayKey, checked: boolean) => void;
  onTogglePaused: (dayKey: WorkDayKey, checked: boolean) => void;
  onEditRange: (dayKey: WorkDayKey, range: WorkShift) => void;
  onRemoveRange: (dayKey: WorkDayKey, rangeId: string) => void;
  onCreateFromDay: (dayKey: WorkDayKey) => void;
};

export default function DayScheduleCard({
  day,
  pauseRanges = [],
  onToggleAvailable,
  onTogglePaused,
  onEditRange,
  onRemoveRange,
  onCreateFromDay,
}: DayScheduleCardProps) {
  const isActive = day.enabled && !day.paused && day.ranges.length > 0;
  const statusLabel = day.paused ? 'Pausado' : isActive ? 'Activo' : 'Cerrado';
  const statusClassName = day.paused
    ? 'bg-amber-50 text-amber-700'
    : isActive
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-slate-100 text-slate-500';

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white px-3 py-3 transition hover:border-[#BFD9D2]">
      <div className="grid gap-3 md:grid-cols-[150px,1fr,auto] md:items-center">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${statusClassName}`}>
            {isActive ? '✓' : day.paused ? '–' : '×'}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#0F172A]">{dayLabels[day.day]}</h3>
            <p className="text-xs text-[#64748B]">{statusLabel}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {day.ranges.length === 0 ? (
            <span className="rounded-full border border-dashed border-[#CBD5E1] px-3 py-1 text-xs font-medium text-[#64748B]">
              Sin franjas
            </span>
          ) : (
            day.ranges.map((range) => (
              <button
                key={range.id}
                id={`range-${day.day}-${range.id}`}
                type="button"
                onClick={() => onEditRange(day.day, range)}
                disabled={!day.enabled || day.paused}
                className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {range.start} - {range.end}
              </button>
            ))
          )}
          {pauseRanges.map((pause) => (
            <span
              key={pause.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {pause.start} - {pause.end}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          {isActive ? (
            <button
              type="button"
              onClick={() => onCreateFromDay(day.day)}
              className="rounded-lg border border-[#D9E7E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F766E] transition hover:bg-[#ECFDF5]"
            >
              + Agregar franja
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onToggleAvailable(day.day, true);
                if (day.paused) {
                  onTogglePaused(day.day, false);
                }
                onCreateFromDay(day.day);
              }}
              className="rounded-lg border border-[#D9E7E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F766E] transition hover:bg-[#ECFDF5]"
            >
              + Activar día
            </button>
          )}
          <button
            type="button"
            onClick={() => onTogglePaused(day.day, !day.paused)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#F8FAFC]"
          >
            {day.paused ? 'Quitar pausa' : 'Pausar'}
          </button>
          {day.ranges.length > 0 ? (
            <button
              type="button"
              onClick={() => onRemoveRange(day.day, day.ranges[day.ranges.length - 1].id)}
              disabled={!day.enabled || day.paused}
              className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Eliminar última
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
