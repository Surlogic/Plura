type BusinessCardProps = {
  name: string;
  category: string;
  rating: string;
};

export default function BusinessCard({ name, category, rating }: BusinessCardProps) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="h-40 w-full rounded-[20px] bg-[#F4F6F8]" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#0E2A47]">{name}</h3>
          <p className="text-sm text-[#6B7280]">{category}</p>
        </div>
        <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1 text-xs font-semibold text-[#1FB6A6]">
          Disponible hoy
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-[#0E2A47]">
        <span className="text-[#1FB6A6]">★</span>
        <span>{rating}</span>
      </div>
    </div>
  );
}
