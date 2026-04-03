import { formatBookingMoney } from '@/utils/bookings';
import type {
  ClientBookingTimelineItem,
  ClientBookingTimelinePayload,
} from '@/types/clientBookingTimeline';
import {
  formatClientNotificationTimestamp,
  getClientNotificationTypeLabel,
} from '@/utils/clientNotifications';

const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  PAYMENT_PENDING: 'Pago pendiente',
  PAID: 'Pagado',
  PARTIALLY_REFUNDED: 'Reembolso parcial',
  REFUNDED: 'Reembolsado',
  RELEASE_PENDING: 'Liberacion pendiente',
  RELEASED: 'Liberado',
  FAILED: 'Fallo financiero',
  NONE: 'Sin estado financiero',
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');

const getStringPayloadValue = (
  payload: ClientBookingTimelinePayload | null | undefined,
  key: string,
) => {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const getNumberPayloadValue = (
  payload: ClientBookingTimelinePayload | null | undefined,
  key: string,
) => {
  const value = payload?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const getClientBookingTimelineEventLabel = getClientNotificationTypeLabel;

export const formatClientBookingTimelineTimestamp = (rawValue: string | null) => {
  if (!rawValue) return 'Fecha no disponible';
  return formatClientNotificationTimestamp(rawValue) || 'Fecha no disponible';
};

export const formatClientBookingTimelineAbsoluteTimestamp = (rawValue: string | null) => {
  if (!rawValue) return '';

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;

  return parsed.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getClientBookingTimelineSummary = (item: ClientBookingTimelineItem) => {
  const serviceName = getStringPayloadValue(item.payload, 'serviceName');

  switch (item.type) {
    case 'BOOKING_CREATED':
      return serviceName
        ? `Tu reserva para ${serviceName} fue registrada correctamente.`
        : 'Tu reserva fue registrada correctamente.';
    case 'BOOKING_CONFIRMED':
      return 'La reserva fue confirmada.';
    case 'BOOKING_CANCELLED':
      return 'La reserva quedó cancelada.';
    case 'BOOKING_RESCHEDULED':
      return 'La fecha o el horario de la reserva cambió.';
    case 'BOOKING_COMPLETED':
      return 'La reserva fue marcada como completada.';
    case 'BOOKING_NO_SHOW':
      return 'La reserva fue marcada como no asistida.';
    case 'PAYMENT_APPROVED':
      return 'El pago asociado fue aprobado.';
    case 'PAYMENT_FAILED':
      return 'El pago asociado registró un fallo.';
    case 'PAYMENT_REFUND_PENDING':
      return 'La devolución fue iniciada y su acreditación depende de Mercado Pago.';
    case 'PAYMENT_REFUNDED':
      return 'Se registró un reembolso asociado a esta reserva.';
    default:
      return 'Se registró una actualización para esta reserva.';
  }
};

export const getClientBookingTimelineMeta = (item: ClientBookingTimelineItem) => {
  const amount = getNumberPayloadValue(item.payload, 'amount');
  const currency = getStringPayloadValue(item.payload, 'currency');
  const financialStatus = getStringPayloadValue(item.payload, 'financialStatus');
  const providerStatus = getStringPayloadValue(item.payload, 'providerStatus');

  return {
    amountLabel: formatBookingMoney(amount, currency),
    financialStatusLabel: financialStatus
      ? FINANCIAL_STATUS_LABELS[financialStatus] || titleCase(financialStatus)
      : null,
    providerStatusLabel: providerStatus ? titleCase(providerStatus) : null,
  };
};
