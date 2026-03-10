'use client';

import { cn } from '@/components/ui/cn';
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/theme';
import { useTheme } from '@/components/theme/ThemeProvider';

type ThemeSwitcherProps = {
  className?: string;
  variant?: 'default' | 'compact';
  showLabel?: boolean;
};

const labelByValue: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Sistema',
};

export default function ThemeSwitcher({
  className,
  variant = 'default',
  showLabel = true,
}: ThemeSwitcherProps) {
  const { themePreference, setThemePreference } = useTheme();
  const compact = variant === 'compact';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLabel ? (
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Apariencia
        </p>
      ) : null}
      <div className="inline-flex items-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-1 shadow-[var(--shadow-card)] backdrop-blur">
        {THEME_PREFERENCES.map((value) => {
          const isActive = themePreference === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setThemePreference(value)}
              className={cn(
                'rounded-full font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]',
                compact ? 'px-2.5 py-1.5 text-[0.68rem]' : 'px-3.5 py-2 text-xs',
                isActive
                  ? 'bg-[color:var(--surface-strong)] text-[color:var(--accent-strong)] shadow-[var(--shadow-card)]'
                  : 'text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--ink)]',
              )}
              aria-pressed={isActive}
            >
              {labelByValue[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
