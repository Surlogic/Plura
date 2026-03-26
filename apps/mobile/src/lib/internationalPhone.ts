export type PhoneCountryOption = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  exampleNational: string;
};

export const DEFAULT_PHONE_COUNTRY_CODE = 'UY';

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { code: 'AR', name: 'Argentina', dialCode: '54', flag: '🇦🇷', exampleNational: '11 2345 6789' },
  { code: 'UY', name: 'Uruguay', dialCode: '598', flag: '🇺🇾', exampleNational: '99 123 456' },
  { code: 'BR', name: 'Brasil', dialCode: '55', flag: '🇧🇷', exampleNational: '11 91234 5678' },
  { code: 'CL', name: 'Chile', dialCode: '56', flag: '🇨🇱', exampleNational: '9 8765 4321' },
  { code: 'CO', name: 'Colombia', dialCode: '57', flag: '🇨🇴', exampleNational: '310 123 4567' },
  { code: 'MX', name: 'México', dialCode: '52', flag: '🇲🇽', exampleNational: '55 1234 5678' },
  { code: 'PE', name: 'Perú', dialCode: '51', flag: '🇵🇪', exampleNational: '912 345 678' },
  { code: 'PY', name: 'Paraguay', dialCode: '595', flag: '🇵🇾', exampleNational: '981 234 567' },
  { code: 'BO', name: 'Bolivia', dialCode: '591', flag: '🇧🇴', exampleNational: '7123 4567' },
  { code: 'EC', name: 'Ecuador', dialCode: '593', flag: '🇪🇨', exampleNational: '99 123 4567' },
  { code: 'VE', name: 'Venezuela', dialCode: '58', flag: '🇻🇪', exampleNational: '412 123 4567' },
  { code: 'CR', name: 'Costa Rica', dialCode: '506', flag: '🇨🇷', exampleNational: '8312 3456' },
  { code: 'PA', name: 'Panamá', dialCode: '507', flag: '🇵🇦', exampleNational: '6123 4567' },
  { code: 'GT', name: 'Guatemala', dialCode: '502', flag: '🇬🇹', exampleNational: '5123 4567' },
  { code: 'SV', name: 'El Salvador', dialCode: '503', flag: '🇸🇻', exampleNational: '7123 4567' },
  { code: 'HN', name: 'Honduras', dialCode: '504', flag: '🇭🇳', exampleNational: '9123 4567' },
  { code: 'NI', name: 'Nicaragua', dialCode: '505', flag: '🇳🇮', exampleNational: '8123 4567' },
  { code: 'CU', name: 'Cuba', dialCode: '53', flag: '🇨🇺', exampleNational: '5 123 4567' },
  { code: 'US', name: 'Estados Unidos', dialCode: '1', flag: '🇺🇸', exampleNational: '202 555 0123' },
  { code: 'CA', name: 'Canadá', dialCode: '1', flag: '🇨🇦', exampleNational: '416 555 0123' },
  { code: 'DO', name: 'República Dominicana', dialCode: '1', flag: '🇩🇴', exampleNational: '809 555 1234' },
  { code: 'ES', name: 'España', dialCode: '34', flag: '🇪🇸', exampleNational: '612 34 56 78' },
  { code: 'PT', name: 'Portugal', dialCode: '351', flag: '🇵🇹', exampleNational: '912 345 678' },
  { code: 'IT', name: 'Italia', dialCode: '39', flag: '🇮🇹', exampleNational: '312 345 6789' },
  { code: 'FR', name: 'Francia', dialCode: '33', flag: '🇫🇷', exampleNational: '6 12 34 56 78' },
  { code: 'DE', name: 'Alemania', dialCode: '49', flag: '🇩🇪', exampleNational: '1512 3456789' },
  { code: 'GB', name: 'Reino Unido', dialCode: '44', flag: '🇬🇧', exampleNational: '7400 123456' },
];

const countriesByCode = new Map(PHONE_COUNTRY_OPTIONS.map((country) => [country.code, country]));
const countriesByDialCode = [...PHONE_COUNTRY_OPTIONS].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
);

export const sanitizePhoneLocalNumber = (value: string) => value.replace(/\D/g, '').slice(0, 15);

export const countPhoneDigits = (value: string) => value.replace(/\D/g, '').length;

export const hasMinimumPhoneDigits = (value: string, minimum = 8) => countPhoneDigits(value) >= minimum;

export const getPhoneCountryOption = (countryCode: string | null | undefined) =>
  countriesByCode.get((countryCode || '').toUpperCase()) || countriesByCode.get(DEFAULT_PHONE_COUNTRY_CODE)!;

export const buildInternationalPhoneNumber = (countryCode: string, nationalNumber: string) => {
  const country = getPhoneCountryOption(countryCode);
  const digits = sanitizePhoneLocalNumber(nationalNumber);
  if (!digits) {
    return '';
  }
  return `+${country.dialCode}${digits}`;
};

export const splitInternationalPhoneNumber = (
  value: string,
  fallbackCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
) => {
  const digits = sanitizePhoneLocalNumber(value);
  const fallbackCountry = getPhoneCountryOption(fallbackCountryCode);

  if (!digits) {
    return {
      countryCode: fallbackCountry.code,
      nationalNumber: '',
    };
  }

  if (digits.startsWith(fallbackCountry.dialCode)) {
    const fallbackNationalNumber = digits.slice(fallbackCountry.dialCode.length) || digits;
    return {
      countryCode: fallbackCountry.code,
      nationalNumber: fallbackNationalNumber,
    };
  }

  const matchedCountry = countriesByDialCode.find((country) => digits.startsWith(country.dialCode));
  if (!matchedCountry) {
    return {
      countryCode: fallbackCountry.code,
      nationalNumber: digits,
    };
  }

  const nationalNumber = digits.slice(matchedCountry.dialCode.length) || digits;
  return {
    countryCode: matchedCountry.code,
    nationalNumber,
  };
};

