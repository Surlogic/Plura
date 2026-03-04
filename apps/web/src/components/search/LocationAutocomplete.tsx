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
    <div className="space-y-2">
      <button
        type="button"
        onClick={onUseCurrentLocation}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D0E1D7] bg-white px-2.5 text-[0.7rem] font-semibold text-[#1B6B5C] transition hover:bg-[#F1F8F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/25"
        disabled={geoStatus === 'loading'}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="9" r="1.6" fill="currentColor" />
        </svg>
        {geoStatus === 'loading' ? 'Detectando...' : 'Usar mi ubicacion'}
      </button>

      <input
        value={locationInput}
        onChange={(event) => onLocationInputChange(event.target.value)}
        placeholder="Ciudad o barrio"
        className="h-9 w-full rounded-lg border border-[#D9E6DF] bg-white px-2.5 text-sm text-[#0E2A47] placeholder:text-[#8090A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
      />

      {geoSuggestions.length > 0 ? (
        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {geoSuggestions.map((item) => (
            <button
              key={`${item.label}-${item.city}`}
              type="button"
              onClick={() => onSelectGeoItem(item)}
              className="w-full rounded-md border border-[#DCE8E3] bg-white px-2 py-1.5 text-left transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
            >
              <p className="truncate text-xs font-semibold text-[#0E2A47]">{item.label}</p>
              {item.city ? <p className="truncate text-[0.7rem] text-[#66788B]">{item.city}</p> : null}
            </button>
          ))}
        </div>
      ) : recentCities.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {recentCities.slice(0, 6).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className="rounded-full border border-[#D5E4DC] bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-[#4E6072] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
            >
              {city}
            </button>
          ))}
        </div>
      ) : null}

      {popularNearby.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#8B9BAC]">
            Populares en tu zona
          </p>
          <div className="flex flex-wrap gap-1">
            {popularNearby.slice(0, 6).map((item) => (
              <button
                key={`popular-${item.id || item.name}`}
                type="button"
                onClick={() => onPickPopularNearby(item)}
                className="rounded-full border border-[#D5E4DC] bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-[#1B6B5C] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/20"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {geoMessage ? (
        <p className={`text-xs ${geoStatus === 'error' ? 'text-[#B42318]' : 'text-[#1B6B5C]'}`}>
          {geoMessage}
        </p>
      ) : null}
    </div>
  );
}
