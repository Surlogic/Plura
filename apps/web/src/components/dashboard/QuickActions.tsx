import Link from 'next/link';

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
};

type QuickActionsProps = {
  actions: QuickAction[];
};

function QuickActionCard({ action }: { action: QuickAction }) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
        <span className="text-base font-semibold">{action.label[0]}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0E2A47]">{action.label}</p>
        <p className="text-xs text-[#6B7280]">{action.description}</p>
      </div>
    </div>
  );

  const className =
    'min-w-[190px] flex-1 rounded-[22px] border border-[#E2E7EC] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0E2A47]">Accesos rápidos</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94A3B8]">
          Atajos
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {actions.map((action) => (
          <QuickActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}
