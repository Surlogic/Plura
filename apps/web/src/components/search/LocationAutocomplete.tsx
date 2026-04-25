import type { GeoAutocompleteItem, SearchSuggestionItem } from '@/types/search';
import { SEARCH_DEFAULT_RADIUS_KM } from '@/config/search';
import { SEARCH_CHIP_CLASS } from '@/components/search/searchUi';

type LocationAutocompleteProps = {
  locationInput: string;
  onLocationInputChange: (value: string) => void;
  onUseCurrentLocation: () => void;
  onSelectGeoItem: (item: GeoAutocompleteItem) => void;
  onSelectCity: (city: string) => void;
  geoSuggestions: GeoAutocompleteItem[];
  recentCities: string[];
  geoStatus: 'idle' | 'loading' | 'active' | 'error';
  geoMessage: string;
  popularNearby: SearchSuggestionItem[];
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  onPickPopularNearby: (item: SearchSuggestionItem) => void;
};

const RADIUS_OPTIONS = [3, 5, 10, 20, 30];

export default function LocationAutocomplete({
  locationInput,
  onLocationInputChange,
  onUseCurrentLocation,
  onSelectGeoItem,
  onSelectCity,
  geoSuggestions,
  recentCities,
  geoStatus,
  geoMessage,
  popularNearby,
  radiusKm,
  onRadiusChange,
  onPickPopularNearby,
}: LocationAutocompleteProps) {
  const showEmptySuggestions = locationInput.trim().length >= 2 && geoSuggestions.length === 0;
  const selectedRadiusOption = RADIUS_OPTIONS.includes(Math.round(radiusKm))
    ? Math.round(radiusKm)
    : SEARCH_DEFAULT_RADIUS_KM;
  const showRadiusSelector = geoStatus === 'active' || Boolean(locationInput.trim()) || geoSuggestions.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-faint)]"
            aria-hidden="true"
          >
            <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="10" cy="9" r="1.6" fill="currentColor" />
          </svg>
          <input
            value={locationInput}
            onChange={(event) => onLocationInputChange(event.target.value)}
            placeholder="Zona, barrio o ciudad"
            className="h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white px-10 text-sm font-medium text-[color:var(--ink)] placeholder:font-normal placeholder:text-[color:var(--ink-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
          />
        </div>

        <button
          type="button"
          onClick={onUseCurrentLocation}
          className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-4 text-[0.76rem] font-semibold text-[color:var(--ink)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
          disabled={geoStatus === 'loading'}
        >
          {geoStatus === 'loading' ? 'Detectando...' : 'Usar mi ubicacion'}
        </button>
      </div>

      {showRadiusSelector ? (
        <label className="flex items-center justify-between gap-3 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-3 py-2">
          <span className="min-w-0">
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
              Radio de búsqueda
            </span>
            <span className="block text-[0.76rem] text-[color:var(--ink-muted)]">
              Se aplica cuando usás ubicación o coordenadas.
            </span>
          </span>
          <select
            value={String(selectedRadiusOption)}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="shrink-0 rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-sm font-semibold text-[color:var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
          >
            {RADIUS_OPTIONS.map((value) => (
              <option key={value} value={value}>{value} km</option>
            ))}
          </select>
        </label>
      ) : null}

      {geoSuggestions.length > 0 ? (
        <div className="space-y-1.5">
          {geoSuggestions.slice(0, 5).map((item) => (
            <button
              key={`${item.label}-${item.city}`}
              type="button"
              onClick={() => onSelectGeoItem(item)}
              className="w-full rounded-[14px] px-3 py-2 text-left transition hover:bg-[color:var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
            >
              <p className="truncate text-sm font-semibold text-[color:var(--ink)]">{item.label}</p>
              {item.city ? (
                <p className="truncate text-[0.74rem] text-[color:var(--ink-muted)]">{item.city}</p>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {showEmptySuggestions ? (
        <p className="text-[0.78rem] text-[color:var(--ink-muted)]">
          No encontramos coincidencias para esa ubicacion.
        </p>
      ) : null}

      {geoSuggestions.length === 0 && recentCities.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {recentCities.slice(0, 4).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className={SEARCH_CHIP_CLASS}
            >
              {city}
            </button>
          ))}
        </div>
      ) : null}

      {geoSuggestions.length === 0 && !locationInput.trim() && popularNearby.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {popularNearby.slice(0, 4).map((item) => (
            <button
              key={`popular-${item.id || item.name}`}
              type="button"
              onClick={() => onPickPopularNearby(item)}
              className={SEARCH_CHIP_CLASS}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      {geoMessage ? (
        <p
          className={`text-[0.74rem] ${
            geoStatus === 'error' ? 'text-[#B42318]' : 'text-[color:var(--ink-muted)]'
          }`}
        >
          {geoMessage}
        </p>
      ) : null}
    </div>
  );
}
