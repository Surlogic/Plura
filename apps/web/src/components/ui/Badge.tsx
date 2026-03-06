import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type BadgeVariant = 'neutral' | 'accent' | 'warm' | 'contrast';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variantClassNames: Record<BadgeVariant, string> = {
  neutral: 'border-[color:var(--border-soft)] bg-white/78 text-[color:var(--ink)]',
  accent:
    'border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]',
  warm:
    'border-[color:var(--warm-soft)] bg-[color:var(--warm-soft)] text-[color:var(--warm)]',
  contrast: 'border-white/14 bg-white/8 text-white',
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
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase',
        variantClassNames[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
