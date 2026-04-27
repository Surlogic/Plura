import UnifiedSearchBar, {
  type UnifiedSearchValues,
} from '@/components/search/UnifiedSearchBar';

type ExploreFiltersProps = {
  initialValues: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  citySuggestions?: string[];
  className?: string;
  locationSummaryOverride?: string;
  onLocationClear?: (mode: 'remove' | 'clear-all') => void;
};

export default function ExploreFilters({
  initialValues,
  fixedQuery,
  citySuggestions = [],
  className,
  locationSummaryOverride,
  onLocationClear,
}: ExploreFiltersProps) {
  return (
    <UnifiedSearchBar
      variant="explore"
      initialValues={initialValues}
      fixedQuery={fixedQuery}
      citySuggestions={citySuggestions}
      className={className}
      density="compact"
      showClearButton
      locationSummaryOverride={locationSummaryOverride}
      onLocationClear={onLocationClear}
    />
  );
}
