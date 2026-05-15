import { memo } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  formatMercadoPagoConnectionDate,
  getMercadoPagoConnectionStatusCopy,
} from '@/lib/billing/professionalMercadoPagoConnection';
import type { ProfessionalMercadoPagoConnection } from '@/types/professionalPaymentProviderConnection';

type MercadoPagoConnectionCardProps = {
  connection?: ProfessionalMercadoPagoConnection | null;
  isLoading: boolean;
  isStartingOAuth: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

const toneClassNames = {
  success: {
    badge: 'border-[#BFE7DB] bg-[#ECFDF5] text-[#047857]',
    card: 'border-[#D8F0E5] bg-[#F7FFFB]',
  },
  warning: {
    badge: 'border-[#F2D6A8] bg-[#FFF7E8] text-[#B45309]',
    card: 'border-[#F3E1BC] bg-[#FFF9EF]',
  },
  error: {
    badge: 'border-[#F8C7C7] bg-[#FEF2F2] text-[#B91C1C]',
    card: 'border-[#F8D7DA] bg-[#FFF7F7]',
  },
};

function MercadoPagoConnectionCard({
  connection,
  isLoading,
  isStartingOAuth,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onRefresh,
}: MercadoPagoConnectionCardProps) {
  const statusCopy = getMercadoPagoConnectionStatusCopy(connection);
  const tone = toneClassNames[statusCopy.tone];
  const status = connection?.status?.toUpperCase();
  const isConnected = Boolean(connection?.connected || connection?.status?.toUpperCase() === 'CONNECTED');
  const isBusy = isLoading || isStartingOAuth || isDisconnecting;
  const connectLabel = isConnected
    ? 'Volver a conectar Mercado Pago'
    : status === 'PENDING_AUTHORIZATION'
      ? 'Continuar conexión'
      : status === 'ERROR'
        ? 'Volver a conectar Mercado Pago'
        : 'Conectar Mercado Pago';
  const actionHint = isStartingOAuth
    ? 'Te vamos a llevar a Mercado Pago para autorizar la conexión.'
    : isDisconnecting
      ? 'Estamos desvinculando tu cuenta. No cierres esta pantalla.'
      : isLoading
        ? 'Consultando el estado más reciente de tu conexión.'
        : isConnected
          ? 'Si necesitás usar otra cuenta, podés volver a conectar Mercado Pago.'
          : 'Conectá tu cuenta para cobrar reservas online sin mezclarlo con tu plan de Plura.';

  return (
    <Card className={tone.card}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>
            {statusCopy.badge}
          </span>

          <h3 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
            {statusCopy.title}
          </h3>

          <p className="mt-2 text-sm text-[#516072]">
            {statusCopy.description}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-[#E2E7EC] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Cuenta</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">
                {connection?.providerAccountId || 'Sin conectar'}
              </p>
            </div>
            <div className="rounded-[20px] border border-[#E2E7EC] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Conectada desde</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">
                {formatMercadoPagoConnectionDate(connection?.connectedAt)}
              </p>
            </div>
            <div className="rounded-[20px] border border-[#E2E7EC] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Última sincronización</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">
                {formatMercadoPagoConnectionDate(connection?.lastSyncAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-[#DDE7F0] bg-white px-4 py-3 text-sm text-[#516072]">
            Conectá tu cuenta de Mercado Pago para cobrar reservas online. Tus clientes pagarán sus reservas desde Plura y el cobro se procesará con tu cuenta conectada.
          </div>

          {connection?.lastError ? (
            <div className="mt-4 rounded-[18px] border border-[#F8C7C7] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              <p className="font-semibold">Último problema detectado</p>
              <p className="mt-1">{connection.lastError}</p>
            </div>
          ) : null}
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onConnect}
            disabled={isBusy}
          >
            {isStartingOAuth ? 'Abriendo Mercado Pago...' : connectLabel}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={onRefresh}
            disabled={isBusy}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar estado'}
          </Button>
          {isConnected ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              onClick={onDisconnect}
              disabled={isBusy}
            >
              {isDisconnecting ? 'Desconectando...' : 'Desconectar cuenta'}
            </Button>
          ) : null}
          <p className="text-sm text-[#516072]">
            {actionHint}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default memo(MercadoPagoConnectionCard);
