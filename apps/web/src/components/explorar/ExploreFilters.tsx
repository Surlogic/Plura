import UnifiedSearchBar, {
  type UnifiedSearchValues,
} from '@/components/search/UnifiedSearchBar';

type ExploreFiltersProps = {
  initialValues: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  citySuggestions?: string[];
  className?: string;
  locationSummaryOverride?: string;
};

export default function ExploreFilters({
  initialValues,
  fixedQuery,
  citySuggestions = [],
  className,
  locationSummaryOverride,
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
    />
  );
}
