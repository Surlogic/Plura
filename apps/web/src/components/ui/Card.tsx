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
    'border-[color:var(--border-soft)] bg-white/96 shadow-[var(--shadow-card)]',
  soft:
    'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-card)]',
  glass:
    'border-white/70 bg-white/88 shadow-[var(--shadow-glass)] backdrop-blur',
  dark:
    'border-white/10 bg-[#0c1d34]/92 text-white shadow-[var(--shadow-lift)]',
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
