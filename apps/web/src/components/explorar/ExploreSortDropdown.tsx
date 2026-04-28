import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { SearchSort } from '@/types/search';
import { cn } from '@/components/ui/cn';

export type ExploreSortOption = {
  value: SearchSort;
  label: string;
};

type ExploreSortDropdownProps = {
  value: SearchSort;
  options: ExploreSortOption[];
  onChange: (value: SearchSort) => void;
  className?: string;
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    className={cn(
      'h-4 w-4 text-[color:var(--ink-faint)] transition duration-200',
      open ? 'rotate-180' : 'rotate-0',
    )}
  >
    <path
      d="M5 7.5L10 12.5L15 7.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ExploreSortDropdown({
  value,
  options,
  onChange,
  className,
}: ExploreSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.value === value)),
    [options, value],
  );
  const selectedOption = options[selectedIndex] || options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlightedIndex]?.focus();
  }, [highlightedIndex, open]);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectOption = (nextValue: SearchSort) => {
    if (nextValue !== value) {
      onChange(nextValue);
    }
    closeMenu();
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => {
      const baseIndex = current >= 0 ? current : selectedIndex;
      return (baseIndex + direction + options.length) % options.length;
    });
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(event.key === 'ArrowDown'
        ? selectedIndex
        : (selectedIndex - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => {
        const nextOpen = !current;
        if (nextOpen) {
          setHighlightedIndex(selectedIndex);
        }
        return nextOpen;
      });
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(options[index]?.value || value);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => {
          setOpen((current) => {
            const nextOpen = !current;
            if (nextOpen) {
              setHighlightedIndex(selectedIndex);
            }
            return nextOpen;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'inline-flex min-h-11 items-center gap-3 rounded-full border border-[color:var(--border-soft)]',
          'bg-[color:var(--surface-muted)] pl-3 pr-3.5 text-left shadow-[var(--shadow-card)] transition',
          'hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]',
        )}
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
          Ordenar
        </span>
        <span className="max-w-[11rem] truncate text-sm font-semibold text-[color:var(--ink)]">
          {selectedOption?.label || value}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute right-0 top-[calc(100%+0.55rem)] z-[130] min-w-[15rem] overflow-hidden rounded-[22px]',
            'border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-2 shadow-[0_24px_50px_-36px_rgba(13,35,58,0.36)] ring-1 ring-black/5',
          )}
        >
          <div
            id={listboxId}
            role="listbox"
            aria-label="Ordenar resultados"
            className="space-y-1"
          >
            {options.map((option, index) => {
              const active = option.value === value;
              const highlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  tabIndex={highlighted ? 0 : -1}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onClick={() => selectOption(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[16px] border px-3 py-2.5 text-left transition',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]',
                    active
                      ? 'border-[color:var(--accent-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)]'
                      : highlighted
                        ? 'border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] text-[color:var(--ink)]'
                        : 'border-transparent bg-transparent text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--ink)]',
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                      {active ? 'Actual' : 'Disponible'}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
                      active
                        ? 'border-[color:var(--accent-soft)] bg-white text-[color:var(--accent-strong)]'
                        : 'border-transparent bg-[color:var(--surface-muted)] text-transparent',
                    )}
                  >
                    <CheckIcon />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
