'use client';

import type { SchedulePauseRange } from '@/types/professional';

type SchedulePausesPanelProps = {
  inputClassName: string;
  pauseDraft: SchedulePauseRange;
  pauses: SchedulePauseRange[];
  onPauseDraftChange: (field: keyof SchedulePauseRange, value: string) => void;
  onAddPause: () => void;
  onRemovePause: (pauseId: string) => void;
};

export default function SchedulePausesPanel({
  inputClassName,
  pauseDraft,
  pauses,
  onPauseDraftChange,
  onAddPause,
  onRemovePause,
}: SchedulePausesPanelProps) {
  return (
    <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-white/95 p-5 shadow-[var(--shadow-card)]">
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
        Pausas por fecha
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
        Pausar disponibilidad por viaje
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-[color:var(--ink)]">
            Desde
          </label>
          <input
            type="date"
            className={inputClassName}
            value={pauseDraft.startDate}
            onChange={(event) => onPauseDraftChange('startDate', event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[color:var(--ink)]">
            Hasta
          </label>
          <input
            type="date"
            className={inputClassName}
            value={pauseDraft.endDate}
            onChange={(event) => onPauseDraftChange('endDate', event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-[color:var(--ink)]">
            Nota (opcional)
          </label>
          <input
            className={inputClassName}
            value={pauseDraft.note ?? ''}
            onChange={(event) => onPauseDraftChange('note', event.target.value)}
            placeholder="Ej: Viaje a congreso"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onAddPause}
        className="mt-4 w-full rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-[color:var(--primary-strong)]"
      >
        Agregar pausa
      </button>
      <div className="mt-4 space-y-3">
        {pauses.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] bg-white/70 px-4 py-4 text-sm text-[color:var(--ink-muted)]">
            No hay pausas cargadas todavía.
          </div>
        ) : (
          pauses.map((pause) => (
            <div
              key={pause.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--ink)]"
            >
              <div>
                <p className="font-semibold">
                  {pause.startDate} → {pause.endDate}
                </p>
                {pause.note ? (
                  <p className="text-xs text-[color:var(--ink-muted)]">{pause.note}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onRemovePause(pause.id)}
                className="rounded-full border border-[color:var(--error-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--error)]"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
