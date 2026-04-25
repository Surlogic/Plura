import UnifiedSearchBar, {
  type UnifiedSearchValues,
} from '@/components/search/UnifiedSearchBar';

type ExploreFiltersProps = {
  initialValues: Partial<UnifiedSearchValues>;
  fixedQuery?: Record<string, string | undefined>;
  citySuggestions?: string[];
  className?: string;
};

export default function ExploreFilters({
  initialValues,
  fixedQuery,
  citySuggestions = [],
  className,
}: ExploreFiltersProps) {
  return (
    <UnifiedSearchBar
      variant="hero"
      initialValues={initialValues}
      fixedQuery={fixedQuery}
      citySuggestions={citySuggestions}
      className={className}
      density="compact"
      showClearButton
    />
  );
}
