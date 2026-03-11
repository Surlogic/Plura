'use client';

import Logo from '@/components/ui/Logo';

type AuthLoadingOverlayProps = {
  visible: boolean;
  title: string;
  description?: string;
};

export default function AuthLoadingOverlay({
  visible,
  title,
  description,
}: AuthLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(4,18,31,0.72)] backdrop-blur-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(31,182,166,0.34),_transparent_42%),linear-gradient(140deg,rgba(8,27,47,0.98)_0%,rgba(14,42,71,0.98)_48%,rgba(31,182,166,0.9)_100%)]" />
      <div className="relative flex max-w-md flex-col items-center px-6 text-center text-white">
        <div className="logo-breathe flex h-40 w-40 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <Logo
            size={112}
            priority
            variant="symbol"
            symbolClassName="drop-shadow-[0_10px_30px_rgba(255,255,255,0.28)]"
          />
        </div>
        <h2 className="mt-8 text-3xl font-semibold leading-tight">{title}</h2>
        {description ? (
          <p className="mt-4 text-base leading-7 text-white/80">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
