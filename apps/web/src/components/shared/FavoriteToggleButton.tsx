import { memo } from 'react';
import { cn } from '@/components/ui/cn';

type FavoriteToggleButtonProps = {
  isActive: boolean;
  onClick: () => void;
  className?: string;
  variant?: 'floating' | 'pill';
  tone?: 'light' | 'default';
  activeLabel?: string;
  inactiveLabel?: string;
};

const HeartIcon = ({ isActive }: { isActive: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-4 w-4"
    fill={isActive ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20.5s-7-4.4-9.2-8.8C1 8.4 3 4.8 6.7 4.8c2.1 0 3.5 1.1 4.3 2.4.8-1.3 2.2-2.4 4.3-2.4 3.7 0 5.7 3.6 3.9 6.9C19 16.1 12 20.5 12 20.5Z" />
  </svg>
);

export default memo(function FavoriteToggleButton({
  isActive,
  onClick,
  className,
  variant = 'floating',
  tone = 'default',
  activeLabel = 'En favoritos',
  inactiveLabel = 'Guardar',
}: FavoriteToggleButtonProps) {
  const baseClassName =
    variant === 'pill'
      ? 'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
      : 'inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';

  const paletteClassName = isActive
    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
    : tone === 'light'
      ? 'border-white/70 bg-white/92 text-[#0E2A47]'
      : 'border-[#DCE4EC] bg-white text-[#0E2A47]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={isActive ? activeLabel : inactiveLabel}
      className={cn(baseClassName, paletteClassName, className)}
    >
      <HeartIcon isActive={isActive} />
      {variant === 'pill' ? <span>{isActive ? activeLabel : inactiveLabel}</span> : null}
    </button>
  );
});
