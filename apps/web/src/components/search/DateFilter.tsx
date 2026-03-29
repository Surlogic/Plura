import { SEARCH_PANEL_SECTION_CLASS } from '@/components/search/searchUi';

type DateFilterProps = {
  date: string;
  from?: string;
  to?: string;
  availableNow: boolean;
  todayIso: string;
  onPickAnytime: () => void;
  onPickToday: () => void;
  onPickTomorrow: () => void;
  onPickThisWeek: () => void;
  onPickDate: (value: string) => void;
  onToggleAvailableNow: () => void;
  showAvailableToggle?: boolean;
};

export default function DateFilter({
  date,
  from,
  to,
  availableNow,
  todayIso,
  onPickAnytime,
  onPickToday,
  onPickTomorrow,
  onPickThisWeek,
  onPickDate,
  onToggleAvailableNow,
  showAvailableToggle = true,
}: DateFilterProps) {
  const hasRange = Boolean(from && to);
  const tomorrow = new Date(`${todayIso}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  const quickActionClass = (active: boolean) =>
    `rounded-full border px-3.5 py-2 text-[0.76rem] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${
      active
        ? 'border-[color:var(--accent-strong)] bg-[color:var(--accent-soft)] text-[color:var(--ink)]'
        : 'border-[color:var(--border-soft)] bg-white text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-soft)]'
    }`;

  return (
    <div className="space-y-4">
      {showAvailableToggle ? (
        <div className={`${SEARCH_PANEL_SECTION_CLASS} flex items-center justify-between gap-3`}>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Disponibilidad inmediata</p>
            <p className="text-xs text-[color:var(--ink-muted)]">
              Mostra solo opciones con horarios disponibles ahora.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={availableNow}
            onClick={onToggleAvailableNow}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-white px-3.5 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
          >
            <span
              className={`relative inline-flex h-5 w-9 rounded-full transition ${
                availableNow ? 'bg-[color:var(--primary)]' : 'bg-[#C7D5CF]'
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                  availableNow ? 'left-0.5 translate-x-4' : 'left-0.5'
                }`}
              />
            </span>
            {availableNow ? 'Activa' : 'Inactiva'}
          </button>
        </div>
      ) : null}

      <div className={SEARCH_PANEL_SECTION_CLASS}>
        <div className="mb-3 space-y-1">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Atajos de fecha</p>
          <p className="text-xs text-[color:var(--ink-muted)]">
            Elegi una fecha puntual o una ventana corta sin salir del buscador.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPickAnytime}
            className={quickActionClass(!date && !hasRange)}
          >
            En cualquier momento
          </button>
          <button
            type="button"
            onClick={onPickToday}
            className={quickActionClass(date === todayIso)}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={onPickTomorrow}
            className={quickActionClass(date === tomorrowIso)}
          >
            Manana
          </button>
          <button
            type="button"
            onClick={onPickThisWeek}
            className={quickActionClass(hasRange)}
          >
            Esta semana
          </button>
        </div>
      </div>

      <div className={SEARCH_PANEL_SECTION_CLASS}>
        <div className="mb-3 space-y-1">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Seleccion manual</p>
          <p className="text-xs text-[color:var(--ink-muted)]">
            Defini una fecha exacta y combinala con el resto de tus filtros.
          </p>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-faint)]"
            aria-hidden="true"
          >
            <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 3v3M13.5 3v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="date"
            value={date}
            min={todayIso}
            onChange={(event) => onPickDate(event.target.value)}
            className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white px-12 text-sm font-medium text-[color:var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
          />
        </div>
      </div>
    </div>
  );
}
