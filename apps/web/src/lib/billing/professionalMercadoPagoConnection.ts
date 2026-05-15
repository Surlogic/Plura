import type { ProfessionalMercadoPagoConnection } from '@/types/professionalPaymentProviderConnection';

export type MercadoPagoConnectionTone = 'success' | 'warning' | 'error';

export type MercadoPagoConnectionStatusCopy = {
  badge: string;
  title: string;
  description: string;
  tone: MercadoPagoConnectionTone;
};

export const getMercadoPagoConnectionStatusCopy = (
  connection?: ProfessionalMercadoPagoConnection | null,
): MercadoPagoConnectionStatusCopy => {
  const status = connection?.status?.toUpperCase();

  if (connection?.connected || status === 'CONNECTED') {
    return {
      badge: 'Conectado',
      title: 'Tu cuenta está lista para cobrar reservas',
      description: 'Tus clientes podrán pagar reservas online y el cobro se procesará con tu cuenta conectada.',
      tone: 'success',
    };
  }

  if (status === 'ERROR') {
    return {
      badge: 'Revisar conexión',
      title: 'Hay un problema con tu cuenta de Mercado Pago',
      description: connection?.lastError?.trim()
        || 'Necesitás volver a conectar tu cuenta para seguir cobrando reservas online.',
      tone: 'error',
    };
  }

  if (status === 'PENDING_AUTHORIZATION') {
    return {
      badge: 'Autorización pendiente',
      title: 'Terminá la conexión en Mercado Pago',
      description: 'Cuando completes la autorización, vamos a actualizar este estado automáticamente.',
      tone: 'warning',
    };
  }

  if (status === 'DISCONNECTED') {
    return {
      badge: 'Desconectado',
      title: 'Conectá tu cuenta para cobrar reservas online',
      description: 'Tus clientes pagarán sus reservas desde Plura y el cobro se procesará con la cuenta que conectes.',
      tone: 'warning',
    };
  }

  return {
    badge: 'No conectado',
    title: 'Conectá tu cuenta para cobrar reservas online',
    description: 'Vinculá tu cuenta de Mercado Pago para aceptar pagos de reservas sin mezclarlo con tu plan de Plura.',
    tone: 'warning',
  };
};

export const formatMercadoPagoConnectionDate = (value?: string | null) => {
  if (!value) return 'Sin dato';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
