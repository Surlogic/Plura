import type { SearchType } from '@/types/search';
import { SEARCH_PANEL_SCROLL_CLASS } from '@/components/search/searchUi';

export type SuggestDropdownItem = {
  id: string;
  type: SearchType;
  label: string;
  secondary?: string;
  categorySlug?: string;
  variant?: 'default' | 'global';
};

type SuggestDropdownGroup = {
  title: string;
  items: SuggestDropdownItem[];
  note?: string;
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

  switch (item.type) {
    case 'RUBRO':
      return 'Categoría';
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
    <div className="pointer-events-auto w-full overflow-hidden rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-2.5 shadow-[0_24px_50px_-36px_rgba(13,35,58,0.36)] ring-1 ring-black/5">
      {flattened.length === 0 ? (
        <p className="px-2 py-2 text-sm text-[color:var(--ink-muted)]">
          Sin sugerencias por ahora.
        </p>
      ) : (
        <>
          {loading ? (
            <p className="px-2 pb-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              Actualizando sugerencias...
            </p>
          ) : null}
          <div className={`${SEARCH_PANEL_SCROLL_CLASS} space-y-3`}>
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
                  className={`space-y-2 ${showDividerAfter ? 'border-b border-[color:var(--border-soft)] pb-3' : ''}`}
                >
                  {group.title ? (
                    <div className="space-y-0.5 px-1.5">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                        {group.title}
                      </p>
                      {group.note ? (
                        <p className="text-[0.72rem] text-[color:var(--ink-muted)]">{group.note}</p>
                      ) : null}
                    </div>
                  ) : group.note ? (
                    <p className="px-1.5 text-[0.72rem] text-[color:var(--ink-muted)]">
                      {group.note}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {group.items.map((item, index) => {
                      const absoluteIndex = startIndex + index;
                      const isActive = absoluteIndex === activeIndex;
                      const toneClass =
                        item.variant === 'global'
                          ? isActive
                            ? 'border-[color:var(--border-strong)] bg-[color:var(--surface-soft)]'
                            : 'border-transparent bg-[color:var(--surface-muted)] hover:bg-white'
                          : isActive
                            ? 'border-[color:var(--accent-strong)] bg-[color:var(--surface-soft)]'
                            : 'border-transparent bg-transparent hover:bg-[color:var(--surface-muted)]';

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => onHoverIndex(absoluteIndex)}
                          onClick={() => onSelect(item)}
                          className={`w-full rounded-[16px] border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${toneClass}`}
                          aria-selected={isActive}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[0.9rem] font-semibold text-[color:var(--ink)]">
                                {item.label}
                              </p>
                              {item.secondary ? (
                                <p className="mt-0.5 truncate text-[0.74rem] leading-4 text-[color:var(--ink-muted)]">
                                  {item.secondary}
                                </p>
                              ) : null}
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
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
