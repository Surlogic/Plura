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
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(255,250,244,0.18)] px-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="relative w-full max-w-[340px] rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-6 py-6 text-center shadow-[0_24px_70px_-44px_rgba(13,35,58,0.55),0_12px_28px_-24px_rgba(13,35,58,0.35)] ring-1 ring-black/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-card)]">
          <div className="logo-breathe">
            <Logo size={34} priority variant="symbol" />
          </div>
        </div>
        <div className="mx-auto mt-5 h-7 w-7 animate-spin rounded-full border-[3px] border-[color:var(--border-soft)] border-t-[color:var(--primary)]" />
        <div className="mt-5">
          <h2 className="text-lg font-semibold leading-tight text-[color:var(--ink)]">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
