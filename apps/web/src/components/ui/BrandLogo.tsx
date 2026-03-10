import Logo from '@/components/ui/Logo';
import { cn } from '@/components/ui/cn';

export type BrandLogoVariant = 'navbar' | 'footer' | 'mobile' | 'auth';

type BrandLogoProps = {
  href?: string;
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  logoVariant?: 'default' | 'dark' | 'symbol' | 'mono';
};

const variantConfig: Record<
  BrandLogoVariant,
  {
    size: number;
    className: string;
  }
> = {
  navbar: {
    size: 34,
    className: 'min-h-12 py-1',
  },
  footer: {
    size: 30,
    className: 'min-h-11 py-1',
  },
  mobile: {
    size: 30,
    className: 'min-h-11 py-1',
  },
  auth: {
    size: 38,
    className: 'min-h-14 py-1',
  },
};

export default function BrandLogo({
  href = '/',
  variant = 'navbar',
  className,
  priority = false,
  logoVariant = 'default',
}: BrandLogoProps) {
  const config = variantConfig[variant];

  return (
    <Logo
      href={href}
      size={config.size}
      priority={priority}
      variant={logoVariant}
      className={cn('inline-flex w-fit items-center', config.className, className)}
    />
  );
}
