import type { SearchType } from '@/types/search';
import type { RecentSearchEntry } from '@/types/search';

export type SuggestDropdownItem = {
  id: string;
  type: SearchType;
  label: string;
  secondary?: string;
  categorySlug?: string;
  recentSearch?: RecentSearchEntry;
  variant?: 'default' | 'global' | 'recent';
};

type SuggestDropdownGroup = {
  title: string;
  items: SuggestDropdownItem[];
};

type SuggestDropdownProps = {
  open: boolean;
  loading: boolean;
  groups: SuggestDropdownGroup[];
  activeIndex: number;
  onSelect: (item: SuggestDropdownItem) => void;
  onHoverIndex: (index: number) => void;
};

const getTypeLabel = (item: SuggestDropdownItem) => {
  if (item.variant === 'global') return 'Explorar';
  if (item.variant === 'recent') return 'Reciente';

  switch (item.type) {
    case 'RUBRO':
      return 'Rubro';
    case 'PROFESIONAL':
      return 'Profesional';
    case 'LOCAL':
      return 'Local';
    default:
      return 'Servicio';
  }
};

export default function SuggestDropdown({
  open,
  loading,
  groups,
  activeIndex,
  onSelect,
  onHoverIndex,
}: SuggestDropdownProps) {
  if (!open) return null;

  const flattened = groups.flatMap((group) => group.items);
  let currentStartIndex = 0;

  return (
    <div className="pointer-events-auto w-full overflow-hidden rounded-[28px] border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)] p-3 shadow-[var(--shadow-lift)] ring-1 ring-black/5">
      {flattened.length === 0 ? (
        <p className="px-2 py-3 text-sm text-[color:var(--ink-muted)]">Sin sugerencias por ahora.</p>
      ) : (
        <>
          {loading ? (
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              Actualizando sugerencias...
            </p>
          ) : null}
          <div className="max-h-[360px] space-y-4 overflow-y-auto overscroll-contain pr-1">
            {groups.map((group, groupIndex) => {
              if (group.items.length === 0) return null;

              const startIndex = currentStartIndex;
              currentStartIndex += group.items.length;
              const showDividerAfter =
                groupIndex === 0 &&
                group.items[0]?.variant === 'global' &&
                groups.slice(1).some((nextGroup) => nextGroup.items.length > 0);

              return (
                <section
                  key={`${group.title || 'grupo'}-${groupIndex}`}
                  className={`space-y-2 ${showDividerAfter ? 'border-b border-[color:var(--border-soft)] pb-3.5' : ''}`}
                >
                  {group.title ? (
                    <p className="px-2 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                      {group.title}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    {group.items.map((item, index) => {
                      const absoluteIndex = startIndex + index;
                      const isActive = absoluteIndex === activeIndex;
                      const toneClass =
                        item.variant === 'global'
                          ? isActive
                            ? 'border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] shadow-[0_18px_34px_-28px_rgba(13,35,58,0.65)]'
                            : 'border-[color:var(--border-soft)] bg-white hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)]'
                          : isActive
                            ? 'border-[color:var(--accent-soft)] bg-[color:var(--surface-soft)] shadow-[0_18px_34px_-28px_rgba(13,35,58,0.55)]'
                            : 'border-transparent bg-white hover:border-[color:var(--border-soft)] hover:bg-[color:var(--surface-soft)]';

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => onHoverIndex(absoluteIndex)}
                          onClick={() => onSelect(item)}
                          className={`w-full rounded-[22px] border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${toneClass}`}
                          aria-selected={isActive}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[0.95rem] font-semibold text-[color:var(--ink)]">
                                {item.label}
                              </p>
                              {item.secondary ? (
                                <p className="mt-1 truncate text-xs leading-5 text-[color:var(--ink-muted)]">
                                  {item.secondary}
                                </p>
                              ) : null}
                            </div>
                            <span className="shrink-0 rounded-full border border-[color:var(--border-soft)] bg-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                              {getTypeLabel(item)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
