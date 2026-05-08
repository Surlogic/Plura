import Link from 'next/link';

type LogoProps = {
  href?: string;
  size?: number;
  className?: string;
  textClassName?: string;
  symbolClassName?: string;
  priority?: boolean;
  variant?: 'default' | 'dark' | 'symbol' | 'mono';
};

export default function Logo({
  href,
  className = '',
  textClassName,
  variant = 'default',
}: LogoProps) {
  const resolvedTextClassName = textClassName ?? (
    variant === 'dark' ? 'text-white' : 'text-[color:var(--primary)]'
  );
  const wrapperClassName = `inline-flex items-center align-middle ${className}`.trim();
  const label = 'Marketplace de cuidado personal';
  const content = (
    <span className={`text-sm font-semibold leading-tight sm:text-base ${resolvedTextClassName}`.trim()}>
      {label}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={wrapperClassName}>
        {content}
      </Link>
    );
  }

  return (
    <div className={wrapperClassName}>
      {content}
    </div>
  );
}
