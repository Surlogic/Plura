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
  const baseClassName = `flex min-h-[74px] w-full min-w-0 flex-col justify-center rounded-[22px] border px-4 py-3 text-left transition ${
    active
      ? 'border-[color:var(--border-strong)] bg-white shadow-[0_8px_24px_rgba(14,42,71,0.10)]'
      : 'border-transparent bg-transparent hover:border-[color:var(--border-soft)] hover:bg-white/68'
  } ${className}`.trim();

  const content = (
    <>
      <span className="truncate whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
        {label}
      </span>
      <div className={`mt-2 min-w-0 ${valueClassName}`.trim()}>{children}</div>
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
