import UnifiedSearchBar from '@/components/search/UnifiedSearchBar';

type DashboardHeroProps = {
  name: string;
  location: string;
};

export default function DashboardHero({ name, location }: DashboardHeroProps) {
  return (
    <section className="rounded-[30px] border border-[#E4EBF2] bg-white p-6 sm:p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Panel cliente
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[#0E2A47] sm:text-4xl">
            Hola, {name}
          </h1>
          <p className="text-sm text-[#64748B] sm:text-base">
            Encontrá profesionales y reservá tu turno sin fricción.
          </p>
        </div>

        <UnifiedSearchBar
          variant="panel"
          initialValues={{ city: location }}
        />
      </div>
    </section>
  );
}
