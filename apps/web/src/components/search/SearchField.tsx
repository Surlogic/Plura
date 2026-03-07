import type { ReactNode } from 'react';

type SearchFieldProps = {
  label: string;
  active?: boolean;
  asButton?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
};

export default function SearchField({
  label,
  active = false,
  asButton = false,
  onClick,
  children,
  className = '',
  valueClassName = '',
}: SearchFieldProps) {
  const baseClassName = `flex min-h-[70px] w-full min-w-0 flex-col justify-center rounded-[24px] border px-4 py-[0.85rem] text-left transition ${
    active
      ? 'border-white/90 bg-white shadow-[0_16px_30px_-24px_rgba(14,42,71,0.42)]'
      : 'border-transparent bg-white/18 hover:bg-white/42'
  } ${className}`.trim();

  const content = (
    <>
      <span className="truncate whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
        {label}
      </span>
      <div className={`mt-1.5 min-w-0 ${valueClassName}`.trim()}>{children}</div>
    </>
  );

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClassName} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${baseClassName} focus-within:ring-2 focus-within:ring-[color:var(--accent-soft)]`}>
      {content}
    </div>
  );
}
