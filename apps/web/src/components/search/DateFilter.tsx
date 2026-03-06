type DateFilterProps = {
  date: string;
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
  return (
    <div className="space-y-4">
      {showAvailableToggle ? (
        <button
          type="button"
          role="switch"
          aria-checked={availableNow}
          onClick={onToggleAvailableNow}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        >
          <span
            className={`relative inline-flex h-3.5 w-7 rounded-full transition ${
              availableNow ? 'bg-[#1B6B5C]' : 'bg-[#C7D5CF]'
            }`}
            aria-hidden="true"
          >
            <span
              className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition ${
                availableNow ? 'left-0.5 translate-x-3' : 'left-0.5'
              }`}
            />
          </span>
          Disponible ahora
        </button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPickAnytime}
          className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        >
          En cualquier momento
        </button>
        <button
          type="button"
          onClick={onPickToday}
          className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={onPickTomorrow}
          className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        >
          Manana
        </button>
        <button
          type="button"
          onClick={onPickThisWeek}
          className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        >
          Esta semana
        </button>
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
  );
}
