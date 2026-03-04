import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  href?: string;
  size?: number;
  className?: string;
  textClassName?: string;
  priority?: boolean;
};

type LogoContentProps = {
  size: number;
  textClassName: string;
  priority: boolean;
};

function LogoContent({
  size,
  textClassName,
  priority,
}: LogoContentProps) {
  const textSize = Math.max(18, Math.round(size * 0.62));

  return (
    <>
      <Image
        src="/logo.png"
        alt="Plura"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: `${size}px`, height: `${size}px` }}
        priority={priority}
      />
      <span
        className={`logo-type leading-none ${textClassName}`.trim()}
        style={{ fontSize: `${textSize}px` }}
      >
        Plura
      </span>
    </>
  );
}

export default function Logo({
  href,
  size = 36,
  className = '',
  textClassName = 'text-[#0E2A47]',
  priority = false,
}: LogoProps) {
  const wrapperClassName = `inline-flex items-center gap-2.5 ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={wrapperClassName}>
        <LogoContent size={size} textClassName={textClassName} priority={priority} />
      </Link>
    );
  }

  return (
    <div className={wrapperClassName}>
      <LogoContent size={size} textClassName={textClassName} priority={priority} />
    </div>
  );
}
