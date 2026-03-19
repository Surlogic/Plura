import { formatBookingMoney } from '@/utils/bookings';
import type {
  ProfessionalBookingTimelineItem,
  ProfessionalBookingTimelinePayload,
} from '@/types/professionalBookingTimeline';
import {
  formatProfessionalNotificationAbsoluteTimestamp,
  formatProfessionalNotificationTimestamp,
  getProfessionalNotificationTypeLabel,
} from '@/utils/notifications';

const TIMELINE_ACTOR_LABELS: Record<string, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profesional',
  SYSTEM: 'Sistema',
};

const TIMELINE_FINANCIAL_STATUS_LABELS: Record<string, string> = {
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
  payload: ProfessionalBookingTimelinePayload | null | undefined,
  key: string,
) => {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const getNumberPayloadValue = (
  payload: ProfessionalBookingTimelinePayload | null | undefined,
  key: string,
) => {
  const value = payload?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const getProfessionalBookingTimelineEventLabel = getProfessionalNotificationTypeLabel;

export const getProfessionalBookingTimelineActorLabel = (actorType: string | null) => {
  if (!actorType) return null;
  return TIMELINE_ACTOR_LABELS[actorType] || titleCase(actorType);
};

export const getProfessionalBookingTimelineFinancialStatusLabel = (
  financialStatus: string | null,
) => {
  if (!financialStatus) return null;
  return TIMELINE_FINANCIAL_STATUS_LABELS[financialStatus] || titleCase(financialStatus);
};

export const formatProfessionalBookingTimelineTimestamp = (rawValue: string | null) => {
  if (!rawValue) return 'Fecha no disponible';
  return formatProfessionalNotificationTimestamp(rawValue) || 'Fecha no disponible';
};

export const formatProfessionalBookingTimelineAbsoluteTimestamp = (
  rawValue: string | null,
) => {
  if (!rawValue) return '';
  return formatProfessionalNotificationAbsoluteTimestamp(rawValue);
};

export const getProfessionalBookingTimelineSummary = (
  item: ProfessionalBookingTimelineItem,
) => {
  const serviceName = getStringPayloadValue(item.payload, 'serviceName');

  switch (item.type) {
    case 'BOOKING_CREATED':
      return serviceName
        ? `Se generó la reserva para ${serviceName}.`
        : 'Se generó la reserva.';
    case 'BOOKING_CONFIRMED':
      return 'La reserva quedó confirmada.';
    case 'BOOKING_CANCELLED':
      return 'La reserva pasó a estado cancelada.';
    case 'BOOKING_RESCHEDULED':
      return 'La reserva cambió de fecha u horario.';
    case 'BOOKING_COMPLETED':
      return 'La reserva quedó marcada como completada.';
    case 'BOOKING_NO_SHOW':
      return 'La reserva quedó marcada como no asistida.';
    case 'PAYMENT_APPROVED':
      return 'El cobro asociado fue aprobado.';
    case 'PAYMENT_FAILED':
      return 'El cobro asociado registró un fallo.';
    case 'PAYMENT_REFUNDED':
      return 'Se registró un reembolso vinculado a esta reserva.';
    default:
      return 'Evento operativo registrado para esta reserva.';
  }
};

export const getProfessionalBookingTimelineMeta = (
  item: ProfessionalBookingTimelineItem,
) => {
  const amount = getNumberPayloadValue(item.payload, 'amount');
  const currency = getStringPayloadValue(item.payload, 'currency');
  const providerStatus = getStringPayloadValue(item.payload, 'providerStatus');
  const financialStatus = getStringPayloadValue(item.payload, 'financialStatus');
  const actorLabel = getProfessionalBookingTimelineActorLabel(item.actorType);
  const sourceModule = getStringPayloadValue(item.payload, 'sourceModule') || item.sourceModule;
  const sourceAction = getStringPayloadValue(item.payload, 'sourceAction') || item.sourceAction;

  return {
    actorLabel,
    amountLabel: formatBookingMoney(amount, currency),
    providerStatusLabel: providerStatus ? titleCase(providerStatus) : null,
    financialStatusLabel: getProfessionalBookingTimelineFinancialStatusLabel(financialStatus),
    sourceLabel:
      sourceModule && sourceAction
        ? `${titleCase(sourceModule)} · ${sourceAction}`
        : sourceAction || sourceModule || null,
  };
};
