import Button from '@/components/ui/Button';
import BrandLogo from '@/components/ui/BrandLogo';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';

type AuthTopBarProps = {
  tone: 'professional' | 'client';
};

const toneStyles = {
  professional: {
    header: 'border-[color:var(--border-soft)] bg-[color:var(--surface)]/92',
    action:
      'border-[color:var(--border-soft)] text-[color:var(--ink)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)] focus-visible:ring-[color:var(--focus-ring)]',
  },
  client: {
    header: 'border-[color:var(--border-soft)] bg-white/88',
    action:
      'border-[color:var(--border-soft)] text-[color:var(--ink)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)] focus-visible:ring-[color:var(--focus-ring)]',
  },
} as const;

export default function AuthTopBar({ tone }: AuthTopBarProps) {
  const styles = toneStyles[tone];

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${styles.header}`}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <BrandLogo href="/" variant="auth" priority />
        <div className="flex items-center gap-3">
          <ThemeSwitcher variant="compact" showLabel={false} />
          <Button
            href="/"
            variant="secondary"
            size="sm"
            className={styles.action}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    </header>
  );
}
