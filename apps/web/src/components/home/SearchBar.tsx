import UnifiedSearchBar from '@/components/search/UnifiedSearchBar';
import type { Category } from '@/types/category';

type SearchBarProps = {
  categories?: Category[];
};

export default function SearchBar({ categories = [] }: SearchBarProps) {
  return (
    <div className="w-full">
      <UnifiedSearchBar
        variant="hero"
        interactiveFocusExpansion
        initialCategories={categories}
      />
    </div>
  );
}
