import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'warm'
  | 'contrast'
  | 'success'
  | 'info'
  | 'premium';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variantClassNames: Record<BadgeVariant, string> = {
  neutral:
    'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--text-secondary)]',
  accent:
    'border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]',
  warm:
    'border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] text-[color:var(--premium-strong)]',
  contrast:
    'border-white/12 bg-white/8 text-[color:var(--text-on-dark-secondary)]',
  success:
    'border-[color:var(--success-soft)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
  info:
    'border-[color:var(--info-soft)] bg-[color:var(--info-soft)] text-[color:var(--accent-strong)]',
  premium:
    'border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] text-[color:var(--premium-strong)]',
};

export default function Badge({
  children,
  className,
  variant = 'neutral',
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.14em] uppercase',
        variantClassNames[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
