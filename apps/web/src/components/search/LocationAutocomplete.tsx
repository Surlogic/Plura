import type { GeoAutocompleteItem, SearchSuggestionItem } from '@/types/search';

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
  onPickPopularNearby: (item: SearchSuggestionItem) => void;
};

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
  onPickPopularNearby,
}: LocationAutocompleteProps) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onUseCurrentLocation}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 text-xs font-semibold text-[color:var(--accent-strong)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        disabled={geoStatus === 'loading'}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="9" r="1.6" fill="currentColor" />
        </svg>
        {geoStatus === 'loading' ? 'Detectando...' : 'Usar mi ubicacion'}
      </button>

      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-faint)]"
          aria-hidden="true"
        >
          <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="9" r="1.6" fill="currentColor" />
        </svg>
        <input
          value={locationInput}
          onChange={(event) => onLocationInputChange(event.target.value)}
          placeholder="Zona, barrio o ciudad"
          className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white px-12 text-sm font-medium text-[color:var(--ink)] placeholder:font-normal placeholder:text-[color:var(--ink-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
        />
      </div>

      {geoSuggestions.length > 0 ? (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {geoSuggestions.map((item) => (
            <button
              key={`${item.label}-${item.city}`}
              type="button"
              onClick={() => onSelectGeoItem(item)}
              className="w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white px-3.5 py-3 text-left transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
            >
              <p className="truncate text-sm font-semibold text-[color:var(--ink)]">{item.label}</p>
              {item.city ? <p className="truncate pt-0.5 text-xs text-[color:var(--ink-muted)]">{item.city}</p> : null}
            </button>
          ))}
        </div>
      ) : recentCities.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Busquedas recientes
          </p>
          <div className="flex flex-wrap gap-1.5">
          {recentCities.slice(0, 6).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
            >
              {city}
            </button>
          ))}
          </div>
        </div>
      ) : null}

      {popularNearby.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Populares en tu zona
          </p>
          <div className="flex flex-wrap gap-1.5">
            {popularNearby.slice(0, 6).map((item) => (
              <button
                key={`popular-${item.id || item.name}`}
                type="button"
                onClick={() => onPickPopularNearby(item)}
                className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[0.74rem] font-semibold text-[color:var(--accent-strong)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {geoMessage ? (
        <p className={`text-xs ${geoStatus === 'error' ? 'text-[#B42318]' : 'text-[color:var(--accent-strong)]'}`}>
          {geoMessage}
        </p>
      ) : null}
    </div>
  );
}
