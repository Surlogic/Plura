import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';

type LogoProps = {
  href?: string;
  size?: number;
  className?: string;
  textClassName?: string;
  symbolClassName?: string;
  priority?: boolean;
  variant?: 'default' | 'dark' | 'symbol' | 'mono';
};

type LogoContentProps = {
  size: number;
  textClassName: string;
  symbolClassName: string;
  priority: boolean;
  showWordmark: boolean;
  gap: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function LogoContent({
  size,
  textClassName,
  symbolClassName,
  priority,
  showWordmark,
  gap,
}: LogoContentProps) {
  const symbolSize = Math.max(20, Math.round(size));
  const wordmarkSize = clamp(Math.round(symbolSize * 0.72), 18, 25);
  const wrapperStyle = {
    gap: `${gap}px`,
  } satisfies CSSProperties;
  const symbolStyle = {
    width: `${symbolSize}px`,
    height: `${symbolSize}px`,
  } satisfies CSSProperties;
  const wordmarkStyle = {
    fontSize: `${wordmarkSize}px`,
  } satisfies CSSProperties;

  return (
    <span className="inline-flex items-center" style={wrapperStyle}>
      <Image
        src="/logo-symbol.png"
        alt="Plura"
        width={symbolSize}
        height={symbolSize}
        className={`shrink-0 object-contain ${symbolClassName}`.trim()}
        style={symbolStyle}
        priority={priority}
      />
      {showWordmark ? (
        <span
          className={`logo-type leading-none ${textClassName}`.trim()}
          style={wordmarkStyle}
        >
          Plura
        </span>
      ) : null}
    </span>
  );
}

export default function Logo({
  href,
  size = 100,
  className = '',
  textClassName,
  symbolClassName = '',
  priority = false,
  variant = 'default',
}: LogoProps) {
  const resolvedGap = Math.max(8, Math.round(size * 0.28));
  const resolvedTextClassName = textClassName ?? (
    variant === 'dark' ? 'text-white' : 'text-[color:var(--primary)]'
  );
  const resolvedSymbolClassName = [
    variant === 'mono' ? 'grayscale brightness-[0.72] contrast-[1.18]' : '',
    symbolClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const wrapperClassName = `inline-flex items-center align-middle ${className}`.trim();
  const showWordmark = variant !== 'symbol';

  if (href) {
    return (
      <Link href={href} className={wrapperClassName}>
        <LogoContent
          size={size}
          textClassName={resolvedTextClassName}
          symbolClassName={resolvedSymbolClassName}
          priority={priority}
          showWordmark={showWordmark}
          gap={resolvedGap}
        />
      </Link>
    );
  }

  return (
    <div className={wrapperClassName}>
      <LogoContent
        size={size}
        textClassName={resolvedTextClassName}
        symbolClassName={resolvedSymbolClassName}
        priority={priority}
        showWordmark={showWordmark}
        gap={resolvedGap}
      />
    </div>
  );
}
