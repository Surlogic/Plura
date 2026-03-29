import { memo } from 'react';
import { SEARCH_CHIP_CLASS } from '@/components/search/searchUi';

export type SearchFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type SearchFilterChipsProps = {
  filters: SearchFilterChip[];
  helperText: string;
};

export default memo(function SearchFilterChips({
  filters,
  helperText,
}: SearchFilterChipsProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--border-soft)] px-1 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          Filtros listos
        </p>
        <p className="text-sm text-[color:var(--ink-muted)]">{helperText}</p>
      </div>

      {filters.length > 0 ? (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={filter.onRemove}
              className={SEARCH_CHIP_CLASS}
              aria-label={`Quitar filtro ${filter.label}`}
            >
              <span>{filter.label}</span>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-[10px] text-[color:var(--ink-faint)]"
                aria-hidden="true"
              >
                x
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
