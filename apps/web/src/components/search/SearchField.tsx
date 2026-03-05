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
  const baseClassName = `flex min-h-[62px] w-full min-w-0 flex-col justify-between rounded-xl border px-3 py-2 text-left transition ${
    active
      ? 'border-[#BFD3C9] bg-white shadow-[0_2px_8px_rgba(14,42,71,0.06)]'
      : 'border-transparent bg-transparent hover:border-[#DEE8E3]'
  } ${className}`.trim();

  const content = (
    <>
      <span className="truncate whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#9AA7B5]">
        {label}
      </span>
      <div className={`mt-1 min-w-0 ${valueClassName}`.trim()}>{children}</div>
    </>
  );

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClassName} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/12`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${baseClassName} focus-within:ring-2 focus-within:ring-[#1B6B5C]/12`}>
      {content}
    </div>
  );
}
