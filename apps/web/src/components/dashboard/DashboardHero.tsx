import UnifiedSearchBar from '@/components/search/UnifiedSearchBar';

type DashboardHeroProps = {
  name: string;
  location: string;
};

export default function DashboardHero({ name, location }: DashboardHeroProps) {
  return (
    <section className="rounded-[30px] border border-[color:var(--border-soft)] bg-white/96 p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Panel cliente
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[color:var(--ink)] sm:text-4xl">
            Hola, {name}
          </h1>
          <p className="text-sm text-[color:var(--ink-muted)] sm:text-base">
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
