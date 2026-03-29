import { memo } from 'react';
import { SEARCH_CHIP_CLASS } from '@/components/search/searchUi';

export type SearchFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type SearchFilterChipsProps = {
  filters: SearchFilterChip[];
  onClearAll?: () => void;
};

export default memo(function SearchFilterChips({
  filters,
  onClearAll,
}: SearchFilterChipsProps) {
  if (filters.length === 0 && !onClearAll) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-soft)] pt-2.5">
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

      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center rounded-full px-1.5 py-1 text-[0.72rem] font-semibold text-[color:var(--ink-muted)] transition hover:text-[color:var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        >
          Limpiar
        </button>
      ) : null}
    </div>
  );
});
