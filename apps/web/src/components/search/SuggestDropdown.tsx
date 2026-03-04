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
    <div className="w-full overflow-hidden rounded-xl border border-[#DCE8E3] bg-white p-2.5 shadow-[0_10px_22px_rgba(14,42,71,0.10)] pointer-events-auto">
      {flattened.length === 0 ? (
        <p className="px-1 py-2 text-sm text-[#6C7E8F]">Sin sugerencias por ahora.</p>
      ) : (
        <>
          {loading ? (
            <p className="px-1 pb-2 text-xs font-medium text-[#6C7E8F]">Actualizando sugerencias...</p>
          ) : null}
          <div className="max-h-[320px] space-y-3 overflow-y-auto overscroll-contain pr-1">
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
                  className={`space-y-1.5 ${showDividerAfter ? 'border-b border-[#E5EDF3] pb-2.5' : ''}`}
                >
                  {group.title ? (
                    <p className="px-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#7D8EA1]">
                      {group.title}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {group.items.map((item, index) => {
                      const absoluteIndex = startIndex + index;
                      const isActive = absoluteIndex === activeIndex;
                      const isGlobal = item.variant === 'global';
                      const isRecent = item.variant === 'recent';

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => onHoverIndex(absoluteIndex)}
                          onClick={() => onSelect(item)}
                          className={`w-full rounded-xl px-3 py-2 text-left transition focus:outline-none ${
                            isGlobal
                              ? isActive
                                ? 'bg-[#EAF2F7]'
                                : 'bg-[#F8FAFC] hover:bg-[#EEF3F8]'
                              : isRecent
                                ? isActive
                                  ? 'bg-[#EFF5FB]'
                                  : 'bg-[#FBFDFF] hover:bg-[#F1F6FC]'
                              : isActive
                                ? 'bg-[#EAF4EF]'
                                : 'hover:bg-[#F6FBF8]'
                          }`}
                          aria-selected={isActive}
                        >
                          <p
                            className={`truncate text-sm font-semibold ${
                              isGlobal ? 'text-[#102A43]' : 'text-[#0E2A47]'
                            }`}
                          >
                            {item.label}
                          </p>
                          {item.secondary ? (
                            <p className="truncate text-xs text-[#66788B]">{item.secondary}</p>
                          ) : null}
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
