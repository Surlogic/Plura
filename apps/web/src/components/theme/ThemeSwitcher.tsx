import { cn } from '@/components/ui/cn';
import { useTheme } from '@/components/theme/ThemeProvider';

type ThemeSwitcherProps = {
  className?: string;
  variant?: 'default' | 'compact';
  showLabel?: boolean;
};

const VISIBLE_THEME_OPTIONS = [
  {
    value: 'light',
    ariaLabel: 'Activar tema claro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2.75V5.25M12 18.75V21.25M21.25 12H18.75M5.25 12H2.75M18.54 5.46L16.77 7.23M7.23 16.77L5.46 18.54M18.54 18.54L16.77 16.77M7.23 7.23L5.46 5.46"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: 'dark',
    ariaLabel: 'Activar tema oscuro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="M20.2 14.2A8.5 8.5 0 1 1 9.8 3.8a7 7 0 1 0 10.4 10.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

export default function ThemeSwitcher({
  className,
  variant = 'default',
  showLabel = true,
}: ThemeSwitcherProps) {
  const { resolvedTheme, setThemePreference } = useTheme();
  const compact = variant === 'compact';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLabel ? (
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Apariencia
        </p>
      ) : null}
      <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-1 shadow-[var(--shadow-card)] backdrop-blur">
        {VISIBLE_THEME_OPTIONS.map(({ value, ariaLabel, icon }) => {
          const isActive = resolvedTheme === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setThemePreference(value)}
              className={cn(
                'inline-flex items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]',
                compact ? 'h-8 w-8' : 'h-9 w-9',
                isActive
                  ? 'bg-[color:var(--surface-strong)] text-[color:var(--accent-strong)] shadow-[var(--shadow-card)]'
                  : 'text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--ink)]',
              )}
              aria-pressed={isActive}
              aria-label={ariaLabel}
            >
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
