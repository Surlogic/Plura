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

const getLogoImageSizeClass = (size: number) => {
  if (size <= 30) return 'h-[30px] w-[30px]';
  if (size >= 38) return 'h-[38px] w-[38px]';
  return 'h-[36px] w-[36px]';
};

const getLogoTextSizeClass = (size: number) => {
  if (size <= 30) return 'text-[18px]';
  if (size >= 38) return 'text-[24px]';
  return 'text-[22px]';
};

function LogoContent({
  size,
  textClassName,
  priority,
}: LogoContentProps) {
  const imageSizeClass = getLogoImageSizeClass(size);
  const textSizeClass = getLogoTextSizeClass(size);

  return (
    <>
      <Image
        src="/logo.png"
        alt="Plura"
        width={size}
        height={size}
        className={`shrink-0 object-contain ${imageSizeClass}`}
        priority={priority}
      />
      <span
        className={`logo-type leading-none ${textClassName} ${textSizeClass}`.trim()}
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
