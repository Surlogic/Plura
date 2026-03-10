import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type CardTone = 'default' | 'soft' | 'glass' | 'dark';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: CardTone;
  padding?: CardPadding;
};

const toneClassNames: Record<CardTone, string> = {
  default:
    'border-[color:var(--border-soft)] bg-[color:var(--surface)] shadow-[var(--shadow-card)]',
  soft:
    'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-card)]',
  glass:
    'border-[color:var(--border-soft)] bg-[color:var(--surface)] shadow-[var(--shadow-glass)] backdrop-blur-xl',
  dark:
    'border-white/10 bg-[linear-gradient(160deg,var(--brand-navy)_0%,var(--brand-navy-soft)_58%,var(--brand-navy-elevated)_100%)] text-[color:var(--text-on-dark)] shadow-[var(--shadow-lift)]',
};

const paddingClassNames: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className,
  tone = 'default',
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-[28px] border',
        toneClassNames[tone],
        paddingClassNames[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
