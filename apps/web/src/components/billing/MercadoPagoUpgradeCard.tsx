import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type MercadoPagoUpgradeCardProps = {
  currentPlanLabel: string;
  onBrowsePlans: () => void;
};

export default function MercadoPagoUpgradeCard({
  currentPlanLabel,
  onBrowsePlans,
}: MercadoPagoUpgradeCardProps) {
  return (
    <Card className="border-[#E7E2D6] bg-[linear-gradient(135deg,#FFFCF6_0%,#FFF7E8_100%)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-[#F2D6A8] bg-[#FFF7E8] px-3 py-1 text-xs font-semibold text-[#B45309]">
            Disponible desde PROFESIONAL
          </span>

          <h3 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
            Tu plan actual no habilita cobros online
          </h3>

          <p className="mt-2 text-sm text-[#516072]">
            En {currentPlanLabel} podés gestionar tu operación, pero para cobrar reservas online con Mercado Pago
            necesitás pasar a PROFESIONAL o ENTERPRISE.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-[#E7D9B8] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Plan actual</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">{currentPlanLabel}</p>
            </div>
            <div className="rounded-[20px] border border-[#E7D9B8] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Cobros online</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">No disponibles</p>
            </div>
            <div className="rounded-[20px] border border-[#E7D9B8] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Upgrade</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">PROFESIONAL o ENTERPRISE</p>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-[#F3E1BC] bg-white px-4 py-3 text-sm text-[#516072]">
            Cuando subas de plan vas a poder conectar tu cuenta de Mercado Pago y cobrar reservas online desde Plura.
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onBrowsePlans}
          >
            Ver planes con cobros online
          </Button>
          <p className="text-sm text-[#516072]">
            Mientras tu plan siga en BASIC no intentamos iniciar la conexión OAuth, así evitamos errores y estados
            confusos.
          </p>
        </div>
      </div>
    </Card>
  );
}
