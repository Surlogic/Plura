import RubroCard from '@/components/shared/RubroCard';

type CategoryCardProps = {
  title: string;
  imageUrl?: string | null;
  slug: string;
};

export default function CategoryCard({ title, imageUrl, slug }: CategoryCardProps) {
  return <RubroCard title={title} imageUrl={imageUrl} slug={slug} />;
}
