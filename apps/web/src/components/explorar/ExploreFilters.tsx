import UnifiedSearchBar, {
  type UnifiedSearchValues,
} from '@/components/search/UnifiedSearchBar';

type ExploreFiltersProps = {
  initialValues: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  citySuggestions?: string[];
};

export default function ExploreFilters({
  initialValues,
  fixedQuery,
  citySuggestions = [],
}: ExploreFiltersProps) {
  return (
    <UnifiedSearchBar
      variant="hero"
      initialValues={initialValues}
      fixedQuery={fixedQuery}
      citySuggestions={citySuggestions}
      showClearButton
    />
  );
}
