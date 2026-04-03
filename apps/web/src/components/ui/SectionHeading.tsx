import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type SectionHeadingProps = {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
};

export default function SectionHeading({
  kicker,
  title,
  description,
  action,
  align = 'left',
  className,
}: SectionHeadingProps) {
  const isCentered = align === 'center';

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        isCentered ? 'items-center justify-center text-center sm:flex-col sm:items-center sm:justify-center' : '',
        className,
      )}
    >
      <div
        className={cn(
          'space-y-3',
          isCentered ? 'mx-auto flex w-full max-w-2xl flex-col items-center text-center' : 'max-w-3xl',
        )}
      >
        {kicker ? (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--ink-faint)]">
            {kicker}
          </p>
        ) : null}
        <div className={cn('space-y-2', isCentered ? 'mx-auto w-full text-center' : '')}>
          <h2 className="text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-[color:var(--ink-muted)] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
