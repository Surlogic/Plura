import type { ChangeEventHandler, FocusEventHandler } from 'react';

type PasswordInputProps = {
  className: string;
  name: string;
  value: string;
  placeholder?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  required?: boolean;
  minLength?: number;
};

export default function PasswordInput({
  className,
  name,
  value,
  placeholder,
  isVisible,
  onToggleVisibility,
  onChange,
  onBlur,
  required,
  minLength,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <input
        type={isVisible ? 'text' : 'password'}
        className={`${className} pr-12`}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]"
        aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={isVisible}
        onClick={onToggleVisibility}
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="3" />
          {isVisible ? <path d="m4 4 16 16" /> : null}
        </svg>
      </button>
    </div>
  );
}
