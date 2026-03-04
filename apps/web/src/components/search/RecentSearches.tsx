import type { RecentSearchEntry } from '@/types/search';

type RecentSearchesProps = {
  items: RecentSearchEntry[];
  onSelect: (item: RecentSearchEntry) => void;
};

const labelFromEntry = (item: RecentSearchEntry) => {
  if (item.query.trim()) return item.query;
  if (item.categorySlug?.trim()) return item.categorySlug.replace(/-/g, ' ');
  return 'Busqueda reciente';
};

const subtitleFromEntry = (item: RecentSearchEntry) => {
  const parts: string[] = [];
  if (item.city.trim()) parts.push(item.city);
  if (item.date) parts.push(item.date);
  if (!item.date && item.from && item.to) parts.push(`${item.from} - ${item.to}`);
  if (item.availableNow) parts.push('Disponible ahora');
  return parts.join(' - ');
};

export default function RecentSearches({ items, onSelect }: RecentSearchesProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <p className="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#7D8EA1]">
        Busquedas recientes
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.slice(0, 8).map((item) => (
          <button
            key={`${item.createdAt}-${item.type}-${item.query}-${item.categorySlug || ''}`}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full rounded-xl border border-[#DCE8E3] bg-white px-3 py-2 text-left transition hover:bg-[#F6FBF8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
          >
            <p className="truncate text-sm font-semibold text-[#0E2A47]">{labelFromEntry(item)}</p>
            {subtitleFromEntry(item) ? (
              <p className="truncate text-xs text-[#66788B]">{subtitleFromEntry(item)}</p>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
