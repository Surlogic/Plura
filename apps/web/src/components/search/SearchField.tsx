import type { ReactNode } from 'react';
import { SEARCH_CONTROL_HEIGHT_CLASS } from '@/components/search/searchUi';

type SearchFieldProps = {
  label: ReactNode;
  active?: boolean;
  asButton?: boolean;
  onClick?: () => void;
  onFocus?: () => void;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  chrome?: 'framed' | 'bare';
};

export default function SearchField({
  label,
  active = false,
  asButton = false,
  onClick,
  onFocus,
  children,
  className = '',
  labelClassName = '',
  valueClassName = '',
  chrome = 'framed',
}: SearchFieldProps) {
  const framedClassName = active
    ? 'border-[color:var(--border-strong)] bg-white shadow-[0_14px_28px_-24px_rgba(14,42,71,0.34)]'
    : 'border-transparent bg-[color:var(--surface-muted)] hover:bg-white';
  const bareClassName = active ? 'bg-transparent' : 'bg-transparent';
  const interactionClassName = chrome === 'bare'
    ? ''
    : 'focus-within:border-[color:var(--accent-strong)] focus-within:ring-2 focus-within:ring-[color:var(--accent-soft)] focus-within:ring-offset-2';
  const baseClassName = `group flex w-full min-w-0 flex-col justify-center text-left transition ${SEARCH_CONTROL_HEIGHT_CLASS} ${
    chrome === 'bare'
      ? `rounded-none border-0 px-0 py-0 ${bareClassName}`
      : `rounded-[18px] border px-3.5 py-2.5 ${framedClassName}`
  } ${className}`.trim();

  const content = (
    <>
      <span
        className={`flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)] ${labelClassName}`.trim()}
      >
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
        onFocus={onFocus}
        className={`${baseClassName} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`${baseClassName} ${interactionClassName}`.trim()}
    >
      {content}
    </div>
  );
}
