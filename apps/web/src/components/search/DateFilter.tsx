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
    `rounded-full border px-3 py-1.5 text-[0.74rem] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${
      active
        ? 'border-[color:var(--surface-dark)] bg-[color:var(--surface-dark)] text-[color:var(--text-on-dark)]'
        : 'border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] text-[color:var(--ink)] hover:bg-white'
    }`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <button type="button" onClick={onPickAnytime} className={quickActionClass(!date && !hasRange)}>
          Cualquier dia
        </button>
        <button type="button" onClick={onPickToday} className={quickActionClass(date === todayIso)}>
          Hoy
        </button>
        <button type="button" onClick={onPickTomorrow} className={quickActionClass(date === tomorrowIso)}>
          Manana
        </button>
        <button type="button" onClick={onPickThisWeek} className={quickActionClass(hasRange)}>
          Esta semana
        </button>
        {showAvailableToggle ? (
          <button
            type="button"
            onClick={onToggleAvailableNow}
            className={quickActionClass(availableNow)}
            aria-pressed={availableNow}
          >
            Disponible ahora
          </button>
        ) : null}
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-faint)]"
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
          className="h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white px-10 text-sm font-medium text-[color:var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        />
      </div>
    </div>
  );
}
