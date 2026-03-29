import type { ReactNode } from 'react';
import { SEARCH_CONTROL_HEIGHT_CLASS } from '@/components/search/searchUi';

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
  const baseClassName = `group flex w-full min-w-0 flex-col justify-center rounded-[24px] border px-4 py-3 text-left transition ${SEARCH_CONTROL_HEIGHT_CLASS} ${
    active
      ? 'border-[color:var(--border-strong)] bg-white shadow-[0_18px_36px_-28px_rgba(14,42,71,0.42)]'
      : 'border-transparent bg-[color:var(--surface-muted)] hover:border-[color:var(--border-soft)] hover:bg-white'
  } ${className}`.trim();

  const content = (
    <>
      <span className="truncate whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
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
        className={`${baseClassName} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`${baseClassName} focus-within:border-[color:var(--accent-strong)] focus-within:ring-2 focus-within:ring-[color:var(--accent-soft)] focus-within:ring-offset-2`}
    >
      {content}
    </div>
  );
}
