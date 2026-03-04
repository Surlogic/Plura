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
    <div className="space-y-2.5">
      {showAvailableToggle ? (
        <button
          type="button"
          role="switch"
          aria-checked={availableNow}
          onClick={onToggleAvailableNow}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-[#D5E4DC] bg-white px-2.5 text-[0.7rem] font-semibold text-[#4E6072] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
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

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onPickAnytime}
          className="rounded-full border border-[#D5E4DC] bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[#4E6072] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
        >
          En cualquier momento
        </button>
        <button
          type="button"
          onClick={onPickToday}
          className="rounded-full border border-[#D5E4DC] bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[#4E6072] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={onPickTomorrow}
          className="rounded-full border border-[#D5E4DC] bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[#4E6072] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
        >
          Manana
        </button>
        <button
          type="button"
          onClick={onPickThisWeek}
          className="rounded-full border border-[#D5E4DC] bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[#4E6072] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
        >
          Esta semana
        </button>
      </div>

      <input
        type="date"
        value={date}
        min={todayIso}
        onChange={(event) => onPickDate(event.target.value)}
        className="h-9 w-full rounded-lg border border-[#D9E6DF] bg-white px-2.5 text-sm text-[#0E2A47] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
      />
    </div>
  );
}
