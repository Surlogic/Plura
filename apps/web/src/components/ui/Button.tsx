import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'accent' | 'contrast';
type ButtonSize = 'sm' | 'md' | 'lg';

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type LinkButtonProps = CommonProps & {
  href: string;
};

type NativeButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export type ButtonProps = LinkButtonProps | NativeButtonProps;

const baseClassName =
  'inline-flex items-center justify-center rounded-full border font-semibold tracking-[-0.01em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)] disabled:pointer-events-none disabled:opacity-60';

const sizeClassNames: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    'border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-[color:var(--primary-strong)] hover:bg-[color:var(--primary-strong)]',
  secondary:
    'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)] shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]',
  quiet:
    'border-transparent bg-transparent text-[color:var(--ink)] shadow-none hover:bg-[color:var(--surface-soft)]',
  accent:
    'border-[color:var(--accent-soft)] bg-[color:var(--surface-strong)] text-[color:var(--accent-strong)] shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]',
  contrast:
    'border-white/[0.42] bg-white/[0.02] text-[#F4F8FB] shadow-[var(--shadow-card)] backdrop-blur-sm hover:-translate-y-0.5 hover:border-white/[0.42] hover:bg-white/[0.06]',
};

export default function Button({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  ...props
}: ButtonProps) {
  const resolvedClassName = cn(
    baseClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    className,
  );

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={resolvedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={resolvedClassName}>
      {children}
    </button>
  );
}
