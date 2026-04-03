import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type ToggleChipTone = 'soft' | 'solid';
type ToggleChipShape = 'pill' | 'tile';

type ToggleChipProps = {
  children: ReactNode;
  selected?: boolean;
  tone?: ToggleChipTone;
  shape?: ToggleChipShape;
  className?: string;
  disabled?: boolean;
  id?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
};

const baseClassName =
  'inline-flex border font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)] disabled:pointer-events-none disabled:opacity-60';

const shapeClassNames: Record<ToggleChipShape, string> = {
  pill: 'items-center justify-center rounded-full px-4 py-2 text-sm',
  tile: 'min-h-[72px] flex-col items-center justify-center rounded-[18px] px-2 py-3 text-center',
};

const selectedClassNames: Record<ToggleChipTone, string> = {
  soft:
    'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--ink)] shadow-[var(--shadow-card)]',
  solid:
    'border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-[var(--shadow-card)]',
};

const idleClassName =
  'border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] hover:-translate-y-0.5 hover:bg-[color:var(--surface-soft)]';

export default function ToggleChip({
  children,
  className,
  selected = false,
  tone = 'soft',
  shape = 'pill',
  type = 'button',
  ...props
}: ToggleChipProps) {
  return (
    <button
      type={type}
      id={props.id}
      aria-pressed={selected}
      disabled={props.disabled}
      onClick={props.onClick}
      title={props.title}
      className={cn(
        baseClassName,
        shapeClassNames[shape],
        selected ? selectedClassNames[tone] : idleClassName,
        className,
      )}
    >
      {children}
    </button>
  );
}
