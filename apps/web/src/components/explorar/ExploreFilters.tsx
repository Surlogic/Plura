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
      variant="explore"
      initialValues={initialValues}
      fixedQuery={fixedQuery}
      citySuggestions={citySuggestions}
      showClearButton
    />
  );
}
