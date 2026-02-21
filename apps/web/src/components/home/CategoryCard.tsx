type CategoryCardProps = {
  title: string;
};

export default function CategoryCard({ title }: CategoryCardProps) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F6F8]">
        <div className="h-6 w-6 rounded-full bg-[#1FB6A6]" />
      </div>
      <h3 className="text-base font-semibold text-[#0E2A47]">{title}</h3>
      <p className="mt-2 text-sm text-[#6B7280]">Explorá profesionales destacados.</p>
    </div>
  );
}
