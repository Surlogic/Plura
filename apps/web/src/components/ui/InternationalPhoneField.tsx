import { useEffect, useState } from 'react';
import {
  buildInternationalPhoneNumber,
  DEFAULT_PHONE_COUNTRY_CODE,
  getPhoneCountryOption,
  PHONE_COUNTRY_OPTIONS,
  sanitizePhoneLocalNumber,
  splitInternationalPhoneNumber,
} from '@/lib/phone/internationalPhone';

type InternationalPhoneFieldProps = {
  value: string;
  onChange: (nextValue: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputPlaceholder?: string;
  selectClassName?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  selectAriaLabel?: string;
  inputAriaLabel?: string;
};

export default function InternationalPhoneField({
  value,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  autoComplete = 'tel-national',
  inputPlaceholder,
  selectClassName,
  inputClassName,
  wrapperClassName = 'grid gap-3 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)]',
  selectAriaLabel = 'Código de país',
  inputAriaLabel = 'Número de teléfono',
}: InternationalPhoneFieldProps) {
  const [countryCode, setCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [nationalNumber, setNationalNumber] = useState('');

  useEffect(() => {
    const parsed = splitInternationalPhoneNumber(value, countryCode);
    if (value.trim()) {
      setCountryCode(parsed.countryCode);
    }
    setNationalNumber(parsed.nationalNumber);
  }, [countryCode, value]);

  const selectedCountry = getPhoneCountryOption(countryCode);

  const handleCountryChange = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    onChange(buildInternationalPhoneNumber(nextCountryCode, nationalNumber));
  };

  const handleNumberChange = (nextValue: string) => {
    const nextNationalNumber = sanitizePhoneLocalNumber(nextValue);
    setNationalNumber(nextNationalNumber);
    onChange(buildInternationalPhoneNumber(countryCode, nextNationalNumber));
  };

  return (
    <div className={wrapperClassName}>
      <select
        className={selectClassName}
        value={countryCode}
        onChange={(event) => handleCountryChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-label={selectAriaLabel}
      >
        {PHONE_COUNTRY_OPTIONS.map((country) => (
          <option key={country.code} value={country.code}>
            {`${country.flag} ${country.name} (+${country.dialCode})`}
          </option>
        ))}
      </select>
      <input
        className={inputClassName}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        value={nationalNumber}
        onChange={(event) => handleNumberChange(event.target.value)}
        onBlur={onBlur}
        placeholder={inputPlaceholder || selectedCountry.exampleNational}
        disabled={disabled}
        required={required}
        aria-label={inputAriaLabel}
      />
    </div>
  );
}

