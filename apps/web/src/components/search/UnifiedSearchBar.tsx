import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import DateFilter from '@/components/search/DateFilter';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import SearchField from '@/components/search/SearchField';
import SearchFilterChips, {
  type SearchFilterChip,
} from '@/components/search/SearchFilterChips';
import SuggestDropdown from '@/components/search/SuggestDropdown';
import {
  SEARCH_BAR_MAX_WIDTH_CLASS,
  SEARCH_CONTROL_HEIGHT_CLASS,
  SEARCH_PANEL_CLASS,
  SEARCH_PANEL_SCROLL_CLASS,
} from '@/components/search/searchUi';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  useUnifiedSearch,
  formatDateLabel,
  getAdaptiveValueClass,
  normalizeDate,
  type UnifiedSearchValues,
} from '@/hooks/useUnifiedSearch';
import { slugToLabel } from '@/utils/searchQuery';

export type { UnifiedSearchValues };

type UnifiedSearchBarProps = {
  initialValues?: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  variant?: 'hero' | 'panel' | 'explore';
  interactiveFocusExpansion?: boolean;
  submitLabel?: string;
  className?: string;
  showClearButton?: boolean;
  citySuggestions?: string[];
};

type SearchSectionLabelProps = {
  icon: 'search' | 'location' | 'calendar';
  text: string;
  hideText?: boolean;
};

const SURFACE_CLASSES: Record<NonNullable<UnifiedSearchBarProps['variant']>, string> = {
  hero: 'border border-white/70 bg-white/92 shadow-[0_28px_70px_-48px_rgba(13,35,58,0.34)] transition-shadow duration-200 hover:shadow-[0_32px_78px_-46px_rgba(13,35,58,0.4)] backdrop-blur-xl',
  panel: 'border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[0_20px_48px_-38px_rgba(13,35,58,0.28)]',
  explore: 'border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[0_20px_48px_-38px_rgba(13,35,58,0.24)]',
};

const SEARCH_TYPE_LABELS = {
  RUBRO: 'Categoría',
  PROFESIONAL: 'Profesional',
  LOCAL: 'Local',
  SERVICIO: 'Servicio',
} as const;

function SearchSectionLabel({ icon, text, hideText = false }: SearchSectionLabelProps) {
  return (
    <>
      {icon === 'search' ? (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-3 w-3 shrink-0 text-[color:var(--accent-strong)]"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : null}

      {icon === 'location' ? (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-3 w-3 shrink-0 text-[color:var(--ink-faint)]"
          aria-hidden="true"
        >
          <path d="M10 17c2.8-3.4 4.2-6 4.2-7.7A4.2 4.2 0 105.8 9.3C5.8 11 7.2 13.6 10 17z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="9" r="1.6" fill="currentColor" />
        </svg>
      ) : null}

      {icon === 'calendar' ? (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-3 w-3 shrink-0 text-[color:var(--ink-faint)]"
          aria-hidden="true"
        >
          <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.5 3v3M13.5 3v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}

      {hideText ? null : <span className="truncate">{text}</span>}
    </>
  );
}

export default memo(function UnifiedSearchBar({
  initialValues,
  fixedQuery,
  variant = 'panel',
  interactiveFocusExpansion = false,
  submitLabel = 'Buscar',
  className,
  showClearButton = false,
  citySuggestions = [],
}: UnifiedSearchBarProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isHero = variant === 'hero';
  const heroFocusExpansionEnabled = isHero && interactiveFocusExpansion;
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [heroExpandedField, setHeroExpandedField] = useState<'query' | null>(null);
  const skipHeroSelectionFocusCollapseRef = useRef(false);

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
    setRadiusKm,
    setAnytime,
    pickToday,
    pickTomorrow,
    pickThisWeek,
    handleClear,
    closeAllDropdowns,
  } = search;

  const stableCloseAllDropdowns = useCallback(() => {
    closeAllDropdowns();
    if (heroFocusExpansionEnabled) {
      setHeroExpandedField(null);
    }
  }, [closeAllDropdowns, heroFocusExpansionEnabled]);

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
    if (heroFocusExpansionEnabled) {
      setHeroExpandedField(null);
    }
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
      if (heroFocusExpansionEnabled) {
        setHeroExpandedField(null);
      }
    }
  };

  const hasCoordinates = typeof values.lat === 'number' && typeof values.lng === 'number';
  const hasDateRange = Boolean(values.from && values.to);
  const hasDateSelection = Boolean(values.date || hasDateRange || values.availableNow);
  const hasLocationSelection = Boolean(values.city.trim() || hasCoordinates);
  const hasQuerySelection = Boolean(searchInput.trim() || values.query.trim() || values.categorySlug);
  const inputPlaceholder = values.categorySlug
    ? `Buscar en ${slugToLabel(values.categorySlug)}`
    : 'Servicio, categoría o profesional';

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

  const radiusSummary = `${Math.round(values.radiusKm)} km`;
  const locationSummary =
    locationInput.trim() || values.city.trim() || (hasCoordinates ? `Cerca de mi · ${radiusSummary}` : 'Zona o ciudad');
  const locationValueClass = getAdaptiveValueClass(locationSummary);
  const searchModeLabel = values.categorySlug
    ? 'Categoría'
    : values.type !== 'SERVICIO'
      ? SEARCH_TYPE_LABELS[values.type]
      : null;
  const queryFieldLabel = 'Servicios';
  const hiddenHeroLabelClassName = isHero ? 'sr-only' : '';
  const heroInlineLabelClassName =
    'inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]';
  const heroServicesExpanded = heroFocusExpansionEnabled && heroExpandedField === 'query';
  const queryFieldClassName = isHero ? 'h-full justify-center py-1.5' : 'h-full';
  const selectionFieldClassName = isHero ? 'h-full justify-center py-1.5' : 'h-full';
  const queryValueClassName = isHero ? '!mt-0 flex min-h-[1.65rem] items-center' : '';
  const selectionValueClassName = isHero ? '!mt-0 flex min-h-[1.65rem] items-center' : '';
  const heroFieldShellClassName = 'px-4 py-2 sm:px-5';
  const heroDividerClassName = 'border-t border-[color:var(--border-soft)]/85 md:border-t-0 md:border-r';
  const heroQueryDividerClassName = 'md:border-r md:border-[color:var(--border-soft)]/85';
  const heroFieldMotionClassName = heroFocusExpansionEnabled
    ? 'lg:transition-[flex-basis,max-width,padding,opacity] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]'
    : '';
  const heroQueryWidthClassName = heroServicesExpanded
    ? 'lg:flex-[1.9_1_0%]'
    : 'lg:flex-[1.55_1_0%]';
  const heroSelectionExpandedWidthClassName = 'lg:flex-[1.05_1_0%]';
  const heroSelectionCompactWidthClassName =
    'lg:flex-[0_0_4.1rem] lg:px-3 lg:items-center lg:justify-center';
  const centeredHeroDropdownClassName = isHero
    ? 'sm:left-1/2 sm:right-auto sm:-translate-x-1/2'
    : 'sm:right-auto';
  const queryWrapperOrderClassName = isHero
    ? `order-1 md:col-[1] ${heroFieldShellClassName} ${heroQueryDividerClassName} ${heroFieldMotionClassName} ${heroQueryWidthClassName}`
    : '';
  const locationWrapperOrderClassName = isHero
    ? `order-2 md:col-[2] ${heroFieldShellClassName} ${heroDividerClassName} ${heroFieldMotionClassName} ${
        heroServicesExpanded ? heroSelectionCompactWidthClassName : heroSelectionExpandedWidthClassName
      }`
    : '';
  const dateWrapperOrderClassName = isHero
    ? `order-3 md:col-[3] ${heroFieldShellClassName} ${heroDividerClassName} ${heroFieldMotionClassName} ${
        heroServicesExpanded ? heroSelectionCompactWidthClassName : heroSelectionExpandedWidthClassName
      }`
    : '';
  const submitWrapperOrderClassName = isHero ? 'order-4 md:col-[4] lg:flex-[0_0_10.5rem]' : '';
  const searchGridClassName = isHero
    ? 'grid gap-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_minmax(0,1fr)_auto] md:items-center lg:flex lg:items-stretch'
    : 'grid gap-1.5 md:grid-cols-[minmax(0,1.9fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_auto] md:items-stretch';
  const submitButtonToneClassName = isDarkTheme
    ? 'border border-[color:var(--primary-strong)] bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-strong)_100%)] text-[color:var(--text-on-dark)] shadow-[0_22px_40px_-28px_rgba(0,0,0,0.72)] hover:-translate-y-0.5 hover:border-[color:var(--brand-primary-light)] hover:bg-[linear-gradient(135deg,var(--primary-strong)_0%,var(--brand-primary-light)_100%)] hover:shadow-[var(--shadow-lift)]'
    : 'border border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--ink)] shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-[color:var(--primary-strong)] hover:bg-[color:var(--primary-strong)] hover:text-white hover:shadow-[var(--shadow-lift)]';
  const submitButtonClassName = isHero
    ? `inline-flex w-full min-w-[8.75rem] items-center justify-center rounded-[18px] px-5 text-[0.95rem] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 ${submitButtonToneClassName} ${SEARCH_CONTROL_HEIGHT_CLASS}`
    : `inline-flex w-full min-w-[7.5rem] items-center justify-center rounded-[18px] px-4 text-[0.94rem] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 ${submitButtonToneClassName} ${SEARCH_CONTROL_HEIGHT_CLASS}`;
  const searchInputClassName = isHero
    ? 'hero-search-service-input block min-h-[1.65rem] w-full min-w-0 appearance-none border-0 rounded-none bg-transparent p-0 shadow-none text-[0.95rem] font-semibold leading-[1.2] text-[color:var(--ink)] outline-none ring-0 placeholder:font-normal placeholder:text-[color:var(--ink-muted)] focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none'
    : 'h-6 w-full min-w-0 bg-transparent text-[0.95rem] font-semibold leading-none text-[color:var(--ink)] placeholder:font-normal placeholder:text-[color:var(--ink-muted)] focus:outline-none';

  const openSearchPanel = () => {
    setIsSearchOpen(true);
    setIsDateOpen(false);
    setIsLocationOpen(false);
    if (heroFocusExpansionEnabled) {
      setHeroExpandedField('query');
    }
  };

  const handleSelectionFieldPointerDown = useCallback(() => {
    skipHeroSelectionFocusCollapseRef.current = true;
  }, []);

  const handleSelectionFieldFocus = useCallback(() => {
    if (!heroFocusExpansionEnabled) return;
    if (skipHeroSelectionFocusCollapseRef.current) {
      skipHeroSelectionFocusCollapseRef.current = false;
      return;
    }
    setHeroExpandedField(null);
  }, [heroFocusExpansionEnabled]);

  const activeFilters = useMemo<SearchFilterChip[]>(() => {
    const filters: SearchFilterChip[] = [];

    if (values.query.trim() || values.categorySlug) {
      const queryLabel = values.categorySlug
        ? `${SEARCH_TYPE_LABELS.RUBRO}: ${slugToLabel(values.categorySlug)}`
        : `${SEARCH_TYPE_LABELS[values.type]}: ${values.query.trim() || 'Busqueda'}`;

      filters.push({
        id: 'query',
        label: queryLabel,
        onRemove: () => {
          setValues((previous) => ({
            ...previous,
            type: 'SERVICIO',
            query: '',
            categorySlug: undefined,
          }));
          setSearchInput('');
        },
      });
    }

    if (values.date) {
      filters.push({
        id: 'date',
        label: `Fecha: ${formatDateLabel(values.date)}`,
        onRemove: () =>
          setValues((previous) => ({
            ...previous,
            date: '',
          })),
      });
    } else if (values.from && values.to) {
      filters.push({
        id: 'range',
        label: `Rango: ${formatDateLabel(values.from)} - ${formatDateLabel(values.to)}`,
        onRemove: () =>
          setValues((previous) => ({
            ...previous,
            from: undefined,
            to: undefined,
          })),
      });
    }

    if (values.availableNow) {
      filters.push({
        id: 'availability',
        label: 'Disponible ahora',
        onRemove: () =>
          setValues((previous) => ({
            ...previous,
            availableNow: false,
          })),
      });
    }

    if (values.city.trim() || hasCoordinates) {
      filters.push({
        id: 'location',
        label: hasCoordinates ? `Cerca de mi · ${radiusSummary}` : `Ubicacion: ${values.city.trim()}`,
        onRemove: () => {
          setValues((previous) => ({
            ...previous,
            city: '',
            lat: undefined,
            lng: undefined,
          }));
          setLocationInput('');
        },
      });
    }

    return filters;
  }, [hasCoordinates, radiusSummary, setLocationInput, setSearchInput, setValues, values]);

  return (
    <div
      ref={wrapperRef}
      className={`relative z-30 mx-auto w-full ${SEARCH_BAR_MAX_WIDTH_CLASS} overflow-visible ${className || ''}`}
    >
      <form onSubmit={handleSubmit} className="relative overflow-visible">
        <div
          className={`relative overflow-visible rounded-[24px] p-1.5 sm:p-2 ${SURFACE_CLASSES[variant]}`}
        >
          <div className={searchGridClassName}>
            <div className={`relative min-w-0 ${queryWrapperOrderClassName}`.trim()}>
              <SearchField
                label={<SearchSectionLabel icon="search" text={queryFieldLabel} />}
                active={isSearchOpen}
                className={queryFieldClassName}
                labelClassName={hiddenHeroLabelClassName}
                valueClassName={queryValueClassName}
                chrome={isHero ? 'bare' : 'framed'}
              >
                <div className="relative flex min-w-0 items-center gap-2.5">
                  {searchModeLabel && !isHero ? (
                    <span className="hidden shrink-0 rounded-full bg-white px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)] sm:inline-flex">
                      {searchModeLabel}
                    </span>
                  ) : null}

                  {isHero && !hasQuerySelection ? (
                    <span
                      className={`pointer-events-none absolute inset-y-0 left-0 flex items-center transition-opacity duration-200 ${heroInlineLabelClassName}`}
                      aria-hidden="true"
                    >
                      <SearchSectionLabel icon="search" text={queryFieldLabel} />
                    </span>
                  ) : null}

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
                      openSearchPanel();
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={openSearchPanel}
                    onClick={openSearchPanel}
                    onKeyDown={handleInputKeyDown}
                    placeholder={isHero ? '' : inputPlaceholder}
                    className={searchInputClassName}
                    aria-label="Buscar tratamiento, categoría, profesional o local"
                    autoComplete="off"
                  />
                </div>
              </SearchField>

              {isSearchOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] sm:right-auto sm:w-[min(100%,38rem)]">
                  <SuggestDropdown
                    open={isSearchOpen}
                    loading={isSuggestLoading}
                    groups={dropdownGroups}
                    activeIndex={activeSuggestionIndex}
                    onHoverIndex={setActiveSuggestionIndex}
                    onSelect={applySuggestion}
                  />
                </div>
              ) : null}
            </div>

            <div className={`relative min-w-0 ${locationWrapperOrderClassName}`.trim()}>
              <SearchField
                label={<SearchSectionLabel icon="location" text="Ubicación" />}
                active={isLocationOpen || hasLocationSelection}
                asButton
                className={selectionFieldClassName}
                onFocus={handleSelectionFieldFocus}
                onPointerDown={handleSelectionFieldPointerDown}
                labelClassName={hiddenHeroLabelClassName}
                valueClassName={selectionValueClassName}
                chrome={isHero ? 'bare' : 'framed'}
                onClick={() => {
                  skipHeroSelectionFocusCollapseRef.current = false;
                  if (heroFocusExpansionEnabled) {
                    setHeroExpandedField(null);
                  }
                  setIsLocationOpen((current) => !current);
                  setIsSearchOpen(false);
                  setIsDateOpen(false);
                }}
              >
                <div
                  className={`flex min-w-0 items-center gap-2.5 transition-[gap,opacity,transform] duration-200 ${
                    heroServicesExpanded ? 'justify-center lg:gap-0' : ''
                  }`}
                >
                  {heroServicesExpanded ? (
                    <span className="hidden h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] text-[color:var(--ink-faint)] lg:inline-flex">
                      <SearchSectionLabel icon="location" text="Ubicación" hideText />
                    </span>
                  ) : null}

                  {isHero && !hasLocationSelection ? (
                    <span className={`${heroInlineLabelClassName} ${heroServicesExpanded ? 'lg:hidden' : ''}`.trim()}>
                      <SearchSectionLabel icon="location" text="Ubicación" />
                    </span>
                  ) : (
                    <span
                      className={`w-full truncate text-left leading-5 transition-opacity duration-200 ${
                        heroServicesExpanded ? 'lg:hidden' : ''
                      } ${locationValueClass} ${
                        hasLocationSelection
                          ? 'font-semibold text-[color:var(--ink)]'
                          : 'font-medium text-[color:var(--ink-muted)]'
                      }`}
                    >
                      {locationSummary}
                    </span>
                  )}
                </div>
              </SearchField>

              {isLocationOpen ? (
                <div
                  className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[80] sm:w-[22rem] ${centeredHeroDropdownClassName}`.trim()}
                >
                  <div className={SEARCH_PANEL_CLASS}>
                    <div className={SEARCH_PANEL_SCROLL_CLASS}>
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
                        radiusKm={values.radiusKm}
                        onRadiusChange={setRadiusKm}
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
                </div>
              ) : null}
            </div>

            <div className={`relative min-w-0 ${dateWrapperOrderClassName}`.trim()}>
              <SearchField
                label={<SearchSectionLabel icon="calendar" text="Fecha" />}
                active={isDateOpen || hasDateSelection}
                asButton
                className={selectionFieldClassName}
                onFocus={handleSelectionFieldFocus}
                onPointerDown={handleSelectionFieldPointerDown}
                labelClassName={hiddenHeroLabelClassName}
                valueClassName={selectionValueClassName}
                chrome={isHero ? 'bare' : 'framed'}
                onClick={() => {
                  skipHeroSelectionFocusCollapseRef.current = false;
                  if (heroFocusExpansionEnabled) {
                    setHeroExpandedField(null);
                  }
                  setIsDateOpen((current) => !current);
                  setIsSearchOpen(false);
                  setIsLocationOpen(false);
                }}
              >
                <div
                  className={`flex min-w-0 items-center gap-2.5 transition-[gap,opacity,transform] duration-200 ${
                    heroServicesExpanded ? 'justify-center lg:gap-0' : ''
                  }`}
                >
                  {heroServicesExpanded ? (
                    <span className="hidden h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] text-[color:var(--ink-faint)] lg:inline-flex">
                      <SearchSectionLabel icon="calendar" text="Fecha" hideText />
                    </span>
                  ) : null}

                  {isHero && !hasDateSelection ? (
                    <span className={`${heroInlineLabelClassName} ${heroServicesExpanded ? 'lg:hidden' : ''}`.trim()}>
                      <SearchSectionLabel icon="calendar" text="Fecha" />
                    </span>
                  ) : (
                    <span
                      className={`w-full truncate text-left text-[0.88rem] leading-5 transition-opacity duration-200 ${
                        heroServicesExpanded ? 'lg:hidden' : ''
                      } ${
                        hasDateSelection
                          ? 'font-semibold text-[color:var(--ink)]'
                          : 'font-medium text-[color:var(--ink-muted)]'
                      }`}
                    >
                      {dateSummary}
                    </span>
                  )}
                </div>
              </SearchField>

              {isDateOpen ? (
                <div
                  className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[80] sm:w-[21.5rem] ${centeredHeroDropdownClassName}`.trim()}
                >
                  <div className={SEARCH_PANEL_CLASS}>
                    <div className={SEARCH_PANEL_SCROLL_CLASS}>
                      <DateFilter
                        date={values.date}
                        from={values.from}
                        to={values.to}
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
                </div>
              ) : null}
            </div>

            <div className={`flex items-stretch self-stretch ${submitWrapperOrderClassName} ${isHero ? 'border-t border-[color:var(--border-soft)]/85 px-1 pt-2 md:border-l md:border-t-0 md:px-2 md:pl-4 md:pt-0 lg:pl-3' : ''}`.trim()}>
              <button
                type="submit"
                className={submitButtonClassName}
              >
                {submitLabel}
              </button>
            </div>
          </div>

          {activeFilters.length > 0 && (!isHero || showClearButton) ? (
            <div className="mt-2.5 px-1">
              <SearchFilterChips filters={activeFilters} onClearAll={showClearButton ? handleClear : undefined} />
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
});
