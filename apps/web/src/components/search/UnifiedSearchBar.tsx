import {
  memo,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import DateFilter from '@/components/search/DateFilter';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import SearchField from '@/components/search/SearchField';
import SuggestDropdown from '@/components/search/SuggestDropdown';
import { slugToLabel } from '@/utils/searchQuery';
import {
  useUnifiedSearch,
  formatDateLabel,
  getAdaptiveValueClass,
  normalizeDate,
  type UnifiedSearchValues,
} from '@/hooks/useUnifiedSearch';

export type { UnifiedSearchValues };

type UnifiedSearchBarProps = {
  initialValues?: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  variant?: 'hero' | 'panel' | 'explore';
  submitLabel?: string;
  className?: string;
  showClearButton?: boolean;
  citySuggestions?: string[];
};

const SURFACE_CLASSES: Record<NonNullable<UnifiedSearchBarProps['variant']>, string> = {
  hero: 'border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_30px_70px_-42px_rgba(13,35,58,0.5)] backdrop-blur-xl',
  panel: 'border border-[color:var(--border-strong)] bg-white shadow-[var(--shadow-card)]',
  explore: 'border border-[color:var(--border-soft)] bg-white shadow-[var(--shadow-card)]',
};

export default memo(function UnifiedSearchBar({
  initialValues,
  fixedQuery,
  variant = 'panel',
  submitLabel = 'Buscar',
  className,
  showClearButton = false,
  citySuggestions = [],
}: UnifiedSearchBarProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const search = useUnifiedSearch({ initialValues, fixedQuery, citySuggestions });

  const {
    values,
    setValues,
    searchInput,
    setSearchInput,
    locationInput,
    setLocationInput,
    isSearchOpen,
    setIsSearchOpen,
    isDateOpen,
    setIsDateOpen,
    isLocationOpen,
    setIsLocationOpen,
    geoStatus,
    geoMessage,
    geoSuggestions,
    isSuggestLoading,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    dropdownGroups,
    flatDropdownItems,
    nearbyCandidates,
    mergedCitySuggestions,
    todayIso,
    runSearch,
    applySuggestion,
    handleUseCurrentLocation,
    selectGeoItem,
    selectCity,
    setAnytime,
    pickToday,
    pickTomorrow,
    pickThisWeek,
    handleClear,
    closeAllDropdowns,
  } = search;

  // Close dropdowns on outside click / escape
  const stableCloseAllDropdowns = useCallback(() => closeAllDropdowns(), [closeAllDropdowns]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        stableCloseAllDropdowns();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stableCloseAllDropdowns();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [stableCloseAllDropdowns]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch({
      ...values,
      query: searchInput.trim() || values.query,
    });
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (flatDropdownItems.length === 0) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestionIndex((current) =>
        current < flatDropdownItems.length - 1 ? current + 1 : flatDropdownItems.length - 1,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      if (flatDropdownItems.length === 0) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestionIndex((current) => (current > 0 ? current - 1 : 0));
      return;
    }

    if (event.key === 'Enter') {
      if (isSearchOpen && activeSuggestionIndex >= 0 && flatDropdownItems[activeSuggestionIndex]) {
        event.preventDefault();
        applySuggestion(flatDropdownItems[activeSuggestionIndex], true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const onClearClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    handleClear();
  };

  const hasCoordinates = typeof values.lat === 'number' && typeof values.lng === 'number';
  const inputPlaceholder = values.categorySlug
    ? `Buscar en ${slugToLabel(values.categorySlug)}`
    : 'Servicio o profesional';

  const dateSummaryBase = values.date
    ? formatDateLabel(values.date)
    : values.from && values.to
      ? `${formatDateLabel(values.from)} - ${formatDateLabel(values.to)}`
      : 'Elegir fecha';
  const dateSummary = values.availableNow
    ? dateSummaryBase === 'Elegir fecha'
      ? 'Disponible ahora'
      : `${dateSummaryBase} + Ahora`
    : dateSummaryBase;

  const locationSummary =
    locationInput.trim() || values.city.trim() || (hasCoordinates ? 'Cerca de mi' : 'Zona o ciudad');
  const locationValueClass = getAdaptiveValueClass(locationSummary);
  const hasDateRange = Boolean(values.from && values.to);
  const isSearchActive = isSearchOpen;
  const isDateActive = isDateOpen || Boolean(values.date || hasDateRange || values.availableNow);
  const isLocationActive = isLocationOpen || Boolean(values.city.trim() || hasCoordinates);
  const hasDateSelection = Boolean(values.date || hasDateRange || values.availableNow);
  const hasLocationSelection = Boolean(values.city.trim() || hasCoordinates);
  const panelSurfaceClass =
    'w-full rounded-[26px] border border-white/90 bg-[color:var(--surface-strong)] p-3.5 shadow-[0_30px_60px_-38px_rgba(13,35,58,0.42)] ring-1 ring-black/5 backdrop-blur';

  return (
    <div ref={wrapperRef} className={`relative z-20 w-full overflow-visible ${className || ''}`}>
      <form onSubmit={handleSubmit} className="relative overflow-visible">
        <div className={`relative overflow-visible rounded-[30px] p-1.5 sm:p-2 ${SURFACE_CLASSES[variant]}`}>
          <div className="grid gap-1.5 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,0.92fr)_minmax(0,1fr)_auto] lg:items-stretch">
            <div className="relative min-w-0">
              <SearchField label="Servicio o rubro" active={isSearchActive} className="h-full">
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4.5 w-4.5 shrink-0 text-[color:var(--accent-strong)]"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSearchInput(nextValue);
                      setValues((previous) => ({
                        ...previous,
                        query: nextValue,
                        type:
                          previous.type === 'PROFESIONAL' || previous.type === 'LOCAL'
                            ? previous.type
                            : 'SERVICIO',
                        categorySlug:
                          previous.type === 'PROFESIONAL' || previous.type === 'LOCAL'
                            ? previous.categorySlug
                            : undefined,
                      }));
                      setIsSearchOpen(true);
                      setIsDateOpen(false);
                      setIsLocationOpen(false);
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      setIsSearchOpen(true);
                      setIsDateOpen(false);
                      setIsLocationOpen(false);
                    }}
                    onClick={() => {
                      setIsSearchOpen(true);
                      setIsDateOpen(false);
                      setIsLocationOpen(false);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder={inputPlaceholder}
                    className="h-7 w-full min-w-0 bg-transparent text-[0.98rem] font-semibold leading-none text-[color:var(--ink)] placeholder:font-normal placeholder:text-[color:var(--ink-muted)] focus:outline-none"
                    aria-label="Buscar tratamiento, rubro, profesional o local"
                    autoComplete="off"
                  />
                </div>
              </SearchField>

              {isSearchOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-[70]">
                  <SuggestDropdown
                    open={isSearchOpen}
                    loading={isSuggestLoading}
                    groups={dropdownGroups}
                    activeIndex={activeSuggestionIndex}
                    onHoverIndex={setActiveSuggestionIndex}
                    onSelect={(item) => {
                      if (item.recentSearch) {
                        runSearch({
                          type: item.type,
                          query: item.recentSearch.query,
                          categorySlug: item.recentSearch.categorySlug,
                          city: item.recentSearch.city,
                          lat: item.recentSearch.lat,
                          lng: item.recentSearch.lng,
                          date: item.recentSearch.date,
                          from: item.recentSearch.from,
                          to: item.recentSearch.to,
                          availableNow: item.recentSearch.availableNow,
                        });
                        return;
                      }
                      applySuggestion(item);
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative min-w-0">
              <SearchField
                label="Fecha"
                active={isDateActive}
                asButton
                className="h-full"
                onClick={() => {
                  setIsDateOpen((current) => !current);
                  setIsSearchOpen(false);
                  setIsLocationOpen(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 shrink-0 text-[color:var(--ink-faint)]"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.5 3v3M13.5 3v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span
                    className={`w-full truncate text-left text-[0.92rem] leading-5 ${
                      hasDateSelection
                        ? 'font-semibold text-[color:var(--ink)]'
                        : 'font-medium text-[color:var(--ink-muted)]'
                    }`}
                  >
                    {dateSummary}
                  </span>
                </div>
              </SearchField>

              {isDateOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-[70]">
                  <div className={panelSurfaceClass}>
                    <DateFilter
                      date={values.date}
                      availableNow={values.availableNow}
                      todayIso={todayIso}
                      onPickAnytime={setAnytime}
                      onPickToday={pickToday}
                      onPickTomorrow={pickTomorrow}
                      onPickThisWeek={pickThisWeek}
                      onPickDate={(value) => {
                        const nextDate = normalizeDate(value);
                        setValues((previous) => ({
                          ...previous,
                          date: nextDate,
                          from: undefined,
                          to: undefined,
                        }));
                      }}
                      onToggleAvailableNow={() =>
                        setValues((previous) => ({
                          ...previous,
                          availableNow: !previous.availableNow,
                        }))
                      }
                      showAvailableToggle
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative min-w-0">
              <SearchField
                label="Ubicacion"
                active={isLocationActive}
                asButton
                className="h-full"
                onClick={() => {
                  setIsLocationOpen((current) => !current);
                  setIsSearchOpen(false);
                  setIsDateOpen(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 shrink-0 text-[color:var(--ink-faint)]"
                    aria-hidden="true"
                  >
                    <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="10" cy="9" r="1.6" fill="currentColor" />
                  </svg>
                  <span
                    className={`w-full truncate text-left leading-5 ${locationValueClass} ${
                      hasLocationSelection
                        ? 'font-semibold text-[color:var(--ink)]'
                        : 'font-medium text-[color:var(--ink-muted)]'
                    }`}
                  >
                    {locationSummary}
                  </span>
                </div>
              </SearchField>

              {isLocationOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-[70]">
                  <div className={panelSurfaceClass}>
                    <LocationAutocomplete
                      locationInput={locationInput}
                      onLocationInputChange={(value) => {
                        setLocationInput(value);
                        setValues((previous) => ({
                          ...previous,
                          city: value,
                          lat: undefined,
                          lng: undefined,
                        }));
                      }}
                      onUseCurrentLocation={handleUseCurrentLocation}
                      onSelectGeoItem={selectGeoItem}
                      onSelectCity={selectCity}
                      geoSuggestions={geoSuggestions}
                      recentCities={mergedCitySuggestions}
                      geoStatus={geoStatus}
                      geoMessage={geoMessage}
                      popularNearby={nearbyCandidates}
                      onPickPopularNearby={(item) => {
                        setValues((prev) => ({
                          ...prev,
                          type: 'LOCAL',
                          query: item.name,
                          categorySlug: undefined,
                        }));
                        setSearchInput(item.name);
                        setIsLocationOpen(false);
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:justify-stretch">
              <button
                type="submit"
                className="inline-flex h-[70px] w-full min-w-[7.5rem] items-center justify-center rounded-[22px] bg-[color:var(--primary)] px-5 text-[0.98rem] font-semibold text-white shadow-[0_18px_30px_-24px_rgba(13,35,58,0.72)] transition hover:-translate-y-[1px] hover:bg-[color:var(--primary-strong)] hover:shadow-[0_24px_38px_-26px_rgba(13,35,58,0.74)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2"
              >
                {submitLabel}
              </button>
              {showClearButton ? (
                <button
                  type="button"
                  onClick={onClearClick}
                  className="inline-flex h-[70px] w-full items-center justify-center rounded-[22px] border border-[color:var(--border-soft)] bg-white/86 px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
});
